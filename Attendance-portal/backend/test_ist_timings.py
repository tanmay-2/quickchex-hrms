import sys
from datetime import datetime, date, time
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

print("=" * 60)
print("TESTING IST PUNCH IN AND PUNCH OUT TIMINGS")
print("=" * 60)

# ── SCENARIO 1: User punches in at 9:30 AM IST and punches out at 4:30 PM IST ──
punch_in_ist = datetime(2026, 10, 20, 9, 30, 0, tzinfo=IST)
punch_out_ist = datetime(2026, 10, 20, 16, 30, 0, tzinfo=IST)

# How it is stored in PostgreSQL (naive TIMESTAMP WITHOUT TIME ZONE)
punch_in_db = punch_in_ist.replace(tzinfo=None)
punch_out_db = punch_out_ist.replace(tzinfo=None)

print(f"\n[Scenario 1] Punch In at 9:30 AM IST, Punch Out at 4:30 PM IST")
print(f"  Stored in DB punch_in_time:  {punch_in_db}")
print(f"  Stored in DB punch_out_time: {punch_out_db}")

# Parse and format back
in_dt = safe_parse_datetime(punch_in_db)
out_dt = repair_utc_punch_out(in_dt, punch_out_db, date(2026, 10, 20))

in_str = safe_format_time(in_dt, "—")
out_str = safe_format_time(out_dt, "—")
hours = safe_calc_hours(in_dt, out_dt, date(2026, 10, 20))
status_res = calculate_attendance_status(punch_in_time=in_dt, punch_out_time=out_dt, target_date=date(2026, 10, 20))

print(f"  Formatted Check In:   '{in_str}' (Expected: '09:30 AM')")
print(f"  Formatted Check Out:  '{out_str}' (Expected: '04:30 PM')")
print(f"  Total Working Hours:  {status_res['total_hours']} (Expected: '7h 00m')")
print(f"  Calculated Status:    {status_res['status']}")

assert in_str == "09:30 AM", f"Check in was {in_str}, expected 09:30 AM"
assert out_str == "04:30 PM", f"Check out was {out_str}, expected 04:30 PM"
assert status_res['total_hours'] == "7h 00m", f"Hours was {status_res['total_hours']}, expected 7h 00m"
assert hours == 7.0, f"Hours was {hours}, expected 7.0"
print("  >>> PASS: Scenario 1 accurate to Indian Standard Time!\n")

# ── SCENARIO 2: Punch in at 10:00 AM IST and Punch Out at 6:00 PM IST ──
punch_in_2 = datetime(2026, 10, 20, 10, 0, 0, tzinfo=IST).replace(tzinfo=None)
punch_out_2 = datetime(2026, 10, 20, 18, 0, 0, tzinfo=IST).replace(tzinfo=None)

in_dt_2 = safe_parse_datetime(punch_in_2)
out_dt_2 = repair_utc_punch_out(in_dt_2, punch_out_2, date(2026, 10, 20))
in_str_2 = safe_format_time(in_dt_2, "—")
out_str_2 = safe_format_time(out_dt_2, "—")
status_res_2 = calculate_attendance_status(punch_in_time=in_dt_2, punch_out_time=out_dt_2, target_date=date(2026, 10, 20))

print(f"[Scenario 2] Punch In at 10:00 AM IST, Punch Out at 6:00 PM IST")
print(f"  Formatted Check In:   '{in_str_2}' (Expected: '10:00 AM')")
print(f"  Formatted Check Out:  '{out_str_2}' (Expected: '06:00 PM')")
print(f"  Total Working Hours:  {status_res_2['total_hours']} (Expected: '8h 00m')")

assert in_str_2 == "10:00 AM"
assert out_str_2 == "06:00 PM"
assert status_res_2['total_hours'] == "8h 00m"
print("  >>> PASS: Scenario 2 accurate to Indian Standard Time!\n")

# ── SCENARIO 3: Punch in at 9:30 AM IST and Punch Out at 6:30 PM IST (Full Day 9 Hours) ──
punch_in_3 = datetime(2026, 10, 20, 9, 30, 0, tzinfo=IST).replace(tzinfo=None)
punch_out_3 = datetime(2026, 10, 20, 18, 30, 0, tzinfo=IST).replace(tzinfo=None)

in_dt_3 = safe_parse_datetime(punch_in_3)
out_dt_3 = repair_utc_punch_out(in_dt_3, punch_out_3, date(2026, 10, 20))
in_str_3 = safe_format_time(in_dt_3, "—")
out_str_3 = safe_format_time(out_dt_3, "—")
status_res_3 = calculate_attendance_status(punch_in_time=in_dt_3, punch_out_time=out_dt_3, target_date=date(2026, 10, 20))

print(f"[Scenario 3] Punch In at 9:30 AM IST, Punch Out at 6:30 PM IST (9 hrs Present)")
print(f"  Formatted Check In:   '{in_str_3}' (Expected: '09:30 AM')")
print(f"  Formatted Check Out:  '{out_str_3}' (Expected: '06:30 PM')")
print(f"  Total Working Hours:  {status_res_3['total_hours']} (Expected: '9h 00m')")
print(f"  Status:               {status_res_3['status']} (Expected: 'Present')")

assert in_str_3 == "09:30 AM"
assert out_str_3 == "06:30 PM"
assert status_res_3['total_hours'] == "9h 00m"
assert status_res_3['status'] == "Present"
print("  >>> PASS: Scenario 3 accurate to Indian Standard Time!\n")

# ── SCENARIO 4: Past Record with UTC drift (LE248 on 19 Oct 2026) ──
# In DB it was stored as 10:19 AM in and 01:25 PM out (because 18:55 IST - 5:30 was 13:25 UTC)
p_in_drift = datetime(2026, 10, 19, 10, 19, 0)
p_out_drift = datetime(2026, 10, 19, 13, 25, 0)

in_dt_drift = safe_parse_datetime(p_in_drift)
out_dt_drift = repair_utc_punch_out(in_dt_drift, p_out_drift, date(2026, 10, 19))
in_str_drift = safe_format_time(in_dt_drift, "—")
out_str_drift = safe_format_time(out_dt_drift, "—")
status_res_drift = calculate_attendance_status(punch_in_time=in_dt_drift, punch_out_time=out_dt_drift, target_date=date(2026, 10, 19))

print(f"[Scenario 4 - Healing Test] LE248 19 Oct 2026 record stored with UTC offset (13:25)")
print(f"  Healed Check In:      '{in_str_drift}' (Expected: '10:19 AM')")
print(f"  Healed Check Out:     '{out_str_drift}' (Expected: '06:55 PM')")
print(f"  Healed Working Hours: {status_res_drift['total_hours']} (Expected: '8h 36m')")

assert in_str_drift == "10:19 AM"
assert out_str_drift == "06:55 PM"
assert status_res_drift['total_hours'] == "8h 36m"
print("  >>> PASS: Scenario 4 accurately healed to Indian Standard Time!\n")

print("=" * 60)
print("ALL IST ATTENDANCE TIMING AND CALCULATION TESTS PASSED!")
print("=" * 60)
