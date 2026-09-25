from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, emp_code, first_name, last_name, email, role, department, designation, reporting_supervisor FROM profile_master ORDER BY id")).mappings().all()
    print(f"Total rows: {len(rows)}")
    for r in rows:
        print(f"ID={r['id']} | CODE={r['emp_code']} | EMAIL={r['email']} | NAME={r['first_name']} {r['last_name']} | ROLE={r['role']} | DESIG={r['designation']} | DEPT={r['department']} | SUP={r['reporting_supervisor']}")
