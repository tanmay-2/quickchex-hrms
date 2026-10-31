# ==============================================================================
# QUICKCHEX HRMS BACKEND - LOAD_REMAINING_DUMP_DATA.PY
# Path: Attendance-portal/backend/load_remaining_dump_data.py
# Purpose: Backend module.
# Primary Functions:
#   • load_tables()
# ==============================================================================

import os
import sys
from sqlalchemy import text
from app.db.session import engine

def load_tables():
    with open('dump_data.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    blocks = {}
    for block in sql.split('COPY public.'):
        if not block.strip(): continue
        table = block.split('(')[0].strip()
        cols = [c.strip() for c in block.split('(')[1].split(') FROM stdin;')[0].split(',')]
        data_text = block.split(') FROM stdin;')[1].split(r'\.')[0].strip()
        rows = [r.split('\t') for r in data_text.split('\n') if r.strip()]
        blocks[table] = (cols, rows)

    with engine.begin() as conn:
        # Create dynamic 2026_09 tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.attendance_2026_09 (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                punch_in_time TIMESTAMP,
                punch_out_time TIMESTAMP,
                punch_in_location TEXT,
                punch_out_location TEXT,
                punch_in_image TEXT,
                punch_out_image TEXT,
                punch_in_latitude FLOAT,
                punch_in_longitude FLOAT,
                punch_in_accuracy FLOAT,
                punch_out_latitude FLOAT,
                punch_out_longitude FLOAT,
                punch_out_accuracy FLOAT,
                hours_completed FLOAT,
                status VARCHAR(20),
                remark TEXT,
                work_mode VARCHAR(50),
                client_site_id INTEGER,
                client_site_name VARCHAR(255),
                first_punch_out_time TIMESTAMP,
                correction_status VARCHAR(50) DEFAULT 'NONE'
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.leave_2026_09 (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days FLOAT NOT NULL,
                reason TEXT NOT NULL,
                has_half_days BOOLEAN DEFAULT FALSE,
                half_day_details TEXT,
                status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                manager_status VARCHAR(50) DEFAULT 'PENDING',
                admin_status VARCHAR(50) DEFAULT 'PENDING',
                manager_reviewed_by VARCHAR(150),
                manager_reviewed_at TIMESTAMP,
                manager_comment TEXT,
                manager_rejection_reason TEXT,
                admin_reviewed_by VARCHAR(1
                50),
                admin_reviewed_at TIMESTAMP,
                admin_comment TEXT,
                admin_rejection_reason TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                employee_name VARCHAR(150),
                manager_id VARCHAR(50),
                manager_name VARCHAR(150),
                approval_level INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.regularization_2026_09 (
                id SERIAL PRIMARY KEY,
                emp_code VARCHAR(50) NOT NULL,
                target_date DATE NOT NULL,
                issued_for_in_time TIMESTAMP,
                issued_for_out_time TIMESTAMP,
                status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                overall_status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                manager_status VARCHAR(50) DEFAULT 'PENDING',
                admin_status VARCHAR(50) DEFAULT 'PENDING',
                comment TEXT,
                employee_id VARCHAR(50),
                employee_name VARCHAR(150),
                manager_id VARCHAR(50),
                manager_name VARCHAR(150),
                approval_level INTEGER DEFAULT 1,
                manager_action VARCHAR(50),
                manager_reviewed_by VARCHAR(150),
                manager_reviewed_at TIMESTAMP,
                manager_comment TEXT,
                manager_rejection_reason TEXT,
                admin_action VARCHAR(50),
                admin_reviewed_by VARCHAR(150),
                admin_reviewed_at TIMESTAMP,
                admin_comment TEXT,
                admin_rejection_reason TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Tables to populate if empty
        for tbl in ['attendance_2026_09', 'leave_2026_09', 'regularization_2026_09', 'leave_requests', 'regularizations']:
            if tbl in blocks:
                cols, rows = blocks[tbl]
                count = conn.execute(text(f"SELECT count(*) FROM public.{tbl}")).scalar()
                if count == 0 and rows:
                    print(f"Loading {len(rows)} rows into {tbl}...")
                    col_names = ", ".join(cols)
                    placeholders = ", ".join([f":c{i}" for i in range(len(cols))])
                    insert_sql = text(f"INSERT INTO public.{tbl} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")
                    for row in rows:
                        row_vals = {}
                        for i, val in enumerate(row):
                            clean_val = None if val == r'\N' else val
                            row_vals[f"c{i}"] = clean_val
                        conn.execute(insert_sql, row_vals)
                    print(f"✅ {tbl} loaded successfully.")

if __name__ == "__main__":
    load_tables()
    print("Done!")
