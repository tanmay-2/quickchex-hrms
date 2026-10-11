import sqlite3
import psycopg2
import json
import decimal
import datetime
from decimal import Decimal

def run_bidirectional_sync():
    pg_url = 'postgresql://postgres:root@127.0.0.1:5433/hrms_db'
    sqlite_path = 'app/attendance.db'

    print("Connecting to PostgreSQL and SQLite...")
    pg = psycopg2.connect(pg_url)
    sl = sqlite3.connect(sqlite_path)
    pg_cur = pg.cursor()
    sl_cur = sl.cursor()

    # Step 1: Ensure PostgreSQL has payslips and holidays if missing
    sl_cur.execute("SELECT count(*) FROM payslips")
    sl_payslips_cnt = sl_cur.fetchone()[0]
    pg_cur.execute("SELECT count(*) FROM payslips")
    pg_payslips_cnt = pg_cur.fetchone()[0]

    print(f"Payslips: SQLite={sl_payslips_cnt}, PostgreSQL={pg_payslips_cnt}")
    if sl_payslips_cnt > 0 and pg_payslips_cnt == 0:
        print("Migrating payslips from SQLite to PostgreSQL...")
        sl_cur.execute("SELECT * FROM payslips")
        rows = sl_cur.fetchall()
        sl_cols = [c[0] for c in sl_cur.description]
        
        pg_cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'payslips'")
        pg_cols = set(r[0] for r in pg_cur.fetchall())
        
        common_cols = [c for c in sl_cols if c in pg_cols]
        cols_str = ", ".join(f'"{c}"' for c in common_cols)
        placeholders = ", ".join(f'%s' for _ in common_cols)
        
        for row in rows:
            data = dict(zip(sl_cols, row))
            vals = [data[c] for c in common_cols]
            pg_cur.execute(f"INSERT INTO payslips ({cols_str}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING", vals)
        
        pg_cur.execute("SELECT setval(pg_get_serial_sequence('payslips', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM payslips")
        pg.commit()
        print(f"Migrated {len(rows)} payslips to PostgreSQL.")

    # Step 2: Now sync all PostgreSQL tables to SQLite
    # Temporarily disable foreign keys in SQLite for clean bulk insert
    sl_cur.execute("PRAGMA foreign_keys = OFF")

    # Get all tables in PG
    pg_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    pg_tables = [r[0] for r in pg_cur.fetchall()]

    # Get all tables in SQLite
    sl_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    sl_tables = set(r[0] for r in sl_cur.fetchall())

    synced_tables = 0
    for tbl in pg_tables:
        if tbl not in sl_tables:
            continue

        try:
            pg_cur.execute(f'SELECT count(*) FROM "{tbl}"')
            pg_cnt = pg_cur.fetchone()[0]
        except Exception as e:
            pg.rollback()
            continue

        if pg_cnt == 0:
            continue

        # Get column definitions
        sl_cur.execute(f'PRAGMA table_info("{tbl}")')
        sl_cols = [c[1] for c in sl_cur.fetchall()]

        pg_cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{tbl}'
        """)
        pg_cols = set(r[0] for r in pg_cur.fetchall())

        common_cols = [c for c in sl_cols if c in pg_cols]
        if not common_cols:
            continue

        cols_str = ", ".join([f'"{c}"' for c in common_cols])
        placeholders = ", ".join(["?" for _ in common_cols])

        # Read from PG
        pg_cur.execute(f'SELECT {cols_str} FROM "{tbl}"')
        rows = pg_cur.fetchall()

        # Format rows for SQLite with type conversions
        formatted_rows = []
        for row in rows:
            formatted_row = []
            for val in row:
                if isinstance(val, (dict, list)):
                    formatted_row.append(json.dumps(val))
                elif isinstance(val, bool):
                    formatted_row.append(1 if val else 0)
                elif isinstance(val, Decimal):
                    formatted_row.append(float(val))
                elif isinstance(val, (datetime.date, datetime.datetime)):
                    formatted_row.append(val.isoformat())
                else:
                    formatted_row.append(val)
            formatted_rows.append(tuple(formatted_row))

        # Replace in SQLite
        sl_cur.execute(f'DELETE FROM "{tbl}"')
        sl_cur.executemany(f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders})', formatted_rows)
        sl.commit()
        synced_tables += 1
        print(f"Synced {len(formatted_rows):>3} rows into SQLite '{tbl}'")

    sl_cur.execute("PRAGMA foreign_keys = ON")
    sl.commit()

    print(f"\nSync complete! {synced_tables} tables synced.")
    pg.close()
    sl.close()

if __name__ == '__main__':
    run_bidirectional_sync()
