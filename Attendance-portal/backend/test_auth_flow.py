# ==============================================================================
# QUICKCHEX HRMS BACKEND - TEST_AUTH_FLOW.PY
# Path: Attendance-portal/backend/test_auth_flow.py
# Purpose: Backend module.
# Primary Functions:
#   • run_tests()
# ==============================================================================

# Import module os for system functionality
import os
# Import module sys for system functionality
import sys

# Invoke sys.path.insert to perform operational action
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import TestClient from fastapi.testclient for module operations
from fastapi.testclient import TestClient
# Import app from app.main for module operations
from app.main import app
# Import SessionLocal from app.db.session for module operations
from app.db.session import SessionLocal
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password
# Import get_latest_otp from app.repositories.otp_repo for module operations
from app.repositories.otp_repo import get_latest_otp

# Set client variable to store client value
client = TestClient(app)

# Define run_tests function to handle run tests
def run_tests():
    # Invoke print to perform operational action
    print("\n--- TEST 1: Login with default password Welcome@123 ---")
    # Set roles_to_test variable to store roles to test value
    roles_to_test = [
        # Execute statement to process data and maintain state
        ("Admin", "aaquib.k@laesfera.co", "Welcome@123"),
        # Execute statement to process data and maintain state
        ("Manager", "kevin.john@laesfera.co", "Welcome@123"),
        # Execute statement to process data and maintain state
        ("Employee", "janhavi.s@laesfera.co", "Welcome@123")
    # Execute statement to process data and maintain state
    ]

    # Iterate through items in sequence loop
    for role_name, email, pwd in roles_to_test:
        # Set resp variable to store resp value
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        # Invoke print to perform operational action
        print(f"[{role_name}] Login status: {resp.status_code}")
        # Execute statement to process data and maintain state
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        # Set data variable to store data value
        data = resp.json()
        # Invoke print to perform operational action
        print(f"[{role_name}] must_change_password: {data.get('must_change_password')}")
        # Execute statement to process data and maintain state
        assert data.get("must_change_password") is True, f"Expected must_change_password=True for {email}"

    # Invoke print to perform operational action
    print("\n--- TEST 2: Verify OTP returns must_change_password = True ---")
    # Set db variable to store db value
    db = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Set otp_record variable to store otp record value
        otp_record = get_latest_otp(db, "janhavi.s@laesfera.co")
        # Execute statement to process data and maintain state
        assert otp_record, "Expected the login flow to store an OTP"
        # Execute statement to process data and maintain state
        otp_record.otp = "654321"
        # Commit transaction to persist changes in database
        db.commit()
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()

    # Set invalid_otp_resp variable to store invalid otp resp value
    invalid_otp_resp = client.post("/api/v1/auth/verify-otp", json={
        # Execute statement to process data and maintain state
        "email": "janhavi.s@laesfera.co",
        # Execute statement to process data and maintain state
        "otp": "123456"
    # Execute statement to process data and maintain state
    })
    # Execute statement to process data and maintain state
    assert invalid_otp_resp.status_code == 400, "The legacy master OTP must be rejected"

    # Set otp_resp variable to store otp resp value
    otp_resp = client.post("/api/v1/auth/verify-otp", json={
        # Execute statement to process data and maintain state
        "email": "janhavi.s@laesfera.co",
        # Execute statement to process data and maintain state
        "otp": "654321"
    # Execute statement to process data and maintain state
    })
    # Invoke print to perform operational action
    print(f"Verify OTP status: {otp_resp.status_code}")
    # Execute statement to process data and maintain state
    assert otp_resp.status_code == 200, f"OTP verification failed: {otp_resp.text}"
    # Set otp_data variable to store otp data value
    otp_data = otp_resp.json()
    # Invoke print to perform operational action
    print(f"Token received: {'Yes' if otp_data.get('access_token') else 'No'}")
    # Invoke print to perform operational action
    print(f"must_change_password in OTP response: {otp_data.get('must_change_password')}")
    # Execute statement to process data and maintain state
    assert otp_data.get("must_change_password") is True, "must_change_password was not True in OTP response"

    # Invoke print to perform operational action
    print("\n--- TEST 3: Password Reset Requires Authentication ---")
    # Set reset_payload variable to store reset payload value
    reset_payload = {
        # Execute statement to process data and maintain state
        "email": "janhavi.s@laesfera.co",
        # Execute statement to process data and maintain state
        "new_password": "JanhaviNew@2026"
    # Execute statement to process data and maintain state
    }
    # Set unauthenticated_resp variable to store unauthenticated resp value
    unauthenticated_resp = client.post("/api/v1/auth/recover-password", json=reset_payload)
    # Execute statement to process data and maintain state
    assert unauthenticated_resp.status_code == 401, "Password reset must require an access token"

    # Set auth_headers variable to store auth headers value
    auth_headers = {"Authorization": f"Bearer {otp_data['access_token']}"}

    # Set cross_account_resp variable to store cross account resp value
    cross_account_resp = client.post(
        # Execute statement to process data and maintain state
        "/api/v1/auth/recover-password",
        # Set json variable to store json value
        json={"email": "EMP002", "new_password": "JanhaviNew@2026"},
        # Set headers variable to store headers value
        headers=auth_headers
    # Execute statement to process data and maintain state
    )
    # Execute statement to process data and maintain state
    assert cross_account_resp.status_code == 403, "A user must not reset another account's password"

    # Invoke print to perform operational action
    print("\n--- TEST 4: Authenticated Password Validation ---")
    # 3a: Cannot use Welcome@123
    bad_resp1 = client.post("/api/v1/auth/recover-password", json={
        # Execute statement to process data and maintain state
        "email": "janhavi.s@laesfera.co",
        # Execute statement to process data and maintain state
        "new_password": "Welcome@123"
    # Execute statement to process data and maintain state
    }, headers=auth_headers)
    # Invoke print to perform operational action
    print(f"Reject default password 'Welcome@123' status: {bad_resp1.status_code} ({bad_resp1.json().get('detail')})")
    # Execute statement to process data and maintain state
    assert bad_resp1.status_code == 400, "Should reject Welcome@123"

    # 3b: Minimum 6 chars
    bad_resp2 = client.post("/api/v1/auth/recover-password", json={
        # Execute statement to process data and maintain state
        "email": "janhavi.s@laesfera.co",
        # Execute statement to process data and maintain state
        "new_password": "123"
    # Execute statement to process data and maintain state
    }, headers=auth_headers)
    # Invoke print to perform operational action
    print(f"Reject short password (< 6 chars) status: {bad_resp2.status_code} ({bad_resp2.json().get('detail')})")
    # Execute statement to process data and maintain state
    assert bad_resp2.status_code == 400, "Should reject short password"

    # 3c: Valid update by emp_code
    good_resp = client.post("/api/v1/auth/recover-password", json={
        # Execute statement to process data and maintain state
        "email": "EMP001",
        # Execute statement to process data and maintain state
        "new_password": "JanhaviNew@2026"
    # Execute statement to process data and maintain state
    }, headers=auth_headers)
    # Invoke print to perform operational action
    print(f"Update by emp_code EMP001 status: {good_resp.status_code}")
    # Execute statement to process data and maintain state
    assert good_resp.status_code == 200, f"Failed updating password: {good_resp.text}"
    # Set good_data variable to store good data value
    good_data = good_resp.json()
    # Execute statement to process data and maintain state
    assert good_data.get("must_change_password") is False

    # Verify in DB
    db = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        user = db.query(Profile).filter(Profile.emp_code == "EMP001").first()
        # Invoke print to perform operational action
        print(f"DB verification: user.must_change_password is {user.must_change_password}")
        # Execute statement to process data and maintain state
        assert user.must_change_password is False

        # Reset EMP001 back to Welcome@123 / True for consistency
        user.password_hash = hash_password("Welcome@123")
        # Execute statement to process data and maintain state
        user.must_change_password = True
        # Commit transaction to persist changes in database
        db.commit()
        # Invoke print to perform operational action
        print("EMP001 reset back to Welcome@123 / must_change_password=True for testing.")
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()

    # Invoke print to perform operational action
    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

# Evaluate condition to control execution branch
if __name__ == "__main__":
    # Invoke run_tests to perform operational action
    run_tests()
