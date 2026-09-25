from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("--- attendance_2026_09 columns ---")
    cols = db.execute(text("PRAGMA table_info(attendance_2026_09)")).fetchall()
    for c in cols:
        print(c)

    print("\n--- attendance_2026_09 rows ---")
    rows = db.execute(text("SELECT * FROM attendance_2026_09")).mappings().all()
    for r in rows:
        print(dict(r))
except Exception as e:
    print("Error:", e)
finally:
    db.close()
