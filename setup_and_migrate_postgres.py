# ==============================================================================
# QUICKCHEX HRMS BACKEND - SETUP_AND_MIGRATE_POSTGRES.PY
# Path: setup_and_migrate_postgres.py
# Purpose: Backend module.
# ==============================================================================

#!/usr/bin/env python3
"""
Root Wrapper for Quickchex PostgreSQL Setup & Migration Tool
Runs Attendance-portal/backend/setup_and_migrate_postgres.py
"""
import sys

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
TARGET_SCRIPT = ROOT_DIR / "Attendance-portal" / "backend" / "setup_and_migrate_postgres.py"

# Try virtualenv python if available
VENV_PYTHON = ROOT_DIR / "Attendance-portal" / "backend" / ".venv" / ("Scripts" if sys.platform == "win32" else "bin") / ("python.exe" if sys.platform == "win32" else "python")

python_bin = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

cmd = [python_bin, str(TARGET_SCRIPT)] + sys.argv[1:]

try:
    exit_code = subprocess.call(cmd)
    sys.exit(exit_code)
except KeyboardInterrupt:
    print("\nProcess interrupted by user.")
    sys.exit(130)
