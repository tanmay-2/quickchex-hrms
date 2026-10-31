# ==============================================================================
# QUICKCHEX HRMS BACKEND - MIGRATE_MISSING_PG_DATA.PY
# Path: Attendance-portal/backend/migrate_missing_pg_data.py
# Purpose: Backend module.
# ==============================================================================

import sqlite3
import os
from sqlalchemy import text
from app.db.session import engine

s_path = os.path.join(os.path.dirname(__file__), "app", "attendance.db")
if not os.path.exists(s_path):
    print("No SQLite database found at:", s_path)
    exit(0)

s_conn = sqlite3.connect(s_path)
s_conn.row_factory = sqlite3.Row
s_cur = s_conn.cursor()

with engine.begin() as pg_conn:
    # 1. client_sites
    existing_sites = pg_conn.execute(text("SELECT count(*) FROM client_sites")).scalar()
    if existing_sites == 0:
        rows = s_cur.execute("SELECT * FROM client_sites").fetchall()
        for r in rows:
            d = dict(r)
            pg_conn.execute(text("""
                INSERT INTO client_sites (id, name, client_name, address, latitude, longitude, allowed_radius, is_active, created_at, updated_at)
                VALUES (:id, :name, :client_name, :address, :latitude, :longitude, :allowed_radius, :is_active, :created_at, :updated_at)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": d["id"],
                "name": d["name"],
                "client_name": d.get("client_name"),
                "address": d.get("address"),
                "latitude": d["latitude"],
                "longitude": d["longitude"],
                "allowed_radius": d.get("allowed_radius", 200.0),
                "is_active": bool(d.get("is_active", 1)),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at")
            })
        # Reset sequence
        pg_conn.execute(text("SELECT setval(pg_get_serial_sequence('client_sites', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM client_sites"))
        print(f"Migrated {len(rows)} client_sites to PostgreSQL")

    # 2. attendance_settings
    existing_settings = pg_conn.execute(text("SELECT count(*) FROM attendance_settings")).scalar()
    if existing_settings == 0:
        rows = s_cur.execute("SELECT * FROM attendance_settings").fetchall()
        for r in rows:
            d = dict(r)
            pg_conn.execute(text("""
                INSERT INTO attendance_settings (id, office_name, office_address, office_latitude, office_longitude, office_radius, enforce_geofence, wfh_enabled, wfh_requires_approval, wfh_requires_location, wfh_requires_camera, allowed_work_modes, updated_at)
                VALUES (:id, :office_name, :office_address, :office_latitude, :office_longitude, :office_radius, :enforce_geofence, :wfh_enabled, :wfh_requires_approval, :wfh_requires_location, :wfh_requires_camera, :allowed_work_modes, :updated_at)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": d["id"],
                "office_name": d.get("office_name", "LA ESFERA Head Office"),
                "office_address": d.get("office_address", "Mumbai, Maharashtra, India"),
                "office_latitude": d.get("office_latitude", 19.1232),
                "office_longitude": d.get("office_longitude", 72.9284),
                "office_radius": d.get("office_radius", 250.0),
                "enforce_geofence": bool(d.get("enforce_geofence", 0)),
                "wfh_enabled": bool(d.get("wfh_enabled", 1)),
                "wfh_requires_approval": bool(d.get("wfh_requires_approval", 0)),
                "wfh_requires_location": bool(d.get("wfh_requires_location", 1)),
                "wfh_requires_camera": bool(d.get("wfh_requires_camera", 1)),
                "allowed_work_modes": str(d.get("allowed_work_modes", '["OFFICE","WFH","CLIENT_SITE"]')),
                "updated_at": d.get("updated_at")
            })
        pg_conn.execute(text("SELECT setval(pg_get_serial_sequence('attendance_settings', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM attendance_settings"))
        print(f"Migrated {len(rows)} attendance_settings to PostgreSQL")

    # 3. payroll_profiles
    existing_payroll = pg_conn.execute(text("SELECT count(*) FROM payroll_profiles")).scalar()
    if existing_payroll == 0:
        rows = s_cur.execute("SELECT * FROM payroll_profiles").fetchall()
        for r in rows:
            d = dict(r)
            pg_conn.execute(text("""
                INSERT INTO payroll_profiles (id, emp_code, basic_salary, hra, special_allowance, gross_salary, pf_deduction, pt_deduction, other_deductions, net_salary, employer_pf, employer_contributions, ctc, pay_frequency, status, created_at, updated_at)
                VALUES (:id, :emp_code, :basic_salary, :hra, :special_allowance, :gross_salary, :pf_deduction, :pt_deduction, :other_deductions, :net_salary, :employer_pf, :employer_contributions, :ctc, :pay_frequency, :status, :created_at, :updated_at)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": d["id"],
                "emp_code": d["emp_code"],
                "basic_salary": d.get("basic_salary", 0.0),
                "hra": d.get("hra", 0.0),
                "special_allowance": d.get("special_allowance", 0.0),
                "gross_salary": d.get("gross_salary", 0.0),
                "pf_deduction": d.get("pf_deduction", 0.0),
                "pt_deduction": d.get("pt_deduction", 200.0),
                "other_deductions": d.get("other_deductions", 0.0),
                "net_salary": d.get("net_salary", 0.0),
                "employer_pf": d.get("employer_pf", 0.0),
                "employer_contributions": d.get("employer_contributions", 0.0),
                "ctc": d.get("ctc", 0.0),
                "pay_frequency": d.get("pay_frequency", "Monthly"),
                "status": d.get("status", "Configured"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at")
            })
        pg_conn.execute(text("SELECT setval(pg_get_serial_sequence('payroll_profiles', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM payroll_profiles"))
        print(f"Migrated {len(rows)} payroll_profiles to PostgreSQL")

    # 4. payslips
    existing_payslips = pg_conn.execute(text("SELECT count(*) FROM payslips")).scalar()
    if existing_payslips == 0:
        rows = s_cur.execute("SELECT * FROM payslips").fetchall()
        for r in rows:
            d = dict(r)
            pg_conn.execute(text("""
                INSERT INTO payslips (id, emp_code, employee_name, month, year, financial_year, basic_salary, hra, special_allowance, gross_earnings, pf_deduction, pt_deduction, total_deductions, net_salary, employer_pf, employer_contributions, ctc, total_days, paid_days, status, created_at)
                VALUES (:id, :emp_code, :employee_name, :month, :year, :financial_year, :basic_salary, :hra, :special_allowance, :gross_earnings, :pf_deduction, :pt_deduction, :total_deductions, :net_salary, :employer_pf, :employer_contributions, :ctc, :total_days, :paid_days, :status, :created_at)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": d["id"],
                "emp_code": d["emp_code"],
                "employee_name": d.get("employee_name"),
                "month": d["month"],
                "year": d["year"],
                "financial_year": d.get("financial_year", "2026-2027"),
                "basic_salary": d.get("basic_salary", 0.0),
                "hra": d.get("hra", 0.0),
                "special_allowance": d.get("special_allowance", 0.0),
                "gross_earnings": d.get("gross_earnings", 0.0),
                "pf_deduction": d.get("pf_deduction", 0.0),
                "pt_deduction": d.get("pt_deduction", 200.0),
                "total_deductions": d.get("total_deductions", 0.0),
                "net_salary": d.get("net_salary", 0.0),
                "employer_pf": d.get("employer_pf", 0.0),
                "employer_contributions": d.get("employer_contributions", 0.0),
                "ctc": d.get("ctc", 0.0),
                "total_days": d.get("total_days", 30),
                "paid_days": d.get("paid_days", 30),
                "status": d.get("status", "Paid"),
                "created_at": d.get("created_at")
            })
        pg_conn.execute(text("SELECT setval(pg_get_serial_sequence('payslips', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM payslips"))
        print(f"Migrated {len(rows)} payslips to PostgreSQL")

    # 5. holidays
    existing_holidays = pg_conn.execute(text("SELECT count(*) FROM holidays")).scalar()
    if existing_holidays == 0:
        default_holidays = [
            (1, "Republic Day", "2026-01-26", "Monday", "National", "Active"),
            (2, "Holi", "2026-03-14", "Saturday", "Gazetted", "Active"),
            (3, "Independence Day", "2026-08-15", "Saturday", "National", "Active"),
            (4, "Gandhi Jayanti", "2026-10-02", "Friday", "National", "Active"),
            (5, "Diwali", "2026-11-08", "Sunday", "Gazetted", "Active"),
            (6, "Christmas", "2026-12-25", "Friday", "Gazetted", "Active")
        ]
        for hid, name, hdate, dow, htype, stat in default_holidays:
            pg_conn.execute(text("""
                INSERT INTO holidays (id, name, holiday_date, day_of_week, type, status)
                VALUES (:id, :name, :hdate, :dow, :type, :status)
                ON CONFLICT (id) DO NOTHING
            """), {"id": hid, "name": name, "hdate": hdate, "dow": dow, "type": htype, "status": stat})
        pg_conn.execute(text("SELECT setval(pg_get_serial_sequence('holidays', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM holidays"))
        print(f"Populated {len(default_holidays)} holidays in PostgreSQL")

print("Migration check and sync completed successfully.")
