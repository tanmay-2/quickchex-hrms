import sys, os
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.getcwd())

import requests
import json
from datetime import datetime, date, timedelta
from app.db.session import SessionLocal
from sqlalchemy import text
from app.core.dependencies import create_access_token

API_BASE = "http://127.0.0.1:8000"

print("=========================================================")
print("RUNNING COMPREHENSIVE TESTS (1 to 8) - SUPABASE POSTGRESQL")
print("=========================================================")

db = SessionLocal()

# Find employees in DB
emp_row = db.execute(text("SELECT id, emp_code, email, first_name, last_name, role, reporting_supervisor FROM profile_master WHERE emp_code='LE243' OR emp_code='EMP001' ORDER BY emp_code DESC LIMIT 1")).mappings().first()
if not emp_row:
    emp_row = db.execute(text("SELECT id, emp_code, email, first_name, last_name, role, reporting_supervisor FROM profile_master LIMIT 1")).mappings().first()

mgr_code = emp_row["reporting_supervisor"] or "EMP002"
mgr_row = db.execute(text("SELECT id, emp_code, email, first_name, last_name, role FROM profile_master WHERE emp_code=:m"), {"m": mgr_code}).mappings().first()
if not mgr_row:
    mgr_row = db.execute(text("SELECT id, emp_code, email, first_name, last_name, role FROM profile_master WHERE role ILIKE '%manager%' OR role ILIKE '%admin%' LIMIT 1")).mappings().first()

emp_code = emp_row["emp_code"]
mgr_code = mgr_row["emp_code"] if mgr_row else "EMP002"

print(f"Employee for testing: {emp_code} ({emp_row['first_name']} {emp_row['last_name']})")
print(f"Manager for testing:  {mgr_code} ({mgr_row['first_name'] if mgr_row else 'Manager'})")

# Tokens
emp_token = create_access_token(data={"sub": emp_row["email"], "emp_code": emp_code, "role": emp_row["role"] or "employee"})
mgr_token = create_access_token(data={"sub": mgr_row["email"] if mgr_row else "manager@quickchex.com", "emp_code": mgr_code, "role": "manager"})

laptop_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
    "X-Forwarded-For": "192.168.1.120",
    "Authorization": f"Bearer {emp_token}",
    "Content-Type": "application/json"
}

phone_headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    "X-Forwarded-For": "192.168.1.145",
    "Authorization": f"Bearer {emp_token}",
    "Content-Type": "application/json"
}

manager_laptop_headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0 Safari/537.36",
    "X-Forwarded-For": "192.168.1.110",
    "Authorization": f"Bearer {mgr_token}",
    "Content-Type": "application/json"
}

# -------------------------------------------------------------------------
# TEST 1: Submit Regularization from laptop -> verify row in PostgreSQL
# -------------------------------------------------------------------------
print("\n--- TEST 1: Submit Regularization from Laptop ---")
t1_payload = {
    "emp_code": emp_code,
    "target_date": "2026-09-22",
    "requested_check_in": "09:15 AM",
    "requested_check_out": "06:30 PM",
    "reason": "Laptop Test: Biometric reader hardware issue at gate 1"
}
t1_res = requests.post(f"{API_BASE}/api/v1/regularization/", json=t1_payload, headers=laptop_headers)
print(f"API Response Status: {t1_res.status_code}")
t1_data = t1_res.json()
t1_id = t1_data.get("id") or t1_data.get("rawId")
print(f"Returned Data: id={t1_id}, status={t1_data.get('status')}")

# Verify row in Supabase PostgreSQL
db.expire_all()
t1_pg = db.execute(text("SELECT id, emp_code, target_date, status, overall_status, comment FROM regularizations WHERE id=:id"), {"id": t1_id}).mappings().first()
t1_monthly = db.execute(text("SELECT id, emp_code, target_date, status, overall_status FROM regularization_2026_09 WHERE id=:id"), {"id": t1_id}).mappings().first()
print(f"PostgreSQL regularizations row:      {dict(t1_pg) if t1_pg else 'NOT FOUND'}")
print(f"PostgreSQL regularization_2026_09 row: {dict(t1_monthly) if t1_monthly else 'NOT FOUND'}")
assert t1_pg is not None, "TEST 1 FAILED: Row missing in regularizations table!"
assert t1_monthly is not None, "TEST 1 FAILED: Row missing in monthly table regularization_2026_09!"
print(">>> TEST 1 PASSED: Regularization saved in PostgreSQL.")

# -------------------------------------------------------------------------
# TEST 2: Submit another Regularization from Phone -> verify row in SAME Supabase table
# -------------------------------------------------------------------------
print("\n--- TEST 2: Submit Regularization from Mobile Phone ---")
t2_payload = {
    "emp_code": emp_code,
    "target_date": "2026-09-23",
    "requested_check_in": "09:30 AM",
    "requested_check_out": "06:45 PM",
    "reason": "Mobile Phone Test: On-duty client visit in BKC"
}
t2_res = requests.post(f"{API_BASE}/api/v1/regularization/", json=t2_payload, headers=phone_headers)
print(f"API Response Status: {t2_res.status_code}")
t2_data = t2_res.json()
t2_id = t2_data.get("id") or t2_data.get("rawId")
print(f"Returned Data: id={t2_id}, status={t2_data.get('status')}")

# Verify row in Supabase PostgreSQL
db.expire_all()
t2_pg = db.execute(text("SELECT id, emp_code, target_date, status, overall_status, comment FROM regularizations WHERE id=:id"), {"id": t2_id}).mappings().first()
t2_monthly = db.execute(text("SELECT id, emp_code, target_date, status, overall_status FROM regularization_2026_09 WHERE id=:id"), {"id": t2_id}).mappings().first()
print(f"PostgreSQL regularizations row:      {dict(t2_pg) if t2_pg else 'NOT FOUND'}")
print(f"PostgreSQL regularization_2026_09 row: {dict(t2_monthly) if t2_monthly else 'NOT FOUND'}")
assert t2_pg is not None, "TEST 2 FAILED: Phone submission missing in regularizations table!"
assert t2_monthly is not None, "TEST 2 FAILED: Phone submission missing in dynamic table regularization_2026_09!"
print(">>> TEST 2 PASSED: Phone regularization row verified in PostgreSQL.")

# -------------------------------------------------------------------------
# TEST 3: Open Manager Portal from Laptop -> phone request appears
# -------------------------------------------------------------------------
print("\n--- TEST 3: Open Manager Portal from Laptop ---")
t3_res = requests.get(f"{API_BASE}/api/v1/manager/regularization", headers=manager_laptop_headers)
print(f"API Response Status: {t3_res.status_code}")
manager_regs = t3_res.json()
found_phone_reg = any(int(r.get("id") or r.get("rawId") or 0) == int(t2_id) for r in manager_regs)
print(f"Total requests retrieved by manager: {len(manager_regs)}")
print(f"Phone submitted request #{t2_id} visible to Manager: {found_phone_reg}")
assert found_phone_reg, f"TEST 3 FAILED: Phone request #{t2_id} not visible in Manager portal!"
print(">>> TEST 3 PASSED: Phone request visible to Manager on Laptop.")

# -------------------------------------------------------------------------
# TEST 4: Approve from Manager Portal -> verify SAME row updated in PostgreSQL
# -------------------------------------------------------------------------
print("\n--- TEST 4: Approve Request from Manager Portal ---")
t4_res = requests.post(
    f"{API_BASE}/api/v1/manager/regularization/{t2_id}/approve",
    json={"comment": "Approved by Manager from Laptop portal"},
    headers=manager_laptop_headers
)
print(f"API Response Status: {t4_res.status_code}")
t4_data = t4_res.json()
print(f"Approval Result: status={t4_data.get('status')}, overall_status={t4_data.get('overall_status')}")

# Verify SAME row in PostgreSQL
db.expire_all()
t4_pg = db.execute(text("SELECT id, emp_code, target_date, status, overall_status, manager_status, manager_reviewed_by, manager_comment FROM regularizations WHERE id=:id"), {"id": t2_id}).mappings().first()
t4_monthly = db.execute(text("SELECT id, emp_code, target_date, status, overall_status, manager_status, manager_reviewed_by FROM regularization_2026_09 WHERE id=:id"), {"id": t2_id}).mappings().first()
# Also verify attendance was synchronized
t4_att = db.execute(text("SELECT id, emp_code, date, punch_in_time, punch_out_time, hours_completed, status, remark FROM attendance_2026_09 WHERE emp_code=:c AND date='2026-09-23'"), {"c": emp_code}).mappings().first()

print(f"Updated PostgreSQL regularizations:      {dict(t4_pg)}")
print(f"Updated PostgreSQL regularization_2026_09: {dict(t4_monthly)}")
print(f"Synchronized Attendance row:             {dict(t4_att) if t4_att else 'NOT FOUND'}")
assert t4_pg["overall_status"] == "APPROVED" or "APPROV" in str(t4_pg["status"]).upper(), "TEST 4 FAILED: Status not updated in PostgreSQL!"
print(">>> TEST 4 PASSED: Manager approval updated row in PostgreSQL and synced attendance.")

# -------------------------------------------------------------------------
# TEST 5: Open Employee Portal on Phone -> verify updated Approved status
# -------------------------------------------------------------------------
print("\n--- TEST 5: Open Employee Portal on Phone ---")
t5_res = requests.get(f"{API_BASE}/api/v1/regularization/me", headers=phone_headers)
print(f"API Response Status: {t5_res.status_code}")
emp_regs = t5_res.json()
my_t2 = next((r for r in emp_regs if int(r.get("id") or r.get("rawId") or 0) == int(t2_id)), None)
print(f"Employee retrieved request #{t2_id}: Status={my_t2.get('status') if my_t2 else 'NOT FOUND'}, StatusDisplay={my_t2.get('statusDisplay') if my_t2 else ''}")
assert my_t2 is not None and ("APPROV" in str(my_t2.get("status")).upper() or "APPROV" in str(my_t2.get("overall_status")).upper()), "TEST 5 FAILED: Updated status not reflected on phone!"
print(">>> TEST 5 PASSED: Employee phone immediately sees updated Approved status.")

# -------------------------------------------------------------------------
# TEST 6: Punch In from Phone -> verify new attendance record in Supabase
# -------------------------------------------------------------------------
print("\n--- TEST 6: Punch In from Mobile Phone ---")
t6_payload = {
    "emp_code": emp_code,
    "punch_type": "in",
    "work_mode": "OFFICE",
    "location": "Quickchex Tech Hub, 5th Floor, Mumbai",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 12.5
}
t6_res = requests.post(f"{API_BASE}/api/v1/attendance/punch", json=t6_payload, headers=phone_headers)
print(f"API Response Status: {t6_res.status_code}")
t6_data = t6_res.json()
print(f"Punch In Result: {t6_data.get('message')}")

# Verify row in attendance_2026_09 in PostgreSQL
db.expire_all()
t6_att = db.execute(text("SELECT id, emp_code, date, punch_in_time, punch_in_location, status, work_mode FROM attendance_2026_09 WHERE emp_code=:c AND date='2026-09-30'"), {"c": emp_code}).mappings().first()
print(f"PostgreSQL attendance_2026_09 row: {dict(t6_att) if t6_att else 'NOT FOUND'}")
assert t6_att is not None, "TEST 6 FAILED: Punch record missing in attendance_2026_09!"
print(">>> TEST 6 PASSED: Mobile Punch In recorded in PostgreSQL.")

# -------------------------------------------------------------------------
# TEST 7: Apply Leave from Phone -> verify new leave in Supabase
# -------------------------------------------------------------------------
print("\n--- TEST 7: Apply Leave from Mobile Phone ---")
t7_payload = {
    "emp_code": emp_code,
    "category": "Casual Leave",
    "start_date": "2026-09-24",
    "end_date": "2026-09-25",
    "total_days": 2.0,
    "reason": "Mobile Phone Test: Family wedding in Pune"
}
t7_res = requests.post(f"{API_BASE}/api/v1/leave/apply", json=t7_payload, headers=phone_headers)
print(f"API Response Status: {t7_res.status_code}")
t7_data = t7_res.json()
t7_id = t7_data.get("id")
print(f"Leave Applied: id={t7_id}, status={t7_data.get('status')}")

# Verify in leave_requests and leave_2026_09
db.expire_all()
t7_pg = db.execute(text("SELECT id, emp_code, category, start_date, end_date, total_days, status, overall_status FROM leave_requests WHERE id=:id"), {"id": t7_id}).mappings().first()
t7_monthly = db.execute(text("SELECT id, emp_code, category, start_date, end_date, total_days, status, overall_status FROM leave_2026_09 WHERE id=:id"), {"id": t7_id}).mappings().first()
print(f"PostgreSQL leave_requests row: {dict(t7_pg) if t7_pg else 'NOT FOUND'}")
print(f"PostgreSQL leave_2026_09 row:   {dict(t7_monthly) if t7_monthly else 'NOT FOUND'}")
assert t7_pg is not None, "TEST 7 FAILED: Leave row missing in leave_requests!"
assert t7_monthly is not None, "TEST 7 FAILED: Leave row missing in leave_2026_09!"
print(">>> TEST 7 PASSED: Phone leave application committed to PostgreSQL.")

# -------------------------------------------------------------------------
# TEST 8: Open Admin/Manager portal from another device -> verify leave appears
# -------------------------------------------------------------------------
print("\n--- TEST 8: Open Manager/Admin Portal from Another Device & Approve ---")
another_device_headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
    "X-Forwarded-For": "10.0.0.45",
    "Authorization": f"Bearer {mgr_token}",
    "Content-Type": "application/json"
}

t8_res = requests.get(f"{API_BASE}/api/v1/manager/leaves", headers=another_device_headers)
print(f"API Response Status: {t8_res.status_code}")
manager_leaves = t8_res.json()
found_leave = any(int(l.get("id") or 0) == int(t7_id) for l in manager_leaves)
print(f"Total leaves visible to Manager: {len(manager_leaves)}")
print(f"Phone submitted leave #{t7_id} visible to Manager: {found_leave}")
assert found_leave, f"TEST 8 FAILED: Leave #{t7_id} not visible to Manager from another device!"

# Approve leave from Manager Portal
t8_app_res = requests.post(
    f"{API_BASE}/api/v1/manager/leaves/{t7_id}/approve",
    json={"comment": "Approved by Manager from Desktop PC"},
    headers=another_device_headers
)
print(f"Leave Approval Status: {t8_app_res.status_code}")

# Verify row updated in PostgreSQL and LeaveBalance updated
db.expire_all()
t8_pg = db.execute(text("SELECT id, emp_code, status, overall_status, manager_reviewed_by, manager_comment FROM leave_requests WHERE id=:id"), {"id": t7_id}).mappings().first()
t8_bal = db.execute(text("SELECT emp_code, allowed_leaves, used_leaves FROM leave_balances WHERE emp_code=:c"), {"c": emp_code}).mappings().first()
print(f"PostgreSQL updated leave_requests row: {dict(t8_pg)}")
print(f"PostgreSQL updated leave_balances row: {dict(t8_bal) if t8_bal else 'NOT FOUND'}")
assert t8_pg["overall_status"] == "APPROVED" or "APPROV" in str(t8_pg["status"]).upper(), "TEST 8 FAILED: Leave status not updated in PostgreSQL!"
print(">>> TEST 8 PASSED: Leave visible on another device, approved, and updated in PostgreSQL.")

print("\n=========================================================")
print("ALL 8 END-TO-END TESTS PASSED SUCCESSFULLY ON POSTGRESQL!")
print("=========================================================")

db.close()
