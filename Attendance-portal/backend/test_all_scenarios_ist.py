# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_ALL_SCENARIOS_IST.PY
# Path: Attendance-portal/backend/test_all_scenarios_ist.py
# Purpose: Backend module.
# ==============================================================================

import sys
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from app.services.attendance_service import (
    get_ist_now,
    get_ist_today,
    safe_parse_datetime,
    safe_format_time,
    safe_calc_hours,
    calculate_attendance_status,
    repair_utc_punch_out,
    IST
)

print("=" * 80)
print("     COMPREHENSIVE TEST SUITE: 100% IST ATTENDANCE ENGINE (ALL SCENARIOS)")
print("=" * 80)

scenarios = [
    {
        "name": "Standard Shift (9:30 AM to 6:30 PM)",
        "in_h": 9, "in_m": 30,
        "out_h": 18, "out_m": 30,
        "expected_in": "09:30 AM",
        "expected_out": "06:30 PM",
        "expected_hours": "9h 00m",
        "expected_status": "Present"
    },
    {
        "name": "10:00 AM Login to 7:00 PM Logout",
        "in_h": 10, "in_m": 0,
        "out_h": 19, "out_m": 0,
        "expected_in": "10:00 AM",
        "expected_out": "07:00 PM",
        "expected_hours": "9h 00m",
        "expected_status": "Present"
    },
    {
        "name": "User Example: 9:30 AM to 4:30 PM",
        "in_h": 9, "in_m": 30,
        "out_h": 16, "out_m": 30,
        "expected_in": "09:30 AM",
        "expected_out": "04:30 PM",
        "expected_hours": "7h 00m",
        "expected_status": "Half Day"
    },
    {
        "name": "Early Morning Login (8:30 AM to 5:30 PM)",
        "in_h": 8, "in_m": 30,
        "out_h": 17, "out_m": 30,
        "expected_in": "08:30 AM",
        "expected_out": "05:30 PM",
        "expected_hours": "9h 00m",
        "expected_status": "Present"
    },
    {
        "name": "Late Evening Logout (10:30 AM to 8:30 PM)",
        "in_h": 10, "in_m": 30,
        "out_h": 20, "out_m": 30,
        "expected_in": "10:30 AM",
        "expected_out": "08:30 PM",
        "expected_hours": "10h 00m",
        "expected_status": "Present"
    },
    {
        "name": "Overtime / Night Logout (11:00 AM to 10:00 PM)",
        "in_h": 11, "in_m": 0,
        "out_h": 22, "out_m": 0,
        "expected_in": "11:00 AM",
        "expected_out": "10:00 PM",
        "expected_hours": "11h 00m",
        "expected_status": "Present"
    },
    {
        "name": "Half Day Shift (10:00 AM to 3:30 PM)",
        "in_h": 10, "in_m": 0,
        "out_h": 15, "out_m": 30,
        "expected_in": "10:00 AM",
        "expected_out": "03:30 PM",
        "expected_hours": "5h 30m",
        "expected_status": "Half Day"
    },
    {
        "name": "Short Shift < 5 Hours (10:00 AM to 2:00 PM)",
        "in_h": 10, "in_m": 0,
        "out_h": 14, "out_m": 0,
        "expected_in": "10:00 AM",
        "expected_out": "02:00 PM",
        "expected_hours": "4h 00m",
        "expected_status": "Absent"
    },
]

passed_count = 0
for i, s in enumerate(scenarios, 1):
    test_date = date(2026, 10, 20)
    # 1. Employee punches in at local IST time
    p_in_ist = datetime(2026, 10, 20, s["in_h"], s["in_m"], 0, tzinfo=IST)
    # 2. Employee punches out at local IST time
    p_out_ist = datetime(2026, 10, 20, s["out_h"], s["out_m"], 0, tzinfo=IST)

    # 3. How the backend stores them in PostgreSQL (naive IST)
    p_in_db = p_in_ist.replace(tzinfo=None)
    p_out_db = p_out_ist.replace(tzinfo=None)

    # 4. Verify DB representation
    assert p_in_db.hour == s["in_h"] and p_in_db.minute == s["in_m"], "DB in-time hour/min mismatch"
    assert p_out_db.hour == s["out_h"] and p_out_db.minute == s["out_m"], "DB out-time hour/min mismatch"

    # 5. Read back through service layer
    in_dt = safe_parse_datetime(p_in_db)
    out_dt = repair_utc_punch_out(in_dt, p_out_db, test_date)

    in_formatted = safe_format_time(in_dt)
    out_formatted = safe_format_time(out_dt)
    res = calculate_attendance_status(punch_in_time=in_dt, punch_out_time=out_dt, target_date=test_date)

    print(f"[{i}] {s['name']}")
    print(f"    DB In:  {p_in_db} -> Display: '{in_formatted}'")
    print(f"    DB Out: {p_out_db} -> Display: '{out_formatted}'")
    print(f"    Total Hours: {res['total_hours']} | Status: {res['status']}")

    assert in_formatted == s["expected_in"], f"Expected {s['expected_in']}, got {in_formatted}"
    assert out_formatted == s["expected_out"], f"Expected {s['expected_out']}, got {out_formatted}"
    assert res["total_hours"] == s["expected_hours"], f"Expected {s['expected_hours']}, got {res['total_hours']}"
    assert res["status"] == s["expected_status"], f"Expected {s['expected_status']}, got {res['status']}"
    passed_count += 1
    print("    >>> PASS\n")

# ── SPECIAL SCENARIO: Active Punch In (Currently working, no punch out yet) ──
print("[9] Active Punch In (Employee currently working, no checkout yet)")
p_in_active = datetime(2026, 10, 20, 10, 0, 0)
in_dt_act = safe_parse_datetime(p_in_active)
active_res = calculate_attendance_status(
    punch_in_time=in_dt_act,
    punch_out_time=None,
    target_date=date(2026, 10, 20),
    now=datetime(2026, 10, 20, 15, 0, 0, tzinfo=IST)
)
print(f"    Check In: '{safe_format_time(in_dt_act)}' | Check Out: '—'")
print(f"    Status:   {active_res['status']} | Active: {active_res['is_active']}")
assert active_res["status"] == "Punched In"
assert active_res["is_active"] == True
passed_count += 1
print("    >>> PASS\n")

# ── SPECIAL SCENARIO: Historical UTC Drift Healing (LE248 on 19 Oct 2026) ──
print("[10] Historical Drift Healing (LE248 on 19 Oct 2026 stored as 13:25 UTC)")
p_in_old = datetime(2026, 10, 19, 10, 19, 0)
p_out_utc = datetime(2026, 10, 19, 13, 25, 0) # 1:25 PM UTC
in_dt_old = safe_parse_datetime(p_in_old)
out_dt_healed = repair_utc_punch_out(in_dt_old, p_out_utc, date(2026, 10, 19))
healed_res = calculate_attendance_status(punch_in_time=in_dt_old, punch_out_time=p_out_utc, target_date=date(2026, 10, 19))
print(f"    Stored UTC: 01:25 PM -> Healed IST: '{safe_format_time(out_dt_healed)}'")
print(f"    Total Hours: {healed_res['total_hours']}")
assert safe_format_time(out_dt_healed) == "06:55 PM"
assert healed_res["total_hours"] == "8h 36m"
passed_count += 1
print("    >>> PASS\n")

print("=" * 80)
print(f"ALL {passed_count}/{passed_count} ATTENDANCE SCENARIOS PASSED WITH 100% ACCURACY IN IST!")
print("=" * 80)
