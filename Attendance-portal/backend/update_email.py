# ==============================================================================
# QUICKCHEX HRMS BACKEND - UPDATE_EMAIL.PY
# Path: Attendance-portal/backend/update_email.py
# Purpose: Backend module.
# ==============================================================================

# Import module sqlite3 for system functionality
import sqlite3

# Set DB_PATH variable to store DB PATH value
DB_PATH = "app/attendance.db"
# Set OLD_EMAIL variable to store OLD EMAIL value
OLD_EMAIL = "migdad.mirza@laesfera.co"
# Set NEW_EMAIL variable to store NEW EMAIL value
NEW_EMAIL = "migdad.m@laesfera.co"

# Set conn variable to store conn value
conn = sqlite3.connect(DB_PATH)
# Set cur variable to store cur value
cur = conn.cursor()

# Check for current record
cur.execute("SELECT id, emp_code, first_name, last_name, email, role FROM profile_master WHERE lower(email) LIKE '%migdad%'")
# Set rows variable to store rows value
rows = cur.fetchall()
# Invoke print to perform operational action
print("Current migdad records:", rows)

# Check if old email exists
cur.execute("SELECT id, emp_code, email, role FROM profile_master WHERE lower(email) = lower(?)", (OLD_EMAIL,))
# Set old variable to store old value
old = cur.fetchone()

# Check if target condition is false or object is missing
if not old:
    # Invoke print to perform operational action
    print(f"ERROR: No record found with email '{OLD_EMAIL}'")
    # Invoke conn.close to perform operational action
    conn.close()
    # Invoke exit to perform operational action
    exit(1)

# Check if new email already taken
cur.execute("SELECT id FROM profile_master WHERE lower(email) = lower(?)", (NEW_EMAIL,))
# Set conflict variable to store conflict value
conflict = cur.fetchone()
# Evaluate condition to control execution branch
if conflict:
    # Invoke print to perform operational action
    print(f"ERROR: Email '{NEW_EMAIL}' already exists (id={conflict[0]}). No changes made.")
    # Invoke conn.close to perform operational action
    conn.close()
    # Invoke exit to perform operational action
    exit(1)

# Perform update
cur.execute("UPDATE profile_master SET email = ? WHERE lower(email) = lower(?)", (NEW_EMAIL, OLD_EMAIL))
# Invoke conn.commit to perform operational action
conn.commit()
# Invoke print to perform operational action
print(f"\nUpdated: {OLD_EMAIL} -> {NEW_EMAIL}")
# Invoke print to perform operational action
print(f"Rows affected: {cur.rowcount}")

# Verify
cur.execute("SELECT id, emp_code, first_name, last_name, email, role FROM profile_master WHERE lower(email) = lower(?)", (NEW_EMAIL,))
# Set updated variable to store updated value
updated = cur.fetchone()
# Invoke print to perform operational action
print(f"\nVerified: {updated}")

# Invoke conn.close to perform operational action
conn.close()
# Invoke print to perform operational action
print("\nDone!")
