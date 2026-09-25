import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.otp import OTP

client = TestClient(app)

def get_otp(email):
    db = SessionLocal()
    rec = db.query(OTP).filter(OTP.email == email).order_by(OTP.id.desc()).first()
    otp = rec.otp if rec else None
    db.close()
    return otp

def auth_user(ident, pwd):
    res = client.post("/api/v1/auth/login", json={"email": ident, "password": pwd})
    assert res.status_code == 200, f"Login failed for {ident}: {res.text}"
    email = res.json()["email"]
    otp = get_otp(email)
    assert otp, f"No OTP for {email}"
    v_res = client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": otp})
    assert v_res.status_code == 200, f"Verify failed for {email}: {v_res.text}"
    return v_res.json()

def run_tests():
    print("=== 1. TEST ADMIN LOGIN (Email & EmpCode) ===")
    admin1 = auth_user("aaquib.k@laesfera.co", "Admin@123")
    print("Admin1 role:", admin1["role"], "code:", admin1["emp_code"])
    assert admin1["role"] == "admin"

    admin2 = auth_user("ADM002", "Admin@123")
    print("Admin2 (Migdad Mirza by code):", admin2["role"], "code:", admin2["emp_code"], "name:", admin2["user"]["name"])
    assert admin2["role"] == "admin"

    print("=== 2. TEST MANAGER LOGIN (Email & EmpCode) ===")
    mgr1 = auth_user("kevin.john@laesfera.co", "Admin@123")
    print("Mgr1 role:", mgr1["role"], "code:", mgr1["emp_code"], "name:", mgr1["user"]["name"])
    assert mgr1["role"] == "manager"

    mgr2 = auth_user("MGR001", "Admin@123")
    print("Mgr2 (by code) role:", mgr2["role"], "code:", mgr2["emp_code"])
    assert mgr2["role"] == "manager"

    print("=== 3. TEST EMPLOYEE LOGIN ===")
    emp = auth_user("payal.m@laesfera.co", "Admin@123")
    print("Emp role:", emp["role"], "code:", emp["emp_code"])
    assert emp["role"] == "employee"

    print("=== 4. TEST WRONG CREDENTIALS ===")
    res_wrong = client.post("/api/v1/auth/login", json={"email": "aaquib.k@laesfera.co", "password": "WrongPassword!"})
    assert res_wrong.status_code == 401
    print("Wrong password rejected: 401 OK")

    res_unknown = client.post("/api/v1/auth/login", json={"email": "unknown@nowhere.com", "password": "Admin@123"})
    assert res_unknown.status_code == 401
    print("Unknown email rejected: 401 OK")

    print("=== 5. TEST AUTHORIZATION & HIERARCHY ===")
    admin_token = admin1["access_token"]
    mgr_token = mgr1["access_token"]
    emp_token = emp["access_token"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Admin route
    r_adm_adm = client.get("/admin/dashboard", headers=admin_headers)
    assert r_adm_adm.status_code == 200, f"Admin -> Admin failed: {r_adm_adm.status_code}"
    print("[PASS] Admin -> /admin/dashboard: 200 OK")

    r_mgr_adm = client.get("/admin/dashboard", headers=mgr_headers)
    assert r_mgr_adm.status_code == 403, f"Manager -> Admin expected 403, got {r_mgr_adm.status_code}"
    print("[PASS] Manager -> /admin/dashboard: 403 Forbidden (Blocked successfully)")

    r_emp_adm = client.get("/admin/dashboard", headers=emp_headers)
    assert r_emp_adm.status_code == 403, f"Employee -> Admin expected 403, got {r_emp_adm.status_code}"
    print("[PASS] Employee -> /admin/dashboard: 403 Forbidden (Blocked successfully)")

    # Manager route (Strict Isolation: Only Manager allowed)
    r_adm_mgr = client.get("/api/v1/manager/dashboard", headers=admin_headers)
    assert r_adm_mgr.status_code == 403, f"Admin -> Manager expected 403, got: {r_adm_mgr.status_code}"
    print("[PASS] Admin -> /manager/dashboard: 403 Forbidden (Blocked successfully)")

    r_mgr_mgr = client.get("/api/v1/manager/dashboard", headers=mgr_headers)
    assert r_mgr_mgr.status_code == 200, f"Manager -> Manager failed: {r_mgr_mgr.status_code}"
    print("[PASS] Manager -> /manager/dashboard: 200 OK")

    r_emp_mgr = client.get("/api/v1/manager/dashboard", headers=emp_headers)
    assert r_emp_mgr.status_code == 403, f"Employee -> Manager expected 403, got {r_emp_mgr.status_code}"
    print("[PASS] Employee -> /manager/dashboard: 403 Forbidden (Blocked successfully)")

    # Unauthenticated requests
    r_noauth_adm = client.get("/admin/dashboard")
    assert r_noauth_adm.status_code in [401, 403]
    r_noauth_mgr = client.get("/api/v1/manager/dashboard")
    assert r_noauth_mgr.status_code in [401, 403]
    print("[PASS] Unauthenticated requests: Blocked successfully (401/403)")

    print("\n>>> ALL BACKEND AUTH & AUTHORIZATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
