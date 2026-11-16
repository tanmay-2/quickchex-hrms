import os
import glob
import subprocess
import psycopg2

def find_psql():
    # 1. Check in PATH
    try:
        res = subprocess.run(["where", "psql"], capture_output=True, text=True)
        if res.returncode == 0:
            lines = [l.strip() for l in res.stdout.strip().splitlines() if l.strip()]
            if lines:
                return lines[0]
    except Exception:
        pass

    # 2. Check standard Windows PostgreSQL paths
    patterns = [
        r"C:\Program Files\PostgreSQL\*\bin\psql.exe",
        r"C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
    ]
    for pat in patterns:
        matches = glob.glob(pat)
        if matches:
            matches.sort(reverse=True)
            return matches[0]

    return None

def main():
    print("=" * 60)
    print(" Quickchex HRMS — Database Restore Utility")
    print("=" * 60)

    # 1. Read target database from .env
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    db_url = None
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                    db_url = line.split("=", 1)[1].strip()
                    break

    if not db_url:
        print("ERROR: DATABASE_URL not found in .env!")
        return

    print(f"Target Database URL: {db_url}")

    # Parse postgresql://user:pass@host:port/dbname
    import re
    m = re.match(r"postgresql(?:\+psycopg2)?://([^:]+):([^@]+)@([^:/]+):(\d+)/(.+)", db_url)
    if not m:
        print("ERROR: Could not parse DATABASE_URL:", db_url)
        return

    user, password, host, port, dbname = m.groups()
    if "?" in dbname:
        dbname = dbname.split("?")[0]

    sql_file = os.path.join(os.path.dirname(__file__), "attendance_db_backup.sql")
    if not os.path.exists(sql_file):
        print(f"ERROR: Backup file '{sql_file}' not found!")
        return

    file_size_mb = os.path.getsize(sql_file) / (1024 * 1024)
    print(f"Backup file: {sql_file} ({file_size_mb:.2f} MB)")

    psql_path = find_psql()
    if not psql_path:
        print("ERROR: psql.exe not found on system! Please ensure PostgreSQL is installed.")
        return

    print(f"Using psql: {psql_path}")
    print(f"Restoring into: {dbname} on {host}:{port}...")

    env = os.environ.copy()
    env["PGPASSWORD"] = password

    cmd = [
        psql_path,
        "-h", host,
        "-p", port,
        "-U", user,
        "-d", dbname,
        "-f", sql_file,
    ]

    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        print("psql warnings/output:")
        print(res.stderr[:500])

    # Verify counts
    try:
        conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname)
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM profile_master;")
        emp_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM users;")
        user_count = cur.fetchone()[0]
        conn.close()
        print("\n" + "=" * 60)
        print(f"  SUCCESS! Restored {emp_count} employees and {user_count} users into {dbname}!")
        print("=" * 60)
    except Exception as e:
        print("Verification note:", e)

if __name__ == "__main__":
    main()
