# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_ALL_SCENARIOS_IST.PY
# Path: Attendance-portal/backend/test_all_scenarios_ist.py
# Purpose: Backend module.
# ==============================================================================

# Import module sys for system functionality
import sys
# Import datetime, date, timedelta from datetime for module operations
from datetime import datetime, date, timedelta
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
print("=" * 80)
# Invoke print to perform operational action
print("     COMPREHENSIVE TEST SUITE: 100% IST ATTENDANCE ENGINE (ALL SCENARIOS)")
# Invoke print to perform operational action
print("=" * 80)

# Set scenarios variable to store scenarios value
scenarios = [
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Standard Shift (9:30 AM to 6:30 PM)",
        # Execute statement to process data and maintain state
        "in_h": 9, "in_m": 30,
        # Execute statement to process data and maintain state
        "out_h": 18, "out_m": 30,
        # Execute statement to process data and maintain state
        "expected_in": "09:30 AM",
        # Execute statement to process data and maintain state
        "expected_out": "06:30 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "9h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Present"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "10:00 AM Login to 7:00 PM Logout",
        # Execute statement to process data and maintain state
        "in_h": 10, "in_m": 0,
        # Execute statement to process data and maintain state
        "out_h": 19, "out_m": 0,
        # Execute statement to process data and maintain state
        "expected_in": "10:00 AM",
        # Execute statement to process data and maintain state
        "expected_out": "07:00 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "9h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Present"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "User Example: 9:30 AM to 4:30 PM",
        # Execute statement to process data and maintain state
        "in_h": 9, "in_m": 30,
        # Execute statement to process data and maintain state
        "out_h": 16, "out_m": 30,
        # Execute statement to process data and maintain state
        "expected_in": "09:30 AM",
        # Execute statement to process data and maintain state
        "expected_out": "04:30 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "7h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Half Day"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Early Morning Login (8:30 AM to 5:30 PM)",
        # Execute statement to process data and maintain state
        "in_h": 8, "in_m": 30,
        # Execute statement to process data and maintain state
        "out_h": 17, "out_m": 30,
        # Execute statement to process data and maintain state
        "expected_in": "08:30 AM",
        # Execute statement to process data and maintain state
        "expected_out": "05:30 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "9h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Present"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Late Evening Logout (10:30 AM to 8:30 PM)",
        # Execute statement to process data and maintain state
        "in_h": 10, "in_m": 30,
        # Execute statement to process data and maintain state
        "out_h": 20, "out_m": 30,
        # Execute statement to process data and maintain state
        "expected_in": "10:30 AM",
        # Execute statement to process data and maintain state
        "expected_out": "08:30 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "10h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Present"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Overtime / Night Logout (11:00 AM to 10:00 PM)",
        # Execute statement to process data and maintain state
        "in_h": 11, "in_m": 0,
        # Execute statement to process data and maintain state
        "out_h": 22, "out_m": 0,
        # Execute statement to process data and maintain state
        "expected_in": "11:00 AM",
        # Execute statement to process data and maintain state
        "expected_out": "10:00 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "11h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Present"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Half Day Shift (10:00 AM to 3:30 PM)",
        # Execute statement to process data and maintain state
        "in_h": 10, "in_m": 0,
        # Execute statement to process data and maintain state
        "out_h": 15, "out_m": 30,
        # Execute statement to process data and maintain state
        "expected_in": "10:00 AM",
        # Execute statement to process data and maintain state
        "expected_out": "03:30 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "5h 30m",
        # Execute statement to process data and maintain state
        "expected_status": "Half Day"
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    {
        # Execute statement to process data and maintain state
        "name": "Short Shift < 5 Hours (10:00 AM to 2:00 PM)",
        # Execute statement to process data and maintain state
        "in_h": 10, "in_m": 0,
        # Execute statement to process data and maintain state
        "out_h": 14, "out_m": 0,
        # Execute statement to process data and maintain state
        "expected_in": "10:00 AM",
        # Execute statement to process data and maintain state
        "expected_out": "02:00 PM",
        # Execute statement to process data and maintain state
        "expected_hours": "4h 00m",
        # Execute statement to process data and maintain state
        "expected_status": "Absent"
    # Execute statement to process data and maintain state
    },
# Execute statement to process data and maintain state
]

# Placeholder statement performing no operation
passed_count = 0
# Iterate through items in sequence loop
for i, s in enumerate(scenarios, 1):
    # Set test_date variable to store test date value
    test_date = date(2026, 10, 20)
    # 1. Employee punches in at local IST time
    p_in_ist = datetime(2026, 10, 20, s["in_h"], s["in_m"], 0, tzinfo=IST)
    # 2. Employee punches out at local IST time
    p_out_ist = datetime(2026, 10, 20, s["out_h"], s["out_m"], 0, tzinfo=IST)

    # 3. How the backend stores them in PostgreSQL (naive IST)
    p_in_db = p_in_ist.replace(tzinfo=None)
    # Set p_out_db variable to store p out db value
    p_out_db = p_out_ist.replace(tzinfo=None)

    # 4. Verify DB representation
    assert p_in_db.hour == s["in_h"] and p_in_db.minute == s["in_m"], "DB in-time hour/min mismatch"
    # Execute statement to process data and maintain state
    assert p_out_db.hour == s["out_h"] and p_out_db.minute == s["out_m"], "DB out-time hour/min mismatch"

    # 5. Read back through service layer
    in_dt = safe_parse_datetime(p_in_db)
    # Set out_dt variable to store out dt value
    out_dt = repair_utc_punch_out(in_dt, p_out_db, test_date)

    # Set in_formatted variable to store in formatted value
    in_formatted = safe_format_time(in_dt)
    # Set out_formatted variable to store out formatted value
    out_formatted = safe_format_time(out_dt)
    # Set res variable to store res value
    res = calculate_attendance_status(punch_in_time=in_dt, punch_out_time=out_dt, target_date=test_date)

    # Invoke print to perform operational action
    print(f"[{i}] {s['name']}")
    # Invoke print to perform operational action
    print(f"    DB In:  {p_in_db} -> Display: '{in_formatted}'")
    # Invoke print to perform operational action
    print(f"    DB Out: {p_out_db} -> Display: '{out_formatted}'")
    # Invoke print to perform operational action
    print(f"    Total Hours: {res['total_hours']} | Status: {res['status']}")

    # Execute statement to process data and maintain state
    assert in_formatted == s["expected_in"], f"Expected {s['expected_in']}, got {in_formatted}"
    # Execute statement to process data and maintain state
    assert out_formatted == s["expected_out"], f"Expected {s['expected_out']}, got {out_formatted}"
    # Execute statement to process data and maintain state
    assert res["total_hours"] == s["expected_hours"], f"Expected {s['expected_hours']}, got {res['total_hours']}"
    # Execute statement to process data and maintain state
    assert res["status"] == s["expected_status"], f"Expected {s['expected_status']}, got {res['status']}"
    # Placeholder statement performing no operation
    passed_count += 1
    # Invoke print to perform operational action
    print("    >>> PASS\n")

# ── SPECIAL SCENARIO: Active Punch In (Currently working, no punch out yet) ──
print("[9] Active Punch In (Employee currently working, no checkout yet)")
# Set p_in_active variable to store p in active value
p_in_active = datetime(2026, 10, 20, 10, 0, 0)
# Set in_dt_act variable to store in dt act value
in_dt_act = safe_parse_datetime(p_in_active)
# Set active_res variable to store active res value
active_res = calculate_attendance_status(
    # Set punch_in_time variable to store punch in time value
    punch_in_time=in_dt_act,
    # Set punch_out_time variable to store punch out time value
    punch_out_time=None,
    # Set target_date variable to store target date value
    target_date=date(2026, 10, 20),
    # Set now variable to store now value
    now=datetime(2026, 10, 20, 15, 0, 0, tzinfo=IST)
# Execute statement to process data and maintain state
)
# Invoke print to perform operational action
print(f"    Check In: '{safe_format_time(in_dt_act)}' | Check Out: '—'")
# Invoke print to perform operational action
print(f"    Status:   {active_res['status']} | Active: {active_res['is_active']}")
# Execute statement to process data and maintain state
assert active_res["status"] == "Punched In"
# Execute statement to process data and maintain state
assert active_res["is_active"] == True
# Placeholder statement performing no operation
passed_count += 1
# Invoke print to perform operational action
print("    >>> PASS\n")

# ── SPECIAL SCENARIO: Historical UTC Drift Healing (LE248 on 19 Oct 2026) ──
print("[10] Historical Drift Healing (LE248 on 19 Oct 2026 stored as 13:25 UTC)")
# Set p_in_old variable to store p in old value
p_in_old = datetime(2026, 10, 19, 10, 19, 0)
p_out_utc = datetime(2026, 10, 19, 13, 25, 0) # 1:25 PM UTC
# Set in_dt_old variable to store in dt old value
in_dt_old = safe_parse_datetime(p_in_old)
# Set out_dt_healed variable to store out dt healed value
out_dt_healed = repair_utc_punch_out(in_dt_old, p_out_utc, date(2026, 10, 19))
# Set healed_res variable to store healed res value
healed_res = calculate_attendance_status(punch_in_time=in_dt_old, punch_out_time=p_out_utc, target_date=date(2026, 10, 19))
# Invoke print to perform operational action
print(f"    Stored UTC: 01:25 PM -> Healed IST: '{safe_format_time(out_dt_healed)}'")
# Invoke print to perform operational action
print(f"    Total Hours: {healed_res['total_hours']}")
# Execute statement to process data and maintain state
assert safe_format_time(out_dt_healed) == "06:55 PM"
# Execute statement to process data and maintain state
assert healed_res["total_hours"] == "8h 36m"
# Placeholder statement performing no operation
passed_count += 1
# Invoke print to perform operational action
print("    >>> PASS\n")

# Invoke print to perform operational action
print("=" * 80)
# Invoke print to perform operational action
print(f"ALL {passed_count}/{passed_count} ATTENDANCE SCENARIOS PASSED WITH 100% ACCURACY IN IST!")
# Invoke print to perform operational action
print("=" * 80)
