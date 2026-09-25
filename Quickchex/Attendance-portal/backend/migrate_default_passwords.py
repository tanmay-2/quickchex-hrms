import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from app.core.security import hash_password, verify_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not found in .env")

DEFAULT_PASSWORD = "Welcome@123"

def migrate_passwords():
    engine = create_engine(DATABASE_URL)
    hashed_pwd = hash_password(DEFAULT_PASSWORD)

    # Sanity check password hashing
    if not verify_password(DEFAULT_PASSWORD, hashed_pwd):
        sys.exit("ERROR: Password hashing verification failed.")

    print(f"Connecting to database: {DATABASE_URL}")
    with engine.begin() as conn:
        # Check current count
        count_before = conn.execute(text("SELECT COUNT(*) FROM profile_master")).scalar()
        print(f"Total accounts in profile_master: {count_before}")

        # Update all accounts
        result = conn.execute(
            text("""
                UPDATE profile_master
                SET password_hash = :h,
                    must_change_password = true
            """),
            {"h": hashed_pwd}
        )
        print(f"Updated {result.rowcount} rows with default password and must_change_password = true")

    # Verify and display
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, emp_code, email, role, must_change_password
            FROM profile_master
            ORDER BY id
        """)).mappings().all()

        print("\n--- Verified Profile Master Records ---")
        for r in rows:
            print(f"ID: {r['id']:<4} | EMP: {(r['emp_code'] or '-'):<8} | Role: {(r['role'] or '-'):<12} | Must Change: {r['must_change_password']} | Email: {r['email']}")

        all_ok = all(r['must_change_password'] is True for r in rows)
        if all_ok:
            print(f"\n[SUCCESS] All {len(rows)} accounts successfully configured with must_change_password = True!")
        else:
            print("\n[WARNING] Some accounts were not updated properly.")

if __name__ == "__main__":
    migrate_passwords()
