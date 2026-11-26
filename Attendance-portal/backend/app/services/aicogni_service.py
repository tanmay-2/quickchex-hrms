# ==============================================================================
# QUICKCHEX HRMS BACKEND - AI COGNI TEAMS NOTIFICATION SERVICE
# Path: Attendance-portal/backend/app/services/aicogni_service.py
# Purpose: Direct 1-on-1 Teams messaging from AI Cogni (aicogni@laesfera.co):
#          • 11:00 AM IST: Missing punch-in personal reminder.
#          • 8:00 PM IST: Missing punch-out personal reminder.
#          • Excludes: Sundays, 4th Saturday, official holidays, and approved leaves.
# ==============================================================================

# Import module os for system functionality
import os
# Import module time for system functionality
import time
# Import module logging for system functionality
import logging
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import Dict, Any, Optional, List from typing for module operations
from typing import Dict, Any, Optional, List
# Import module requests for system functionality
import requests
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text

# Import SessionLocal from app.db.session for module operations
from app.db.session import SessionLocal
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import Holiday, LeaveRequest from app.models.leave for module operations
from app.models.leave import Holiday, LeaveRequest

# Set logger variable to store logger value
logger = logging.getLogger("aicogni_teams")

# Set DEFAULT_HRMS_URL variable to store DEFAULT HRMS URL value
DEFAULT_HRMS_URL = "https://lahrms.laesfera.co:8200"

# In-memory token cache
_token_cache = {
    # Execute statement to process data and maintain state
    "access_token": None,
    # Execute statement to process data and maintain state
    "expires_at": datetime.min,
    # Execute statement to process data and maintain state
    "my_user_id": None
# Execute statement to process data and maintain state
}

# Cache of email -> AAD Object ID & email -> chat_id
_user_aad_cache: Dict[str, str] = {}
_user_chat_cache: Dict[str, str] = {}
# Deduplication set so employees receive exactly one 9-hour completion reminder per day
_sent_9hr_reminders: set = set()


# Define get_credentials function to handle get credentials
def get_credentials() -> Dict[str, str]:
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "tenant_id": os.getenv("AICOGNI_TENANT_ID") or os.getenv("TEAMS_TENANT_ID", "").strip(),
        # Execute statement to process data and maintain state
        "client_id": os.getenv("AICOGNI_CLIENT_ID") or os.getenv("TEAMS_CLIENT_ID", "").strip(),
        # Execute statement to process data and maintain state
        "client_secret": os.getenv("AICOGNI_CLIENT_SECRET") or os.getenv("TEAMS_CLIENT_SECRET", "").strip(),
        # Execute statement to process data and maintain state
        "refresh_token": os.getenv("AICOGNI_REFRESH_TOKEN", "").strip()
    # Execute statement to process data and maintain state
    }


# Define get_aicogni_access_token function to handle get aicogni access token
def get_aicogni_access_token() -> Optional[str]:
    """Redeems a valid Microsoft Graph delegated access token using the refresh token."""
    global _token_cache

    # Evaluate condition to control execution branch
    if _token_cache["access_token"] and datetime.utcnow() < _token_cache["expires_at"]:
        # Return computed result or response payload to caller
        return _token_cache["access_token"]

    # Set creds variable to store creds value
    creds = get_credentials()
    # Check if target condition is false or object is missing
    if not creds["refresh_token"]:
        # Log error message with failure diagnostic details
        logger.error("[AI Cogni] Missing AICOGNI_REFRESH_TOKEN in .env")
        # Return computed result or response payload to caller
        return None

    # Set token_url variable to store token url value
    token_url = f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token"
    # Set payload variable to store payload value
    payload = {
        # Execute statement to process data and maintain state
        "client_id": creds["client_id"],
        # Execute statement to process data and maintain state
        "client_secret": creds["client_secret"],
        # Execute statement to process data and maintain state
        "grant_type": "refresh_token",
        # Execute statement to process data and maintain state
        "refresh_token": creds["refresh_token"],
        # Execute statement to process data and maintain state
        "scope": "https://graph.microsoft.com/.default offline_access"
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.post(token_url, data=payload, timeout=12)
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set data variable to store data value
            data = resp.json()
            # Execute statement to process data and maintain state
            _token_cache["access_token"] = data["access_token"]
            # Execute statement to process data and maintain state
            _token_cache["expires_at"] = datetime.utcnow() + timedelta(minutes=50)

            # If a new refresh token is returned, update it
            if data.get("refresh_token"):
                # Execute statement to process data and maintain state
                creds["refresh_token"] = data["refresh_token"]

            # Log informational message for system observability
            logger.info("[AI Cogni] Access token refreshed successfully.")
            # Return computed result or response payload to caller
            return _token_cache["access_token"]
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[AI Cogni] Failed to refresh token: {resp.status_code} {resp.text}")
            # Return computed result or response payload to caller
            return None
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Exception during token refresh: {e}")
        # Return computed result or response payload to caller
        return None


# Define get_aicogni_user_id function to handle get aicogni user id
def get_aicogni_user_id() -> Optional[str]:
    """Retrieves AI Cogni's own user ID."""
    global _token_cache
    # Evaluate condition to control execution branch
    if _token_cache["my_user_id"]:
        # Return computed result or response payload to caller
        return _token_cache["my_user_id"]

    # Set token variable to store token value
    token = get_aicogni_access_token()
    # Check if target condition is false or object is missing
    if not token:
        # Return computed result or response payload to caller
        return None

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.get(
            # Specify parameter value for "https://graph.microsoft.com/v1.0/me?$select
            "https://graph.microsoft.com/v1.0/me?$select=id",
            # Set headers variable to store headers value
            headers={"Authorization": f"Bearer {token}"},
            # Set timeout variable to store timeout value
            timeout=10
        # Execute statement to process data and maintain state
        )
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set uid variable to store uid value
            uid = resp.json().get("id")
            # Execute statement to process data and maintain state
            _token_cache["my_user_id"] = uid
            # Return computed result or response payload to caller
            return uid
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Exception getting own user ID: {e}")
    # Return computed result or response payload to caller
    return None


# Define resolve_employee_aad_id function to handle resolve employee aad id
def resolve_employee_aad_id(email: str) -> Optional[str]:
    """Looks up employee's Azure AD Object ID by corporate email."""
    if not email:
        # Return computed result or response payload to caller
        return None

    # Set clean variable to store clean value
    clean = email.strip().lower()
    # Evaluate condition to control execution branch
    if clean in _user_aad_cache:
        # Return computed result or response payload to caller
        return _user_aad_cache[clean]

    # Set token variable to store token value
    token = get_aicogni_access_token()
    # Check if target condition is false or object is missing
    if not token:
        # Return computed result or response payload to caller
        return None

    # Begin guarded execution block to trap exceptions
    try:
        # Set url variable to store url value
        url = f"https://graph.microsoft.com/v1.0/users/{clean}?$select=id,mail,displayName"
        # Set resp variable to store resp value
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=10)
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set aad_id variable to store aad id value
            aad_id = resp.json().get("id")
            # Evaluate condition to control execution branch
            if aad_id:
                # Execute statement to process data and maintain state
                _user_aad_cache[clean] = aad_id
                # Return computed result or response payload to caller
                return aad_id
        # Execute fallback branch when conditions are not met
        else:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"[AI Cogni] Employee {clean} not found in Azure AD: {resp.status_code}")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Exception resolving employee {clean}: {e}")
    # Return computed result or response payload to caller
    return None


# Define get_or_create_1on1_chat function to handle get or create 1on1 chat
def get_or_create_1on1_chat(employee_email: str) -> Optional[str]:
    """Gets or creates the 1-on-1 Teams chat between AI Cogni and the employee."""
    clean = employee_email.strip().lower()
    # Evaluate condition to control execution branch
    if clean in _user_chat_cache:
        # Return computed result or response payload to caller
        return _user_chat_cache[clean]

    # Set my_id variable to store my id value
    my_id = get_aicogni_user_id()
    # Set emp_aad_id variable to store emp aad id value
    emp_aad_id = resolve_employee_aad_id(clean)

    # Check if target condition is false or object is missing
    if not my_id or not emp_aad_id:
        # Return computed result or response payload to caller
        return None

    # Set token variable to store token value
    token = get_aicogni_access_token()
    # Set headers variable to store headers value
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Set chat_payload variable to store chat payload value
    chat_payload = {
        # Execute statement to process data and maintain state
        "chatType": "oneOnOne",
        # Execute statement to process data and maintain state
        "members": [
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                # Execute statement to process data and maintain state
                "roles": ["owner"],
                # Execute statement to process data and maintain state
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{my_id}')"
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                # Execute statement to process data and maintain state
                "roles": ["owner"],
                # Execute statement to process data and maintain state
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{emp_aad_id}')"
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        ]
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.post("https://graph.microsoft.com/v1.0/chats", headers=headers, json=chat_payload, timeout=12)
        # Evaluate condition to control execution branch
        if resp.status_code in [200, 201]:
            # Set chat_id variable to store chat id value
            chat_id = resp.json().get("id")
            # Execute statement to process data and maintain state
            _user_chat_cache[clean] = chat_id
            # Return computed result or response payload to caller
            return chat_id
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[AI Cogni] Failed to create chat with {clean}: {resp.status_code} {resp.text}")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Exception creating chat with {clean}: {e}")
    # Return computed result or response payload to caller
    return None


# Define send_aicogni_message function to handle send aicogni message
def send_aicogni_message(employee_email: str, html_content: str) -> bool:
    """Sends a rich HTML message to the employee's personal 1-on-1 Teams chat from AI Cogni."""
    chat_id = get_or_create_1on1_chat(employee_email)
    # Check if target condition is false or object is missing
    if not chat_id:
        # Return computed result or response payload to caller
        return False

    # Set token variable to store token value
    token = get_aicogni_access_token()
    # Set headers variable to store headers value
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Set msg_payload variable to store msg payload value
    msg_payload = {
        # Execute statement to process data and maintain state
        "body": {
            # Execute statement to process data and maintain state
            "contentType": "html",
            # Execute statement to process data and maintain state
            "content": html_content
        # Execute statement to process data and maintain state
        }
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set url variable to store url value
        url = f"https://graph.microsoft.com/v1.0/chats/{chat_id}/messages"
        # Set resp variable to store resp value
        resp = requests.post(url, headers=headers, json=msg_payload, timeout=12)
        # Evaluate condition to control execution branch
        if resp.status_code in [200, 201]:
            # Log informational message for system observability
            logger.info(f"[AI Cogni] Sent direct message to {employee_email}")
            # Return computed result or response payload to caller
            return True
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[AI Cogni] Failed to send message to {employee_email}: {resp.status_code} {resp.text}")
            # Return computed result or response payload to caller
            return False
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Exception sending message to {employee_email}: {e}")
        # Return computed result or response payload to caller
        return False


# ── Calendar & Exclusion Rules ──────────────────────────────────────────────

# Define is_fourth_saturday function to handle is fourth saturday
def is_fourth_saturday(d: date) -> bool:
    """Checks if date is the 4th Saturday of the month (always day 22 through 28)."""
    return d.weekday() == 5 and 22 <= d.day <= 28


# Define is_sunday function to handle is sunday
def is_sunday(d: date) -> bool:
    """Checks if date is Sunday (weekday 6)."""
    return d.weekday() == 6


# Define is_skip_day function to handle is skip day
def is_skip_day(today: date, db: Session) -> tuple[bool, str]:
    """
    Evaluates all corporate exclusion rules:
    - Sundays
    - 4th Saturday
    - Official company holidays
    """
    if is_sunday(today):
        # Return computed result or response payload to caller
        return True, "Sunday (Weekly Off)"

    # Evaluate condition to control execution branch
    if is_fourth_saturday(today):
        # Return computed result or response payload to caller
        return True, "4th Saturday (Company Holiday)"

    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        # Evaluate condition to control execution branch
        if holiday:
            # Set h_name variable to store h name value
            h_name = holiday.name or getattr(holiday, "title", "Company Holiday")
            # Return computed result or response payload to caller
            return True, f"Official Holiday: {h_name}"
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"[AI Cogni] Could not check holidays: {e}")

    # Return computed result or response payload to caller
    return False, ""


# Define normalize_code_set function to handle normalize code set
def normalize_code_set(codes) -> set:
    """Returns a set containing both with/without 'LE' prefix, space-free, and trimmed representations."""
    res = set()
    # Iterate through items in sequence loop
    for c in codes:
        # Check if target condition is false or object is missing
        if not c:
            # Skip to next iteration of active loop
            continue
        # Set cleaned variable to store cleaned value
        cleaned = str(c).strip().upper().replace(" ", "")
        # Invoke res.add to perform operational action
        res.add(cleaned)
        # Evaluate condition to control execution branch
        if cleaned.startswith("LE"):
            # Invoke res.add to perform operational action
            res.add(cleaned[2:])
        # Execute fallback branch when conditions are not met
        else:
            # Invoke res.add to perform operational action
            res.add(f"LE{cleaned}")
    # Return computed result or response payload to caller
    return res


# ── Scheduled Checks ────────────────────────────────────────────────────────

# Define run_aicogni_morning_punch_check function to handle run aicogni morning punch check
def run_aicogni_morning_punch_check() -> Dict[str, Any]:
    """
    Runs daily at 11:00 AM IST:
    1. Skips Sundays, 4th Saturday, official holidays.
    2. Identifies employees who have not punched in and are not on approved leave.
    3. AI Cogni personally direct-messages each missing employee on Teams.
    """
    today = date.today()
    # Log informational message for system observability
    logger.info(f"[AI Cogni] Running 11:00 AM Missing Punch-In Check for {today}...")

    # Define db schema field with type Session and default value
    db: Session = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Execute statement to process data and maintain state
        skip, reason = is_skip_day(today, db)
        # Evaluate condition to control execution branch
        if skip:
            # Log informational message for system observability
            logger.info(f"[AI Cogni] Skipping morning alert: {reason}")
            # Return computed result or response payload to caller
            return {"status": "skipped", "reason": reason}

        # 1. Approved leave exclusion
        approved_leaves = db.execute(text("""
            SELECT DISTINCT UPPER(emp_code) as code 
            FROM leave_requests 
            WHERE status ILIKE 'approved' 
              AND :today BETWEEN start_date AND end_date
        """), {"today": today}).fetchall()
        # Set on_leave_codes variable to store on leave codes value
        on_leave_codes = normalize_code_set([row[0] for row in approved_leaves if row[0]])

        # 2. Punched in today check
        tname = f"attendance_{today.year}_{today.month:02d}"
        # Set punched_in_codes variable to store punched in codes value
        punched_in_codes = set()
        # Begin guarded execution block to trap exceptions
        try:
            # Set punched_rows variable to store punched rows value
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
            # Set punched_in_codes variable to store punched in codes value
            punched_in_codes = normalize_code_set([r[0] for r in punched_rows if r[0]])
        # Catch and handle specific exception if raised
        except Exception as tbl_err:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"[AI Cogni] Attendance table error {tname}: {tbl_err}")

        # Check approved regularizations for today
        reg_tname = f"regularization_{today.year}_{today.month:02d}"
        # Begin guarded execution block to trap exceptions
        try:
            # Set reg_rows variable to store reg rows value
            reg_rows = db.execute(text(f"""
                SELECT DISTINCT UPPER(emp_code) 
                FROM {reg_tname} 
                WHERE date = :today AND status ILIKE 'approved'
            """), {"today": today}).fetchall()
            # Invoke punched_in_codes.update to perform operational action
            punched_in_codes.update(normalize_code_set([r[0] for r in reg_rows if r[0]]))
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # 3. Active employees (exclude inactive, resigned, terminated)
        all_profiles = db.query(Profile).filter(Profile.emp_code.isnot(None)).all()
        # Set active_employees variable to store active employees value
        active_employees = [
            # Execute statement to process data and maintain state
            emp for emp in all_profiles
            # Check if target condition is false or object is missing
            if not emp.employment_status or emp.employment_status.strip().lower() not in (
                # Execute statement to process data and maintain state
                "inactive", "terminated", "resigned", "archived", "disabled", "suspended", "relieved", "left"
            # Execute statement to process data and maintain state
            )
        # Execute statement to process data and maintain state
        ]

        # Set missing_employees variable to store missing employees value
        missing_employees = []
        # Iterate through items in sequence loop
        for emp in active_employees:
            # Set raw_code variable to store raw code value
            raw_code = (emp.emp_code or "").strip().upper()
            # Set code variable to store code value
            code = raw_code.replace(" ", "")
            # Set clean_num variable to store clean num value
            clean_num = code[2:] if code.startswith("LE") else code
            # Check if target condition is false or object is missing
            if not code or code in on_leave_codes or clean_num in on_leave_codes or code in punched_in_codes or clean_num in punched_in_codes:
                # Skip to next iteration of active loop
                continue

            # Set full_name variable to store full name value
            full_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or code
            # Set first_name variable to store first name value
            first_name = emp.first_name or full_name
            # Set email variable to store email value
            email = (emp.email or "").strip().lower()

            # Evaluate condition to control execution branch
            if email:
                # Execute statement to process data and maintain state
                missing_employees.append({
                    # Execute statement to process data and maintain state
                    "code": code,
                    # Execute statement to process data and maintain state
                    "first_name": first_name,
                    # Execute statement to process data and maintain state
                    "name": full_name,
                    # Execute statement to process data and maintain state
                    "email": email
                # Execute statement to process data and maintain state
                })

        # Log informational message for system observability
        logger.info(f"[AI Cogni] Found {len(missing_employees)} employees missing punch-in at 11:00 AM.")

        # Check if target condition is false or object is missing
        if not missing_employees:
            # Return computed result or response payload to caller
            return {"status": "success", "message": "All employees punched in or on leave.", "missing_count": 0}

        # Set date_str variable to store date str value
        date_str = today.strftime("%d %b %Y (%A)")
        # Set sent_count variable to store sent count value
        sent_count = 0
        # Set failed_count variable to store failed count value
        failed_count = 0

        # Iterate through items in sequence loop
        for emp in missing_employees:
            # Set html variable to store html value
            html = f"""
            <p style="font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #1e293b;">
                Hi <b>{emp['first_name']}</b>, you have not punched in today.
            </p>
            <p style="font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #1e293b;">
                Please punch in on the portal: <a href="{DEFAULT_HRMS_URL}/dashboard" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Open HRMS Portal</a>
            </p>
            """

            # Evaluate condition to control execution branch
            if send_aicogni_message(emp["email"], html):
                # Execute statement to process data and maintain state
                sent_count += 1
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                failed_count += 1
            time.sleep(1.0)  # Throttling to respect Azure Graph API rate limits (avoid 429 quota error)

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "completed",
            # Execute statement to process data and maintain state
            "date": str(today),
            # Execute statement to process data and maintain state
            "missing_count": len(missing_employees),
            # Execute statement to process data and maintain state
            "sent_count": sent_count,
            # Execute statement to process data and maintain state
            "failed_count": failed_count,
            # Execute statement to process data and maintain state
            "employees": [m["name"] for m in missing_employees]
        # Execute statement to process data and maintain state
        }

    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[AI Cogni] Error in morning punch check: {e}")
        # Return computed result or response payload to caller
        return {"status": "error", "error": str(e)}
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()


# Define run_aicogni_night_punchout_check function to handle dynamic 9-hour punchout check
def run_aicogni_night_punchout_check() -> Dict[str, Any]:
    """
    Dynamic 9-Hour Work Completion Check (runs periodically, e.g. every 10 mins):
    1. Skips Sundays, 4th Saturday, official holidays.
    2. Identifies employees who punched in today, have NOT punched out,
       and have completed at least 9 hours from their punch-in time.
    3. Sends exactly ONE 1-on-1 Teams message per employee per day via ERA (hrms@laesfera.co).
    """
    global _sent_9hr_reminders
    today = date.today()
    now = datetime.now()
    nine_hours_ago = now - timedelta(hours=9)
    today_prefix = str(today)

    # Prune previous days from the deduplication set
    _sent_9hr_reminders = {k for k in _sent_9hr_reminders if k.startswith(today_prefix)}

    logger.info(f"[ERA] Running Dynamic 9-Hour Punch-Out Check for {today} at {now.strftime('%I:%M %p')}...")

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
                LEFT JOIN profile_master p ON (
                    UPPER(REPLACE(TRIM(p.emp_code), ' ', '')) = UPPER(REPLACE(TRIM(a.emp_code), ' ', ''))
                    OR REPLACE(UPPER(REPLACE(TRIM(p.emp_code), ' ', '')), 'LE', '') = REPLACE(UPPER(REPLACE(TRIM(a.emp_code), ' ', '')), 'LE', '')
                )
                WHERE a.date = :today 
                  AND a.punch_in_time IS NOT NULL 
                  AND a.punch_out_time IS NULL
                  AND a.punch_in_time <= :cutoff
                  AND (a.status IS NULL OR (LOWER(a.status) NOT LIKE '%leave%' AND LOWER(a.status) NOT LIKE '%absent%'))
                  AND (p.employment_status IS NULL OR LOWER(p.employment_status) NOT IN ('inactive', 'terminated', 'resigned', 'archived', 'disabled', 'suspended', 'relieved', 'left'))
                ORDER BY a.punch_in_time ASC
            """), {"today": today, "cutoff": nine_hours_ago}).mappings().all()

            for r in rows:
                code = (r.get("emp_code") or "").strip().upper()
                cache_key = f"{today_prefix}:{code}"
                if cache_key in _sent_9hr_reminders:
                    continue

                full_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or code
                first_name = r.get('first_name') or full_name
                email = (r.get("email") or "").strip().lower()
                in_time_val = r.get("punch_in_time")

                if isinstance(in_time_val, datetime):
                    in_time_display = in_time_val.strftime("%I:%M %p")
                else:
                    in_time_display = str(in_time_val)[11:16] if " " in str(in_time_val) else str(in_time_val)

                if email:
                    missing_punchouts.append({
                        "code": code,
                        "cache_key": cache_key,
                        "first_name": first_name,
                        "name": full_name,
                        "punch_in_display": in_time_display,
                        "email": email
                    })
        except Exception as tbl_err:
            logger.warning(f"[ERA] Error querying 9-hour punchouts {tname}: {tbl_err}")

        logger.info(f"[ERA] Found {len(missing_punchouts)} employees ready for 9-hour punch-out reminder.")

        if not missing_punchouts:
            return {"status": "success", "message": "No new employees completed 9 hours without punch-out.", "count": 0}

        sent_count = 0
        failed_count = 0

        for emp in missing_punchouts:
            html = f"""
            <p style="font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #1e293b;">
                Hi <b>{emp['first_name']}</b>, you have completed your <b>9 hours of work today</b> (punched in at <b>{emp['punch_in_display']}</b>).
            </p>
            <p style="font-family: Segoe UI, Arial, sans-serif; font-size: 14px; color: #1e293b;">
                Please remember to punch out on the portal: <a href="{DEFAULT_HRMS_URL}/dashboard" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Open HRMS Portal</a>
            </p>
            """

            if send_aicogni_message(emp["email"], html):
                _sent_9hr_reminders.add(emp["cache_key"])
                sent_count += 1
            else:
                failed_count += 1
            time.sleep(1.0)  # Throttling to respect Azure Graph API rate limits

        return {
            "status": "completed",
            "date": str(today),
            "missing_count": len(missing_punchouts),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "employees": [m["name"] for m in missing_punchouts]
        }

    except Exception as e:
        logger.error(f"[ERA] Error in 9-hour punchout check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


# Backward-compatibility alias
run_aicogni_9hr_punchout_check = run_aicogni_night_punchout_check
