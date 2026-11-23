# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_IST_TIMINGS.PY
# Path: Attendance-portal/backend/test_ist_timings.py
# Purpose: Backend module.
# ==============================================================================

# Import module sys for system functionality
import sys
# Import datetime, date, time from datetime for module operations
from datetime import datetime, date, time
# Import ZoneInfo from zoneinfo for module operations
from zoneinfo import ZoneInfo
# Import  from app.services.attendance_service for module operations
from app.services.attendance_service import (
    # Execute statement to process data and maintain state
    get_ist_now,
    # Execute statement to process data and maintain state
    get_ist_today,
    # Execute statement to process data and maintain state
    safe_parse_datetime,
    # Execute statement to process data and maintain state
    safe_format_time,
    # Execute statement to process data and maintain state
    safe_calc_hours,
    # Execute statement to process data and maintain state
    calculate_attendance_status,
    # Execute statement to process data and maintain state
    repair_utc_punch_out,
    # Execute statement to process data and maintain state
    IST
# Execute statement to process data and maintain state
)

# Invoke print to perform operational action
print("=" * 60)
# Invoke print to perform operational action
print("TESTING IST PUNCH IN AND PUNCH OUT TIMINGS")
# Invoke print to perform operational action
print("=" * 60)

# ── SCENARIO 1: User punches in at 9:30 AM IST and punches out at 4:30 PM IST ──
punch_in_ist = datetime(2026, 10, 20, 9, 30, 0, tzinfo=IST)
# Set punch_out_ist variable to store punch out ist value
punch_out_ist = datetime(2026, 10, 20, 16, 30, 0, tzinfo=IST)

# How it is stored in PostgreSQL (naive TIMESTAMP WITHOUT TIME ZONE)
punch_in_db = punch_in_ist.replace(tzinfo=None)
# Set punch_out_db variable to store punch out db value
punch_out_db = punch_out_ist.replace(tzinfo=None)

# Invoke print to perform operational action
print(f"\n[Scenario 1] Punch In at 9:30 AM IST, Punch Out at 4:30 PM IST")
# Invoke print to perform operational action
print(f"  Stored in DB punch_in_time:  {punch_in_db}")
# Invoke print to perform operational action
print(f"  Stored in DB punch_out_time: {punch_out_db}")

# Parse and format back
in_dt = safe_parse_datetime(punch_in_db)
# Set out_dt variable to store out dt value
out_dt = repair_utc_punch_out(in_dt, punch_out_db, date(2026, 10, 20))

# Set in_str variable to store in str value
in_str = safe_format_time(in_dt, "—")
# Set out_str variable to store out str value
out_str = safe_format_time(out_dt, "—")
# Set hours variable to store hours value
hours = safe_calc_hours(in_dt, out_dt, date(2026, 10, 20))
# Set status_res variable to store status res value
status_res = calculate_attendance_status(punch_in_time=in_dt, punch_out_time=out_dt, target_date=date(2026, 10, 20))

# Invoke print to perform operational action
print(f"  Formatted Check In:   '{in_str}' (Expected: '09:30 AM')")
# Invoke print to perform operational action
print(f"  Formatted Check Out:  '{out_str}' (Expected: '04:30 PM')")
# Invoke print to perform operational action
print(f"  Total Working Hours:  {status_res['total_hours']} (Expected: '7h 00m')")
# Invoke print to perform operational action
print(f"  Calculated Status:    {status_res['status']}")

# Execute statement to process data and maintain state
assert in_str == "09:30 AM", f"Check in was {in_str}, expected 09:30 AM"
# Execute statement to process data and maintain state
assert out_str == "04:30 PM", f"Check out was {out_str}, expected 04:30 PM"
# Execute statement to process data and maintain state
assert status_res['total_hours'] == "7h 00m", f"Hours was {status_res['total_hours']}, expected 7h 00m"
# Execute statement to process data and maintain state
assert hours == 7.0, f"Hours was {hours}, expected 7.0"
# Invoke print to perform operational action
print("  >>> PASS: Scenario 1 accurate to Indian Standard Time!\n")

# ── SCENARIO 2: Punch in at 10:00 AM IST and Punch Out at 6:00 PM IST ──
punch_in_2 = datetime(2026, 10, 20, 10, 0, 0, tzinfo=IST).replace(tzinfo=None)
# Set punch_out_2 variable to store punch out 2 value
punch_out_2 = datetime(2026, 10, 20, 18, 0, 0, tzinfo=IST).replace(tzinfo=None)

# Set in_dt_2 variable to store in dt 2 value
in_dt_2 = safe_parse_datetime(punch_in_2)
# Set out_dt_2 variable to store out dt 2 value
out_dt_2 = repair_utc_punch_out(in_dt_2, punch_out_2, date(2026, 10, 20))
# Set in_str_2 variable to store in str 2 value
in_str_2 = safe_format_time(in_dt_2, "—")
# Set out_str_2 variable to store out str 2 value
out_str_2 = safe_format_time(out_dt_2, "—")
# Set status_res_2 variable to store status res 2 value
status_res_2 = calculate_attendance_status(punch_in_time=in_dt_2, punch_out_time=out_dt_2, target_date=date(2026, 10, 20))

# Invoke print to perform operational action
print(f"[Scenario 2] Punch In at 10:00 AM IST, Punch Out at 6:00 PM IST")
# Invoke print to perform operational action
print(f"  Formatted Check In:   '{in_str_2}' (Expected: '10:00 AM')")
# Invoke print to perform operational action
print(f"  Formatted Check Out:  '{out_str_2}' (Expected: '06:00 PM')")
# Invoke print to perform operational action
print(f"  Total Working Hours:  {status_res_2['total_hours']} (Expected: '8h 00m')")

# Execute statement to process data and maintain state
assert in_str_2 == "10:00 AM"
# Execute statement to process data and maintain state
assert out_str_2 == "06:00 PM"
# Execute statement to process data and maintain state
assert status_res_2['total_hours'] == "8h 00m"
# Invoke print to perform operational action
print("  >>> PASS: Scenario 2 accurate to Indian Standard Time!\n")

# ── SCENARIO 3: Punch in at 9:30 AM IST and Punch Out at 6:30 PM IST (Full Day 9 Hours) ──
punch_in_3 = datetime(2026, 10, 20, 9, 30, 0, tzinfo=IST).replace(tzinfo=None)
# Set punch_out_3 variable to store punch out 3 value
punch_out_3 = datetime(2026, 10, 20, 18, 30, 0, tzinfo=IST).replace(tzinfo=None)

# Set in_dt_3 variable to store in dt 3 value
in_dt_3 = safe_parse_datetime(punch_in_3)
# Set out_dt_3 variable to store out dt 3 value
out_dt_3 = repair_utc_punch_out(in_dt_3, punch_out_3, date(2026, 10, 20))
# Set in_str_3 variable to store in str 3 value
in_str_3 = safe_format_time(in_dt_3, "—")
# Set out_str_3 variable to store out str 3 value
out_str_3 = safe_format_time(out_dt_3, "—")
# Set status_res_3 variable to store status res 3 value
status_res_3 = calculate_attendance_status(punch_in_time=in_dt_3, punch_out_time=out_dt_3, target_date=date(2026, 10, 20))

# Invoke print to perform operational action
print(f"[Scenario 3] Punch In at 9:30 AM IST, Punch Out at 6:30 PM IST (9 hrs Present)")
# Invoke print to perform operational action
print(f"  Formatted Check In:   '{in_str_3}' (Expected: '09:30 AM')")
# Invoke print to perform operational action
print(f"  Formatted Check Out:  '{out_str_3}' (Expected: '06:30 PM')")
# Invoke print to perform operational action
print(f"  Total Working Hours:  {status_res_3['total_hours']} (Expected: '9h 00m')")
# Invoke print to perform operational action
print(f"  Status:               {status_res_3['status']} (Expected: 'Present')")

# Execute statement to process data and maintain state
assert in_str_3 == "09:30 AM"
# Execute statement to process data and maintain state
assert out_str_3 == "06:30 PM"
# Execute statement to process data and maintain state
assert status_res_3['total_hours'] == "9h 00m"
# Execute statement to process data and maintain state
assert status_res_3['status'] == "Present"
# Invoke print to perform operational action
print("  >>> PASS: Scenario 3 accurate to Indian Standard Time!\n")

# ── SCENARIO 4: Past Record with UTC drift (LE248 on 19 Oct 2026) ──
# In DB it was stored as 10:19 AM in and 01:25 PM out (because 18:55 IST - 5:30 was 13:25 UTC)
p_in_drift = datetime(2026, 10, 19, 10, 19, 0)
# Set p_out_drift variable to store p out drift value
p_out_drift = datetime(2026, 10, 19, 13, 25, 0)

# Set in_dt_drift variable to store in dt drift value
in_dt_drift = safe_parse_datetime(p_in_drift)
# Set out_dt_drift variable to store out dt drift value
out_dt_drift = repair_utc_punch_out(in_dt_drift, p_out_drift, date(2026, 10, 19))
# Set in_str_drift variable to store in str drift value
in_str_drift = safe_format_time(in_dt_drift, "—")
# Set out_str_drift variable to store out str drift value
out_str_drift = safe_format_time(out_dt_drift, "—")
# Set status_res_drift variable to store status res drift value
status_res_drift = calculate_attendance_status(punch_in_time=in_dt_drift, punch_out_time=out_dt_drift, target_date=date(2026, 10, 19))

# Invoke print to perform operational action
print(f"[Scenario 4 - Healing Test] LE248 19 Oct 2026 record stored with UTC offset (13:25)")
# Invoke print to perform operational action
print(f"  Healed Check In:      '{in_str_drift}' (Expected: '10:19 AM')")
# Invoke print to perform operational action
print(f"  Healed Check Out:     '{out_str_drift}' (Expected: '06:55 PM')")
# Invoke print to perform operational action
print(f"  Healed Working Hours: {status_res_drift['total_hours']} (Expected: '8h 36m')")

# Execute statement to process data and maintain state
assert in_str_drift == "10:19 AM"
# Execute statement to process data and maintain state
assert out_str_drift == "06:55 PM"
# Execute statement to process data and maintain state
assert status_res_drift['total_hours'] == "8h 36m"
# Invoke print to perform operational action
print("  >>> PASS: Scenario 4 accurately healed to Indian Standard Time!\n")

# Invoke print to perform operational action
print("=" * 60)
# Invoke print to perform operational action
print("ALL IST ATTENDANCE TIMING AND CALCULATION TESTS PASSED!")
# Invoke print to perform operational action
print("=" * 60)
