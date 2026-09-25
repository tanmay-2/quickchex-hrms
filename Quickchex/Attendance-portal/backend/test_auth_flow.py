import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.profile_model import Profile
from app.core.security import hash_password

client = TestClient(app)

def run_tests():
    print("\n--- TEST 1: Login with default password Welcome@123 ---")
    roles_to_test = [
        ("Admin", "aaquib.k@laesfera.co", "Welcome@123"),
        ("Manager", "kevin.john@laesfera.co", "Welcome@123"),
        ("Employee", "janhavi.s@laesfera.co", "Welcome@123")
    ]

    for role_name, email, pwd in roles_to_test:
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        print(f"[{role_name}] Login status: {resp.status_code}")
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        data = resp.json()
        print(f"[{role_name}] must_change_password: {data.get('must_change_password')}")
        assert data.get("must_change_password") is True, f"Expected must_change_password=True for {email}"

    print("\n--- TEST 2: Verify OTP returns must_change_password = True ---")
    otp_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": "janhavi.s@laesfera.co",
        "otp": "123456"
    })
    print(f"Verify OTP status: {otp_resp.status_code}")
    assert otp_resp.status_code == 200, f"OTP verification failed: {otp_resp.text}"
    otp_data = otp_resp.json()
    print(f"Token received: {'Yes' if otp_data.get('access_token') else 'No'}")
    print(f"must_change_password in OTP response: {otp_data.get('must_change_password')}")
    assert otp_data.get("must_change_password") is True, "must_change_password was not True in OTP response"

    print("\n--- TEST 3: Recover Password Validation Checks ---")
    # 3a: Cannot use Welcome@123
    bad_resp1 = client.post("/api/v1/auth/recover-password", json={
        "email": "janhavi.s@laesfera.co",
        "new_password": "Welcome@123"
    })
    print(f"Reject default password 'Welcome@123' status: {bad_resp1.status_code} ({bad_resp1.json().get('detail')})")
    assert bad_resp1.status_code == 400, "Should reject Welcome@123"

    # 3b: Minimum 6 chars
    bad_resp2 = client.post("/api/v1/auth/recover-password", json={
        "email": "janhavi.s@laesfera.co",
        "new_password": "123"
    })
    print(f"Reject short password (< 6 chars) status: {bad_resp2.status_code} ({bad_resp2.json().get('detail')})")
    assert bad_resp2.status_code == 400, "Should reject short password"

    # 3c: Valid update by emp_code
    good_resp = client.post("/api/v1/auth/recover-password", json={
        "email": "EMP001",
        "new_password": "JanhaviNew@2026"
    })
    print(f"Update by emp_code EMP001 status: {good_resp.status_code}")
    assert good_resp.status_code == 200, f"Failed updating password: {good_resp.text}"
    good_data = good_resp.json()
    assert good_data.get("must_change_password") is False

    # Verify in DB
    db = SessionLocal()
    try:
        user = db.query(Profile).filter(Profile.emp_code == "EMP001").first()
        print(f"DB verification: user.must_change_password is {user.must_change_password}")
        assert user.must_change_password is False

        # Reset EMP001 back to Welcome@123 / True for consistency
        user.password_hash = hash_password("Welcome@123")
        user.must_change_password = True
        db.commit()
        print("EMP001 reset back to Welcome@123 / must_change_password=True for testing.")
    finally:
        db.close()

    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    run_tests()
