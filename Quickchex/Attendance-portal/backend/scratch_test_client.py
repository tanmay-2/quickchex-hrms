from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("--- Testing GET /attendance/records with EMP001 ---")
headers = {
    "x-emp-code": "EMP001",
    "x-user-email": "aquib@company.com"
}
res = client.get("/attendance/records", headers=headers)
print("Status:", res.status_code)
print("Records count:", len(res.json()) if res.status_code == 200 else res.text)
if res.status_code == 200 and len(res.json()) > 0:
    print("Latest record:", res.json()[0])

print("\n--- Testing GET /dashboard/summary with EMP001 ---")
res2 = client.get("/dashboard/summary", headers=headers)
print("Status:", res2.status_code)
if res2.status_code == 200:
    d = res2.json()
    print("Employee:", d.get("employee"))
    print("Stats:", d.get("stats"))
    print("Recent Attendance count:", len(d.get("recentAttendance", [])))
    if d.get("recentAttendance"):
        print("Latest Recent Attendance:", d.get("recentAttendance")[0])
else:
    print("Error:", res2.text)
