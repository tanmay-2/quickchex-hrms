"""
Quickchex Attendance Portal - Admin Password Reset
==================================================
Place this file in:  Quickchex/Attendance-portal/backend/
Run it from that folder with the project's virtualenv active.

USAGE
-----
  Step 1 - see what accounts exist:
      python reset_admin.py

  Step 2 - reset the password for one account:
      python reset_admin.py your.email@company.com

  Step 3 (only if NO account exists at all):
      python reset_admin.py your.email@company.com --create

This uses the project's own hash_password() from app/core/security.py,
so the resulting hash is guaranteed compatible with login.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Use the project's OWN hashing function - never reimplement it
from app.core.security import hash_password, verify_password

load_dotenv()

NEW_PASSWORD = "Welcome@123"   # <-- change here if you want a different password
ADMIN_ROLE   = "admin"       # lowercase: required by require_role(["admin"])

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not found. Run this from the backend/ folder "
             "where the .env file lives.")

engine = create_engine(DATABASE_URL)


def list_accounts():
    """Show existing accounts so you can pick the right email."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, emp_code, first_name, last_name, email, role, designation,
                   must_change_password
            FROM profile_master
            ORDER BY
                CASE WHEN lower(role) IN ('admin','superadmin','super admin')
                     THEN 0 ELSE 1 END,
                id
            LIMIT 50
        """)).mappings().all()

    if not rows:
        print("\n  No rows in profile_master - the table is empty.")
        print("  Create an admin with:")
        print("      python reset_admin.py your.email@company.com --create\n")
        return

    print(f"\n  Found {len(rows)} account(s) in profile_master:\n")
    print(f"  {'ID':<5} {'EMP CODE':<12} {'EMAIL':<35} {'ROLE':<14} NAME")
    print("  " + "-" * 90)
    for r in rows:
        name = " ".join(filter(None, [r["first_name"], r["last_name"]])) or "-"
        print(f"  {r['id']:<5} {(r['emp_code'] or '-'):<12} "
              f"{(r['email'] or '-'):<35} {(r['role'] or '-'):<14} {name}")

    print("\n  Pick the email you want, then run:")
    print("      python reset_admin.py <that-email>\n")


def reset_password(email, create_if_missing=False):
    new_hash = hash_password(NEW_PASSWORD)

    # Sanity check before touching the database
    if not verify_password(NEW_PASSWORD, new_hash):
        sys.exit("ERROR: hash self-check failed. Aborting without changes.")

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id, role, emp_code, designation FROM profile_master "
                 "WHERE lower(email) = lower(:e)"),
            {"e": email},
        ).mappings().first()

        if existing:
            conn.execute(text("""
                UPDATE profile_master
                SET password_hash        = :h,
                    must_change_password = true,
                    role                 = :role
                WHERE lower(email) = lower(:e)
            """), {"h": new_hash, "role": ADMIN_ROLE, "e": email})

            print(f"\n  Password reset for: {email}")
            print(f"  Role set to '{ADMIN_ROLE}' (was '{existing['role']}')")
            print(f"  emp_code '{existing['emp_code']}' and designation "
                  f"'{existing['designation']}' left untouched.")

        elif create_if_missing:
            emp_code = conn.execute(text("""
                SELECT 'ADM' || LPAD((COALESCE(MAX(id), 0) + 1)::text, 3, '0')
                FROM profile_master
            """)).scalar()

            conn.execute(text("""
                INSERT INTO profile_master
                    (emp_code, first_name, last_name, email, role,
                     designation, password_hash, must_change_password)
                VALUES
                    (:code, 'System', 'Administrator', :e, :role,
                     'Administrator', :h, true)
            """), {"code": emp_code, "e": email, "role": ADMIN_ROLE, "h": new_hash})

            print(f"\n  Created new admin account: {email} (emp_code {emp_code})")

        else:
            sys.exit(f"\n  No account found with email '{email}'.\n"
                     f"  Run without arguments to list accounts, or add --create "
                     f"to make a new admin.\n")

    # Read back and verify against the app's own login logic
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT email, role, password_hash, must_change_password "
                 "FROM profile_master WHERE lower(email) = lower(:e)"),
            {"e": email},
        ).mappings().first()

    print("\n  Verification (simulating the app's login check):")
    print(f"    verify_password('{NEW_PASSWORD}') -> "
          f"{verify_password(NEW_PASSWORD, row['password_hash'])}")
    print(f"    role in JWT                       -> '{row['role']}'")
    print(f"    must_change_password              -> {row['must_change_password']}")

    print("\n  LOG IN WITH:")
    print(f"    Email    : {row['email']}")
    print(f"    Password : {NEW_PASSWORD}")
    print("\n  NOTE: login is a 2-step flow. After submitting these credentials")
    print("  the app emails you a 6-digit OTP. If email is not working, the OTP")
    print("  is also printed in the backend terminal, like:")
    print("      OTP for you@company.com: 123456\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        list_accounts()
    else:
        reset_password(args[0], create_if_missing="--create" in sys.argv)
