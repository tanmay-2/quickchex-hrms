# ==============================================================================
# QUICKCHEX HRMS BACKEND - APPLY_FIXES.PY
# Path: Attendance-portal/backend/apply_fixes.py
# Purpose: Backend module.
# Primary Functions:
#   • read()
#   • write()
#   • backup()
#   • patch()
# ==============================================================================

r"""
Quickchex backend - automatic fix script
========================================

WHAT TO DO:
  1. Put this file in:  Attendance-portal\backend\
  2. Open cmd there and run:
         .venv\Scripts\python.exe apply_fixes.py

That's it. It edits the files for you and tells you what it changed.

Safe to run more than once - it skips anything already fixed.
Every file it touches is backed up first as <name>.py.backup
"""

# Import module io for system functionality
import io
# Import module os for system functionality
import os
# Import module shutil for system functionality
import shutil
# Import module sys for system functionality
import sys

# Set HERE variable to store HERE value
HERE = os.path.dirname(os.path.abspath(__file__))
# Set changes variable to store changes value
changes = []
# Set skipped variable to store skipped value
skipped = []
# Set problems variable to store problems value
problems = []


# Define read function to handle read
def read(path):
    # Return computed result or response payload to caller
    return io.open(path, encoding="utf-8", newline="").read()


# Define write function to handle write
def write(path, text):
    # Invoke io.open to perform operational action
    io.open(path, "w", encoding="utf-8", newline="").write(text)


# Define backup function to handle backup
def backup(path):
    # Set b variable to store b value
    b = path + ".backup"
    # Check if target condition is false or object is missing
    if not os.path.exists(b):
        # Invoke shutil.copy2 to perform operational action
        shutil.copy2(path, b)


# Define patch function to handle patch
def patch(relpath, label, find, replace, already):
    """Replace `find` with `replace` in a file. `already` = marker meaning done."""
    path = os.path.join(HERE, relpath)

    # Check if target condition is false or object is missing
    if not os.path.exists(path):
        # Invoke problems.append to perform operational action
        problems.append("%s - FILE NOT FOUND at %s" % (label, relpath))
        # Return computed result or response payload to caller
        return

    # Set text variable to store text value
    text = read(path)

    # Evaluate condition to control execution branch
    if already in text:
        # Invoke skipped.append to perform operational action
        skipped.append("%s - already fixed" % label)
        # Return computed result or response payload to caller
        return

    # Check if target condition is false or object is missing
    if find not in text:
        # Execute statement to process data and maintain state
        problems.append(
            # Execute statement to process data and maintain state
            "%s - could not find the code to replace in %s "
            # Execute statement to process data and maintain state
            "(file may already be modified)" % (label, relpath)
        # Execute statement to process data and maintain state
        )
        # Return computed result or response payload to caller
        return

    # Invoke backup to perform operational action
    backup(path)
    # Invoke write to perform operational action
    write(path, text.replace(find, replace, 1))
    # Invoke changes.append to perform operational action
    changes.append("%s - FIXED (%s)" % (label, relpath))


# ---------------------------------------------------------------------------
# FIX 1 - init_db.py : five models were never imported, so five tables
#         were never created on a fresh database.
# ---------------------------------------------------------------------------
patch(
    # Invoke os.path.join to perform operational action
    os.path.join("app", "db", "init_db.py"),
    # Execute statement to process data and maintain state
    "Missing model imports",
    # Execute statement to process data and maintain state
    "from app.models.profile_model import Profile",
    # Execute statement to process data and maintain state
    "from app.models.profile_model import Profile\r\n"
    # Execute statement to process data and maintain state
    "from app.models.leave import LeaveRequest, LeaveBalance\r\n"
    # Execute statement to process data and maintain state
    "from app.models.document import EmployeeDocument\r\n"
    # Execute statement to process data and maintain state
    "from app.models.policy_model import Policy\r\n"
    # Execute statement to process data and maintain state
    "from app.models.ticket_model import Ticket",
    # Set already variable to store already value
    already="from app.models.leave import LeaveRequest",
# Execute statement to process data and maintain state
)

# ---------------------------------------------------------------------------
# FIX 2 - session.py : echo=True floods the terminal with SQL and buries
#         the login OTP in thousands of lines.
# ---------------------------------------------------------------------------
patch(
    # Invoke os.path.join to perform operational action
    os.path.join("app", "db", "session.py"),
    # Execute statement to process data and maintain state
    "SQL log spam",
    # Specify parameter value for "echo
    "echo=True",
    # Specify parameter value for "echo
    "echo=False",
    # Set already variable to store already value
    already="echo=False",
# Execute statement to process data and maintain state
)

# ---------------------------------------------------------------------------
# FIX 3 - main.py : the per-month tables (attendance_2026_08 etc) were never
#         created. Nothing called create_monthly_tables() except a cron job
#         set for the 25th of the month.
# ---------------------------------------------------------------------------
patch(
    # Invoke os.path.join to perform operational action
    os.path.join("app", "main.py"),
    # Execute statement to process data and maintain state
    "Monthly attendance tables",
    # Execute statement to process data and maintain state
    '        init_db()\r\n        print("\u2705 Database initialized")',
    # Execute statement to process data and maintain state
    '        init_db()\r\n'
    # Execute statement to process data and maintain state
    '        print("\u2705 Database initialized")\r\n'
    # Execute statement to process data and maintain state
    '\r\n'
    # Execute statement to process data and maintain state
    '        # Create THIS month\'s dynamic tables (attendance_YYYY_MM etc).\r\n'
    # Execute statement to process data and maintain state
    '        from app.db.table_manager import create_monthly_tables\r\n'
    # Execute statement to process data and maintain state
    '        create_monthly_tables(for_next_month=False)\r\n'
    # Execute statement to process data and maintain state
    '        create_monthly_tables(for_next_month=True)\r\n'
    # Execute statement to process data and maintain state
    '        print("\u2705 Monthly tables verified")',
    # Set already variable to store already value
    already="Monthly tables verified",
# Execute statement to process data and maintain state
)

# ---------------------------------------------------------------------------
# FIX 4 - email_service.py : no SMTP timeout, so an unreachable mail server
#         hangs the request forever.
# ---------------------------------------------------------------------------
patch(
    # Invoke os.path.join to perform operational action
    os.path.join("app", "services", "email_service.py"),
    # Execute statement to process data and maintain state
    "SMTP timeout",
    # Execute statement to process data and maintain state
    "smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)",
    # Specify parameter value for "smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout
    "smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)",
    # Set already variable to store already value
    already="timeout=10",
# Execute statement to process data and maintain state
)

# ---------------------------------------------------------------------------
# FIX 5 - auth_service.py : login waited for the OTP email to send before
#         returning, and only printed the OTP afterwards. A slow mail server
#         meant login never returned - which the frontend showed as
#         "Connection failed. Please ensure the backend is running."
# ---------------------------------------------------------------------------
patch(
    # Invoke os.path.join to perform operational action
    os.path.join("app", "services", "auth_service.py"),
    # Execute statement to process data and maintain state
    "Login hang on slow email",
    # Execute statement to process data and maintain state
    '    # \u2705 Send email\r\n'
    # Execute statement to process data and maintain state
    '    try:\r\n'
    # Execute statement to process data and maintain state
    '        send_otp_email(email, otp_code)\r\n'
    # Execute statement to process data and maintain state
    '        print("email send successfully")\r\n'
    # Execute statement to process data and maintain state
    '    except Exception as e:\r\n'
    # Execute statement to process data and maintain state
    '        print("\u26a0\ufe0f Email failed, using console OTP")\r\n'
    # Execute statement to process data and maintain state
    '    print(f"\U0001f510 OTP for {email}: {otp_code}")',

    # Execute statement to process data and maintain state
    '    # Show the OTP in the terminal FIRST so it is always available,\r\n'
    # Execute statement to process data and maintain state
    '    # even if the mail server is slow, blocked or misconfigured.\r\n'
    # Execute statement to process data and maintain state
    '    print("=" * 46)\r\n'
    # Execute statement to process data and maintain state
    '    print(f"\U0001f510 OTP for {email}: {otp_code}")\r\n'
    # Execute statement to process data and maintain state
    '    print("=" * 46, flush=True)\r\n'
    # Execute statement to process data and maintain state
    '\r\n'
    # Execute statement to process data and maintain state
    '    # Send the email on a background thread so a slow SMTP host can\r\n'
    # Execute statement to process data and maintain state
    '    # never hang the login request.\r\n'
    # Execute statement to process data and maintain state
    '    def _send_in_background():\r\n'
    # Execute statement to process data and maintain state
    '        try:\r\n'
    # Execute statement to process data and maintain state
    '            send_otp_email(email, otp_code)\r\n'
    # Execute statement to process data and maintain state
    '            print("email sent successfully", flush=True)\r\n'
    # Execute statement to process data and maintain state
    '        except Exception as e:\r\n'
    # Execute statement to process data and maintain state
    '            print(f"\u26a0\ufe0f Email failed ({e}) - use the console OTP above", flush=True)\r\n'
    # Execute statement to process data and maintain state
    '\r\n'
    # Specify parameter value for '    threading.Thread(target
    '    threading.Thread(target=_send_in_background, daemon=True).start()',
    # Set already variable to store already value
    already="_send_in_background",
# Execute statement to process data and maintain state
)

# auth_service.py also needs the threading import
_auth = os.path.join(HERE, "app", "services", "auth_service.py")
# Evaluate condition to control execution branch
if os.path.exists(_auth):
    # Set _t variable to store  t value
    _t = read(_auth)
    # Check if target condition is false or object is missing
    if "_send_in_background" in _t and "import threading" not in _t:
        # Invoke backup to perform operational action
        backup(_auth)
        # Invoke write to perform operational action
        write(_auth, _t.replace("import re", "import re\r\nimport threading", 1))
        # Invoke changes.append to perform operational action
        changes.append("Added 'import threading' (app\\services\\auth_service.py)")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
print("")
# Invoke print to perform operational action
print("=" * 62)
# Invoke print to perform operational action
print("  Quickchex backend - fix script")
# Invoke print to perform operational action
print("=" * 62)
# Invoke print to perform operational action
print("")

# Evaluate condition to control execution branch
if changes:
    # Invoke print to perform operational action
    print("  CHANGED:")
    # Iterate through items in sequence loop
    for c in changes:
        # Invoke print to perform operational action
        print("    [+] " + c)
    # Invoke print to perform operational action
    print("")

# Evaluate condition to control execution branch
if skipped:
    # Invoke print to perform operational action
    print("  ALREADY OK:")
    # Iterate through items in sequence loop
    for s in skipped:
        # Invoke print to perform operational action
        print("    [=] " + s)
    # Invoke print to perform operational action
    print("")

# Evaluate condition to control execution branch
if problems:
    # Invoke print to perform operational action
    print("  NEEDS ATTENTION:")
    # Iterate through items in sequence loop
    for p in problems:
        # Invoke print to perform operational action
        print("    [!] " + p)
    # Invoke print to perform operational action
    print("")

# Verify the files still parse as valid Python
print("  Checking the files are still valid Python...")
# Import module ast for system functionality
import ast

# Set bad variable to store bad value
bad = False
# Iterate through items in sequence loop
for rel in [
    # Invoke os.path.join to perform operational action
    os.path.join("app", "main.py"),
    # Invoke os.path.join to perform operational action
    os.path.join("app", "db", "init_db.py"),
    # Invoke os.path.join to perform operational action
    os.path.join("app", "db", "session.py"),
    # Invoke os.path.join to perform operational action
    os.path.join("app", "services", "auth_service.py"),
    # Invoke os.path.join to perform operational action
    os.path.join("app", "services", "email_service.py"),
# Execute statement to process data and maintain state
]:
    # Set p variable to store p value
    p = os.path.join(HERE, rel)
    # Check if target condition is false or object is missing
    if not os.path.exists(p):
        # Skip to next iteration of active loop
        continue
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke ast.parse to perform operational action
        ast.parse(read(p))
        # Invoke print to perform operational action
        print("    [ok] " + rel)
    # Catch and handle specific exception if raised
    except SyntaxError as e:
        # Set bad variable to store bad value
        bad = True
        # Invoke print to perform operational action
        print("    [BROKEN] %s  line %s: %s" % (rel, e.lineno, e.msg))

# Invoke print to perform operational action
print("")
# Evaluate condition to control execution branch
if bad:
    # Invoke print to perform operational action
    print("  A file is broken. Restore it from its .backup copy and tell Claude.")
    # Invoke sys.exit to perform operational action
    sys.exit(1)

# Invoke print to perform operational action
print("=" * 62)
# Invoke print to perform operational action
print("  Done. Now start the server with:")
# Invoke print to perform operational action
print("")
# Invoke print to perform operational action
print("      .venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000")
# Invoke print to perform operational action
print("")
# Invoke print to perform operational action
print("=" * 62)
# Invoke print to perform operational action
print("")
