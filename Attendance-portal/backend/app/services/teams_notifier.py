# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEAMS NOTIFIER SERVICE (teams_notifier.py)
# Path: Attendance-portal/backend/app/services/teams_notifier.py
# Purpose: Automated Microsoft Teams notification engine for daily attendance:
#          • 11:45 AM: Missing punch-in check (skips Sundays, holidays, approved leaves).
#          • 11:00 PM: Missing punch-out check (employees clocked in but didn't clock out).
# ==============================================================================

import os
import logging
from datetime import date, datetime
from typing import List, Dict, Any, Optional
import requests
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.profile_model import Profile
from app.models.leave import Holiday, LeaveRequest

logger = logging.getLogger("teams_notifier")

TEAMS_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
DEFAULT_HRMS_URL = "https://la-esfera-hrms.vercel.app"

def get_teams_webhook_url() -> str:
    url = os.getenv("TEAMS_WEBHOOK_URL", "").strip()
    if not url:
        # Check from backend .env directly
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
    action_url: str = "https://la-esfera-hrms.vercel.app/dashboard",
    color: str = "Accent"
) -> bool:
    """
    Sends a high-fidelity Microsoft Teams Adaptive Card via Power Automate Webhook.
    """
    webhook_url = get_teams_webhook_url()
    if not webhook_url:
        logger.warning("[Teams Notifier] TEAMS_WEBHOOK_URL is not configured in .env. Skipping alert.")
        return False

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
            "text": subtitle,
            "wrap": True,
            "spacing": "Small",
            "isSubtle": True
        }
    ]

    if facts:
        body_elements.append({
            "type": "FactSet",
            "facts": facts,
            "spacing": "Medium"
        })

    if detail_bullets:
        bullet_text = "\n\n".join(detail_bullets[:25])  # Cap at 25 for card readability
        if len(detail_bullets) > 25:
            bullet_text += f"\n\n*... and {len(detail_bullets) - 25} more.*"

        body_elements.append({
            "type": "TextBlock",
            "text": bullet_text,
            "wrap": True,
            "spacing": "Medium"
        })

    card_payload = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "contentUrl": None,
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

    try:
        resp = requests.post(webhook_url, json=card_payload, timeout=12)
        if resp.status_code in [200, 201, 202]:
            logger.info(f"[Teams Notifier] Successfully sent Teams alert: {title}")
            return True
        else:
            logger.error(f"[Teams Notifier] Teams Webhook returned status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        logger.error(f"[Teams Notifier] Exception posting to Teams webhook: {e}")
        return False


def run_morning_missing_punch_check() -> Dict[str, Any]:
    """
    Runs daily at 11:45 AM IST:
    1. Skips if today is Sunday or an official Holiday.
    2. Identifies all active employees who:
       - Are NOT on approved leave today.
       - Have NOT punched in today.
    3. Dispatches a high-priority Microsoft Teams reminder card.
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
        on_leave_codes = {row[0] for row in approved_leaves if row[0]}

        # 4. Check today's attendance partition table
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
            logger.warning(f"[Teams Notifier] Could not query attendance table {tname}: {tbl_err}")

        # 5. Get all active company employees
        active_employees = db.query(Profile).filter(
            Profile.emp_code.isnot(None)
        ).all()

        missing_employees = []
        for emp in active_employees:
            code = (emp.emp_code or "").strip().upper()
            if not code:
                continue

            # Skip if on approved leave
            if code in on_leave_codes:
                continue

            # Skip if already punched in
            if code in punched_in_codes:
                continue

            full_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or code
            dept = emp.department or "Operations"
            mgr = emp.reporting_supervisor or "Team Lead"
            missing_employees.append({
                "code": code,
                "name": full_name,
                "dept": dept,
                "manager": mgr,
                "email": emp.email or ""
            })

        logger.info(f"[Teams Notifier] Morning Check: {len(missing_employees)} employees missing punch-in.")

        if not missing_employees:
            logger.info("[Teams Notifier] 100% attendance achieved! No alert needed.")
            return {
                "status": "success",
                "message": "All active employees are punched in or on approved leave.",
                "missing_count": 0
            }

        # 6. Format and send the Teams Adaptive Card
        date_str = today.strftime("%d %b %Y (%A)")
        title = "⏰ 11:45 AM Attendance Reminder"
        subtitle = f"Attendance check completed for **{date_str}**. The following team members have not punched in yet:"

        facts = [
            {"title": "Date:", "value": date_str},
            {"title": "Active Shift:", "value": "10:00 AM – 7:00 PM"},
            {"title": "Unmarked Count:", "value": f"{len(missing_employees)} Employees"},
            {"title": "Status:", "value": "Missing Punch-In"}
        ]

        detail_bullets = [
            f"• **{m['name']}** (`{m['code']}`) — *{m['dept']}* (Mgr: {m['manager']})"
            for m in missing_employees
        ]

        sent = send_teams_adaptive_card(
            title=title,
            subtitle=subtitle,
            facts=facts,
            detail_bullets=detail_bullets,
            action_title="Open Attendance Portal",
            action_url=f"{DEFAULT_HRMS_URL}/admin/attendance",
            color="Attention"  # Red / Warning Accent
        )

        return {
            "status": "sent" if sent else "failed",
            "date": str(today),
            "missing_count": len(missing_employees),
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
    3. Dispatches a high-priority Microsoft Teams reminder card.
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
                SELECT a.emp_code, a.punch_in_time, p.first_name, p.last_name, p.department, p.reporting_supervisor
                FROM {tname} a
                LEFT JOIN profile_master p ON UPPER(p.emp_code) = UPPER(a.emp_code)
                WHERE a.date = :today 
                  AND a.punch_in_time IS NOT NULL 
                  AND a.punch_out_time IS NULL
                ORDER BY a.punch_in_time ASC
            """), {"today": today}).mappings().all()

            for r in rows:
                code = r.get("emp_code")
                name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or code
                in_time = str(r.get("punch_in_time") or "—")
                missing_punchouts.append({
                    "code": code,
                    "name": name,
                    "punch_in": in_time,
                    "dept": r.get("department") or "Engineering",
                    "manager": r.get("reporting_supervisor") or "Management"
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

        # Format and send the Teams Adaptive Card
        date_str = today.strftime("%d %b %Y (%A)")
        title = "🌙 11:00 PM Missing Punch-Out Alert"
        subtitle = f"Attendance closeout for **{date_str}**. The following team members punched in today but have not punched out:"

        facts = [
            {"title": "Date:", "value": date_str},
            {"title": "Pending Punch-Outs:", "value": f"{len(missing_punchouts)} Employees"},
            {"title": "Resolution:", "value": "Punch out now or regularize tomorrow"}
        ]

        detail_bullets = [
            f"• **{m['name']}** (`{m['code']}`) — Punched In: `{m['punch_in']}` (Mgr: {m['manager']})"
            for m in missing_punchouts
        ]

        sent = send_teams_adaptive_card(
            title=title,
            subtitle=subtitle,
            facts=facts,
            detail_bullets=detail_bullets,
            action_title="Review Attendance Logs",
            action_url=f"{DEFAULT_HRMS_URL}/admin/attendance",
            color="Warning"  # Amber / Warning
        )

        return {
            "status": "sent" if sent else "failed",
            "date": str(today),
            "missing_punchout_count": len(missing_punchouts),
            "employees": [m["name"] for m in missing_punchouts]
        }

    except Exception as e:
        logger.error(f"[Teams Notifier] Error in run_night_missing_punchout_check: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
