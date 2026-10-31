# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_ALL_EVENING_LOGOUTS.PY
# Path: Attendance-portal/backend/test_all_evening_logouts.py
# Purpose: Backend module.
# ==============================================================================

import sys
from datetime import datetime, date, timedelta
from app.services.attendance_service import (
    safe_parse_datetime,
    safe_format_time,
    safe_calc_hours,
    calculate_attendance_status,
    repair_utc_punch_out,
    IST
)

print("=" * 70)
print("TESTING ALL LOGOUTS AT 6:00 PM AND AFTER (AFFECTED BY UTC DRIFT)")
print("=" * 70)

test_cases = [
    # (Punch In IST, Actual Logout IST, Stored UTC checkout)
    ("10:00 AM", "06:00 PM", "2026-10-19 12:30:00", "8h 00m"),
    ("10:19 AM", "06:55 PM", "2026-10-19 13:25:00", "8h 36m"),
    ("10:00 AM", "07:00 PM", "2026-10-19 13:30:00", "9h 00m"),
    ("09:30 AM", "07:30 PM", "2026-10-19 14:00:00", "10h 00m"),
    ("10:30 AM", "08:00 PM", "2026-10-19 14:30:00", "9h 30m"),
    ("10:00 AM", "08:30 PM", "2026-10-19 15:00:00", "10h 30m"),
    ("11:00 AM", "09:00 PM", "2026-10-19 15:30:00", "10h 00m"),
    ("10:00 AM", "10:00 PM", "2026-10-19 16:30:00", "12h 00m"),
    ("11:00 AM", "11:00 PM", "2026-10-19 17:30:00", "12h 00m"),
]

for in_time_str, expected_out_str, stored_utc_str, expected_hours in test_cases:
    # Convert in_time_str to datetime on 2026-10-19
    dt_in = datetime.strptime(f"2026-10-19 {in_time_str}", "%Y-%m-%d %I:%M %p")
    dt_out_utc = datetime.strptime(stored_utc_str, "%Y-%m-%d %H:%M:%S")

    # Run through repair_utc_punch_out
    healed_out = repair_utc_punch_out(dt_in, dt_out_utc, date(2026, 10, 19))
    formatted_out = safe_format_time(healed_out)
    calc = calculate_attendance_status(punch_in_time=dt_in, punch_out_time=dt_out_utc, target_date=date(2026, 10, 19))

    print(f"In: {in_time_str} | Stored UTC: {dt_out_utc.strftime('%I:%M %p')} -> Healed Out: {formatted_out} | Hours: {calc['total_hours']}")
    assert formatted_out == expected_out_str, f"Expected {expected_out_str}, got {formatted_out}"
    assert calc['total_hours'] == expected_hours, f"Expected {expected_hours}, got {calc['total_hours']}"

print("\n" + "=" * 70)
print("ALL 6:00 PM AND LATER LOGOUT TESTS PASSED WITH 100% ACCURACY!")
print("=" * 70)
