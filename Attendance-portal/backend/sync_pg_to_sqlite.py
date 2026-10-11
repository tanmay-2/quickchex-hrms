import psycopg2
import sqlite3
import json

def sync():
    pg = psycopg2.connect('postgresql://postgres:root@127.0.0.1:5433/hrms_db')
    sl = sqlite3.connect('app/attendance.db')
    
    pg_cur = pg.cursor()
    sl_cur = sl.cursor()
    
    # Get all tables in SQLite
    sl_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';")
    sl_tables = [r[0] for r in sl_cur.fetchall()]
    
    # Tables to copy over from PG to SQLite
    priority_tables = [
        'policies',
        'leave_requests',
        'regularizations',
        'profile_master',
        'users',
        'leave_balances',
        'client_sites',
        'attendance_settings',
        'employee_work_mode_assignments',
        'holidays',
        'daily_tasks',
        'notifications',
        'organization_calendar',
        'monthly_sheets',
        'payroll_profiles',
        'payslips',
        'tickets',
        'attendance_2026_09',
        'attendance_2026_10',
        'attendance_2026_11',
        'regularization_2026_09',
        'regularization_2026_10',
        'regularization_2026_11',
        'leave_2026_09',
        'leave_2026_10',
        'leave_2026_11',
        'tasks_2026_09',
        'tasks_2026_10',
        'tasks_2026_11'
    ]
    
    for tbl in priority_tables:
        if tbl not in sl_tables:
            continue
            
        try:
            pg_cur.execute(f'SELECT count(*) FROM "{tbl}"')
            pg_cnt = pg_cur.fetchone()[0]
        except Exception:
            pg.rollback()
            continue
            
        if pg_cnt == 0:
            continue
            
        # Get SQLite table columns
        sl_cur.execute(f'PRAGMA table_info("{tbl}")')
        sl_cols = [c[1] for c in sl_cur.fetchall()]
        
        # Get PG table columns
        pg_cur.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{tbl}'
        """)
        pg_col_dict = {r[0]: r[1] for r in pg_cur.fetchall()}
        
        common_cols = [c for c in sl_cols if c in pg_col_dict]
        if not common_cols:
            continue
            
        cols_str = ", ".join([f'"{c}"' for c in common_cols])
        placeholders = ", ".join(["?" for _ in common_cols])
        
        # Read from PG
        pg_cur.execute(f'SELECT {cols_str} FROM "{tbl}"')
        rows = pg_cur.fetchall()
        
        # Clear existing rows in SQLite table to avoid duplicates
        sl_cur.execute(f'DELETE FROM "{tbl}"')
        
        # Format rows for SQLite
        formatted_rows = []
        for row in rows:
            formatted_row = []
            for val, col_name in zip(row, common_cols):
                if isinstance(val, (dict, list)):
                    formatted_row.append(json.dumps(val))
                elif isinstance(val, bool):
                    formatted_row.append(1 if val else 0)
                else:
                    formatted_row.append(val)
            formatted_rows.append(tuple(formatted_row))
            
        sl_cur.executemany(f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders})', formatted_rows)
        sl.commit()
        print(f"Synced {len(formatted_rows)} rows into SQLite table '{tbl}'")
        
    pg.close()
    sl.close()
    print("All tables synced successfully from PostgreSQL to SQLite!")

if __name__ == '__main__':
    sync()
