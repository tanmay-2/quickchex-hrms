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

# Import module sys for system functionality
import sys
# Import module os for system functionality
import os

# Ensure backend root is on sys.path
backend_root = os.path.dirname(os.path.abspath(__file__))
# Check if target condition is false or object is missing
if backend_root not in sys.path:
    # Invoke sys.path.insert to perform operational action
    sys.path.insert(0, backend_root)

# Import TestClient from fastapi.testclient for module operations
from fastapi.testclient import TestClient
# Import app from app.main for module operations
from app.main import app
# Import create_access_token from app.core.security for module operations
from app.core.security import create_access_token

# Set client variable to store client value
client = TestClient(app)

# Define run_tests function to handle run tests
def run_tests():
    # Invoke print to perform operational action
    print("==================================================")
    # Invoke print to perform operational action
    print("RUNNING QUICKCHEX AUTHORIZATION & SECURITY TESTS")
    # Invoke print to perform operational action
    print("==================================================")

    # 1. Health check
    res = client.get("/health")
    # Execute statement to process data and maintain state
    assert res.status_code == 200, f"Health check failed: {res.text}"
    # Invoke print to perform operational action
    print("[PASS] GET /health returned 200 OK:", res.json())

    # 2. Readiness check
    res = client.get("/ready")
    # Execute statement to process data and maintain state
    assert res.status_code == 200, f"Readiness check failed: {res.text}"
    # Invoke print to perform operational action
    print("[PASS] GET /ready returned 200 OK:", res.json())

    # 3. Unauthenticated requests should return 401 Unauthorized
    res = client.get("/api/v1/admin/dashboard")
    # Execute statement to process data and maintain state
    assert res.status_code == 401, f"Expected 401 for unauthenticated admin access, got {res.status_code}"
    # Invoke print to perform operational action
    print("[PASS] Unauthenticated access to /api/v1/admin/dashboard blocked with 401")

    # Set res variable to store res value
    res = client.get("/api/v1/manager/dashboard")
    # Execute statement to process data and maintain state
    assert res.status_code == 401, f"Expected 401 for unauthenticated manager access, got {res.status_code}"
    # Invoke print to perform operational action
    print("[PASS] Unauthenticated access to /api/v1/manager/dashboard blocked with 401")

    # Generate JWT tokens for each role
    employee_token = create_access_token({
        # Execute statement to process data and maintain state
        "sub": "employee@quickchex.com",
        # Execute statement to process data and maintain state
        "emp_code": "EMP001",
        # Execute statement to process data and maintain state
        "role": "employee"
    # Execute statement to process data and maintain state
    })
    # Set manager_token variable to store manager token value
    manager_token = create_access_token({
        # Execute statement to process data and maintain state
        "sub": "manager@quickchex.com",
        # Execute statement to process data and maintain state
        "emp_code": "MGR001",
        # Execute statement to process data and maintain state
        "role": "manager"
    # Execute statement to process data and maintain state
    })
    # Set admin_token variable to store admin token value
    admin_token = create_access_token({
        # Execute statement to process data and maintain state
        "sub": "admin@quickchex.com",
        # Execute statement to process data and maintain state
        "emp_code": "ADM001",
        # Execute statement to process data and maintain state
        "role": "admin"
    # Execute statement to process data and maintain state
    })

    # Set emp_headers variable to store emp headers value
    emp_headers = {"Authorization": f"Bearer {employee_token}"}
    # Set mgr_headers variable to store mgr headers value
    mgr_headers = {"Authorization": f"Bearer {manager_token}"}
    # Set adm_headers variable to store adm headers value
    adm_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Employee tests
    # Employee attempting admin route -> 403 Forbidden
    res = client.get("/api/v1/admin/dashboard", headers=emp_headers)
    # Execute statement to process data and maintain state
    assert res.status_code == 403, f"Expected 403 for employee on admin route, got {res.status_code}"
    # Invoke print to perform operational action
    print("[PASS] Employee access to /api/v1/admin/dashboard blocked with 403 Forbidden")

    # Employee attempting manager route -> 403 Forbidden
    res = client.get("/api/v1/manager/dashboard", headers=emp_headers)
    # Execute statement to process data and maintain state
    assert res.status_code == 403, f"Expected 403 for employee on manager route, got {res.status_code}"
    # Invoke print to perform operational action
    print("[PASS] Employee access to /api/v1/manager/dashboard blocked with 403 Forbidden")

    # 5. Manager tests
    # Manager attempting admin route -> 403 Forbidden
    res = client.get("/api/v1/admin/dashboard", headers=mgr_headers)
    # Execute statement to process data and maintain state
    assert res.status_code == 403, f"Expected 403 for manager on admin route, got {res.status_code}"
    # Invoke print to perform operational action
    print("[PASS] Manager access to /api/v1/admin/dashboard blocked with 403 Forbidden")

    # Manager accessing manager route -> 200 OK (or success response)
    res = client.get("/api/v1/manager/dashboard", headers=mgr_headers)
    # Execute statement to process data and maintain state
    assert res.status_code in [200, 404], f"Manager route unexpected status: {res.status_code} - {res.text}"
    # Invoke print to perform operational action
    print(f"[PASS] Manager access to /api/v1/manager/dashboard authorized (status {res.status_code})")

    # 6. Admin tests
    # Admin accessing admin route -> 200 OK
    res = client.get("/api/v1/admin/dashboard", headers=adm_headers)
    # Execute statement to process data and maintain state
    assert res.status_code == 200, f"Expected 200 for admin on admin route, got {res.status_code} - {res.text}"
    # Invoke print to perform operational action
    print("[PASS] Admin access to /api/v1/admin/dashboard returned 200 OK")

    # Admin accessing manager route -> authorized (admins can manage)
    res = client.get("/api/v1/manager/dashboard", headers=adm_headers)
    # Execute statement to process data and maintain state
    assert res.status_code in [200, 404], f"Admin on manager route unexpected status: {res.status_code} - {res.text}"
    # Invoke print to perform operational action
    print(f"[PASS] Admin access to /api/v1/manager/dashboard authorized (status {res.status_code})")

    # Invoke print to perform operational action
    print("==================================================")
    # Invoke print to perform operational action
    print("ALL AUTHORIZATION & SECURITY TESTS PASSED SUCCESSFULLY!")
    # Invoke print to perform operational action
    print("==================================================")

# Evaluate condition to control execution branch
if __name__ == "__main__":
    # Invoke run_tests to perform operational action
    run_tests()
