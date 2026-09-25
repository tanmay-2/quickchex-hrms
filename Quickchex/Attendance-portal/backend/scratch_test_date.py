from app.db.session import SessionLocal
from app.api.v1.endpoints.admin_api import _get_attendance_status_for_date
from datetime import date

db = SessionLocal()
try:
    for d in [date(2026, 9, 23), date(2026, 9, 24), date(2026, 9, 25)]:
        res = _get_attendance_status_for_date(db, "EMP001", d)
        print(f"EMP001 on {d}:", res)
finally:
    db.close()
