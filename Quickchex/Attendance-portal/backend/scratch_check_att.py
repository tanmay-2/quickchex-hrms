from app.db.session import engine
from sqlalchemy import text
with engine.connect() as conn:
    rows = conn.execute(text("SELECT * FROM attendance_2026_09 WHERE emp_code = 'ADM001'")).mappings().all()
    print("attendance_2026_09 for ADM001:")
    for r in rows:
        print(dict(r))

    print("\nAll rows in attendance_2026_09:")
    all_rows = conn.execute(text("SELECT * FROM attendance_2026_09")).mappings().all()
    for r in all_rows:
        print(dict(r))
