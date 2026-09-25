from datetime import datetime, date, time
from typing import Optional, Any


def safe_parse_datetime(v: Any) -> Optional[datetime]:
    """Safely converts any datetime, date, or string representation to a datetime object."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, time.min)
    if isinstance(v, str):
        v_clean = v.strip().replace("Z", "")
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y",
            "%d %b %Y %I:%M %p",
            "%d %b %Y"
        ):
            try:
                return datetime.strptime(v_clean, fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(v_clean)
        except Exception:
            return None
    return None


def safe_parse_date(v: Any) -> Optional[date]:
    """Safely converts any date, datetime, or string to a date object."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    dt = safe_parse_datetime(v)
    if dt:
        return dt.date()
    return None


def safe_format_time(v: Any, fallback: str = "—") -> str:
    """Formats any time input to '09:30 AM' format."""
    dt = safe_parse_datetime(v)
    if dt:
        return dt.strftime("%I:%M %p")
    return str(v) if v else fallback


def safe_format_date(v: Any, fmt: str = "%d %b %Y", fallback: str = "") -> str:
    """Formats any date input to '25 Sep 2026' format."""
    dt = safe_parse_datetime(v)
    if dt:
        return dt.strftime(fmt)
    d = safe_parse_date(v)
    if d:
        return d.strftime(fmt)
    return str(v) if v else fallback


def safe_calc_hours(punch_in: Any, punch_out: Any, target_date: Any = None, now: Any = None) -> float:
    """Calculates worked hours float safely from any input types."""
    in_dt = safe_parse_datetime(punch_in)
    out_dt = safe_parse_datetime(punch_out)
    if not in_dt:
        return 0.0
    if out_dt and out_dt > in_dt:
        return round((out_dt - in_dt).total_seconds() / 3600.0, 2)
    t_date = safe_parse_date(target_date)
    curr_now = now or datetime.now()
    if not out_dt and t_date and t_date == curr_now.date():
        return round(max(0.0, (curr_now - in_dt).total_seconds() / 3600.0), 2)
    return 0.0


def calculate_attendance_status(
    punch_in_time=None,
    punch_out_time=None,
    hours_completed=None,
    target_date=None,
    is_leave=False,
    leave_category=None,
    is_holiday=False,
    is_sunday=False,
    status_override=None,
    now=None
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
    curr_now = now or datetime.now()
    today = curr_now.date()

    in_dt = safe_parse_datetime(punch_in_time)
    out_dt = safe_parse_datetime(punch_out_time)
    t_date = safe_parse_date(target_date) or (in_dt.date() if in_dt else today)

    # 1. Preserved Status Overrides (e.g. Rejected by Admin / Manager)
    if status_override:
        norm_override = str(status_override).strip().title()
        if norm_override in ("Rejected", "Reject"):
            return {
                "status": "Rejected",
                "badge_code": "REJ",
                "is_active": False,
                "hours": float(hours_completed or 0),
                "hours_completed": float(hours_completed or 0),
                "total_minutes": int(float(hours_completed or 0) * 60),
                "total_hours": f"{int(float(hours_completed or 0))}h {int((float(hours_completed or 0) % 1) * 60):02d}m",
                "working_hours": f"{int(float(hours_completed or 0))}h {int((float(hours_completed or 0) % 1) * 60):02d}m"
            }

    # 2. Approved Leave Check
    if is_leave:
        cat_str = f" ({leave_category})" if leave_category else ""
        return {
            "status": f"Leave{cat_str}",
            "badge_code": "L",
            "is_active": False,
            "hours": 0.0,
            "hours_completed": 0.0,
            "total_minutes": 0,
            "total_hours": "0h 00m",
            "working_hours": "0h 00m"
        }

    # 3. Holiday Check
    if is_holiday:
        return {
            "status": "Holiday",
            "badge_code": "H",
            "is_active": False,
            "hours": 0.0,
            "hours_completed": 0.0,
            "total_minutes": 0,
            "total_hours": "0h 00m",
            "working_hours": "0h 00m"
        }

    # 4. Weekly Off Check
    if is_sunday or (t_date and t_date.weekday() == 6):
        return {
            "status": "Weekly Off",
            "badge_code": "WO",
            "is_active": False,
            "hours": 0.0,
            "hours_completed": 0.0,
            "total_minutes": 0,
            "total_hours": "0h 00m",
            "working_hours": "0h 00m"
        }

    # 5. Invalid Timestamp check (punch out before punch in)
    if in_dt and out_dt and out_dt < in_dt:
        return {
            "status": "Invalid",
            "badge_code": "INVALID",
            "is_active": False,
            "hours": 0.0,
            "hours_completed": 0.0,
            "total_minutes": 0,
            "total_hours": "0h 00m",
            "working_hours": "0h 00m"
        }

    # 6. Both Punch In and Punch Out Exist (Completed Shift)
    if in_dt is not None and out_dt is not None:
        diff_sec = max(0.0, (out_dt - in_dt).total_seconds())
        total_minutes = int(diff_sec // 60)
        hours_part = total_minutes // 60
        minutes_part = total_minutes % 60
        total_hours_formatted = f"{hours_part}h {minutes_part:02d}m"
        hours_float = round(diff_sec / 3600.0, 2)

        # 9-hour / 5-hour Business Rule:
        # Working Hours >= 9:00 (>= 540 min) -> Present
        # 5:00 <= Working Hours < 9:00 (300 to 539 min) -> Half Day
        # Working Hours < 5:00 (< 300 min) -> Absent
        if total_minutes >= 540:
            status = "Present"
            badge_code = "P"
        elif total_minutes >= 300:
            status = "Half Day"
            badge_code = "HD"
        else:
            status = "Absent"
            badge_code = "A"

        return {
            "status": status,
            "badge_code": badge_code,
            "is_active": False,
            "hours": hours_float,
            "hours_completed": hours_float,
            "total_minutes": total_minutes,
            "total_hours": total_hours_formatted,
            "working_hours": total_hours_formatted
        }

    # 7. Punch In exists, Punch Out is Missing
    if in_dt is not None and out_dt is None:
        if t_date == today:
            diff_m = max(0, int((curr_now - in_dt).total_seconds() // 60))
            live_h_str = f"{diff_m // 60}h {diff_m % 60:02d}m"
            live_h_val = round(diff_m / 60.0, 2)
            # Active punch: Do NOT prematurely mark as Present / Half Day / Absent
            return {
                "status": "Punched In",
                "badge_code": "P",
                "is_active": True,
                "hours": live_h_val,
                "hours_completed": live_h_val,
                "total_minutes": diff_m,
                "total_hours": live_h_str,
                "working_hours": live_h_str
            }
        else:
            return {
                "status": "Missing Punch",
                "badge_code": "MP",
                "is_active": False,
                "hours": 0.0,
                "hours_completed": 0.0,
                "total_minutes": 0,
                "total_hours": "—",
                "working_hours": "—"
            }

    # 8. If hours_completed provided without timestamps (legacy / manual override)
    if hours_completed is not None and float(hours_completed or 0) > 0:
        h_val = float(hours_completed)
        total_minutes = int(h_val * 60)
        h_part = total_minutes // 60
        m_part = total_minutes % 60
        total_hours_formatted = f"{h_part}h {m_part:02d}m"
        if total_minutes >= 540:
            status = "Present"
            badge_code = "P"
        elif total_minutes >= 300:
            status = "Half Day"
            badge_code = "HD"
        else:
            status = "Absent"
            badge_code = "A"

        return {
            "status": status,
            "badge_code": badge_code,
            "is_active": False,
            "hours": round(h_val, 2),
            "hours_completed": round(h_val, 2),
            "total_minutes": total_minutes,
            "total_hours": total_hours_formatted,
            "working_hours": total_hours_formatted
        }

    # 9. Future Date
    if t_date and t_date > today:
        return {
            "status": "Not Marked",
            "badge_code": "—",
            "is_active": False,
            "hours": 0.0,
            "hours_completed": 0.0,
            "total_minutes": 0,
            "total_hours": "—",
            "working_hours": "—"
        }

    # 10. Default Absent
    return {
        "status": "Absent",
        "badge_code": "A",
        "is_active": False,
        "hours": 0.0,
        "hours_completed": 0.0,
        "total_minutes": 0,
        "total_hours": "0h 00m",
        "working_hours": "0h 00m"
    }


def recalculate_database_attendance_records(db_session=None):
    """
    Scans existing attendance tables (e.g. attendance_YYYY_MM)
    and updates existing records based on the 9h / 5h business rules.
    Converts obsolete 'Completed' or improperly classified records into Present / Half Day / Absent.
    Preserves overrides like 'Rejected' or approved Leave.
    """
    from app.db.session import engine, SessionLocal
    from sqlalchemy import text
    import logging

    log = logging.getLogger("attendance_sync")
    session = db_session or SessionLocal()
    try:
        # Determine table names
        dialect = session.bind.dialect.name if session.bind else "sqlite"
        if dialect == "postgresql":
            res = session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'attendance_%'")).fetchall()
            table_names = [r[0] for r in res]
        else:
            res = session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attendance_%'")).fetchall()
            table_names = [r[0] for r in res]

        updated_count = 0
        for tbl in table_names:
            # Only target monthly attendance tables (attendance_YYYY_MM)
            parts = tbl.split("_")
            if len(parts) != 3 or not parts[1].isdigit() or not parts[2].isdigit():
                continue

            rows = session.execute(text(f"""
                SELECT id, emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark
                FROM {tbl}
                WHERE punch_in_time IS NOT NULL AND punch_out_time IS NOT NULL
            """)).mappings().all()

            for r in rows:
                current_status = r["status"] or ""
                remark = r["remark"] or ""

                # Preserve administrative rejection
                if "reject" in current_status.lower() or "reject" in remark.lower():
                    continue

                calc = calculate_attendance_status(
                    punch_in_time=r["punch_in_time"],
                    punch_out_time=r["punch_out_time"],
                    hours_completed=r["hours_completed"],
                    target_date=r["date"]
                )
                new_status = calc["status"]
                new_hours = calc["hours"]

                # Update if status or hours changed
                if current_status != new_status or abs(float(r["hours_completed"] or 0) - new_hours) > 0.05:
                    session.execute(text(f"""
                        UPDATE {tbl}
                        SET status = :st,
                            hours_completed = :h
                        WHERE id = :id
                    """), {"st": new_status, "h": new_hours, "id": r["id"]})
                    updated_count += 1

        session.commit()
        if updated_count > 0:
            log.info(f"Recalculated {updated_count} attendance records to 9h/5h business rule.")
        return updated_count
    except Exception as exc:
        session.rollback()
        log.error(f"Error during attendance records recalculation: {exc}")
        return 0
    finally:
        if not db_session:
            session.close()