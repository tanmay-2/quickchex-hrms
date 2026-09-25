r"""
Quickchex frontend - import repair
==================================

Fixes the broken import paths that make `npm run build` fail.

WHAT TO DO:
  1. Put this file in:  Frontend\hrms-frontend\
     (the folder containing package.json and the src folder)
  2. Open cmd there and run:
         python fix_frontend_imports.py

Safe to run twice. Backups are written as <name>.backup

WHY THESE ARE BROKEN
--------------------
Windows treats file paths as case-insensitive, so `import Sidebar_emp`
happily loads a file called `sidebar_emp.jsx`. Linux does not, and neither
does Vite's production bundler. So `npm run dev` works on your machine
while `npm run build` fails - and any deploy to a Linux server fails too.
"""

import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")

if not os.path.isdir(SRC):
    sys.exit(
        "ERROR: no 'src' folder next to this script.\n"
        "Put this file in Frontend\\hrms-frontend\\ (where package.json is)."
    )

# (file relative to src, text to find, text to replace with)
FIXES = [
    ("App.jsx", '"./pages/Login/LoginPage"', '"./pages/Login/loginPage"'),

    ("pages/TeamLeader/TLRegularization.jsx",
     "components/sidebar/Sidebar_tl", "components/sidebar/sidebar_tl"),

    ("pages/Profile/Profile.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Attendance/Attendance.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/CompanyPolicies.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/RegularizationPage.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/LeaveApplication.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/Tickets_emp.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/Dashboard_emp.jsx",
     "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),

    ("pages/Dashboard/CompanyPolicies.jsx",
     'components/sidebar/sidebar"', 'components/sidebar/Sidebar"'),

    # TopHeader.jsx lives in pages/Dashboard/, not components/
    ("pages/Dashboard/DailyTaskPage.jsx",
     "../../components/TopHeader", "../Dashboard/TopHeader"),

    # loginPage.css - three files import it with a capital L
    ("pages/Login/loginPage.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
    ("pages/Login/OtpPage.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
    ("pages/Login/ResetPassword.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
]

changed = 0
already = 0
missing = []

for rel, find, replace in FIXES:
    path = os.path.join(SRC, rel)
    if not os.path.exists(path):
        missing.append(rel)
        continue

    text = io.open(path, encoding="utf-8", newline="").read()

    if find not in text:
        already += 1
        continue

    backup = path + ".backup"
    if not os.path.exists(backup):
        shutil.copy2(path, backup)

    io.open(path, "w", encoding="utf-8", newline="").write(text.replace(find, replace))
    print("  [+] %-45s %s -> %s" % (rel, find.strip('"'), replace.strip('"')))
    changed += 1

print("")
print("=" * 60)
print("  Fixed: %d     Already correct: %d" % (changed, already))
if missing:
    print("  Files not found (skipped): %s" % ", ".join(missing))
print("=" * 60)
print("")
print("  Verify with:   npm run build")
print("  It should finish with 'built in ...' and no 'Module not found'.")
print("")
