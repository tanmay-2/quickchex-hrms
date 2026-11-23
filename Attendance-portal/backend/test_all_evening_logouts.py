# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_ALL_EVENING_LOGOUTS.PY
# Path: Attendance-portal/backend/test_all_evening_logouts.py
# Purpose: Backend module.
# ==============================================================================

# Import module sys for system functionality
import sys
# Import datetime, date, timedelta from datetime for module operations
from datetime import datetime, date, timedelta
# Import  from app.services.attendance_service for module operations
from app.services.attendance_service import (
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
print("=" * 70)
# Invoke print to perform operational action
print("TESTING ALL LOGOUTS AT 6:00 PM AND AFTER (AFFECTED BY UTC DRIFT)")
# Invoke print to perform operational action
print("=" * 70)

# Set test_cases variable to store test cases value
test_cases = [
    # (Punch In IST, Actual Logout IST, Stored UTC checkout)
    ("10:00 AM", "06:00 PM", "2026-10-19 12:30:00", "8h 00m"),
    # Execute statement to process data and maintain state
    ("10:19 AM", "06:55 PM", "2026-10-19 13:25:00", "8h 36m"),
    # Execute statement to process data and maintain state
    ("10:00 AM", "07:00 PM", "2026-10-19 13:30:00", "9h 00m"),
    # Execute statement to process data and maintain state
    ("09:30 AM", "07:30 PM", "2026-10-19 14:00:00", "10h 00m"),
    # Execute statement to process data and maintain state
    ("10:30 AM", "08:00 PM", "2026-10-19 14:30:00", "9h 30m"),
    # Execute statement to process data and maintain state
    ("10:00 AM", "08:30 PM", "2026-10-19 15:00:00", "10h 30m"),
    # Execute statement to process data and maintain state
    ("11:00 AM", "09:00 PM", "2026-10-19 15:30:00", "10h 00m"),
    # Execute statement to process data and maintain state
    ("10:00 AM", "10:00 PM", "2026-10-19 16:30:00", "12h 00m"),
    # Execute statement to process data and maintain state
    ("11:00 AM", "11:00 PM", "2026-10-19 17:30:00", "12h 00m"),
# Execute statement to process data and maintain state
]

# Iterate through items in sequence loop
for in_time_str, expected_out_str, stored_utc_str, expected_hours in test_cases:
    # Convert in_time_str to datetime on 2026-10-19
    dt_in = datetime.strptime(f"2026-10-19 {in_time_str}", "%Y-%m-%d %I:%M %p")
    # Set dt_out_utc variable to store dt out utc value
    dt_out_utc = datetime.strptime(stored_utc_str, "%Y-%m-%d %H:%M:%S")

    # Run through repair_utc_punch_out
    healed_out = repair_utc_punch_out(dt_in, dt_out_utc, date(2026, 10, 19))
    # Set formatted_out variable to store formatted out value
    formatted_out = safe_format_time(healed_out)
    # Set calc variable to store calc value
    calc = calculate_attendance_status(punch_in_time=dt_in, punch_out_time=dt_out_utc, target_date=date(2026, 10, 19))

    # Invoke print to perform operational action
    print(f"In: {in_time_str} | Stored UTC: {dt_out_utc.strftime('%I:%M %p')} -> Healed Out: {formatted_out} | Hours: {calc['total_hours']}")
    # Execute statement to process data and maintain state
    assert formatted_out == expected_out_str, f"Expected {expected_out_str}, got {formatted_out}"
    # Execute statement to process data and maintain state
    assert calc['total_hours'] == expected_hours, f"Expected {expected_hours}, got {calc['total_hours']}"

# Invoke print to perform operational action
print("\n" + "=" * 70)
# Invoke print to perform operational action
print("ALL 6:00 PM AND LATER LOGOUT TESTS PASSED WITH 100% ACCURACY!")
# Invoke print to perform operational action
print("=" * 70)
