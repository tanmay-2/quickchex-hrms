from app.db.session import SessionLocal
from sqlalchemy import text
from datetime import date
import traceback

db = SessionLocal()
try:
    table_name = "attendance_2026_09"
    candidate_codes = ["EMP001", "aquib@company.com", "4"]
    target_date = date(2026, 9, 25)
    
    try:
        query = text(f"""
            SELECT punch_in_time, punch_out_time, punch_in_location, punch_out_location,
                   hours_completed, status, remark
            FROM {table_name}
            WHERE emp_code IN :codes AND date = :t_date
            ORDER BY id DESC LIMIT 1
        """)
        rec = db.execute(query, {"codes": tuple(candidate_codes), "t_date": target_date}).mappings().first()
        print("rec without expanding:", rec)
    except Exception as e:
        print("FAILED without expanding:", e)
        traceback.print_exc()

    # Now let's try with expanding=True
    from sqlalchemy import bindparam
    query_exp = text(f"""
        SELECT punch_in_time, punch_out_time, punch_in_location, punch_out_location,
               hours_completed, status, remark
        FROM {table_name}
        WHERE emp_code IN :codes AND date = :t_date
        ORDER BY id DESC LIMIT 1
    """).bindparams(bindparam("codes", expanding=True))
    rec2 = db.execute(query_exp, {"codes": candidate_codes, "t_date": target_date}).mappings().first()
    print("rec with expanding:", rec2)

finally:
    db.close()
