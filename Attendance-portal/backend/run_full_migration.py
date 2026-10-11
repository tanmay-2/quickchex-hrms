import sys
import sqlite3
import psycopg2
import json
from decimal import Decimal
import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

def migrate_all_sqlite_to_postgres():
    pg_url = 'postgresql://postgres:root@127.0.0.1:5433/hrms_db'
    sqlite_path = 'app/attendance.db'

    print("Connecting to PostgreSQL and SQLite...")
    pg = psycopg2.connect(pg_url)
    sl = sqlite3.connect(sqlite_path)
    sl.row_factory = sqlite3.Row
    pg_cur = pg.cursor()
    sl_cur = sl.cursor()

    # Get all tables in SQLite
    sl_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [r[0] for r in sl_cur.fetchall()]

    for tbl in tables:
        # Check if table exists in PG
        pg_cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=%s", (tbl,))
        pg_col_info = pg_cur.fetchall()
        if not pg_col_info:
            print(f"⏩ Table {tbl} does not exist in PostgreSQL, skipping...")
            continue

        pg_cols = {r[0]: r[1] for r in pg_col_info}

        sl_cur.execute(f'PRAGMA table_info("{tbl}")')
        sl_cols = [c[1] for c in sl_cur.fetchall()]

        common_cols = [c for c in sl_cols if c in pg_cols]
        if not common_cols:
            continue

        # Get rows from SQLite
        sl_cur.execute(f'SELECT * FROM "{tbl}"')
        s_rows = sl_cur.fetchall()
        if not s_rows:
            continue

        # Process each row
        inserted_count = 0
        for r in s_rows:
            d = dict(r)
            row_cols = [c for c in common_cols if not (c == 'id' and d.get('id') is None)]
            cols_str = ", ".join([f'"{c}"' for c in row_cols])
            placeholders = ", ".join(["%s" for _ in row_cols])

            vals = []
            for c in row_cols:
                v = d[c]
                col_type = pg_cols[c].lower()
                if isinstance(v, (dict, list)):
                    vals.append(json.dumps(v))
                elif "bool" in col_type and v is not None:
                    vals.append(bool(v))
                elif ("date" in col_type or "time" in col_type) and isinstance(v, str):
                    vals.append(v.strip() if v.strip() else None)
                elif v == "":
                    vals.append(None)
                else:
                    vals.append(v)

            # Determine conflict clause
            if "id" in row_cols:
                conflict_clause = 'ON CONFLICT ("id") DO UPDATE SET ' + ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in row_cols if c != 'id'])
            elif tbl == "profile_master" and "emp_code" in row_cols:
                conflict_clause = 'ON CONFLICT ("emp_code") DO NOTHING'
            elif tbl == "users" and "empcode" in row_cols:
                conflict_clause = 'ON CONFLICT ("empcode") DO NOTHING'
            else:
                conflict_clause = ""


            insert_sql = f'INSERT INTO "{tbl}" ({cols_str}) VALUES ({placeholders}) {conflict_clause}'
            try:
                pg_cur.execute(insert_sql, vals)
                inserted_count += 1
            except Exception as e:
                pg.rollback()
                print(f"Error inserting into {tbl}: {e}")
                break

        else:
            pg.commit()
            # Reset sequence if id column exists
            if "id" in common_cols:
                try:
                    pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('\"{tbl}\"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM \"{tbl}\"")
                    pg.commit()
                except Exception as seq_err:
                    pg.rollback()

            # Verify final count in PG
            pg_cur.execute(f'SELECT count(*) FROM "{tbl}"')
            final_cnt = pg_cur.fetchone()[0]
            print(f"✅ {tbl:<32} synced! SQLite: {len(s_rows)} -> PG: {final_cnt}")

    pg.close()
    sl.close()
    print("\n🎉 Migration completed successfully!")

if __name__ == '__main__':
    migrate_all_sqlite_to_postgres()
