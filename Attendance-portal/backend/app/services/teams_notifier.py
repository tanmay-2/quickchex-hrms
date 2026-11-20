# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEAMS NOTIFIER SERVICE (teams_notifier.py)
# Path: Attendance-portal/backend/app/services/teams_notifier.py
# Purpose: Automated Microsoft Teams 1-on-1 Bot & Channel notification engine:
#          • 11:45 AM: Missing punch-in private alert to each employee (skips Sundays, holidays, approved leaves).
#          • 11:00 PM: Missing punch-out private alert to each employee (clocked in without clocking out).
# ==============================================================================

import os
import time
import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.profile_model import Profile
from app.models.leave import Holiday, LeaveRequest

logger = logging.getLogger("teams_notifier")

DEFAULT_HRMS_URL = "https://la-esfera-hrms.vercel.app"

# ── Microsoft Credentials & Tokens ──────────────────────────────────────────
_bot_token = None
_bot_token_expires_at = datetime.min

_graph_token = None
_graph_token_expires_at = datetime.min

# Cache email -> AAD Object ID to minimize API lookups
_email_to_aad_cache: Dict[str, str] = {}


def get_tenant_id() -> str:
    return os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"


def get_bot_credentials() -> tuple[str, str]:
    app_id = os.getenv("BOT_APP_ID", "").strip()
    app_secret = os.getenv("BOT_APP_PASSWORD", "").strip()
    return app_id, app_secret


def get_graph_credentials() -> tuple[str, str]:
    client_id = os.getenv("CLIENT_ID") or os.getenv("OUTLOOK_CLIENT_ID", "").strip()
    client_secret = os.getenv("CLIENT_SECRET") or os.getenv("OUTLOOK_CLIENT_SECRET", "").strip()
    return client_id, client_secret


def get_bot_token() -> Optional[str]:
    """Obtains and caches Bot Framework OAuth2 token for single-tenant bot."""
    global _bot_token, _bot_token_expires_at
    if _bot_token and datetime.utcnow() < _bot_token_expires_at:
        return _bot_token

    tenant_id = get_tenant_id()
    app_id, app_secret = get_bot_credentials()

    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": app_id,
        "client_secret": app_secret,
        "scope": "https://api.botframework.com/.default"
    }

    try:
        resp = requests.post(url, data=data, timeout=10)
        if resp.status_code == 200:
            _bot_token = resp.json().get("access_token")
            _bot_token_expires_at = datetime.utcnow() + timedelta(minutes=50)
            return _bot_token
        else:
            logger.error(f"[Teams Bot] Failed to get bot token: {resp.text}")
            return None
    except Exception as e:
        logger.error(f"[Teams Bot] Exception getting bot token: {e}")
        return None


def get_graph_token() -> Optional[str]:
    """Obtains and caches Microsoft Graph token for user lookups."""
    global _graph_token, _graph_token_expires_at
    if _graph_token and datetime.utcnow() < _graph_token_expires_at:
        return _graph_token

    tenant_id = get_tenant_id()
    client_id, client_secret = get_graph_credentials()

    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default"
    }

    try:
        resp = requests.post(url, data=data, timeout=10)
        if resp.status_code == 200:
            _graph_token = resp.json().get("access_token")
            _graph_token_expires_at = datetime.utcnow() + timedelta(minutes=50)
            return _graph_token
        else:
            logger.error(f"[Teams Graph] Failed to get graph token: {resp.text}")
            return None
    except Exception as e:
        logger.error(f"[Teams Graph] Exception getting graph token: {e}")
        return None


def resolve_user_aad_id(email: str) -> Optional[str]:
    """Looks up user's Azure AD Object ID by corporate email."""
    if not email:
        return None

    clean_email = email.strip().lower()
    if clean_email in _email_to_aad_cache:
        return _email_to_aad_cache[clean_email]

    graph_token = get_graph_token()
    if not graph_token:
        return None

    url = f"https://graph.microsoft.com/v1.0/users/{clean_email}?$select=id,mail,displayName"
    headers = {"Authorization": f"Bearer {graph_token}"}

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            aad_id = resp.json().get("id")
            if aad_id:
                _email_to_aad_cache[clean_email] = aad_id
                return aad_id
        else:
            logger.debug(f"[Teams Graph] User not found by email '{clean_email}': {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"[Teams Graph] Exception resolving user {clean_email}: {e}")
        return None


# ── 1-on-1 Bot Message Dispatcher ───────────────────────────────────────────

def send_bot_direct_message(
    user_aad_id: str,
    title: str,
    message: str,
    facts: Optional[List[Dict[str, str]]] = None,
    action_title: str = "Open HRMS Portal",
    action_url: str = f"{DEFAULT_HRMS_URL}/dashboard",
    color: str = "Accent"
) -> bool:
    """
    Sends a private 1-on-1 Adaptive Card directly to an employee's Teams chat via Quickchex HR Bot.
    """
    token = get_bot_token()
    if not token:
        logger.error("[Teams Bot] Cannot send 1-on-1 message: Bot token unavailable.")
        return False

    app_id, _ = get_bot_credentials()
    tenant_id = get_tenant_id()
    service_url = "https://smba.trafficmanager.net/in/"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Create or retrieve the 1-on-1 personal conversation with this user
    conv_payload = {
        "bot": {"id": app_id, "name": "Quickchex HR Bot"},
        "isGroup": False,
        "members": [{"id": user_aad_id}],
        "tenantId": tenant_id
    }

    try:
        conv_resp = requests.post(f"{service_url}v3/conversations", headers=headers, json=conv_payload, timeout=10)
        if conv_resp.status_code not in [200, 201]:
            logger.warning(f"[Teams Bot] Failed to create conversation for user {user_aad_id}: {conv_resp.status_code} {conv_resp.text}")
            return False

        conv_id = conv_resp.json().get("id")
        if not conv_id:
            return False

        # 2. Build the Adaptive Card
        body_elements = [
            {
                "type": "TextBlock",
                "text": title,
                "weight": "Bolder",
                "size": "Large",
                "color": color
            },
            {
                "type": "TextBlock",
                "text": message,
                "wrap": True,
                "spacing": "Medium"
            }
        ]

        if facts:
            body_elements.append({
                "type": "FactSet",
                "facts": facts,
                "spacing": "Medium"
            })

        card_payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": body_elements,
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": action_title,
                                "url": action_url
                            }
                        ]
                    }
                }
            ]
        }

        # 3. Post activity to conversation
        msg_resp = requests.post(f"{service_url}v3/conversations/{conv_id}/activities", headers=headers, json=card_payload, timeout=10)
        if msg_resp.status_code in [200, 201]:
            logger.info(f"[Teams Bot] Successfully delivered 1-on-1 alert to user {user_aad_id}.")
            return True
        else:
            logger.error(f"[Teams Bot] Failed to post activity: {msg_resp.status_code} {msg_resp.text}")
            return False

    except Exception as e:
        logger.error(f"[Teams Bot] Exception sending direct message to {user_aad_id}: {e}")
        return False


# ── Channel Webhook Dispatcher (Optional Backup) ─────────────────────────────

def get_teams_webhook_url() -> str:
    url = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
    if not url:
        try:
            from dotenv import load_dotenv
            load_dotenv()
            url = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
        except Exception:
            pass
    return url


def send_teams_adaptive_card(
    title: str,
    subtitle: str,
    facts: List[Dict[str, str]],
    detail_bullets: Optional[List[str]] = None,
    action_title: str = "Open HRMS Portal",
    action_url: str = f"{DEFAULT_HRMS_URL}/dashboard",
    color: str = "Accent"
) -> bool:
    """Optional channel webhook sender for team visibility."""
    webhook_url = get_teams_webhook_url()
    if not webhook_url:
        return False

    body_elements = [
        {"type": "TextBlock", "text": title, "weight": "Bolder", "size": "Large", "color": color},
        {"type": "TextBlock", "text": subtitle, "wrap": True, "spacing": "Small", "isSubtle": True}
    ]
    if facts:
        body_elements.append({"type": "FactSet", "facts": facts, "spacing": "Medium"})
    if detail_bullets:
        bullet_text = "\n\n".join(detail_bullets[:25])
        if len(detail_bullets) > 25:
            bullet_text += f"\n\n*... and {len(detail_bullets) - 25} more.*"
        body_elements.append({"type": "TextBlock", "text": bullet_text, "wrap": True, "spacing": "Medium"})

    card_payload = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": body_elements,
                "actions": [{"type": "Action.OpenUrl", "title": action_title, "url": action_url}]
            }
        }]
    }

    try:
        resp = requests.post(webhook_url, json=card_payload, timeout=12)
        return resp.status_code in [200, 201, 202]
    except Exception:
        return False


def normalize_code_set(codes) -> set:
    """Returns a set containing both with/without 'LE' prefix and trimmed representations."""
    res = set()
    for c in codes:
        if not c:
            continue
        cleaned = str(c).strip().upper()
        res.add(cleaned)
        if cleaned.startswith("LE"):
            res.add(cleaned[2:])
        else:
            res.add(f"LE{cleaned}")
    return res


# ── Scheduled Attendance Checkers ───────────────────────────────────────────

def run_morning_missing_punch_check() -> Dict[str, Any]:
    """
    Runs daily at 11:45 AM IST:
    1. Skips if today is Sunday or an official Holiday.
    2. Identifies all active employees who:
       - Are NOT on approved leave today.
       - Have NOT punched in today.
    3. Dispatches a PRIVATE 1-on-1 Teams message to each missing employee.
    """
    today = date.today()
    logger.info(f"[Teams Notifier] Running 11:45 AM Missing Punch-In Check for {today}...")

    # 1. Skip on Sundays
    if today.weekday() == 6:
        logger.info("[Teams Notifier] Today is Sunday. Skipping attendance alert.")
        return {"status": "skipped", "reason": "Sunday (Weekly Off)"}

    db: Session = SessionLocal()
    try:
        # 2. Skip on Official Company Holidays
        holiday = None
        try:
            holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        except Exception:
            holiday = None
        if holiday:
            h_name = holiday.name or holiday.title or "Public Holiday"
            logger.info(f"[Teams Notifier] Today is an official holiday ({h_name}). Skipping attendance alert.")
            return {"status": "skipped", "reason": f"Company Holiday: {h_name}"}

        # 3. Get employees currently on approved leave today
        approved_leaves = db.execute(text("""
            SELECT DISTINCT UPPER(emp_code) as code 
            FROM leave_requests 
            WHERE status ILIKE 'approved' 
              AND :today BETWEEN start_date AND end_date
        """), {"today": today}).fetchall()
        on_leave_codes = normalize_code_set([row[0] for row in approved_leaves if row[0]])

        # 4. Check today's attendance partition table
        tname = f"attendance_{today.year}_{today.month:02d}"
        punched_in_codes = set()
        try:
            punched_rows = db.execute(text(f"""
                SELECT DISTINCT UPPER(emp_code) 
                FROM {tname} 
                WHERE date = :today 
                  AND (
                      punch_in_time IS NOT NULL 
                      OR status ILIKE 'present' 
                      OR status ILIKE 'punched in' 
                      OR status ILIKE 'half day' 
                      OR status ILIKE 'late' 
                      OR status ILIKE 'on time' 
                      OR status ILIKE '%wfh%' 
                      OR status ILIKE '%work from home%'
                  )
            """), {"today": today}).fetchall()
            punched_in_codes = normalize_code_set([r[0] for r in punched_rows if r[0]])
        except Exception as tbl_err:
            logger.warning(f"[Teams Notifier] Could not query attendance table {tname}: {tbl_err}")

        # Check approved regularizations for today
        reg_tname = f"regularization_{today.year}_{today.month:02d}"
        try:
            reg_rows = db.execute(text(f"""
                SELECT DISTINCT UPPER(emp_code) 
                FROM {reg_tname} 
                WHERE date = :today AND status ILIKE 'approved'
            """), {"today": today}).fetchall()
            punched_in_codes.update(normalize_code_set([r[0] for r in reg_rows if r[0]]))
        except Exception:
            pass

        # 5. Get all active company employees
        active_employees = db.query(Profile).filter(Profile.emp_code.isnot(None)).all()

        missing_employees = []
        for emp in active_employees:
            code = (emp.emp_code or "").strip().upper()
            clean_num = code[2:] if code.startswith("LE") else code
            if not code or code in on_leave_codes or clean_num in on_leave_codes or code in punched_in_codes or clean_num in punched_in_codes:
                continue

            full_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or code
            first_name = emp.first_name or full_name
            dept = emp.department or "Operations"
            mgr = emp.reporting_supervisor or "Team Lead"
            email = (emp.email or "").strip().lower()

            missing_employees.append({
                "code": code,
                "first_name": first_name,
                "name": full_name,
                "dept": dept,
                "manager": mgr,
                "email": email
            })

        logger.info(f"[Teams Notifier] Morning Check: {len(missing_employees)} employees missing punch-in.")

        if not missing_employees:
            logger.info("[Teams Notifier] 100% attendance achieved! No alerts needed.")
            return {
                "status": "success",
                "message": "All active employees are punched in or on approved leave.",
                "missing_count": 0
            }

        date_str = today.strftime("%d %b %Y (%A)")
        sent_count = 0
        failed_count = 0

        # 6. Send PRIVATE 1-on-1 alert to each employee
        for emp in missing_employees:
            email = emp["email"]
            aad_id = resolve_user_aad_id(email) if email else None

            if not aad_id:
                logger.warning(f"[Teams Notifier] No Azure AD match for {emp['name']} ({email}).")
                failed_count += 1
                continue

            title = "⏰ Attendance Reminder: Missing Punch-In"
            message = (
                f"Hi **{emp['first_name']}**, our system noticed that you haven't punched in today (**{date_str}**).\n\n"
                f"If you are working today, please clock in on the portal to avoid your attendance being marked as absent."
            )
            facts = [
                {"title": "Employee:", "value": f"{emp['name']} ({emp['code']})"},
                {"title": "Department:", "value": emp["dept"]},
                {"title": "Status:", "value": "Missing Punch-In ⚠️"},
                {"title": "Shift Timing:", "value": "10:00 AM – 7:00 PM"}
            ]

            delivered = send_bot_direct_message(
                user_aad_id=aad_id,
                title=title,
                message=message,
                facts=facts,
                action_title="🚀 Clock In on HRMS",
                action_url=f"{DEFAULT_HRMS_URL}/dashboard",
                color="Attention"
            )

            if delivered:
                sent_count += 1
            else:
                failed_count += 1
            time.sleep(1.0)  # Throttling to respect Azure Graph API rate limits (avoid 429 quota error)

        logger.info(f"[Teams Notifier] 1-on-1 Morning Alerts completed: {sent_count} sent, {failed_count} failed.")

        return {
            "status": "completed",
            "date": str(today),
            "missing_count": len(missing_employees),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "missing_employees": [m["name"] for m in missing_employees]
        }

    except Exception as e:
        logger.error(f"[Teams Notifier] Error in run_morning_missing_punch_check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


def run_night_missing_punchout_check() -> Dict[str, Any]:
    """
    Runs daily at 11:00 PM IST (23:00):
    1. Skips if today is Sunday or an official Holiday.
    2. Identifies all employees who punched in today, but never punched out.
    3. Dispatches a PRIVATE 1-on-1 Teams message to each employee reminding them to clock out.
    """
    today = date.today()
    logger.info(f"[Teams Notifier] Running 11:00 PM Missing Punch-Out Check for {today}...")

    # Skip on Sundays
    if today.weekday() == 6:
        return {"status": "skipped", "reason": "Sunday"}

    db: Session = SessionLocal()
    try:
        # Skip on holidays
        holiday = None
        try:
            holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        except Exception:
            holiday = None
        if holiday:
            return {"status": "skipped", "reason": "Company Holiday"}

        tname = f"attendance_{today.year}_{today.month:02d}"
        missing_punchouts = []
        try:
            rows = db.execute(text(f"""
                SELECT a.emp_code, a.punch_in_time, p.first_name, p.last_name, p.department, p.email
                FROM {tname} a
                LEFT JOIN profile_master p ON (
                    UPPER(TRIM(p.emp_code)) = UPPER(TRIM(a.emp_code))
                    OR REPLACE(UPPER(TRIM(p.emp_code)), 'LE', '') = REPLACE(UPPER(TRIM(a.emp_code)), 'LE', '')
                )
                WHERE a.date = :today 
                  AND a.punch_in_time IS NOT NULL 
                  AND a.punch_out_time IS NULL
                  AND (a.status IS NULL OR a.status NOT ILIKE '%leave%' AND a.status NOT ILIKE '%absent%')
                ORDER BY a.punch_in_time ASC
            """), {"today": today}).mappings().all()

            for r in rows:
                code = r.get("emp_code")
                full_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or code
                first_name = r.get('first_name') or full_name
                in_time = str(r.get("punch_in_time") or "—")
                email = (r.get("email") or "").strip().lower()

                missing_punchouts.append({
                    "code": code,
                    "first_name": first_name,
                    "name": full_name,
                    "punch_in": in_time,
                    "dept": r.get("department") or "Operations",
                    "email": email
                })
        except Exception as tbl_err:
            logger.warning(f"[Teams Notifier] Error querying missing punchouts: {tbl_err}")

        logger.info(f"[Teams Notifier] Night Check: {len(missing_punchouts)} employees clocked in without punch-out.")

        if not missing_punchouts:
            return {
                "status": "success",
                "message": "All employees who clocked in today have punched out successfully.",
                "count": 0
            }

        date_str = today.strftime("%d %b %Y (%A)")
        sent_count = 0
        failed_count = 0

        # Send private 1-on-1 alert to each employee
        for emp in missing_punchouts:
            email = emp["email"]
            aad_id = resolve_user_aad_id(email) if email else None

            if not aad_id:
                failed_count += 1
                continue

            title = "🌙 Attendance Alert: Missing Punch-Out"
            message = (
                f"Hi **{emp['first_name']}**, you clocked in today at **{emp['punch_in']}** but haven't clocked out yet.\n\n"
                f"Please punch out on the portal before ending your day, or submit an attendance regularization tomorrow."
            )
            facts = [
                {"title": "Employee:", "value": f"{emp['name']} ({emp['code']})"},
                {"title": "Clock-In Time:", "value": emp["punch_in"]},
                {"title": "Status:", "value": "Missing Punch-Out ⚠️"}
            ]

            delivered = send_bot_direct_message(
                user_aad_id=aad_id,
                title=title,
                message=message,
                facts=facts,
                action_title="🚪 Clock Out on HRMS",
                action_url=f"{DEFAULT_HRMS_URL}/dashboard",
                color="Warning"
            )

            if delivered:
                sent_count += 1
            else:
                failed_count += 1
            time.sleep(1.0)  # Throttling to respect Azure Graph API rate limits (avoid 429 quota error)

        return {
            "status": "completed",
            "date": str(today),
            "missing_punchout_count": len(missing_punchouts),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "employees": [m["name"] for m in missing_punchouts]
        }

    except Exception as e:
        logger.error(f"[Teams Notifier] Error in run_night_missing_punchout_check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
