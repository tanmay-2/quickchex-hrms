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

import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
changes = []
skipped = []
problems = []


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def write(path, text):
    io.open(path, "w", encoding="utf-8", newline="").write(text)


def backup(path):
    b = path + ".backup"
    if not os.path.exists(b):
        shutil.copy2(path, b)


def patch(relpath, label, find, replace, already):
    """Replace `find` with `replace` in a file. `already` = marker meaning done."""
    path = os.path.join(HERE, relpath)

    if not os.path.exists(path):
        problems.append("%s - FILE NOT FOUND at %s" % (label, relpath))
        return

    text = read(path)

    if already in text:
        skipped.append("%s - already fixed" % label)
        return

    if find not in text:
        problems.append(
            "%s - could not find the code to replace in %s "
            "(file may already be modified)" % (label, relpath)
        )
        return

    backup(path)
    write(path, text.replace(find, replace, 1))
    changes.append("%s - FIXED (%s)" % (label, relpath))


# ---------------------------------------------------------------------------
# FIX 1 - init_db.py : five models were never imported, so five tables
#         were never created on a fresh database.
# ---------------------------------------------------------------------------
patch(
    os.path.join("app", "db", "init_db.py"),
    "Missing model imports",
    "from app.models.profile_model import Profile",
    "from app.models.profile_model import Profile\r\n"
    "from app.models.leave import LeaveRequest, LeaveBalance\r\n"
    "from app.models.document import EmployeeDocument\r\n"
    "from app.models.policy_model import Policy\r\n"
    "from app.models.ticket_model import Ticket",
    already="from app.models.leave import LeaveRequest",
)

# ---------------------------------------------------------------------------
# FIX 2 - session.py : echo=True floods the terminal with SQL and buries
#         the login OTP in thousands of lines.
# ---------------------------------------------------------------------------
patch(
    os.path.join("app", "db", "session.py"),
    "SQL log spam",
    "echo=True",
    "echo=False",
    already="echo=False",
)

# ---------------------------------------------------------------------------
# FIX 3 - main.py : the per-month tables (attendance_2026_08 etc) were never
#         created. Nothing called create_monthly_tables() except a cron job
#         set for the 25th of the month.
# ---------------------------------------------------------------------------
patch(
    os.path.join("app", "main.py"),
    "Monthly attendance tables",
    '        init_db()\r\n        print("\u2705 Database initialized")',
    '        init_db()\r\n'
    '        print("\u2705 Database initialized")\r\n'
    '\r\n'
    '        # Create THIS month\'s dynamic tables (attendance_YYYY_MM etc).\r\n'
    '        from app.db.table_manager import create_monthly_tables\r\n'
    '        create_monthly_tables(for_next_month=False)\r\n'
    '        create_monthly_tables(for_next_month=True)\r\n'
    '        print("\u2705 Monthly tables verified")',
    already="Monthly tables verified",
)

# ---------------------------------------------------------------------------
# FIX 4 - email_service.py : no SMTP timeout, so an unreachable mail server
#         hangs the request forever.
# ---------------------------------------------------------------------------
patch(
    os.path.join("app", "services", "email_service.py"),
    "SMTP timeout",
    "smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)",
    "smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)",
    already="timeout=10",
)

# ---------------------------------------------------------------------------
# FIX 5 - auth_service.py : login waited for the OTP email to send before
#         returning, and only printed the OTP afterwards. A slow mail server
#         meant login never returned - which the frontend showed as
#         "Connection failed. Please ensure the backend is running."
# ---------------------------------------------------------------------------
patch(
    os.path.join("app", "services", "auth_service.py"),
    "Login hang on slow email",
    '    # \u2705 Send email\r\n'
    '    try:\r\n'
    '        send_otp_email(email, otp_code)\r\n'
    '        print("email send successfully")\r\n'
    '    except Exception as e:\r\n'
    '        print("\u26a0\ufe0f Email failed, using console OTP")\r\n'
    '    print(f"\U0001f510 OTP for {email}: {otp_code}")',

    '    # Show the OTP in the terminal FIRST so it is always available,\r\n'
    '    # even if the mail server is slow, blocked or misconfigured.\r\n'
    '    print("=" * 46)\r\n'
    '    print(f"\U0001f510 OTP for {email}: {otp_code}")\r\n'
    '    print("=" * 46, flush=True)\r\n'
    '\r\n'
    '    # Send the email on a background thread so a slow SMTP host can\r\n'
    '    # never hang the login request.\r\n'
    '    def _send_in_background():\r\n'
    '        try:\r\n'
    '            send_otp_email(email, otp_code)\r\n'
    '            print("email sent successfully", flush=True)\r\n'
    '        except Exception as e:\r\n'
    '            print(f"\u26a0\ufe0f Email failed ({e}) - use the console OTP above", flush=True)\r\n'
    '\r\n'
    '    threading.Thread(target=_send_in_background, daemon=True).start()',
    already="_send_in_background",
)

# auth_service.py also needs the threading import
_auth = os.path.join(HERE, "app", "services", "auth_service.py")
if os.path.exists(_auth):
    _t = read(_auth)
    if "_send_in_background" in _t and "import threading" not in _t:
        backup(_auth)
        write(_auth, _t.replace("import re", "import re\r\nimport threading", 1))
        changes.append("Added 'import threading' (app\\services\\auth_service.py)")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
print("")
print("=" * 62)
print("  Quickchex backend - fix script")
print("=" * 62)
print("")

if changes:
    print("  CHANGED:")
    for c in changes:
        print("    [+] " + c)
    print("")

if skipped:
    print("  ALREADY OK:")
    for s in skipped:
        print("    [=] " + s)
    print("")

if problems:
    print("  NEEDS ATTENTION:")
    for p in problems:
        print("    [!] " + p)
    print("")

# Verify the files still parse as valid Python
print("  Checking the files are still valid Python...")
import ast

bad = False
for rel in [
    os.path.join("app", "main.py"),
    os.path.join("app", "db", "init_db.py"),
    os.path.join("app", "db", "session.py"),
    os.path.join("app", "services", "auth_service.py"),
    os.path.join("app", "services", "email_service.py"),
]:
    p = os.path.join(HERE, rel)
    if not os.path.exists(p):
        continue
    try:
        ast.parse(read(p))
        print("    [ok] " + rel)
    except SyntaxError as e:
        bad = True
        print("    [BROKEN] %s  line %s: %s" % (rel, e.lineno, e.msg))

print("")
if bad:
    print("  A file is broken. Restore it from its .backup copy and tell Claude.")
    sys.exit(1)

print("=" * 62)
print("  Done. Now start the server with:")
print("")
print("      .venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000")
print("")
print("=" * 62)
print("")
