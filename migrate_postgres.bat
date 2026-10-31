@echo off
setlocal
cd /d "%~dp0"

if exist "Attendance-portal\backend\.venv\Scripts\python.exe" (
    "Attendance-portal\backend\.venv\Scripts\python.exe" "Attendance-portal\backend\setup_and_migrate_postgres.py" %*
) else (
    python "Attendance-portal\backend\setup_and_migrate_postgres.py" %*
)

if "%~1"=="" (
    echo.
    pause
)
