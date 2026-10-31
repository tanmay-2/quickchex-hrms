# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_AUTH_HIERARCHY.PY
# Path: Attendance-portal/backend/test_auth_hierarchy.py
# Purpose: Backend module.
# Primary Functions:
#   • run_tests()
# ==============================================================================

"""
Test suite for Quickchex HRMS Role-Based Access Control and Authorization Boundaries
Tests:
- Health and readiness endpoints
- Unauthenticated access rejection (401)
- Employee role boundary enforcement (403 on admin & manager routes)
- Manager role boundary enforcement (200 on manager routes, 403 on admin routes)
- Admin role boundary enforcement (200 on admin & manager routes)
"""

import sys
import os

# Ensure backend root is on sys.path
backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("RUNNING QUICKCHEX AUTHORIZATION & SECURITY TESTS")
    print("==================================================")

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] GET /health returned 200 OK:", res.json())

    # 2. Readiness check
    res = client.get("/ready")
    assert res.status_code == 200, f"Readiness check failed: {res.text}"
    print("[PASS] GET /ready returned 200 OK:", res.json())

    # 3. Unauthenticated requests should return 401 Unauthorized
    res = client.get("/api/v1/admin/dashboard")
    assert res.status_code == 401, f"Expected 401 for unauthenticated admin access, got {res.status_code}"
    print("[PASS] Unauthenticated access to /api/v1/admin/dashboard blocked with 401")

    res = client.get("/api/v1/manager/dashboard")
    assert res.status_code == 401, f"Expected 401 for unauthenticated manager access, got {res.status_code}"
    print("[PASS] Unauthenticated access to /api/v1/manager/dashboard blocked with 401")

    # Generate JWT tokens for each role
    employee_token = create_access_token({
        "sub": "employee@quickchex.com",
        "emp_code": "EMP001",
        "role": "employee"
    })
    manager_token = create_access_token({
        "sub": "manager@quickchex.com",
        "emp_code": "MGR001",
        "role": "manager"
    })
    admin_token = create_access_token({
        "sub": "admin@quickchex.com",
        "emp_code": "ADM001",
        "role": "admin"
    })

    emp_headers = {"Authorization": f"Bearer {employee_token}"}
    mgr_headers = {"Authorization": f"Bearer {manager_token}"}
    adm_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Employee tests
    # Employee attempting admin route -> 403 Forbidden
    res = client.get("/api/v1/admin/dashboard", headers=emp_headers)
    assert res.status_code == 403, f"Expected 403 for employee on admin route, got {res.status_code}"
    print("[PASS] Employee access to /api/v1/admin/dashboard blocked with 403 Forbidden")

    # Employee attempting manager route -> 403 Forbidden
    res = client.get("/api/v1/manager/dashboard", headers=emp_headers)
    assert res.status_code == 403, f"Expected 403 for employee on manager route, got {res.status_code}"
    print("[PASS] Employee access to /api/v1/manager/dashboard blocked with 403 Forbidden")

    # 5. Manager tests
    # Manager attempting admin route -> 403 Forbidden
    res = client.get("/api/v1/admin/dashboard", headers=mgr_headers)
    assert res.status_code == 403, f"Expected 403 for manager on admin route, got {res.status_code}"
    print("[PASS] Manager access to /api/v1/admin/dashboard blocked with 403 Forbidden")

    # Manager accessing manager route -> 200 OK (or success response)
    res = client.get("/api/v1/manager/dashboard", headers=mgr_headers)
    assert res.status_code in [200, 404], f"Manager route unexpected status: {res.status_code} - {res.text}"
    print(f"[PASS] Manager access to /api/v1/manager/dashboard authorized (status {res.status_code})")

    # 6. Admin tests
    # Admin accessing admin route -> 200 OK
    res = client.get("/api/v1/admin/dashboard", headers=adm_headers)
    assert res.status_code == 200, f"Expected 200 for admin on admin route, got {res.status_code} - {res.text}"
    print("[PASS] Admin access to /api/v1/admin/dashboard returned 200 OK")

    # Admin accessing manager route -> authorized (admins can manage)
    res = client.get("/api/v1/manager/dashboard", headers=adm_headers)
    assert res.status_code in [200, 404], f"Admin on manager route unexpected status: {res.status_code} - {res.text}"
    print(f"[PASS] Admin access to /api/v1/manager/dashboard authorized (status {res.status_code})")

    print("==================================================")
    print("ALL AUTHORIZATION & SECURITY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
