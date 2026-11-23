# ==============================================================================
# ATTENDANCE SERVICE & BUSINESS LOGIC ENGINE (attendance_service.py)
# ==============================================================================
# Core calculations for attendance, working hours, and statuses:
# 1. Authoritative Business Rules:
#    - >= 9h 00m (540 mins) worked -> Present
#    - 5h 00m to 8h 59m worked      -> Half Day
#    - < 5h 00m worked             -> Absent
#    - Punched in without checkout -> Punched In / In Progress
# 2. Timezone Management:
#    - All business computations are strictly enforced in Asia/Kolkata (IST).
#    - Auto-repairs legacy UTC timestamp discrepancies from mobile devices.
# 3. Safe Parsing:
#    - Robust converters for diverse date/time formats, nulls, and ISO strings.
# ==============================================================================

# Import datetime, date, time, timezone, timedelta from datetime for module operations
from datetime import datetime, date, time, timezone, timedelta
# Import ZoneInfo from zoneinfo for module operations
from zoneinfo import ZoneInfo
# Import Optional, Any from typing for module operations
from typing import Optional, Any
# Import module re for system functionality
import re

# Set IST variable to store IST value
IST = ZoneInfo("Asia/Kolkata")


# Define get_ist_now function to handle get ist now
def get_ist_now() -> datetime:
    """Returns the current timezone-aware datetime in Asia/Kolkata (IST)."""
    return datetime.now(IST)


# Define get_ist_today function to handle get ist today
def get_ist_today() -> date:
    """Returns today's date in Asia/Kolkata (IST)."""
    return datetime.now(IST).date()


# Define to_ist function to handle to ist
def to_ist(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Ensures a datetime is in Asia/Kolkata timezone.
    - If dt is timezone-aware (e.g. UTC), converts it to Asia/Kolkata.
    - If dt is timezone-naive, treats it as Asia/Kolkata local time and attaches IST.
    """
    if dt is None:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if dt.tzinfo is None:
        # Return computed result or response payload to caller
        return dt.replace(tzinfo=IST)
    # Return computed result or response payload to caller
    return dt.astimezone(IST)


# Define safe_parse_datetime function to handle safe parse datetime
def safe_parse_datetime(v: Any) -> Optional[datetime]:
    """Safely converts any datetime, date, or string representation to an Asia/Kolkata timezone-aware datetime object."""
    if not v:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if isinstance(v, datetime):
        # Return computed result or response payload to caller
        return to_ist(v)
    # Evaluate condition to control execution branch
    if isinstance(v, date):
        # Return computed result or response payload to caller
        return datetime.combine(v, time.min, tzinfo=IST)
    # Evaluate condition to control execution branch
    if isinstance(v, str):
        # Set v_str variable to store v str value
        v_str = v.strip()
        # Check if target condition is false or object is missing
        if not v_str or v_str in ("—", "-", "--"):
            # Return computed result or response payload to caller
            return None
        # First try ISO format (handles offsets and 'Z')
        try:
            # Set iso_str variable to store iso str value
            iso_str = v_str.replace("Z", "+00:00") if v_str.endswith("Z") else v_str
            # Set dt variable to store dt value
            dt = datetime.fromisoformat(iso_str)
            # Return computed result or response payload to caller
            return to_ist(dt)
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

        # Iterate through items in sequence loop
        for fmt in (
            # Execute statement to process data and maintain state
            "%Y-%m-%d %H:%M:%S.%f",
            # Execute statement to process data and maintain state
            "%Y-%m-%d %H:%M:%S",
            # Execute statement to process data and maintain state
            "%Y-%m-%d %H:%M",
            # Execute statement to process data and maintain state
            "%Y-%m-%d",
            # Execute statement to process data and maintain state
            "%d-%m-%Y %H:%M:%S",
            # Execute statement to process data and maintain state
            "%d-%m-%Y %H:%M",
            # Execute statement to process data and maintain state
            "%d-%m-%Y",
            # Execute statement to process data and maintain state
            "%d %b %Y %I:%M %p",
            # Execute statement to process data and maintain state
            "%d %b %Y",
            # Execute statement to process data and maintain state
            "%I:%M %p",
            # Execute statement to process data and maintain state
            "%H:%M:%S",
            # Execute statement to process data and maintain state
            "%H:%M"
        # Execute statement to process data and maintain state
        ):
            # Begin guarded execution block to trap exceptions
            try:
                # Set parsed variable to store parsed value
                parsed = datetime.strptime(v_str, fmt)
                # Return computed result or response payload to caller
                return parsed.replace(tzinfo=IST)
            # Catch and handle specific exception if raised
            except ValueError:
                # Skip to next iteration of active loop
                continue

    # Return computed result or response payload to caller
    return None


# Define safe_parse_date function to handle safe parse date
def safe_parse_date(v: Any) -> Optional[date]:
    """Safely converts any date, datetime, or string to a date object."""
    if not v:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if isinstance(v, datetime):
        # Return computed result or response payload to caller
        return to_ist(v).date()
    # Evaluate condition to control execution branch
    if isinstance(v, date):
        # Return computed result or response payload to caller
        return v
    # Set dt variable to store dt value
    dt = safe_parse_datetime(v)
    # Evaluate condition to control execution branch
    if dt:
        # Return computed result or response payload to caller
        return dt.date()
    # Return computed result or response payload to caller
    return None


# Define safe_format_time function to handle safe format time
def safe_format_time(v: Any, fallback: str = "—") -> str:
    """Formats any time input to '07:10 AM' 12-hour format in Asia/Kolkata."""
    if not v or v in ("—", "-", "--"):
        # Return computed result or response payload to caller
        return fallback
    # Set dt variable to store dt value
    dt = safe_parse_datetime(v)
    # Evaluate condition to control execution branch
    if dt:
        # Return computed result or response payload to caller
        return dt.strftime("%I:%M %p")
    # Evaluate condition to control execution branch
    if isinstance(v, str):
        # Set s variable to store s value
        s = v.strip()
        # Set m variable to store m value
        m = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$", s, re.I)
        # Evaluate condition to control execution branch
        if m:
            # Return computed result or response payload to caller
            return f"{int(m.group(1)):02d}:{m.group(2)} {m.group(3).upper()}"
    # Return computed result or response payload to caller
    return str(v) if v else fallback


# Define safe_format_date function to handle safe format date
def safe_format_date(v: Any, fmt: str = "%d %b %Y", fallback: str = "") -> str:
    """Formats any date input to '25 Sep 2026' format."""
    dt = safe_parse_datetime(v)
    # Evaluate condition to control execution branch
    if dt:
        # Return computed result or response payload to caller
        return dt.strftime(fmt)
    # Set d variable to store d value
    d = safe_parse_date(v)
    # Evaluate condition to control execution branch
    if d:
        # Return computed result or response payload to caller
        return d.strftime(fmt)
    # Return computed result or response payload to caller
    return str(v) if v else fallback


# Define repair_utc_punch_out function to handle repair utc punch out
def repair_utc_punch_out(in_time: Any, out_time: Any, target_date: Any = None) -> Optional[datetime]:
    """
    Auto-corrects any punch_out_time that was stored in UTC (5 hours 30 minutes behind IST).
    Handles:
    1. Direct inverted timestamps where out_dt < in_dt (e.g., in=10:00 AM, out=07:30 UTC -> 1:00 PM IST).
    2. Any logout that occurred at 6:00 PM IST or later (stored in UTC as 12:30 PM to 6:30 PM):
       Adding 5.5 hours restores the true logout time (6:00 PM to 11:59 PM IST) and full working hours.
    """
    in_dt = safe_parse_datetime(in_time)
    # Set out_dt variable to store out dt value
    out_dt = safe_parse_datetime(out_time)
    # Check if target condition is false or object is missing
    if not out_dt:
        # Return computed result or response payload to caller
        return None
    # Check if target condition is false or object is missing
    if not in_dt:
        # Return computed result or response payload to caller
        return out_dt

    # 1. Direct inversion: out_dt is earlier than in_dt
    if out_dt < in_dt:
        # Set out_dt_shifted variable to store out dt shifted value
        out_dt_shifted = out_dt + timedelta(hours=5, minutes=30)
        # Evaluate condition to control execution branch
        if out_dt_shifted >= in_dt:
            # Return computed result or response payload to caller
            return out_dt_shifted

    # 2. Checkouts on or before 2026-10-19 affected by UTC storage:
    # A logout at 6:00 PM IST or later was stored in UTC between 12:30 PM (12:30) and 6:30 PM (18:30).
    t_date = safe_parse_date(target_date) or in_dt.date()
    # Evaluate condition to control execution branch
    if t_date and str(t_date) <= "2026-10-19":
        # Set out_dt_shifted variable to store out dt shifted value
        out_dt_shifted = out_dt + timedelta(hours=5, minutes=30)

        # Case A: Shifted time produces an evening logout (>= 18:00 / 6:00 PM IST) on the same date
        if out_dt_shifted.date() == in_dt.date() and out_dt_shifted.hour >= 18:
            # Set shifted_duration variable to store shifted duration value
            shifted_duration = (out_dt_shifted - in_dt).total_seconds() / 3600.0
            # Set orig_duration variable to store orig duration value
            orig_duration = (out_dt - in_dt).total_seconds() / 3600.0
            # If the shifted duration gives a full working day (5.0 to 16.0 hours) while unshifted was truncated
            if 5.0 <= shifted_duration <= 16.0 and orig_duration < 9.0:
                # Return computed result or response payload to caller
                return out_dt_shifted

        # Case B: Midday logout (11:30 AM - 3:59 PM UTC) where unshifted duration was < 5.5h
        duration_hrs = (out_dt - in_dt).total_seconds() / 3600.0
        # Evaluate condition to control execution branch
        if duration_hrs < 5.5 and 11 <= out_dt.hour <= 18:
            # Set shifted_duration variable to store shifted duration value
            shifted_duration = (out_dt_shifted - in_dt).total_seconds() / 3600.0
            # Evaluate condition to control execution branch
            if 5.5 <= shifted_duration <= 16.0 and 16 <= out_dt_shifted.hour <= 23:
                # Return computed result or response payload to caller
                return out_dt_shifted

    # Return computed result or response payload to caller
    return out_dt


# Define safe_calc_hours function to handle safe calc hours
def safe_calc_hours(punch_in: Any, punch_out: Any, target_date: Any = None, now: Any = None) -> float:
    """Calculates worked hours float safely from any input types."""
    in_dt = safe_parse_datetime(punch_in)
    # Set out_dt variable to store out dt value
    out_dt = repair_utc_punch_out(in_dt, punch_out, target_date)
    # Check if target condition is false or object is missing
    if not in_dt:
        # Return computed result or response payload to caller
        return 0.0
    # Evaluate condition to control execution branch
    if out_dt and out_dt > in_dt:
        # Return computed result or response payload to caller
        return round((out_dt - in_dt).total_seconds() / 3600.0, 2)
    # Set t_date variable to store t date value
    t_date = safe_parse_date(target_date)
    # Set curr_now variable to store curr now value
    curr_now = safe_parse_datetime(now) or get_ist_now()
    # Check if target condition is false or object is missing
    if not out_dt and t_date and t_date == curr_now.date():
        # Return computed result or response payload to caller
        return round(max(0.0, (curr_now - in_dt).total_seconds() / 3600.0), 2)
    # Return computed result or response payload to caller
    return 0.0


# Define calculate_attendance_status function to handle calculate attendance status
def calculate_attendance_status(
    # Set punch_in_time variable to store punch in time value
    punch_in_time=None,
    # Set punch_out_time variable to store punch out time value
    punch_out_time=None,
    # Set hours_completed variable to store hours completed value
    hours_completed=None,
    # Set target_date variable to store target date value
    target_date=None,
    # Set is_leave variable to store is leave value
    is_leave=False,
    # Set leave_category variable to store leave category value
    leave_category=None,
    # Set is_holiday variable to store is holiday value
    is_holiday=False,
    # Set is_sunday variable to store is sunday value
    is_sunday=False,
    # Set is_weekly_off variable to store is weekly off value
    is_weekly_off=False,
    # Set status_override variable to store status override value
    status_override=None,
    # Set holiday_name variable to store holiday name value
    holiday_name=None,
    # Set leave_type variable to store leave type value
    leave_type=None,
    # Set now variable to store now value
    now=None,
    # Execute statement to process data and maintain state
    **kwargs
# Execute statement to process data and maintain state
) -> dict:
    """
    Centralized HRMS Attendance Status Calculator.
    AUTHORITATIVE BUSINESS RULES:
      - >= 540 minutes (9h 00m or more)  -> Present
      - >= 300 minutes (5h 00m) and < 540 minutes (< 9h 00m) -> Half Day
      - < 300 minutes (< 5h 00m)         -> Absent
      - Active Punch In (no Punch Out)   -> Punched In / In Progress (never final Present/Half Day/Absent)
      - Missing Punch (past day)         -> Missing Punch
      - Approved Leave                   -> Leave
      - Holiday                          -> Holiday
      - Weekly Off                       -> Weekly Off
    """
    curr_now = safe_parse_datetime(now) or get_ist_now()
    # Set today variable to store today value
    today = curr_now.date()

    # Set in_dt variable to store in dt value
    in_dt = safe_parse_datetime(punch_in_time)
    # Set out_dt variable to store out dt value
    out_dt = repair_utc_punch_out(in_dt, punch_out_time, target_date)
    # Set t_date variable to store t date value
    t_date = safe_parse_date(target_date) or (in_dt.date() if in_dt else today)
    # Set is_future variable to store is future value
    is_future = bool(t_date and t_date > today)

    # 1. Preserved Status Overrides (e.g. Rejected by Admin / Manager)
    if status_override:
        # Set norm_override variable to store norm override value
        norm_override = str(status_override).strip().title()
        # Evaluate condition to control execution branch
        if norm_override in ("Rejected", "Reject"):
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "status": "Rejected",
                # Execute statement to process data and maintain state
                "badge_code": "REJ",
                # Execute statement to process data and maintain state
                "is_active": False,
                # Execute statement to process data and maintain state
                "hours": float(hours_completed or 0),
                # Execute statement to process data and maintain state
                "hours_completed": float(hours_completed or 0),
                # Execute statement to process data and maintain state
                "total_minutes": int(float(hours_completed or 0) * 60),
                # Execute statement to process data and maintain state
                "total_hours": f"{int(float(hours_completed or 0))}h {int((float(hours_completed or 0) % 1) * 60):02d}m",
                # Execute statement to process data and maintain state
                "working_hours": f"{int(float(hours_completed or 0))}h {int((float(hours_completed or 0) % 1) * 60):02d}m"
            # Execute statement to process data and maintain state
            }

    # 2. Approved Leave Check
    if is_leave:
        # Set eff_category variable to store eff category value
        eff_category = leave_category or leave_type
        # Set cat_str variable to store cat str value
        cat_str = f" ({eff_category})" if eff_category else ""
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": f"Leave{cat_str}",
            # Execute statement to process data and maintain state
            "badge_code": "LV",
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": 0.0,
            # Execute statement to process data and maintain state
            "hours_completed": 0.0,
            # Execute statement to process data and maintain state
            "total_minutes": 0,
            # Execute statement to process data and maintain state
            "total_hours": "0h 00m",
            # Execute statement to process data and maintain state
            "working_hours": "0h 00m"
        # Execute statement to process data and maintain state
        }

    # 3. Holiday Check
    if is_holiday:
        # Set h_name variable to store h name value
        h_name = str(holiday_name).strip() if (holiday_name and str(holiday_name).strip()) else "Holiday"
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": h_name,
            # Execute statement to process data and maintain state
            "badge_code": "H",
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": 0.0,
            # Execute statement to process data and maintain state
            "hours_completed": 0.0,
            # Execute statement to process data and maintain state
            "total_minutes": 0,
            # Execute statement to process data and maintain state
            "total_hours": "0h 00m",
            # Execute statement to process data and maintain state
            "working_hours": "0h 00m"
        # Execute statement to process data and maintain state
        }

    # 4. Weekly Off Check
    if is_weekly_off or (is_sunday and not is_future):
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "Weekly Off",
            # Execute statement to process data and maintain state
            "badge_code": "WO",
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": 0.0,
            # Execute statement to process data and maintain state
            "hours_completed": 0.0,
            # Execute statement to process data and maintain state
            "total_minutes": 0,
            # Execute statement to process data and maintain state
            "total_hours": "0h 00m",
            # Execute statement to process data and maintain state
            "working_hours": "0h 00m"
        # Execute statement to process data and maintain state
        }

    # 5. Invalid Timestamp check (punch out before punch in)
    if in_dt and out_dt and out_dt < in_dt:
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "Invalid",
            # Execute statement to process data and maintain state
            "badge_code": "INVALID",
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": 0.0,
            # Execute statement to process data and maintain state
            "hours_completed": 0.0,
            # Execute statement to process data and maintain state
            "total_minutes": 0,
            # Execute statement to process data and maintain state
            "total_hours": "0h 00m",
            # Execute statement to process data and maintain state
            "working_hours": "0h 00m"
        # Execute statement to process data and maintain state
        }

    # 6. Both Punch In and Punch Out Exist (Completed Shift)
    if in_dt is not None and out_dt is not None:
        # Set diff_sec variable to store diff sec value
        diff_sec = max(0.0, (out_dt - in_dt).total_seconds())
        # Set total_minutes variable to store total minutes value
        total_minutes = int(diff_sec // 60)
        # Set hours_part variable to store hours part value
        hours_part = total_minutes // 60
        # Set minutes_part variable to store minutes part value
        minutes_part = total_minutes % 60
        # Set total_hours_formatted variable to store total hours formatted value
        total_hours_formatted = f"{hours_part}h {minutes_part:02d}m"
        # Set hours_float variable to store hours float value
        hours_float = round(diff_sec / 3600.0, 2)

        # 9-hour / 5-hour Business Rule:
        # Working Hours >= 9:00 (>= 540 min) -> Present
        # 5:00 <= Working Hours < 9:00 (300 to 539 min) -> Half Day
        # Working Hours < 5:00 (< 300 min) -> Absent
        if total_minutes >= 540:
            # Set status variable to store status value
            status = "Present"
            # Set badge_code variable to store badge code value
            badge_code = "P"
        # Evaluate alternate branch condition
        elif total_minutes >= 300:
            # Set status variable to store status value
            status = "Half Day"
            # Set badge_code variable to store badge code value
            badge_code = "HD"
        # Execute fallback branch when conditions are not met
        else:
            # Set status variable to store status value
            status = "Absent"
            # Set badge_code variable to store badge code value
            badge_code = "A"

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": status,
            # Execute statement to process data and maintain state
            "badge_code": badge_code,
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": hours_float,
            # Execute statement to process data and maintain state
            "hours_completed": hours_float,
            # Execute statement to process data and maintain state
            "total_minutes": total_minutes,
            # Execute statement to process data and maintain state
            "total_hours": total_hours_formatted,
            # Execute statement to process data and maintain state
            "working_hours": total_hours_formatted
        # Execute statement to process data and maintain state
        }

    # 7. Punch In exists, Punch Out is Missing
    if in_dt is not None and out_dt is None:
        # Evaluate condition to control execution branch
        if t_date == today:
            # Set diff_m variable to store diff m value
            diff_m = max(0, int((curr_now - in_dt).total_seconds() // 60))
            # Set live_h_str variable to store live h str value
            live_h_str = f"{diff_m // 60}h {diff_m % 60:02d}m"
            # Set live_h_val variable to store live h val value
            live_h_val = round(diff_m / 60.0, 2)
            # Active punch: Do NOT prematurely mark as Present / Half Day / Absent
            return {
                # Execute statement to process data and maintain state
                "status": "Punched In",
                # Execute statement to process data and maintain state
                "badge_code": "P",
                # Execute statement to process data and maintain state
                "is_active": True,
                # Execute statement to process data and maintain state
                "hours": live_h_val,
                # Execute statement to process data and maintain state
                "hours_completed": live_h_val,
                # Execute statement to process data and maintain state
                "total_minutes": diff_m,
                # Execute statement to process data and maintain state
                "total_hours": live_h_str,
                # Execute statement to process data and maintain state
                "working_hours": live_h_str
            # Execute statement to process data and maintain state
            }
        # Execute fallback branch when conditions are not met
        else:
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "status": "Missing Punch",
                # Execute statement to process data and maintain state
                "badge_code": "MP",
                # Execute statement to process data and maintain state
                "is_active": False,
                # Execute statement to process data and maintain state
                "hours": 0.0,
                # Execute statement to process data and maintain state
                "hours_completed": 0.0,
                # Execute statement to process data and maintain state
                "total_minutes": 0,
                # Execute statement to process data and maintain state
                "total_hours": "—",
                # Execute statement to process data and maintain state
                "working_hours": "—"
            # Execute statement to process data and maintain state
            }

    # 8. If hours_completed provided without timestamps (legacy / manual override)
    if hours_completed is not None and float(hours_completed or 0) > 0:
        # Set h_val variable to store h val value
        h_val = float(hours_completed)
        # Set total_minutes variable to store total minutes value
        total_minutes = int(h_val * 60)
        # Set h_part variable to store h part value
        h_part = total_minutes // 60
        # Set m_part variable to store m part value
        m_part = total_minutes % 60
        # Set total_hours_formatted variable to store total hours formatted value
        total_hours_formatted = f"{h_part}h {m_part:02d}m"
        # Evaluate condition to control execution branch
        if total_minutes >= 540:
            # Set status variable to store status value
            status = "Present"
            # Set badge_code variable to store badge code value
            badge_code = "P"
        # Evaluate alternate branch condition
        elif total_minutes >= 300:
            # Set status variable to store status value
            status = "Half Day"
            # Set badge_code variable to store badge code value
            badge_code = "HD"
        # Execute fallback branch when conditions are not met
        else:
            # Set status variable to store status value
            status = "Absent"
            # Set badge_code variable to store badge code value
            badge_code = "A"

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": status,
            # Execute statement to process data and maintain state
            "badge_code": badge_code,
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": round(h_val, 2),
            # Execute statement to process data and maintain state
            "hours_completed": round(h_val, 2),
            # Execute statement to process data and maintain state
            "total_minutes": total_minutes,
            # Execute statement to process data and maintain state
            "total_hours": total_hours_formatted,
            # Execute statement to process data and maintain state
            "working_hours": total_hours_formatted
        # Execute statement to process data and maintain state
        }

    # 9. Future Date
    if t_date and t_date > today:
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "status": "Not Marked",
            # Execute statement to process data and maintain state
            "badge_code": "—",
            # Execute statement to process data and maintain state
            "is_active": False,
            # Execute statement to process data and maintain state
            "hours": 0.0,
            # Execute statement to process data and maintain state
            "hours_completed": 0.0,
            # Execute statement to process data and maintain state
            "total_minutes": 0,
            # Execute statement to process data and maintain state
            "total_hours": "—",
            # Execute statement to process data and maintain state
            "working_hours": "—"
        # Execute statement to process data and maintain state
        }

    # 10. Default Absent
    return {
        # Execute statement to process data and maintain state
        "status": "Absent",
        # Execute statement to process data and maintain state
        "badge_code": "A",
        # Execute statement to process data and maintain state
        "is_active": False,
        # Execute statement to process data and maintain state
        "hours": 0.0,
        # Execute statement to process data and maintain state
        "hours_completed": 0.0,
        # Execute statement to process data and maintain state
        "total_minutes": 0,
        # Execute statement to process data and maintain state
        "total_hours": "0h 00m",
        # Execute statement to process data and maintain state
        "working_hours": "0h 00m"
    # Execute statement to process data and maintain state
    }


# Define recalculate_database_attendance_records function to handle recalculate database attendance records
def recalculate_database_attendance_records(db_session=None):
    """
    Scans existing attendance tables (e.g. attendance_YYYY_MM)
    and updates existing records based on the 9h / 5h business rules.
    Converts obsolete 'Completed' or improperly classified records into Present / Half Day / Absent.
    Preserves overrides like 'Rejected' or approved Leave.
    """
    from app.db.session import engine, SessionLocal
    # Import text from sqlalchemy for module operations
    from sqlalchemy import text
    # Import module logging for system functionality
    import logging

    # Set log variable to store log value
    log = logging.getLogger("attendance_sync")
    # Set session variable to store session value
    session = db_session or SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Determine table names
        dialect = session.bind.dialect.name if session.bind else "sqlite"
        # Evaluate condition to control execution branch
        if dialect == "postgresql":
            # Set res variable to store res value
            res = session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'attendance_%'")).fetchall()
            # Set table_names variable to store table names value
            table_names = [r[0] for r in res]
        # Execute fallback branch when conditions are not met
        else:
            # Set res variable to store res value
            res = session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attendance_%'")).fetchall()
            # Set table_names variable to store table names value
            table_names = [r[0] for r in res]

        # Set updated_count variable to store updated count value
        updated_count = 0
        # Iterate through items in sequence loop
        for tbl in table_names:
            # Only target monthly attendance tables (attendance_YYYY_MM)
            parts = tbl.split("_")
            # Check if target condition is false or object is missing
            if len(parts) != 3 or not parts[1].isdigit() or not parts[2].isdigit():
                # Skip to next iteration of active loop
                continue

            # Set rows variable to store rows value
            rows = session.execute(text(f"""
                SELECT id, emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark
                FROM {tbl}
                WHERE punch_in_time IS NOT NULL AND punch_out_time IS NOT NULL
            """)).mappings().all()

            # Iterate through items in sequence loop
            for r in rows:
                # Set current_status variable to store current status value
                current_status = r["status"] or ""
                # Set remark variable to store remark value
                remark = r["remark"] or ""

                # Preserve administrative rejection
                if "reject" in current_status.lower() or "reject" in remark.lower():
                    # Skip to next iteration of active loop
                    continue

                # Set calc variable to store calc value
                calc = calculate_attendance_status(
                    # Set punch_in_time variable to store punch in time value
                    punch_in_time=r["punch_in_time"],
                    # Set punch_out_time variable to store punch out time value
                    punch_out_time=r["punch_out_time"],
                    # Set hours_completed variable to store hours completed value
                    hours_completed=r["hours_completed"],
                    # Set target_date variable to store target date value
                    target_date=r["date"]
                # Execute statement to process data and maintain state
                )
                # Set new_status variable to store new status value
                new_status = calc["status"]
                # Set new_hours variable to store new hours value
                new_hours = calc["hours"]

                # Update if status or hours changed
                if current_status != new_status or abs(float(r["hours_completed"] or 0) - new_hours) > 0.05:
                    # Execute statement to process data and maintain state
                    session.execute(text(f"""
                        UPDATE {tbl}
                        SET status = :st,
                            hours_completed = :h
                        WHERE id = :id
                    """), {"st": new_status, "h": new_hours, "id": r["id"]})
                    # Execute statement to process data and maintain state
                    updated_count += 1

        # Invoke session.commit to perform operational action
        session.commit()
        # Evaluate condition to control execution branch
        if updated_count > 0:
            # Invoke log.info to perform operational action
            log.info(f"Recalculated {updated_count} attendance records to 9h/5h business rule.")
        # Return computed result or response payload to caller
        return updated_count
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Invoke session.rollback to perform operational action
        session.rollback()
        # Invoke log.error to perform operational action
        log.error(f"Error during attendance records recalculation: {exc}")
        # Return computed result or response payload to caller
        return 0
    # Execute cleanup actions regardless of exceptions
    finally:
        # Check if target condition is false or object is missing
        if not db_session:
            # Invoke session.close to perform operational action
            session.close()