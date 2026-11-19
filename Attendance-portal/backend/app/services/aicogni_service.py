# ==============================================================================
# QUICKCHEX HRMS BACKEND - AI COGNI TEAMS NOTIFICATION SERVICE
# Path: Attendance-portal/backend/app/services/aicogni_service.py
# Purpose: Direct 1-on-1 Teams messaging from AI Cogni (aicogni@laesfera.co):
#          • 11:30 AM IST: Missing punch-in personal reminder.
#          • 11:00 PM IST: Missing punch-out personal reminder.
#          • Excludes: Sundays, 4th Saturday, official holidays, and approved leaves.
# ==============================================================================

import os
import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, Optional, List
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.profile_model import Profile
from app.models.leave import Holiday, LeaveRequest

logger = logging.getLogger("aicogni_teams")

DEFAULT_HRMS_URL = "https://la-esfera-hrms.vercel.app"

# In-memory token cache
_token_cache = {
    "access_token": None,
    "expires_at": datetime.min,
    "my_user_id": None
}

# Cache of email -> AAD Object ID & email -> chat_id
_user_aad_cache: Dict[str, str] = {}
_user_chat_cache: Dict[str, str] = {}


def get_credentials() -> Dict[str, str]:
    return {
        "tenant_id": os.getenv("AICOGNI_TENANT_ID") or os.getenv("TEAMS_TENANT_ID", "").strip(),
        "client_id": os.getenv("AICOGNI_CLIENT_ID") or os.getenv("TEAMS_CLIENT_ID", "").strip(),
        "client_secret": os.getenv("AICOGNI_CLIENT_SECRET") or os.getenv("TEAMS_CLIENT_SECRET", "").strip(),
        "refresh_token": os.getenv("AICOGNI_REFRESH_TOKEN", "").strip()
    }


def get_aicogni_access_token() -> Optional[str]:
    """Redeems a valid Microsoft Graph delegated access token using the refresh token."""
    global _token_cache

    if _token_cache["access_token"] and datetime.utcnow() < _token_cache["expires_at"]:
        return _token_cache["access_token"]

    creds = get_credentials()
    if not creds["refresh_token"]:
        logger.error("[AI Cogni] Missing AICOGNI_REFRESH_TOKEN in .env")
        return None

    token_url = f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token"
    payload = {
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "grant_type": "refresh_token",
        "refresh_token": creds["refresh_token"],
        "scope": "https://graph.microsoft.com/.default offline_access"
    }

    try:
        resp = requests.post(token_url, data=payload, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            _token_cache["access_token"] = data["access_token"]
            _token_cache["expires_at"] = datetime.utcnow() + timedelta(minutes=50)

            # If a new refresh token is returned, update it
            if data.get("refresh_token"):
                creds["refresh_token"] = data["refresh_token"]

            logger.info("[AI Cogni] Access token refreshed successfully.")
            return _token_cache["access_token"]
        else:
            logger.error(f"[AI Cogni] Failed to refresh token: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        logger.error(f"[AI Cogni] Exception during token refresh: {e}")
        return None


def get_aicogni_user_id() -> Optional[str]:
    """Retrieves AI Cogni's own user ID."""
    global _token_cache
    if _token_cache["my_user_id"]:
        return _token_cache["my_user_id"]

    token = get_aicogni_access_token()
    if not token:
        return None

    try:
        resp = requests.get(
            "https://graph.microsoft.com/v1.0/me?$select=id",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        if resp.status_code == 200:
            uid = resp.json().get("id")
            _token_cache["my_user_id"] = uid
            return uid
    except Exception as e:
        logger.error(f"[AI Cogni] Exception getting own user ID: {e}")
    return None


def resolve_employee_aad_id(email: str) -> Optional[str]:
    """Looks up employee's Azure AD Object ID by corporate email."""
    if not email:
        return None

    clean = email.strip().lower()
    if clean in _user_aad_cache:
        return _user_aad_cache[clean]

    token = get_aicogni_access_token()
    if not token:
        return None

    try:
        url = f"https://graph.microsoft.com/v1.0/users/{clean}?$select=id,mail,displayName"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=10)
        if resp.status_code == 200:
            aad_id = resp.json().get("id")
            if aad_id:
                _user_aad_cache[clean] = aad_id
                return aad_id
        else:
            logger.warning(f"[AI Cogni] Employee {clean} not found in Azure AD: {resp.status_code}")
    except Exception as e:
        logger.error(f"[AI Cogni] Exception resolving employee {clean}: {e}")
    return None


def get_or_create_1on1_chat(employee_email: str) -> Optional[str]:
    """Gets or creates the 1-on-1 Teams chat between AI Cogni and the employee."""
    clean = employee_email.strip().lower()
    if clean in _user_chat_cache:
        return _user_chat_cache[clean]

    my_id = get_aicogni_user_id()
    emp_aad_id = resolve_employee_aad_id(clean)

    if not my_id or not emp_aad_id:
        return None

    token = get_aicogni_access_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    chat_payload = {
        "chatType": "oneOnOne",
        "members": [
            {
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{my_id}')"
            },
            {
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{emp_aad_id}')"
            }
        ]
    }

    try:
        resp = requests.post("https://graph.microsoft.com/v1.0/chats", headers=headers, json=chat_payload, timeout=12)
        if resp.status_code in [200, 201]:
            chat_id = resp.json().get("id")
            _user_chat_cache[clean] = chat_id
            return chat_id
        else:
            logger.error(f"[AI Cogni] Failed to create chat with {clean}: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"[AI Cogni] Exception creating chat with {clean}: {e}")
    return None


def send_aicogni_message(employee_email: str, html_content: str) -> bool:
    """Sends a rich HTML message to the employee's personal 1-on-1 Teams chat from AI Cogni."""
    chat_id = get_or_create_1on1_chat(employee_email)
    if not chat_id:
        return False

    token = get_aicogni_access_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    msg_payload = {
        "body": {
            "contentType": "html",
            "content": html_content
        }
    }

    try:
        url = f"https://graph.microsoft.com/v1.0/chats/{chat_id}/messages"
        resp = requests.post(url, headers=headers, json=msg_payload, timeout=12)
        if resp.status_code in [200, 201]:
            logger.info(f"[AI Cogni] Sent direct message to {employee_email}")
            return True
        else:
            logger.error(f"[AI Cogni] Failed to send message to {employee_email}: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"[AI Cogni] Exception sending message to {employee_email}: {e}")
        return False


# ── Calendar & Exclusion Rules ──────────────────────────────────────────────

def is_fourth_saturday(d: date) -> bool:
    """Checks if date is the 4th Saturday of the month (always day 22 through 28)."""
    return d.weekday() == 5 and 22 <= d.day <= 28


def is_sunday(d: date) -> bool:
    """Checks if date is Sunday (weekday 6)."""
    return d.weekday() == 6


def is_skip_day(today: date, db: Session) -> tuple[bool, str]:
    """
    Evaluates all corporate exclusion rules:
    - Sundays
    - 4th Saturday
    - Official company holidays
    """
    if is_sunday(today):
        return True, "Sunday (Weekly Off)"

    if is_fourth_saturday(today):
        return True, "4th Saturday (Company Holiday)"

    try:
        holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        if holiday:
            h_name = holiday.name or getattr(holiday, "title", "Company Holiday")
            return True, f"Official Holiday: {h_name}"
    except Exception as e:
        logger.warning(f"[AI Cogni] Could not check holidays: {e}")

    return False, ""


# ── Scheduled Checks ────────────────────────────────────────────────────────

def run_aicogni_morning_punch_check() -> Dict[str, Any]:
    """
    Runs daily at 11:30 AM IST:
    1. Skips Sundays, 4th Saturday, official holidays.
    2. Identifies employees who have not punched in and are not on approved leave.
    3. AI Cogni personally direct-messages each missing employee on Teams.
    """
    today = date.today()
    logger.info(f"[AI Cogni] Running 11:30 AM Missing Punch-In Check for {today}...")

    db: Session = SessionLocal()
    try:
        skip, reason = is_skip_day(today, db)
        if skip:
            logger.info(f"[AI Cogni] Skipping morning alert: {reason}")
            return {"status": "skipped", "reason": reason}

        # 1. Approved leave exclusion
        approved_leaves = db.execute(text("""
            SELECT DISTINCT UPPER(emp_code) as code 
            FROM leave_requests 
            WHERE status ILIKE 'approved' 
              AND :today BETWEEN start_date AND end_date
        """), {"today": today}).fetchall()
        on_leave_codes = {row[0] for row in approved_leaves if row[0]}

        # 2. Punched in today check
        tname = f"attendance_{today.year}_{today.month:02d}"
        punched_in_codes = set()
        try:
            punched_rows = db.execute(text(f"""
                SELECT DISTINCT UPPER(emp_code) 
                FROM {tname} 
                WHERE date = :today AND punch_in_time IS NOT NULL
            """), {"today": today}).fetchall()
            punched_in_codes = {r[0] for r in punched_rows if r[0]}
        except Exception as tbl_err:
            logger.warning(f"[AI Cogni] Attendance table error {tname}: {tbl_err}")

        # 3. Active employees
        active_employees = db.query(Profile).filter(Profile.emp_code.isnot(None)).all()

        missing_employees = []
        for emp in active_employees:
            code = (emp.emp_code or "").strip().upper()
            if not code or code in on_leave_codes or code in punched_in_codes:
                continue

            full_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or code
            first_name = emp.first_name or full_name
            email = (emp.email or "").strip().lower()

            if email:
                missing_employees.append({
                    "code": code,
                    "first_name": first_name,
                    "name": full_name,
                    "email": email
                })

        logger.info(f"[AI Cogni] Found {len(missing_employees)} employees missing punch-in at 11:30 AM.")

        if not missing_employees:
            return {"status": "success", "message": "All employees punched in or on leave.", "missing_count": 0}

        date_str = today.strftime("%d %b %Y (%A)")
        sent_count = 0
        failed_count = 0

        for emp in missing_employees:
            html = f"""
            <div style="font-family: Segoe UI, sans-serif; padding: 12px; border-left: 4px solid #e11d48; background-color: #fff1f2; border-radius: 6px;">
                <h3 style="margin: 0 0 8px 0; color: #be123c;">⏰ Attendance Reminder: Missing Punch-In</h3>
                <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px;">
                    Hi <b>{emp['first_name']}</b>, our system noticed that you haven't punched in today (<b>{date_str}</b>) by 11:30 AM.
                </p>
                <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">
                    If you are working today, please clock in on the portal to avoid being marked absent.
                </p>
                <a href="{DEFAULT_HRMS_URL}/dashboard" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 13px;">
                    🚀 Clock In on HRMS
                </a>
            </div>
            """

            if send_aicogni_message(emp["email"], html):
                sent_count += 1
            else:
                failed_count += 1

        return {
            "status": "completed",
            "date": str(today),
            "missing_count": len(missing_employees),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "employees": [m["name"] for m in missing_employees]
        }

    except Exception as e:
        logger.error(f"[AI Cogni] Error in morning punch check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


def run_aicogni_night_punchout_check() -> Dict[str, Any]:
    """
    Runs daily at 11:00 PM IST (23:00):
    1. Skips Sundays, 4th Saturday, official holidays.
    2. Identifies employees who punched in today, but have not punched out.
    3. AI Cogni personally direct-messages each employee on Teams.
    """
    today = date.today()
    logger.info(f"[AI Cogni] Running 11:00 PM Missing Punch-Out Check for {today}...")

    db: Session = SessionLocal()
    try:
        skip, reason = is_skip_day(today, db)
        if skip:
            return {"status": "skipped", "reason": reason}

        tname = f"attendance_{today.year}_{today.month:02d}"
        missing_punchouts = []
        try:
            rows = db.execute(text(f"""
                SELECT a.emp_code, a.punch_in_time, p.first_name, p.last_name, p.email
                FROM {tname} a
                LEFT JOIN profile_master p ON UPPER(p.emp_code) = UPPER(a.emp_code)
                WHERE a.date = :today 
                  AND a.punch_in_time IS NOT NULL 
                  AND a.punch_out_time IS NULL
                ORDER BY a.punch_in_time ASC
            """), {"today": today}).mappings().all()

            for r in rows:
                code = r.get("emp_code")
                full_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or code
                first_name = r.get('first_name') or full_name
                in_time = str(r.get("punch_in_time") or "—")
                email = (r.get("email") or "").strip().lower()

                if email:
                    missing_punchouts.append({
                        "code": code,
                        "first_name": first_name,
                        "name": full_name,
                        "punch_in": in_time,
                        "email": email
                    })
        except Exception as tbl_err:
            logger.warning(f"[AI Cogni] Error querying missing punchouts: {tbl_err}")

        logger.info(f"[AI Cogni] Found {len(missing_punchouts)} employees missing punch-out at 11:00 PM.")

        if not missing_punchouts:
            return {"status": "success", "message": "All clocked-in employees have clocked out.", "count": 0}

        date_str = today.strftime("%d %b %Y (%A)")
        sent_count = 0
        failed_count = 0

        for emp in missing_punchouts:
            html = f"""
            <div style="font-family: Segoe UI, sans-serif; padding: 12px; border-left: 4px solid #f59e0b; background-color: #fffbeb; border-radius: 6px;">
                <h3 style="margin: 0 0 8px 0; color: #b45309;">🌙 Attendance Reminder: Missing Punch-Out</h3>
                <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px;">
                    Hi <b>{emp['first_name']}</b>, you punched in today at <b>{emp['punch_in']}</b>, but our system hasn't recorded your punch-out yet.
                </p>
                <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">
                    Please punch out on the portal before ending your day, or submit an attendance regularization tomorrow.
                </p>
                <a href="{DEFAULT_HRMS_URL}/dashboard" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 13px;">
                    🚪 Clock Out on HRMS
                </a>
            </div>
            """

            if send_aicogni_message(emp["email"], html):
                sent_count += 1
            else:
                failed_count += 1

        return {
            "status": "completed",
            "date": str(today),
            "missing_count": len(missing_punchouts),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "employees": [m["name"] for m in missing_punchouts]
        }

    except Exception as e:
        logger.error(f"[AI Cogni] Error in night punchout check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
