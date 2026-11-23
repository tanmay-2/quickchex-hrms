# ==============================================================================
# QUICKCHEX HRMS BACKEND - INSPECT_PROFILES.PY
# Path: Attendance-portal/backend/inspect_profiles.py
# Purpose: Backend module.
# ==============================================================================

# Import engine from app.db.session for module operations
from app.db.session import engine
# Import text from sqlalchemy for module operations
from sqlalchemy import text

# Acquire context manager resource for enclosed block
with engine.connect() as conn:
    # Set rows variable to store rows value
    rows = conn.execute(text("SELECT id, emp_code, first_name, last_name, email, role, department, designation, reporting_supervisor FROM profile_master ORDER BY id")).mappings().all()
    # Invoke print to perform operational action
    print(f"Total rows: {len(rows)}")
    # Iterate through items in sequence loop
    for r in rows:
        # Invoke print to perform operational action
        print(f"ID={r['id']} | CODE={r['emp_code']} | EMAIL={r['email']} | NAME={r['first_name']} {r['last_name']} | ROLE={r['role']} | DESIG={r['designation']} | DEPT={r['department']} | SUP={r['reporting_supervisor']}")
