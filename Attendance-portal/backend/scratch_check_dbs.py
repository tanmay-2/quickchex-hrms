import psycopg2
import sqlite3

pg = psycopg2.connect('postgresql://postgres:root@127.0.0.1:5433/hrms_db')
cur = pg.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
pg_tables = [r[0] for r in cur.fetchall()]
print(f"PostgreSQL tables count: {len(pg_tables)}")

for t in pg_tables:
    try:
        cur.execute(f'SELECT count(*) FROM "{t}"')
        cnt = cur.fetchone()[0]
        if cnt > 0 or 'attend' in t or 'user' in t or 'profile' in t:
            print(f"  PG: {t} -> {cnt} rows")
    except Exception as e:
        pg.rollback()

sl = sqlite3.connect('app/attendance.db')
scur = sl.cursor()
scur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
sl_tables = [r[0] for r in scur.fetchall()]
print(f"\nSQLite tables count: {len(sl_tables)}")
for t in sl_tables:
    scur.execute(f'SELECT count(*) FROM "{t}"')
    cnt = scur.fetchone()[0]
    if cnt > 0:
        print(f"  SQLite: {t} -> {cnt} rows")
