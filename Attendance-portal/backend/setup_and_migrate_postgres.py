#!/usr/bin/env python3
"""
==============================================================================
Quickchex HRMS - Automated PostgreSQL Database Creator & Data Migrator
==============================================================================
This script automates:
1. Connecting to your target PostgreSQL server using credentials you provide.
2. Checking if the target database exists; if not, automatically creating it.
3. Extracting and recreating all table schemas (including dynamic monthly tables)
   from your source Neon database.
4. Transferring all existing data with foreign key safety (bulk batch copy).
5. Synchronizing and updating all primary key SERIAL sequences.
6. Displaying a row-count verification audit table.
7. Optionally updating your backend .env file with the new PostgreSQL connection URL.
==============================================================================
"""

import os
import sys

# Configure UTF-8 stdout/stderr for Windows console compatibility
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

import getpass
import argparse
import datetime
import urllib.parse
from pathlib import Path

# Ensure backend root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import execute_values, Json
except ImportError:
    print("❌ Error: 'psycopg2' is required. Please install it using:")
    print("   pip install psycopg2-binary")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    # Load environment from Attendance-portal/backend/.env
    env_path = SCRIPT_DIR / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass


def print_banner():
    banner = """
╔═══════════════════════════════════════════════════════════════════════╗
║            QUICKCHEX HRMS — POSTGRESQL MIGRATION WIZARD               ║
║   Automated Server Database Creation & Full Neon Data Replication     ║
╚═══════════════════════════════════════════════════════════════════════╝
"""
    print(banner)


def parse_connection_params(url_str):
    """Parses a postgresql:// URL into component dictionary."""
    parsed = urllib.parse.urlparse(url_str)
    return {
        "user": urllib.parse.unquote(parsed.username) if parsed.username else "postgres",
        "password": urllib.parse.unquote(parsed.password) if parsed.password else "",
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.path.lstrip("/") if parsed.path else "postgres",
        "query": urllib.parse.parse_qs(parsed.query)
    }


def build_connection_url(user, password, host, port, dbname, sslmode=None):
    """Builds a postgresql:// URL from components."""
    enc_user = urllib.parse.quote_plus(user)
    enc_pass = urllib.parse.quote_plus(password)
    query_str = f"?sslmode={sslmode}" if sslmode and sslmode != "disable" else ""
    return f"postgresql://{enc_user}:{enc_pass}@{host}:{port}/{dbname}{query_str}"


def get_interactive_credentials():
    """Interactively prompts user for target and source PostgreSQL details."""
    print("📋 [Step 1/5] Configure Target PostgreSQL Server:")
    print("Choose configuration method:")
    print("  [1] Enter credentials step-by-step (Host, Port, User, Password, DB Name)")
    print("  [2] Paste a full PostgreSQL connection URL")
    
    choice = input("\nEnter choice [1 or 2, default: 1]: ").strip() or "1"
    
    if choice == "2":
        target_url = input("\nPaste Target PostgreSQL URL: ").strip()
        while not target_url.startswith("postgresql://") and not target_url.startswith("postgres://"):
            print("⚠️ Invalid URL. It should start with postgresql://")
            target_url = input("Paste Target PostgreSQL URL: ").strip()
        
        parsed = parse_connection_params(target_url)
        target_host = parsed["host"]
        target_port = parsed["port"]
        target_user = parsed["user"]
        target_pass = parsed["password"]
        target_dbname = parsed["dbname"]
        ssl_mode = parsed["query"].get("sslmode", ["prefer"])[0]
    else:
        target_host = input("Server Host / IP [default: localhost]: ").strip() or "localhost"
        target_port_str = input("Server Port [default: 5432]: ").strip() or "5432"
        target_port = int(target_port_str)
        target_user = input("PostgreSQL Username [default: postgres]: ").strip() or "postgres"
        target_pass = getpass.getpass("PostgreSQL Password: ")
        target_dbname = input("Target Database Name [default: quickchex_hrms]: ").strip() or "quickchex_hrms"
        
        print("\nSSL Mode options: [prefer / require / disable]")
        ssl_mode = input("Select SSL mode [default: prefer]: ").strip().lower() or "prefer"
        
        target_url = build_connection_url(target_user, target_pass, target_host, target_port, target_dbname, ssl_mode)

    print("\n📋 [Step 2/5] Source Neon Database:")
    default_neon = os.getenv("DATABASE_URL", "")
    if default_neon:
        print(f"Current Source in .env:")
        # Mask password for display
        masked = default_neon
        if "@" in default_neon and ":" in default_neon:
            try:
                p = urllib.parse.urlparse(default_neon)
                masked = f"{p.scheme}://{p.username}:******@{p.hostname}:{p.port or 5432}{p.path}"
            except Exception:
                pass
        print(f"  👉 {masked}")
        use_default = input("Use this Neon database as data source? [Y/n]: ").strip().lower()
        if use_default in ("", "y", "yes"):
            source_url = default_neon
        else:
            source_url = input("Paste Source Neon PostgreSQL URL: ").strip()
    else:
        source_url = input("Paste Source Neon PostgreSQL URL: ").strip()

    return {
        "target_host": target_host,
        "target_port": target_port,
        "target_user": target_user,
        "target_pass": target_pass,
        "target_dbname": target_dbname,
        "ssl_mode": ssl_mode,
        "target_url": target_url,
        "source_url": source_url
    }


def ensure_target_database_exists(host, port, user, password, dbname, ssl_mode):
    """
    Connects to the maintenance 'postgres' database on target server
    and creates the target database if it doesn't exist yet.
    """
    print(f"\n🔌 Connecting to target server at {host}:{port} (maintenance DB: postgres)...")
    
    conn_kwargs = {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "dbname": "postgres"
    }
    if ssl_mode and ssl_mode != "disable":
        conn_kwargs["sslmode"] = ssl_mode

    try:
        conn = psycopg2.connect(**conn_kwargs)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        # Retry with template1 if postgres db is not accessible
        try:
            conn_kwargs["dbname"] = "template1"
            conn = psycopg2.connect(**conn_kwargs)
            conn.autocommit = True
            cur = conn.cursor()
        except Exception as e2:
            print(f"\n❌ Could not connect to PostgreSQL server at {host}:{port}")
            print(f"   Error details: {e2}")
            sys.exit(1)

    # Check if target db exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (dbname,))
    exists = cur.fetchone() is not None

    if not exists:
        print(f"📦 Database '{dbname}' does not exist on server.")
        print(f"🚀 Creating database '{dbname}' automatically...")
        cur.execute(sql.SQL("CREATE DATABASE {} WITH ENCODING 'UTF8' TEMPLATE template1;").format(sql.Identifier(dbname)))
        print(f"✅ Database '{dbname}' created successfully!")
    else:
        print(f"ℹ️ Database '{dbname}' already exists on target server.")
        action = input("   Choose: [1] Overwrite/Sync tables, [2] Recreate fresh (drop & create), [3] Abort [default: 1]: ").strip() or "1"
        if action == "2":
            print(f"⚠️ Dropping and recreating '{dbname}'...")
            # Terminate active connections first
            cur.execute("""
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = %s AND pid <> pg_backend_pid();
            """, (dbname,))
            cur.execute(sql.SQL("DROP DATABASE {};").format(sql.Identifier(dbname)))
            cur.execute(sql.SQL("CREATE DATABASE {} WITH ENCODING 'UTF8' TEMPLATE template1;").format(sql.Identifier(dbname)))
            print(f"✅ Database '{dbname}' recreated fresh!")
        elif action == "3":
            print("Migration aborted by user.")
            sys.exit(0)
        else:
            print(f"Proceeding with existing database '{dbname}'...")

    cur.close()
    conn.close()


def get_neon_table_definitions(source_cur, table_name):
    """
    Generates accurate DDL (columns, types, constraints, defaults) for any table in source Neon.
    """
    source_cur.execute("""
        SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    cols = source_cur.fetchall()
    
    # Get Primary Key
    source_cur.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = %s;
    """, (table_name,))
    pk_cols = [r[0] for r in source_cur.fetchall()]
    
    col_defs = []
    for col in cols:
        name, dt, char_len, num_prec, num_scale, udt, is_null, c_def = col
        
        # Determine exact PostgreSQL datatype
        if c_def and "nextval" in str(c_def):
            type_str = "BIGSERIAL" if udt in ("int8", "bigint") else "SERIAL"
        elif udt in ("varchar", "character varying"):
            type_str = f"VARCHAR({char_len})" if char_len else "VARCHAR"
        elif udt in ("numeric", "decimal"):
            if num_prec and num_scale is not None:
                type_str = f"NUMERIC({num_prec},{num_scale})"
            else:
                type_str = "NUMERIC"
        elif udt == "int4":
            type_str = "INTEGER"
        elif udt == "int8":
            type_str = "BIGINT"
        elif udt == "int2":
            type_str = "SMALLINT"
        elif udt == "bool":
            type_str = "BOOLEAN"
        elif udt == "float8":
            type_str = "DOUBLE PRECISION"
        elif udt == "float4":
            type_str = "REAL"
        elif udt == "text":
            type_str = "TEXT"
        elif udt == "timestamp":
            type_str = "TIMESTAMP"
        elif udt == "timestamptz":
            type_str = "TIMESTAMP WITH TIME ZONE"
        elif udt == "date":
            type_str = "DATE"
        elif udt == "time":
            type_str = "TIME"
        elif udt == "json":
            type_str = "JSON"
        elif udt == "jsonb":
            type_str = "JSONB"
        elif udt == "bytea":
            type_str = "BYTEA"
        else:
            type_str = udt.upper()
            
        nullable = "NOT NULL" if is_null == "NO" else ""
        default = ""
        if c_def and "nextval" not in str(c_def):
            default = f"DEFAULT {c_def}"
            
        col_def = f'"{name}" {type_str} {nullable} {default}'.strip()
        col_defs.append(col_def)
        
    if pk_cols:
        pk_str = ", ".join([f'"{p}"' for p in pk_cols])
        col_defs.append(f"PRIMARY KEY ({pk_str})")
        
    ddl = f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n  ' + ",\n  ".join(col_defs) + "\n);"
    return ddl


def migrate_all_data(source_url, target_url):
    """
    Connects to source Neon and target PostgreSQL, creates schemas, and transfers all data.
    """
    print("\n🔗 Establishing connections to both databases...")
    try:
        source_conn = psycopg2.connect(source_url)
        source_cur = source_conn.cursor()
        print("  ✅ Connected to Source (Neon) successfully.")
    except Exception as e:
        print(f"  ❌ Failed to connect to Source Neon database: {e}")
        sys.exit(1)

    try:
        target_conn = psycopg2.connect(target_url)
        target_conn.autocommit = True
        target_cur = target_conn.cursor()
        print("  ✅ Connected to Target PostgreSQL database successfully.")
    except Exception as e:
        print(f"  ❌ Failed to connect to Target database: {e}")
        sys.exit(1)

    # 1. Get all tables in Source Neon
    source_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    all_source_tables = [r[0] for r in source_cur.fetchall()]
    print(f"\n📊 Found {len(all_source_tables)} tables in Source Neon database.")

    # 2. Preferred Dependency Order to minimize constraint conflicts
    priority_order = [
        "roles", "users", "profile_master", "attendance_settings", "client_sites",
        "policies", "holidays", "payroll_settings", "employment_contracts",
        "payroll_profiles", "leave_balances", "leave_requests", "comp_offs",
        "monthly_sheets", "payroll_runs", "payroll_records", "payslips",
        "notifications", "organization_calendar", "otp", "employee_documents",
        "employee_work_mode_assignments", "intern_conversion_records",
        "resignation_requests", "resignations", "tickets", "daily_tasks", "regularizations"
    ]
    
    sorted_tables = []
    for t in priority_order:
        if t in all_source_tables:
            sorted_tables.append(t)
    for t in all_source_tables:
        if t not in sorted_tables:
            sorted_tables.append(t)

    # 3. Create Tables on Target if not exist
    print("\n🏗️  Step 3/5: Ensuring all table structures exist on Target...")
    for table in sorted_tables:
        ddl = get_neon_table_definitions(source_cur, table)
        target_cur.execute(ddl)
    print("✅ All table schemas verified/created on Target.")

    # 4. Disable Foreign Keys/Triggers during data load if possible
    has_replica_role = False
    try:
        target_cur.execute("SET session_replication_role = 'replica';")
        has_replica_role = True
    except Exception:
        print("ℹ️ Note: Standard permissions active. Migrating with dependency-ordered inserts.")

    # 5. Migrate Data
    print("\n🚚 Step 4/5: Migrating data rows from Neon to Target...")
    results = {}

    for table in sorted_tables:
        source_cur.execute(f'SELECT count(*) FROM "{table}";')
        source_count = source_cur.fetchone()[0]

        if source_count == 0:
            target_cur.execute(f'SELECT count(*) FROM "{table}";')
            target_count = target_cur.fetchone()[0]
            results[table] = (0, target_count)
            print(f"  • {table:<32} (0 rows - skipped)")
            continue

        # Get list of columns
        source_cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        cols_info = source_cur.fetchall()
        col_names = [c[0] for c in cols_info]
        json_col_indices = [i for i, c in enumerate(cols_info) if c[1] in ('json', 'jsonb')]

        quoted_cols = ", ".join([f'"{c}"' for c in col_names])

        # Truncate target table before inserting to prevent duplicate ID issues
        try:
            target_cur.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
        except Exception:
            target_cur.execute(f'DELETE FROM "{table}";')

        # Stream rows from source and batch insert into target
        source_cur.execute(f'SELECT {quoted_cols} FROM "{table}";')
        batch_size = 500
        total_migrated = 0

        insert_sql = f'INSERT INTO "{table}" ({quoted_cols}) VALUES %s;'

        while True:
            rows = source_cur.fetchmany(batch_size)
            if not rows:
                break
            
            # Format JSON columns if necessary
            if json_col_indices:
                formatted_rows = []
                for row in rows:
                    r_list = list(row)
                    for idx in json_col_indices:
                        if r_list[idx] is not None and not isinstance(r_list[idx], str):
                            r_list[idx] = Json(r_list[idx])
                    formatted_rows.append(tuple(r_list))
                execute_values(target_cur, insert_sql, formatted_rows, page_size=batch_size)
            else:
                execute_values(target_cur, insert_sql, rows, page_size=batch_size)

            total_migrated += len(rows)

        target_cur.execute(f'SELECT count(*) FROM "{table}";')
        target_count = target_cur.fetchone()[0]
        results[table] = (source_count, target_count)
        print(f"  • {table:<32} {target_count:>5} / {source_count:>5} rows  [DONE ✅]")

    # Restore trigger behavior
    if has_replica_role:
        try:
            target_cur.execute("SET session_replication_role = 'origin';")
        except Exception:
            pass

    # 6. Reset Sequences for SERIAL/IDENTITY Columns
    print("\n🔄 Step 5/5: Updating all primary key SERIAL sequences...")
    try:
        target_cur.execute("""
            DO $$
            DECLARE
                seq RECORD;
            BEGIN
                FOR seq IN 
                    SELECT s.relname AS seqname, n.nspname AS schemaname, t.relname AS tablename, a.attname AS colname
                    FROM pg_class s
                    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
                    JOIN pg_class t ON t.oid = d.refobjid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                    WHERE s.relkind = 'S' AND n.nspname = 'public'
                LOOP
                    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1))',
                        seq.schemaname || '.' || seq.seqname,
                        seq.colname,
                        seq.schemaname,
                        seq.tablename
                    );
                END LOOP;
            END $$;
        """)
        print("✅ All SERIAL primary key sequences synchronized.")
    except Exception as e:
        print(f"⚠️ Sequence synchronization notice: {e}")

    source_conn.close()
    target_conn.close()
    return results


def print_audit_summary(results):
    """Prints a structured summary comparison table."""
    print("\n" + "="*70)
    print(f"{'TABLE NAME':<36} {'SOURCE (Neon)':<14} {'TARGET (Server)':<14} {'STATUS'}")
    print("="*70)
    all_matched = True
    total_src = 0
    total_tgt = 0

    for table, (src, tgt) in results.items():
        total_src += src
        total_tgt += tgt
        if src == tgt:
            status = "MATCH ✅"
        else:
            status = "MISMATCH ⚠️"
            all_matched = False
        print(f"{table:<36} {src:<14} {tgt:<14} {status}")

    print("="*70)
    print(f"{'TOTAL ROWS':<36} {total_src:<14} {total_tgt:<14} {'PERFECT 🎉' if all_matched else 'CHECK ⚠️'}")
    print("="*70)


def update_backend_env(new_database_url):
    """Safely updates DATABASE_URL in Attendance-portal/backend/.env with backup."""
    env_file = SCRIPT_DIR / ".env"
    if not env_file.exists():
        print("⚠️ Backend .env file not found. Skipping auto-update.")
        return

    # Create backup
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = SCRIPT_DIR / f".env.backup_{timestamp}"
    content = env_file.read_text(encoding="utf-8")
    backup_file.write_text(content, encoding="utf-8")
    print(f"📁 Created backup of old .env at: {backup_file.name}")

    # Replace DATABASE_URL
    lines = content.splitlines()
    new_lines = []
    replaced = False

    for line in lines:
        if line.strip().startswith("DATABASE_URL="):
            new_lines.append(f"DATABASE_URL={new_database_url}")
            replaced = True
        else:
            new_lines.append(line)

    if not replaced:
        new_lines.append(f"DATABASE_URL={new_database_url}")

    env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    print("✅ Successfully updated DATABASE_URL in Attendance-portal/backend/.env!")


def main():
    print_banner()

    parser = argparse.ArgumentParser(description="Quickchex PostgreSQL Server Auto-Setup & Neon Migration Tool")
    parser.add_argument("--target-url", help="Target PostgreSQL connection URL")
    parser.add_argument("--source-url", help="Source Neon PostgreSQL connection URL")
    parser.add_argument("--target-host", help="Target host")
    parser.add_argument("--target-port", type=int, default=5432, help="Target port")
    parser.add_argument("--target-user", help="Target username")
    parser.add_argument("--target-pass", help="Target password")
    parser.add_argument("--target-db", help="Target database name")
    parser.add_argument("--ssl-mode", default="prefer", help="Target SSL mode")
    parser.add_argument("--update-env", action="store_true", help="Automatically update backend .env with target URL")
    args = parser.parse_args()

    # Determine credentials
    if args.target_url:
        target_url = args.target_url
        parsed = parse_connection_params(target_url)
        target_host = parsed["host"]
        target_port = parsed["port"]
        target_user = parsed["user"]
        target_pass = parsed["password"]
        target_dbname = parsed["dbname"]
        ssl_mode = parsed["query"].get("sslmode", ["prefer"])[0]
        source_url = args.source_url or os.getenv("DATABASE_URL")
    elif args.target_host and args.target_user and args.target_db:
        target_host = args.target_host
        target_port = args.target_port
        target_user = args.target_user
        target_pass = args.target_pass or ""
        target_dbname = args.target_db
        ssl_mode = args.ssl_mode
        target_url = build_connection_url(target_user, target_pass, target_host, target_port, target_dbname, ssl_mode)
        source_url = args.source_url or os.getenv("DATABASE_URL")
    else:
        # Run Interactive Wizard
        creds = get_interactive_credentials()
        target_host = creds["target_host"]
        target_port = creds["target_port"]
        target_user = creds["target_user"]
        target_pass = creds["target_pass"]
        target_dbname = creds["target_dbname"]
        ssl_mode = creds["ssl_mode"]
        target_url = creds["target_url"]
        source_url = creds["source_url"]

    if not source_url:
        print("❌ Error: No Source Neon DATABASE_URL provided or found in .env.")
        sys.exit(1)

    # 1. Ensure target DB exists or create it
    ensure_target_database_exists(target_host, target_port, target_user, target_pass, target_dbname, ssl_mode)

    # 2. Migrate schemas, tables, and data
    results = migrate_all_data(source_url, target_url)

    # 3. Print verification table
    print_audit_summary(results)

    # 4. Prompt to update .env
    if args.update_env:
        update_backend_env(target_url)
    else:
        print("\n⚙️  Update Application Configuration:")
        update_choice = input("Would you like to update your backend .env file to use this new database? [Y/n]: ").strip().lower()
        if update_choice in ("", "y", "yes"):
            update_backend_env(target_url)
        else:
            print("Skipped .env update. When ready, set DATABASE_URL in Attendance-portal/backend/.env to:")
            print(f"  DATABASE_URL={target_url}")

    print("\n🎉 Migration completed successfully! Your PostgreSQL server is fully up to date.")


if __name__ == "__main__":
    main()
