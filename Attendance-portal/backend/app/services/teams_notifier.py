# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEAMS NOTIFIER SERVICE (teams_notifier.py)
# Path: Attendance-portal/backend/app/services/teams_notifier.py
# Purpose: Automated Microsoft Teams 1-on-1 Bot & Channel notification engine:
#          • 11:00 AM: Missing punch-in private alert to each employee (skips Sundays, holidays, approved leaves).
#          • 8:00 PM: Missing punch-out private alert to each employee (clocked in without clocking out).
# ==============================================================================

# Import module os for system functionality
import os
# Import module time for system functionality
import time
# Import module logging for system functionality
import logging
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import List, Dict, Any, Optional from typing for module operations
from typing import List, Dict, Any, Optional
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
logger = logging.getLogger("teams_notifier")

# Set DEFAULT_HRMS_URL variable to store DEFAULT HRMS URL value
DEFAULT_HRMS_URL = "https://la-esfera-hrms.vercel.app"

# ── Microsoft Credentials & Tokens ──────────────────────────────────────────
_bot_token = None
# Set _bot_token_expires_at variable to store  bot token expires at value
_bot_token_expires_at = datetime.min

# Set _graph_token variable to store  graph token value
_graph_token = None
# Set _graph_token_expires_at variable to store  graph token expires at value
_graph_token_expires_at = datetime.min

# Cache email -> AAD Object ID to minimize API lookups
_email_to_aad_cache: Dict[str, str] = {}


# Define get_tenant_id function to handle get tenant id
def get_tenant_id() -> str:
    # Return computed result or response payload to caller
    return os.getenv("TENANT_ID") or os.getenv("OUTLOOK_TENANT_ID") or "b292bf8e-4b06-4865-b248-a1d099b8c151"


# Define get_bot_credentials function to handle get bot credentials
def get_bot_credentials() -> tuple[str, str]:
    # Set app_id variable to store app id value
    app_id = os.getenv("BOT_APP_ID", "").strip()
    # Set app_secret variable to store app secret value
    app_secret = os.getenv("BOT_APP_PASSWORD", "").strip()
    # Return computed result or response payload to caller
    return app_id, app_secret


# Define get_graph_credentials function to handle get graph credentials
def get_graph_credentials() -> tuple[str, str]:
    # Set client_id variable to store client id value
    client_id = os.getenv("CLIENT_ID") or os.getenv("OUTLOOK_CLIENT_ID", "").strip()
    # Set client_secret variable to store client secret value
    client_secret = os.getenv("CLIENT_SECRET") or os.getenv("OUTLOOK_CLIENT_SECRET", "").strip()
    # Return computed result or response payload to caller
    return client_id, client_secret


# Define get_bot_token function to handle get bot token
def get_bot_token() -> Optional[str]:
    """Obtains and caches Bot Framework OAuth2 token for single-tenant bot."""
    global _bot_token, _bot_token_expires_at
    # Evaluate condition to control execution branch
    if _bot_token and datetime.utcnow() < _bot_token_expires_at:
        # Return computed result or response payload to caller
        return _bot_token

    # Set tenant_id variable to store tenant id value
    tenant_id = get_tenant_id()
    # Execute statement to process data and maintain state
    app_id, app_secret = get_bot_credentials()

    # Set url variable to store url value
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    # Set data variable to store data value
    data = {
        # Execute statement to process data and maintain state
        "grant_type": "client_credentials",
        # Execute statement to process data and maintain state
        "client_id": app_id,
        # Execute statement to process data and maintain state
        "client_secret": app_secret,
        # Execute statement to process data and maintain state
        "scope": "https://api.botframework.com/.default"
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.post(url, data=data, timeout=10)
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set _bot_token variable to store  bot token value
            _bot_token = resp.json().get("access_token")
            # Set _bot_token_expires_at variable to store  bot token expires at value
            _bot_token_expires_at = datetime.utcnow() + timedelta(minutes=50)
            # Return computed result or response payload to caller
            return _bot_token
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[Teams Bot] Failed to get bot token: {resp.text}")
            # Return computed result or response payload to caller
            return None
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Bot] Exception getting bot token: {e}")
        # Return computed result or response payload to caller
        return None


# Define get_graph_token function to handle get graph token
def get_graph_token() -> Optional[str]:
    """Obtains and caches Microsoft Graph token for user lookups."""
    global _graph_token, _graph_token_expires_at
    # Evaluate condition to control execution branch
    if _graph_token and datetime.utcnow() < _graph_token_expires_at:
        # Return computed result or response payload to caller
        return _graph_token

    # Set tenant_id variable to store tenant id value
    tenant_id = get_tenant_id()
    # Execute statement to process data and maintain state
    client_id, client_secret = get_graph_credentials()

    # Set url variable to store url value
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    # Set data variable to store data value
    data = {
        # Execute statement to process data and maintain state
        "grant_type": "client_credentials",
        # Execute statement to process data and maintain state
        "client_id": client_id,
        # Execute statement to process data and maintain state
        "client_secret": client_secret,
        # Execute statement to process data and maintain state
        "scope": "https://graph.microsoft.com/.default"
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.post(url, data=data, timeout=10)
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set _graph_token variable to store  graph token value
            _graph_token = resp.json().get("access_token")
            # Set _graph_token_expires_at variable to store  graph token expires at value
            _graph_token_expires_at = datetime.utcnow() + timedelta(minutes=50)
            # Return computed result or response payload to caller
            return _graph_token
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[Teams Graph] Failed to get graph token: {resp.text}")
            # Return computed result or response payload to caller
            return None
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Graph] Exception getting graph token: {e}")
        # Return computed result or response payload to caller
        return None


# Define resolve_user_aad_id function to handle resolve user aad id
def resolve_user_aad_id(email: str) -> Optional[str]:
    """Looks up user's Azure AD Object ID by corporate email."""
    if not email:
        # Return computed result or response payload to caller
        return None

    # Set clean_email variable to store clean email value
    clean_email = email.strip().lower()
    # Evaluate condition to control execution branch
    if clean_email in _email_to_aad_cache:
        # Return computed result or response payload to caller
        return _email_to_aad_cache[clean_email]

    # Set graph_token variable to store graph token value
    graph_token = get_graph_token()
    # Check if target condition is false or object is missing
    if not graph_token:
        # Return computed result or response payload to caller
        return None

    # Set url variable to store url value
    url = f"https://graph.microsoft.com/v1.0/users/{clean_email}?$select=id,mail,displayName"
    # Set headers variable to store headers value
    headers = {"Authorization": f"Bearer {graph_token}"}

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.get(url, headers=headers, timeout=10)
        # Evaluate condition to control execution branch
        if resp.status_code == 200:
            # Set aad_id variable to store aad id value
            aad_id = resp.json().get("id")
            # Evaluate condition to control execution branch
            if aad_id:
                # Execute statement to process data and maintain state
                _email_to_aad_cache[clean_email] = aad_id
                # Return computed result or response payload to caller
                return aad_id
        # Execute fallback branch when conditions are not met
        else:
            # Log debug trace message for development diagnostics
            logger.debug(f"[Teams Graph] User not found by email '{clean_email}': {resp.status_code}")
            # Return computed result or response payload to caller
            return None
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Graph] Exception resolving user {clean_email}: {e}")
        # Return computed result or response payload to caller
        return None


# ── 1-on-1 Bot Message Dispatcher ───────────────────────────────────────────

# Define send_bot_direct_message function to handle send bot direct message
def send_bot_direct_message(
    # Define user_aad_id schema field with type str,
    user_aad_id: str,
    # Define title schema field with type str,
    title: str,
    # Define message schema field with type str,
    message: str,
    # Define facts schema field with type Optional[List[Dict[str, str]]] and default value
    facts: Optional[List[Dict[str, str]]] = None,
    # Define action_title schema field with type str and default value
    action_title: str = "Open HRMS Portal",
    # Define action_url schema field with type str and default value
    action_url: str = f"{DEFAULT_HRMS_URL}/dashboard",
    # Define color schema field with type str and default value
    color: str = "Accent"
# Execute statement to process data and maintain state
) -> bool:
    """
    Sends a private 1-on-1 Adaptive Card directly to an employee's Teams chat via Quickchex HR Bot.
    """
    token = get_bot_token()
    # Check if target condition is false or object is missing
    if not token:
        # Log error message with failure diagnostic details
        logger.error("[Teams Bot] Cannot send 1-on-1 message: Bot token unavailable.")
        # Return computed result or response payload to caller
        return False

    # Execute statement to process data and maintain state
    app_id, _ = get_bot_credentials()
    # Set tenant_id variable to store tenant id value
    tenant_id = get_tenant_id()
    # Set service_url variable to store service url value
    service_url = "https://smba.trafficmanager.net/in/"

    # Set headers variable to store headers value
    headers = {
        # Execute statement to process data and maintain state
        "Authorization": f"Bearer {token}",
        # Execute statement to process data and maintain state
        "Content-Type": "application/json"
    # Execute statement to process data and maintain state
    }

    # 1. Create or retrieve the 1-on-1 personal conversation with this user
    conv_payload = {
        # Execute statement to process data and maintain state
        "bot": {"id": app_id, "name": "Quickchex HR Bot"},
        # Execute statement to process data and maintain state
        "isGroup": False,
        # Execute statement to process data and maintain state
        "members": [{"id": user_aad_id}],
        # Execute statement to process data and maintain state
        "tenantId": tenant_id
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set conv_resp variable to store conv resp value
        conv_resp = requests.post(f"{service_url}v3/conversations", headers=headers, json=conv_payload, timeout=10)
        # Check if target condition is false or object is missing
        if conv_resp.status_code not in [200, 201]:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"[Teams Bot] Failed to create conversation for user {user_aad_id}: {conv_resp.status_code} {conv_resp.text}")
            # Return computed result or response payload to caller
            return False

        # Set conv_id variable to store conv id value
        conv_id = conv_resp.json().get("id")
        # Check if target condition is false or object is missing
        if not conv_id:
            # Return computed result or response payload to caller
            return False

        # 2. Build the Adaptive Card
        body_elements = [
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "type": "TextBlock",
                # Execute statement to process data and maintain state
                "text": title,
                # Execute statement to process data and maintain state
                "weight": "Bolder",
                # Execute statement to process data and maintain state
                "size": "Large",
                # Execute statement to process data and maintain state
                "color": color
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "type": "TextBlock",
                # Execute statement to process data and maintain state
                "text": message,
                # Execute statement to process data and maintain state
                "wrap": True,
                # Execute statement to process data and maintain state
                "spacing": "Medium"
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        ]

        # Evaluate condition to control execution branch
        if facts:
            # Execute statement to process data and maintain state
            body_elements.append({
                # Execute statement to process data and maintain state
                "type": "FactSet",
                # Execute statement to process data and maintain state
                "facts": facts,
                # Execute statement to process data and maintain state
                "spacing": "Medium"
            # Execute statement to process data and maintain state
            })

        # Set card_payload variable to store card payload value
        card_payload = {
            # Execute statement to process data and maintain state
            "type": "message",
            # Execute statement to process data and maintain state
            "attachments": [
                # Execute statement to process data and maintain state
                {
                    # Execute statement to process data and maintain state
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    # Execute statement to process data and maintain state
                    "content": {
                        # Execute statement to process data and maintain state
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        # Execute statement to process data and maintain state
                        "type": "AdaptiveCard",
                        # Execute statement to process data and maintain state
                        "version": "1.4",
                        # Execute statement to process data and maintain state
                        "body": body_elements,
                        # Execute statement to process data and maintain state
                        "actions": [
                            # Execute statement to process data and maintain state
                            {
                                # Execute statement to process data and maintain state
                                "type": "Action.OpenUrl",
                                # Execute statement to process data and maintain state
                                "title": action_title,
                                # Execute statement to process data and maintain state
                                "url": action_url
                            # Execute statement to process data and maintain state
                            }
                        # Execute statement to process data and maintain state
                        ]
                    # Execute statement to process data and maintain state
                    }
                # Execute statement to process data and maintain state
                }
            # Execute statement to process data and maintain state
            ]
        # Execute statement to process data and maintain state
        }

        # 3. Post activity to conversation
        msg_resp = requests.post(f"{service_url}v3/conversations/{conv_id}/activities", headers=headers, json=card_payload, timeout=10)
        # Evaluate condition to control execution branch
        if msg_resp.status_code in [200, 201]:
            # Log informational message for system observability
            logger.info(f"[Teams Bot] Successfully delivered 1-on-1 alert to user {user_aad_id}.")
            # Return computed result or response payload to caller
            return True
        # Execute fallback branch when conditions are not met
        else:
            # Log error message with failure diagnostic details
            logger.error(f"[Teams Bot] Failed to post activity: {msg_resp.status_code} {msg_resp.text}")
            # Return computed result or response payload to caller
            return False

    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Bot] Exception sending direct message to {user_aad_id}: {e}")
        # Return computed result or response payload to caller
        return False


# ── Channel Webhook Dispatcher (Optional Backup) ─────────────────────────────

# Define get_teams_webhook_url function to handle get teams webhook url
def get_teams_webhook_url() -> str:
    # Set url variable to store url value
    url = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
    # Check if target condition is false or object is missing
    if not url:
        # Begin guarded execution block to trap exceptions
        try:
            # Import load_dotenv from dotenv for module operations
            from dotenv import load_dotenv
            # Invoke load_dotenv to perform operational action
            load_dotenv()
            # Set url variable to store url value
            url = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return url


# Define send_teams_adaptive_card function to handle send teams adaptive card
def send_teams_adaptive_card(
    # Define title schema field with type str,
    title: str,
    # Define subtitle schema field with type str,
    subtitle: str,
    # Define facts schema field with type List[Dict[str, str]],
    facts: List[Dict[str, str]],
    # Define detail_bullets schema field with type Optional[List[str]] and default value
    detail_bullets: Optional[List[str]] = None,
    # Define action_title schema field with type str and default value
    action_title: str = "Open HRMS Portal",
    # Define action_url schema field with type str and default value
    action_url: str = f"{DEFAULT_HRMS_URL}/dashboard",
    # Define color schema field with type str and default value
    color: str = "Accent"
# Execute statement to process data and maintain state
) -> bool:
    """Optional channel webhook sender for team visibility."""
    webhook_url = get_teams_webhook_url()
    # Check if target condition is false or object is missing
    if not webhook_url:
        # Return computed result or response payload to caller
        return False

    # Set body_elements variable to store body elements value
    body_elements = [
        # Execute statement to process data and maintain state
        {"type": "TextBlock", "text": title, "weight": "Bolder", "size": "Large", "color": color},
        # Execute statement to process data and maintain state
        {"type": "TextBlock", "text": subtitle, "wrap": True, "spacing": "Small", "isSubtle": True}
    # Execute statement to process data and maintain state
    ]
    # Evaluate condition to control execution branch
    if facts:
        # Invoke body_elements.append to perform operational action
        body_elements.append({"type": "FactSet", "facts": facts, "spacing": "Medium"})
    # Evaluate condition to control execution branch
    if detail_bullets:
        # Set bullet_text variable to store bullet text value
        bullet_text = "\n\n".join(detail_bullets[:25])
        # Evaluate condition to control execution branch
        if len(detail_bullets) > 25:
            # Execute statement to process data and maintain state
            bullet_text += f"\n\n*... and {len(detail_bullets) - 25} more.*"
        # Invoke body_elements.append to perform operational action
        body_elements.append({"type": "TextBlock", "text": bullet_text, "wrap": True, "spacing": "Medium"})

    # Set card_payload variable to store card payload value
    card_payload = {
        # Execute statement to process data and maintain state
        "type": "message",
        # Execute statement to process data and maintain state
        "attachments": [{
            # Execute statement to process data and maintain state
            "contentType": "application/vnd.microsoft.card.adaptive",
            # Execute statement to process data and maintain state
            "content": {
                # Execute statement to process data and maintain state
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                # Execute statement to process data and maintain state
                "type": "AdaptiveCard",
                # Execute statement to process data and maintain state
                "version": "1.4",
                # Execute statement to process data and maintain state
                "body": body_elements,
                # Execute statement to process data and maintain state
                "actions": [{"type": "Action.OpenUrl", "title": action_title, "url": action_url}]
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        }]
    # Execute statement to process data and maintain state
    }

    # Begin guarded execution block to trap exceptions
    try:
        # Set resp variable to store resp value
        resp = requests.post(webhook_url, json=card_payload, timeout=12)
        # Return computed result or response payload to caller
        return resp.status_code in [200, 201, 202]
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return False


# Define normalize_code_set function to handle normalize code set
def normalize_code_set(codes) -> set:
    """Returns a set containing both with/without 'LE' prefix and trimmed representations."""
    res = set()
    # Iterate through items in sequence loop
    for c in codes:
        # Check if target condition is false or object is missing
        if not c:
            # Skip to next iteration of active loop
            continue
        # Set cleaned variable to store cleaned value
        cleaned = str(c).strip().upper()
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


# ── Scheduled Attendance Checkers ───────────────────────────────────────────

# Define run_morning_missing_punch_check function to handle run morning missing punch check
def run_morning_missing_punch_check() -> Dict[str, Any]:
    """
    Runs daily at 11:00 AM IST:
    1. Skips if today is Sunday or an official Holiday.
    2. Identifies all active employees who:
       - Are NOT on approved leave today.
       - Have NOT punched in today.
    3. Dispatches a PRIVATE 1-on-1 Teams message to each missing employee.
    """
    today = date.today()
    # Log informational message for system observability
    logger.info(f"[Teams Notifier] Running 11:00 AM Missing Punch-In Check for {today}...")

    # 1. Skip on Sundays
    if today.weekday() == 6:
        # Log informational message for system observability
        logger.info("[Teams Notifier] Today is Sunday. Skipping attendance alert.")
        # Return computed result or response payload to caller
        return {"status": "skipped", "reason": "Sunday (Weekly Off)"}

    # Define db schema field with type Session and default value
    db: Session = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # 2. Skip on Official Company Holidays
        holiday = None
        # Begin guarded execution block to trap exceptions
        try:
            # Initiate database query on specified model
            holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        # Catch and handle specific exception if raised
        except Exception:
            # Set holiday variable to store holiday value
            holiday = None
        # Evaluate condition to control execution branch
        if holiday:
            # Set h_name variable to store h name value
            h_name = holiday.name or holiday.title or "Public Holiday"
            # Log informational message for system observability
            logger.info(f"[Teams Notifier] Today is an official holiday ({h_name}). Skipping attendance alert.")
            # Return computed result or response payload to caller
            return {"status": "skipped", "reason": f"Company Holiday: {h_name}"}

        # 3. Get employees currently on approved leave today
        approved_leaves = db.execute(text("""
            SELECT DISTINCT UPPER(emp_code) as code 
            FROM leave_requests 
            WHERE status ILIKE 'approved' 
              AND :today BETWEEN start_date AND end_date
        """), {"today": today}).fetchall()
        # Set on_leave_codes variable to store on leave codes value
        on_leave_codes = normalize_code_set([row[0] for row in approved_leaves if row[0]])

        # 4. Check today's attendance partition table
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
            logger.warning(f"[Teams Notifier] Could not query attendance table {tname}: {tbl_err}")

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

        # 5. Get all active company employees
        active_employees = db.query(Profile).filter(Profile.emp_code.isnot(None)).all()

        # Set missing_employees variable to store missing employees value
        missing_employees = []
        # Iterate through items in sequence loop
        for emp in active_employees:
            # Set code variable to store code value
            code = (emp.emp_code or "").strip().upper()
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
            # Set dept variable to store dept value
            dept = emp.department or "Operations"
            # Set mgr variable to store mgr value
            mgr = emp.reporting_supervisor or "Team Lead"
            # Set email variable to store email value
            email = (emp.email or "").strip().lower()

            # Execute statement to process data and maintain state
            missing_employees.append({
                # Execute statement to process data and maintain state
                "code": code,
                # Execute statement to process data and maintain state
                "first_name": first_name,
                # Execute statement to process data and maintain state
                "name": full_name,
                # Execute statement to process data and maintain state
                "dept": dept,
                # Execute statement to process data and maintain state
                "manager": mgr,
                # Execute statement to process data and maintain state
                "email": email
            # Execute statement to process data and maintain state
            })

        # Log informational message for system observability
        logger.info(f"[Teams Notifier] Morning Check: {len(missing_employees)} employees missing punch-in.")

        # Check if target condition is false or object is missing
        if not missing_employees:
            # Log informational message for system observability
            logger.info("[Teams Notifier] 100% attendance achieved! No alerts needed.")
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "status": "success",
                # Execute statement to process data and maintain state
                "message": "All active employees are punched in or on approved leave.",
                # Execute statement to process data and maintain state
                "missing_count": 0
            # Execute statement to process data and maintain state
            }

        # Set date_str variable to store date str value
        date_str = today.strftime("%d %b %Y (%A)")
        # Set sent_count variable to store sent count value
        sent_count = 0
        # Set failed_count variable to store failed count value
        failed_count = 0

        # 6. Send PRIVATE 1-on-1 alert to each employee
        for emp in missing_employees:
            # Set email variable to store email value
            email = emp["email"]
            # Set aad_id variable to store aad id value
            aad_id = resolve_user_aad_id(email) if email else None

            # Check if target condition is false or object is missing
            if not aad_id:
                # Log warning message for non-fatal unexpected condition
                logger.warning(f"[Teams Notifier] No Azure AD match for {emp['name']} ({email}).")
                # Execute statement to process data and maintain state
                failed_count += 1
                # Skip to next iteration of active loop
                continue

            # Set title variable to store title value
            title = "⏰ Attendance Reminder: Missing Punch-In"
            # Set message variable to store message value
            message = (
                # Execute statement to process data and maintain state
                f"Hi **{emp['first_name']}**, our system noticed that you haven't punched in today (**{date_str}**).\n\n"
                f"If you are working today, please clock in on the portal to avoid your attendance being marked as absent."
            # Execute statement to process data and maintain state
            )
            # Set facts variable to store facts value
            facts = [
                # Execute statement to process data and maintain state
                {"title": "Employee:", "value": f"{emp['name']} ({emp['code']})"},
                # Execute statement to process data and maintain state
                {"title": "Department:", "value": emp["dept"]},
                # Execute statement to process data and maintain state
                {"title": "Status:", "value": "Missing Punch-In ⚠️"},
                # Execute statement to process data and maintain state
                {"title": "Shift Timing:", "value": "10:00 AM – 7:00 PM"}
            # Execute statement to process data and maintain state
            ]

            # Set delivered variable to store delivered value
            delivered = send_bot_direct_message(
                # Set user_aad_id variable to store user aad id value
                user_aad_id=aad_id,
                # Set title variable to store title value
                title=title,
                # Set message variable to store message value
                message=message,
                # Set facts variable to store facts value
                facts=facts,
                # Set action_title variable to store action title value
                action_title="🚀 Clock In on HRMS",
                # Set action_url variable to store action url value
                action_url=f"{DEFAULT_HRMS_URL}/dashboard",
                # Set color variable to store color value
                color="Attention"
            # Execute statement to process data and maintain state
            )

            # Evaluate condition to control execution branch
            if delivered:
                # Execute statement to process data and maintain state
                sent_count += 1
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                failed_count += 1
            time.sleep(1.0)  # Throttling to respect Azure Graph API rate limits (avoid 429 quota error)

        # Log informational message for system observability
        logger.info(f"[Teams Notifier] 1-on-1 Morning Alerts completed: {sent_count} sent, {failed_count} failed.")

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
            "missing_employees": [m["name"] for m in missing_employees]
        # Execute statement to process data and maintain state
        }

    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Notifier] Error in run_morning_missing_punch_check: {e}")
        # Return computed result or response payload to caller
        return {"status": "error", "error": str(e)}
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()


# Define run_night_missing_punchout_check function to handle run night missing punchout check
def run_night_missing_punchout_check() -> Dict[str, Any]:
    """
    Runs daily at 8:00 PM IST (20:00):
    1. Skips if today is Sunday or an official Holiday.
    2. Identifies all employees who punched in today, but never punched out.
    3. Dispatches a PRIVATE 1-on-1 Teams message to each employee reminding them to clock out.
    """
    today = date.today()
    # Log informational message for system observability
    logger.info(f"[Teams Notifier] Running 8:00 PM Missing Punch-Out Check for {today}...")

    # Skip on Sundays
    if today.weekday() == 6:
        # Return computed result or response payload to caller
        return {"status": "skipped", "reason": "Sunday"}

    # Define db schema field with type Session and default value
    db: Session = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Skip on holidays
        holiday = None
        # Begin guarded execution block to trap exceptions
        try:
            # Initiate database query on specified model
            holiday = db.query(Holiday).filter(Holiday.holiday_date == today).first()
        # Catch and handle specific exception if raised
        except Exception:
            # Set holiday variable to store holiday value
            holiday = None
        # Evaluate condition to control execution branch
        if holiday:
            # Return computed result or response payload to caller
            return {"status": "skipped", "reason": "Company Holiday"}

        # Set tname variable to store tname value
        tname = f"attendance_{today.year}_{today.month:02d}"
        # Set missing_punchouts variable to store missing punchouts value
        missing_punchouts = []
        # Begin guarded execution block to trap exceptions
        try:
            # Set rows variable to store rows value
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

            # Iterate through items in sequence loop
            for r in rows:
                # Set code variable to store code value
                code = r.get("emp_code")
                # Set full_name variable to store full name value
                full_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or code
                # Set first_name variable to store first name value
                first_name = r.get('first_name') or full_name
                # Set in_time variable to store in time value
                in_time = str(r.get("punch_in_time") or "—")
                # Set email variable to store email value
                email = (r.get("email") or "").strip().lower()

                # Execute statement to process data and maintain state
                missing_punchouts.append({
                    # Execute statement to process data and maintain state
                    "code": code,
                    # Execute statement to process data and maintain state
                    "first_name": first_name,
                    # Execute statement to process data and maintain state
                    "name": full_name,
                    # Execute statement to process data and maintain state
                    "punch_in": in_time,
                    # Execute statement to process data and maintain state
                    "dept": r.get("department") or "Operations",
                    # Execute statement to process data and maintain state
                    "email": email
                # Execute statement to process data and maintain state
                })
        # Catch and handle specific exception if raised
        except Exception as tbl_err:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"[Teams Notifier] Error querying missing punchouts: {tbl_err}")

        # Log informational message for system observability
        logger.info(f"[Teams Notifier] Night Check: {len(missing_punchouts)} employees clocked in without punch-out.")

        # Check if target condition is false or object is missing
        if not missing_punchouts:
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "status": "success",
                # Execute statement to process data and maintain state
                "message": "All employees who clocked in today have punched out successfully.",
                # Execute statement to process data and maintain state
                "count": 0
            # Execute statement to process data and maintain state
            }

        # Set date_str variable to store date str value
        date_str = today.strftime("%d %b %Y (%A)")
        # Set sent_count variable to store sent count value
        sent_count = 0
        # Set failed_count variable to store failed count value
        failed_count = 0

        # Send private 1-on-1 alert to each employee
        for emp in missing_punchouts:
            # Set email variable to store email value
            email = emp["email"]
            # Set aad_id variable to store aad id value
            aad_id = resolve_user_aad_id(email) if email else None

            # Check if target condition is false or object is missing
            if not aad_id:
                # Execute statement to process data and maintain state
                failed_count += 1
                # Skip to next iteration of active loop
                continue

            # Set title variable to store title value
            title = "🌙 Attendance Alert: Missing Punch-Out"
            # Set message variable to store message value
            message = (
                # Execute statement to process data and maintain state
                f"Hi **{emp['first_name']}**, you clocked in today at **{emp['punch_in']}** but haven't clocked out yet.\n\n"
                f"Please punch out on the portal before ending your day, or submit an attendance regularization tomorrow."
            # Execute statement to process data and maintain state
            )
            # Set facts variable to store facts value
            facts = [
                # Execute statement to process data and maintain state
                {"title": "Employee:", "value": f"{emp['name']} ({emp['code']})"},
                # Execute statement to process data and maintain state
                {"title": "Clock-In Time:", "value": emp["punch_in"]},
                # Execute statement to process data and maintain state
                {"title": "Status:", "value": "Missing Punch-Out ⚠️"}
            # Execute statement to process data and maintain state
            ]

            # Set delivered variable to store delivered value
            delivered = send_bot_direct_message(
                # Set user_aad_id variable to store user aad id value
                user_aad_id=aad_id,
                # Set title variable to store title value
                title=title,
                # Set message variable to store message value
                message=message,
                # Set facts variable to store facts value
                facts=facts,
                # Set action_title variable to store action title value
                action_title="🚪 Clock Out on HRMS",
                # Set action_url variable to store action url value
                action_url=f"{DEFAULT_HRMS_URL}/dashboard",
                # Set color variable to store color value
                color="Warning"
            # Execute statement to process data and maintain state
            )

            # Evaluate condition to control execution branch
            if delivered:
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
            "missing_punchout_count": len(missing_punchouts),
            # Execute statement to process data and maintain state
            "sent_count": sent_count,
            # Execute statement to process data and maintain state
            "failed_count": failed_count,
            # Execute statement to process data and maintain state
            "employees": [m["name"] for m in missing_punchouts]
        # Execute statement to process data and maintain state
        }

    # Catch and handle specific exception if raised
    except Exception as e:
        # Log error message with failure diagnostic details
        logger.error(f"[Teams Notifier] Error in run_night_missing_punchout_check: {e}")
        # Return computed result or response payload to caller
        return {"status": "error", "error": str(e)}
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()
