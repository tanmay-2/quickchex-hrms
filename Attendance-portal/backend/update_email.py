import sqlite3

DB_PATH = "app/attendance.db"
OLD_EMAIL = "migdad.mirza@laesfera.co"
NEW_EMAIL = "migdad.m@laesfera.co"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check for current record
cur.execute("SELECT id, emp_code, first_name, last_name, email, role FROM profile_master WHERE lower(email) LIKE '%migdad%'")
rows = cur.fetchall()
print("Current migdad records:", rows)

# Check if old email exists
cur.execute("SELECT id, emp_code, email, role FROM profile_master WHERE lower(email) = lower(?)", (OLD_EMAIL,))
old = cur.fetchone()

if not old:
    print(f"ERROR: No record found with email '{OLD_EMAIL}'")
    conn.close()
    exit(1)

# Check if new email already taken
cur.execute("SELECT id FROM profile_master WHERE lower(email) = lower(?)", (NEW_EMAIL,))
conflict = cur.fetchone()
if conflict:
    print(f"ERROR: Email '{NEW_EMAIL}' already exists (id={conflict[0]}). No changes made.")
    conn.close()
    exit(1)

# Perform update
cur.execute("UPDATE profile_master SET email = ? WHERE lower(email) = lower(?)", (NEW_EMAIL, OLD_EMAIL))
conn.commit()
print(f"\nUpdated: {OLD_EMAIL} -> {NEW_EMAIL}")
print(f"Rows affected: {cur.rowcount}")

# Verify
cur.execute("SELECT id, emp_code, first_name, last_name, email, role FROM profile_master WHERE lower(email) = lower(?)", (NEW_EMAIL,))
updated = cur.fetchone()
print(f"\nVerified: {updated}")

conn.close()
print("\nDone!")
