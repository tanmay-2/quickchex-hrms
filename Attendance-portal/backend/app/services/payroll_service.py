import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date, datetime
import calendar
import io
try:
    import pymupdf as fitz
except ImportError:
    import fitz


logger = logging.getLogger("payroll_service")

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def init_payslips_table(db: Session):
    """Ensures payslips and payroll_profiles tables exist."""
    try:
        # SQLite uses INTEGER PRIMARY KEY AUTOINCREMENT
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS payroll_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emp_code VARCHAR(50) UNIQUE NOT NULL,
                basic_salary NUMERIC(12, 2) DEFAULT 0.00,
                hra NUMERIC(12, 2) DEFAULT 0.00,
                special_allowance NUMERIC(12, 2) DEFAULT 0.00,
                gross_salary NUMERIC(12, 2) DEFAULT 0.00,
                pf_deduction NUMERIC(12, 2) DEFAULT 0.00,
                pt_deduction NUMERIC(12, 2) DEFAULT 0.00,
                other_deductions NUMERIC(12, 2) DEFAULT 0.00,
                net_salary NUMERIC(12, 2) DEFAULT 0.00,
                employer_pf NUMERIC(12, 2) DEFAULT 0.00,
                employer_contributions NUMERIC(12, 2) DEFAULT 0.00,
                ctc NUMERIC(12, 2) DEFAULT 0.00,
                pay_frequency VARCHAR(50) DEFAULT 'Monthly',
                effective_date DATE,
                status VARCHAR(50) DEFAULT 'Payroll Setup Required',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS payslips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emp_code VARCHAR(50) NOT NULL,
                employee_name VARCHAR(150),
                month VARCHAR(20) NOT NULL,
                year INTEGER NOT NULL,
                financial_year VARCHAR(20) NOT NULL,
                basic_salary NUMERIC(12, 2) DEFAULT 0.00,
                hra NUMERIC(12, 2) DEFAULT 0.00,
                special_allowance NUMERIC(12, 2) DEFAULT 0.00,
                gross_earnings NUMERIC(12, 2) DEFAULT 0.00,
                pf_deduction NUMERIC(12, 2) DEFAULT 0.00,
                pt_deduction NUMERIC(12, 2) DEFAULT 200.00,
                total_deductions NUMERIC(12, 2) DEFAULT 0.00,
                net_salary NUMERIC(12, 2) DEFAULT 0.00,
                employer_pf NUMERIC(12, 2) DEFAULT 0.00,
                employer_contributions NUMERIC(12, 2) DEFAULT 0.00,
                ctc NUMERIC(12, 2) DEFAULT 0.00,
                total_days INTEGER DEFAULT 30,
                paid_days INTEGER DEFAULT 30,
                status VARCHAR(50) DEFAULT 'Generated',
                generated_on DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_emp_month_year UNIQUE (emp_code, month, year)
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error initializing payroll tables: {e}")


def calculate_salary_breakdown(monthly_gross: float):
    gross = max(0.0, float(monthly_gross or 0.0))
    basic = round(gross * 0.50, 2)
    hra = round(gross * 0.20, 2)
    special_allowance = max(0.0, round(gross - (basic + hra), 2))
    
    pf_deduction = round(basic * 0.12, 2)
    pt_deduction = 200.0 if gross >= 15000 else (175.0 if gross >= 10000 else 0.0)
    total_deductions = round(pf_deduction + pt_deduction, 2)
    
    net_salary = max(0.0, round(gross - total_deductions, 2))
    employer_pf = round(basic * 0.12, 2)
    employer_contributions = employer_pf
    ctc = round(gross + employer_contributions, 2)

    return {
        "basic_salary": basic,
        "hra": hra,
        "special_allowance": special_allowance,
        "gross_earnings": gross,
        "gross_salary": gross,
        "pf_deduction": pf_deduction,
        "pt_deduction": pt_deduction,
        "other_deductions": 0.0,
        "total_deductions": total_deductions,
        "net_salary": net_salary,
        "employer_pf": employer_pf,
        "employer_contributions": employer_contributions,
        "ctc": ctc
    }


def init_payroll_profile(
    db: Session,
    emp_code: str,
    monthly_gross: float = None,
    annual_ctc: float = None,
    joining_date: date = None,
    employment_type: str = "Full-time"
) -> dict:
    """
    Initializes payroll profile for a newly created employee.
    DO NOT GENERATE FAKE SALARY OR FAKE PAYSLIP!
    If salary is not specified, status = 'Payroll Setup Required'.
    """
    init_payslips_table(db)

    clean_code = str(emp_code or "").strip()
    if not clean_code:
        return {}

    existing = db.execute(
        text("SELECT * FROM payroll_profiles WHERE emp_code = :c"),
        {"c": clean_code}
    ).mappings().first()

    gross_val = 0.0
    has_salary = False
    if monthly_gross and float(monthly_gross) > 0:
        gross_val = float(monthly_gross)
        has_salary = True
    elif annual_ctc and float(annual_ctc) > 0:
        gross_val = float(annual_ctc) / 12.0 / 1.06
        has_salary = True

    calc = calculate_salary_breakdown(gross_val) if has_salary else {
        "basic_salary": 0.0,
        "hra": 0.0,
        "special_allowance": 0.0,
        "gross_salary": 0.0,
        "pf_deduction": 0.0,
        "pt_deduction": 0.0,
        "other_deductions": 0.0,
        "total_deductions": 0.0,
        "net_salary": 0.0,
        "employer_pf": 0.0,
        "employer_contributions": 0.0,
        "ctc": 0.0
    }

    status_str = "Configured" if has_salary else "Payroll Setup Required"
    eff_date = joining_date or date.today()

    if existing:
        if has_salary:
            db.execute(text("""
                UPDATE payroll_profiles
                SET basic_salary = :basic_salary,
                    hra = :hra,
                    special_allowance = :special_allowance,
                    gross_salary = :gross_salary,
                    pf_deduction = :pf_deduction,
                    pt_deduction = :pt_deduction,
                    other_deductions = :other_deductions,
                    net_salary = :net_salary,
                    employer_pf = :employer_pf,
                    employer_contributions = :employer_contributions,
                    ctc = :ctc,
                    status = :st,
                    effective_date = COALESCE(:eff, effective_date),
                    updated_at = CURRENT_TIMESTAMP
                WHERE emp_code = :c
            """), {"c": clean_code, "st": status_str, "eff": eff_date, **calc})
            db.commit()
    else:
        db.execute(text("""
            INSERT INTO payroll_profiles (
                emp_code, basic_salary, hra, special_allowance, gross_salary,
                pf_deduction, pt_deduction, other_deductions, net_salary,
                employer_pf, employer_contributions, ctc,
                pay_frequency, effective_date, status
            ) VALUES (
                :c, :basic_salary, :hra, :special_allowance, :gross_salary,
                :pf_deduction, :pt_deduction, :other_deductions, :net_salary,
                :employer_pf, :employer_contributions, :ctc,
                'Monthly', :eff, :st
            )
        """), {"c": clean_code, "eff": eff_date, "st": status_str, **calc})
        db.commit()

    return {"emp_code": clean_code, "status": status_str, **calc}


def get_month_index(month_name: str) -> int:
    try:
        return MONTH_NAMES.index(month_name) + 1
    except ValueError:
        return datetime.now().month


def get_days_in_month(month: str, year: int) -> int:
    m_idx = get_month_index(month)
    try:
        return calendar.monthrange(int(year), m_idx)[1]
    except Exception:
        return 30


def get_all_payroll_records(
    db: Session,
    search: str = "",
    month: str = "",
    year: str = "",
    department: str = "",
    status: str = ""
) -> dict:
    """
    Returns actual employees from profile_master synchronized with payroll_profiles & payslips.
    No fake salaries. Displays 'Payroll Setup Required' when salary is not configured.
    Respects actual joining date and mid-month proration.
    """
    init_payslips_table(db)

    now = datetime.now()
    sel_month = month.strip() if month and month.strip() in MONTH_NAMES else MONTH_NAMES[now.month - 1]
    sel_year = int(year) if year and str(year).isdigit() else now.year
    fin_year = f"{sel_year}-{sel_year + 1}" if get_month_index(sel_month) >= 4 else f"{sel_year - 1}-{sel_year}"

    total_days = get_days_in_month(sel_month, sel_year)
    month_num = get_month_index(sel_month)
    period_start = date(sel_year, month_num, 1)
    period_end = date(sel_year, month_num, total_days)

    query = text("""
        SELECT p.id as pid, p.emp_code, p.first_name, p.last_name, p.department,
               p.designation, p.employment_type, p.emp_join_date, p.email, p.mobile_no,
               pp.id as profile_id, pp.basic_salary, pp.hra, pp.special_allowance,
               pp.gross_salary, pp.pf_deduction, pp.pt_deduction, pp.other_deductions,
               pp.net_salary, pp.ctc, pp.status as payroll_profile_status
        FROM profile_master p
        LEFT JOIN payroll_profiles pp ON p.emp_code = pp.emp_code
        ORDER BY p.emp_code ASC
    """)
    rows = db.execute(query).mappings().all()

    # Preload payslips for this month and year
    ps_query = text("""
        SELECT * FROM payslips WHERE month = :m AND year = :y
    """)
    ps_rows = db.execute(ps_query, {"m": sel_month, "y": sel_year}).mappings().all()
    ps_map = {r["emp_code"]: r for r in ps_rows}

    records = []

    for r in rows:
        emp_code = str(r.get("emp_code") or "")
        first_n = str(r.get("first_name") or "")
        last_n = str(r.get("last_name") or "")
        emp_name = f"{first_n} {last_n}".strip() or emp_code
        dept = str(r.get("department") or "Operations")
        desig = str(r.get("designation") or "Employee")

        # Joining date parsing
        raw_join = r.get("emp_join_date")
        join_d = None
        if raw_join:
            if isinstance(raw_join, date):
                join_d = raw_join
            elif isinstance(raw_join, str):
                try:
                    join_d = date.fromisoformat(raw_join[:10])
                except Exception:
                    pass

        profile_status = r.get("payroll_profile_status") or "Payroll Setup Required"
        gross_configured = float(r.get("gross_salary") or 0.0)

        # Check existing payslip in database
        ps = ps_map.get(emp_code)

        if ps:
            payslip_generated = True
            payslip_id = ps.get("id")
            rec_status = ps.get("status") or "Payslip Generated"
            paid_d = int(ps.get("paid_days") or total_days)
            t_days = int(ps.get("total_days") or total_days)
            rec_gross = float(ps.get("gross_earnings") or 0.0)
            rec_pt = float(ps.get("pt_deduction") or 0.0)
            tot_ded = float(ps.get("total_deductions") or 0.0)
            rec_other = max(0.0, round(tot_ded - rec_pt, 2))
            rec_net = float(ps.get("net_salary") or 0.0)
        else:
            payslip_generated = False
            payslip_id = None

            # Calculate based on actual joining date and salary profile
            if join_d and join_d > period_end:
                # Employee joined after this month
                rec_status = "Not Eligible (Joined Later)"
                paid_d = 0
                t_days = total_days
                rec_gross = 0.0
                rec_pt = 0.0
                rec_other = 0.0
                rec_net = 0.0
            elif gross_configured <= 0 or profile_status == "Payroll Setup Required":
                rec_status = "Payroll Setup Required"
                paid_d = total_days
                if join_d and join_d >= period_start and join_d <= period_end:
                    paid_d = total_days - join_d.day + 1
                t_days = total_days
                rec_gross = 0.0
                rec_pt = 0.0
                rec_other = 0.0
                rec_net = 0.0
            else:
                # Salary is configured
                if join_d and join_d >= period_start and join_d <= period_end:
                    # Joined mid-month: Prorated days
                    paid_d = total_days - join_d.day + 1
                    t_days = total_days
                    ratio = paid_d / total_days
                    prorated_gross = round(gross_configured * ratio, 2)
                    prorated = calculate_salary_breakdown(prorated_gross)
                    rec_gross = prorated["gross_salary"]
                    rec_pt = prorated["pt_deduction"]
                    rec_other = 0.0
                    rec_net = prorated["net_salary"]
                    rec_status = "Payroll Ready"
                else:
                    paid_d = total_days
                    t_days = total_days
                    rec_gross = gross_configured
                    rec_pt = float(r.get("pt_deduction") or 200.0)
                    rec_other = float(r.get("other_deductions") or 0.0)
                    rec_net = float(r.get("net_salary") or 0.0)
                    rec_status = "Payroll Ready"

        record_id = payslip_id if payslip_id else f"rec-{emp_code}-{sel_month}-{sel_year}"

        item = {
            "id": record_id,
            "rawId": payslip_id,
            "employeeId": emp_code,
            "emp_code": emp_code,
            "employeeName": emp_name,
            "name": emp_name,
            "department": dept,
            "designation": desig,
            "joiningDate": join_d.strftime("%d %b %Y") if join_d else "—",
            "joining_date": str(join_d or ""),
            "month": sel_month,
            "year": sel_year,
            "totalDays": t_days,
            "total_days": t_days,
            "presentDays": paid_d,
            "present_days": paid_d,
            "absentDays": max(0, t_days - paid_d),
            "absent_days": max(0, t_days - paid_d),
            "paidLeave": 0,
            "paid_leave": 0,
            "unpaidLeave": 0,
            "unpaid_leave": 0,
            "grossSalary": rec_gross,
            "gross_salary": rec_gross,
            "gross_earnings": rec_gross,
            "ptDeducted": rec_pt,
            "pt_deducted": rec_pt,
            "otherDeductions": rec_other,
            "other_deductions": rec_other,
            "salaryCredited": rec_net,
            "salary_credited": rec_net,
            "finalAmountCredited": rec_net,
            "final_amount_credited": rec_net,
            "net_salary": rec_net,
            "status": rec_status,
            "payrollStatus": "Configured" if gross_configured > 0 else "Payroll Setup Required",
            "payslipGenerated": payslip_generated,
            "payslip_generated": payslip_generated,
            "payslipId": payslip_id,
            "payslip_id": payslip_id,
        }

        # Apply Filters
        if search:
            st = search.strip().lower()
            if st not in emp_name.lower() and st not in emp_code.lower() and st not in dept.lower():
                continue

        if department and department.strip() and department.strip() != "—":
            if dept.lower() != department.strip().lower():
                continue

        if status and status.strip():
            st_filter = status.strip().lower()
            if st_filter == "pending approval":
                if "pending" not in rec_status.lower() and "ready" not in rec_status.lower():
                    continue
            elif st_filter == "approved":
                if "approved" not in rec_status.lower() and "paid" not in rec_status.lower():
                    continue
            elif st_filter == "payslip generated":
                if not payslip_generated:
                    continue
            elif st_filter not in rec_status.lower():
                continue

        records.append(item)

    # Compute Aggregations
    total_emps = len(set(r["employeeId"] for r in records))
    payroll_recs = len(records)
    pending_appr = sum(1 for r in records if "ready" in r["status"].lower() or "pending" in r["status"].lower())
    approved_cnt = sum(1 for r in records if "approved" in r["status"].lower() or "paid" in r["status"].lower())
    payslips_gen = sum(1 for r in records if r["payslipGenerated"])
    tot_gross = round(sum(r["grossSalary"] for r in records), 2)
    tot_ded = round(sum(r["ptDeducted"] + r["otherDeductions"] for r in records), 2)
    tot_credited = round(sum(r["finalAmountCredited"] for r in records), 2)

    return {
        "records": records,
        "items": records,
        "data": records,
        "summary": {
            "totalEmployees": total_emps,
            "payrollRecords": payroll_recs,
            "pendingApproval": pending_appr,
            "approved": approved_cnt,
            "payslipsGenerated": payslips_gen,
            "totalGrossPayroll": tot_gross,
            "totalDeductions": tot_ded,
            "totalSalaryCredited": tot_credited
        }
    }


def generate_payslip_for_employee_record(
    db: Session,
    emp_code: str,
    month: str,
    year: int
) -> dict:
    """
    Generates and persists an actual payslip in the database.
    Throws error if salary is not configured.
    Prorates according to joining date if mid-month joining.
    Prevents duplicates using (emp_code, month, year) unique key.
    """
    init_payslips_table(db)

    # 1. Fetch employee profile & payroll profile
    emp = db.execute(
        text("SELECT * FROM profile_master WHERE emp_code = :c"),
        {"c": emp_code}
    ).mappings().first()

    if not emp:
        raise ValueError(f"Employee {emp_code} not found.")

    prof = db.execute(
        text("SELECT * FROM payroll_profiles WHERE emp_code = :c"),
        {"c": emp_code}
    ).mappings().first()

    gross_salary = float(prof.get("gross_salary") or 0.0) if prof else 0.0
    if gross_salary <= 0:
        raise ValueError(f"Cannot generate payslip: Payroll setup required for {emp_code}.")

    # 2. Check Joining Date eligibility
    total_days = get_days_in_month(month, year)
    m_idx = get_month_index(month)
    period_start = date(year, m_idx, 1)
    period_end = date(year, m_idx, total_days)

    raw_join = emp.get("emp_join_date")
    join_d = None
    if raw_join:
        if isinstance(raw_join, date):
            join_d = raw_join
        elif isinstance(raw_join, str):
            try:
                join_d = date.fromisoformat(raw_join[:10])
            except Exception:
                pass

    if join_d and join_d > period_end:
        raise ValueError(f"Cannot generate payslip: Employee joined on {join_d}, after this pay period ({month} {year}).")

    if join_d and join_d >= period_start and join_d <= period_end:
        # Mid-month joining proration
        paid_days = total_days - join_d.day + 1
        ratio = paid_days / total_days
        actual_gross = round(gross_salary * ratio, 2)
    else:
        paid_days = total_days
        actual_gross = gross_salary

    calc = calculate_salary_breakdown(actual_gross)

    first_n = emp.get("first_name") or ""
    last_n = emp.get("last_name") or ""
    full_name = f"{first_n} {last_n}".strip() or emp_code
    fin_year = f"{year}-{year + 1}" if m_idx >= 4 else f"{year - 1}-{year}"

    # 3. Insert or update existing payslip (No duplicates!)
    db.execute(text("""
        INSERT INTO payslips (
            emp_code, employee_name, month, year, financial_year,
            basic_salary, hra, special_allowance, gross_earnings,
            pf_deduction, pt_deduction, total_deductions, net_salary,
            employer_pf, employer_contributions, ctc,
            total_days, paid_days, status, generated_on
        ) VALUES (
            :emp_code, :employee_name, :month, :year, :fin_year,
            :basic_salary, :hra, :special_allowance, :gross_earnings,
            :pf_deduction, :pt_deduction, :total_deductions, :net_salary,
            :employer_pf, :employer_contributions, :ctc,
            :total_days, :paid_days, 'Generated', CURRENT_DATE
        )
        ON CONFLICT (emp_code, month, year) DO UPDATE SET
            employee_name = EXCLUDED.employee_name,
            basic_salary = EXCLUDED.basic_salary,
            hra = EXCLUDED.hra,
            special_allowance = EXCLUDED.special_allowance,
            gross_earnings = EXCLUDED.gross_earnings,
            pf_deduction = EXCLUDED.pf_deduction,
            pt_deduction = EXCLUDED.pt_deduction,
            total_deductions = EXCLUDED.total_deductions,
            net_salary = EXCLUDED.net_salary,
            employer_pf = EXCLUDED.employer_pf,
            employer_contributions = EXCLUDED.employer_contributions,
            ctc = EXCLUDED.ctc,
            total_days = EXCLUDED.total_days,
            paid_days = EXCLUDED.paid_days,
            status = 'Generated',
            generated_on = CURRENT_DATE;
    """), {
        "emp_code": emp_code,
        "employee_name": full_name,
        "month": month,
        "year": year,
        "fin_year": fin_year,
        "total_days": total_days,
        "paid_days": paid_days,
        **calc
    })
    db.commit()

    saved = db.execute(
        text("SELECT * FROM payslips WHERE emp_code = :c AND month = :m AND year = :y"),
        {"c": emp_code, "m": month, "y": year}
    ).mappings().first()

    return dict(saved) if saved else {"emp_code": emp_code, "month": month, "year": year, **calc}


def approve_payroll_record(db: Session, record_id: str, month: str = "", year: int = None) -> dict:
    """Marks payslip or payroll record as Approved."""
    init_payslips_table(db)

    # If numeric ID, update directly
    if str(record_id).isdigit():
        db.execute(
            text("UPDATE payslips SET status = 'Approved' WHERE id = :id"),
            {"id": int(record_id)}
        )
        db.commit()
        return {"id": record_id, "status": "Approved"}

    # If composite string like rec-LE724-September-2026
    parts = str(record_id).split("-")
    if len(parts) >= 4:
        emp_c = parts[1]
        m = parts[2]
        y = int(parts[3])
        # Generate payslip first if needed, then approve
        ps = generate_payslip_for_employee_record(db, emp_c, m, y)
        db.execute(
            text("UPDATE payslips SET status = 'Approved' WHERE emp_code = :c AND month = :m AND year = :y"),
            {"c": emp_c, "m": m, "y": y}
        )
        db.commit()
        return {"id": ps.get("id"), "emp_code": emp_c, "status": "Approved"}

    return {"status": "Approved"}


def update_employee_salary_configuration(
    db: Session,
    emp_code: str,
    payload: dict
) -> dict:
    """Admin updates salary components for an employee."""
    init_payslips_table(db)

    gross_val = None
    if "gross_salary" in payload or "grossSalary" in payload or "gross" in payload:
        gross_val = float(payload.get("gross_salary") or payload.get("grossSalary") or payload.get("gross") or 0.0)
    elif "basic_salary" in payload or "basicSalary" in payload:
        b = float(payload.get("basic_salary") or payload.get("basicSalary") or 0.0)
        gross_val = b * 2.0 # 50% basic rule

    if gross_val is None or gross_val <= 0:
        raise ValueError("Valid gross salary is required.")

    calc = calculate_salary_breakdown(gross_val)

    db.execute(text("""
        INSERT INTO payroll_profiles (
            emp_code, basic_salary, hra, special_allowance, gross_salary,
            pf_deduction, pt_deduction, other_deductions, net_salary,
            employer_pf, employer_contributions, ctc,
            pay_frequency, status, updated_at
        ) VALUES (
            :c, :basic_salary, :hra, :special_allowance, :gross_salary,
            :pf_deduction, :pt_deduction, :other_deductions, :net_salary,
            :employer_pf, :employer_contributions, :ctc,
            'Monthly', 'Configured', CURRENT_TIMESTAMP
        )
        ON CONFLICT (emp_code) DO UPDATE SET
            basic_salary = EXCLUDED.basic_salary,
            hra = EXCLUDED.hra,
            special_allowance = EXCLUDED.special_allowance,
            gross_salary = EXCLUDED.gross_salary,
            pf_deduction = EXCLUDED.pf_deduction,
            pt_deduction = EXCLUDED.pt_deduction,
            other_deductions = EXCLUDED.other_deductions,
            net_salary = EXCLUDED.net_salary,
            employer_pf = EXCLUDED.employer_pf,
            employer_contributions = EXCLUDED.employer_contributions,
            ctc = EXCLUDED.ctc,
            status = 'Configured',
            updated_at = CURRENT_TIMESTAMP;
    """), {"c": emp_code, **calc})
    db.commit()

    return {"emp_code": emp_code, "status": "Configured", **calc}


def generate_payslip_pdf(db: Session, payslip_id_or_code: str) -> bytes:
    """Generates official PDF bytes using PyMuPDF (fitz) from real persisted database data."""
    init_payslips_table(db)

    target_code = str(payslip_id_or_code).strip()
    if target_code.startswith("rec-"):
        parts = target_code.split("-")
        if len(parts) >= 2:
            target_code = parts[1]

    row = None
    if str(payslip_id_or_code).isdigit():
        row = db.execute(
            text("SELECT * FROM payslips WHERE id = :id"),
            {"id": int(payslip_id_or_code)}
        ).mappings().first()

    if not row:
        row = db.execute(
            text("SELECT * FROM payslips WHERE emp_code = :c ORDER BY id DESC LIMIT 1"),
            {"c": target_code}
        ).mappings().first()

    if not row:
        raise ValueError(f"Payslip {payslip_id_or_code} not found in database.")

    emp_code = row.get("emp_code")
    emp_name = row.get("employee_name") or emp_code
    month = row.get("month")
    year = row.get("year")
    fin_year = row.get("financial_year")
    paid_d = row.get("paid_days") or 30
    tot_d = row.get("total_days") or 30
    basic = float(row.get("basic_salary") or 0.0)
    hra = float(row.get("hra") or 0.0)
    special = float(row.get("special_allowance") or 0.0)
    gross = float(row.get("gross_earnings") or 0.0)
    pf = float(row.get("pf_deduction") or 0.0)
    pt = float(row.get("pt_deduction") or 0.0)
    tot_ded = float(row.get("total_deductions") or 0.0)
    net_pay = float(row.get("net_salary") or 0.0)
    employer_pf = float(row.get("employer_pf") or 0.0)
    ctc = float(row.get("ctc") or 0.0)

    # Fetch profile details for designation & department
    prof = db.execute(
        text("SELECT department, designation, branch_location, emp_join_date FROM profile_master WHERE emp_code = :c"),
        {"c": emp_code}
    ).mappings().first()

    dept = prof.get("department") if prof else "Operations"
    desig = prof.get("designation") if prof else "Employee"
    join_str = str(prof.get("emp_join_date") or "—") if prof else "—"

    # Create PyMuPDF document
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4 points: 595 x 842

    # Draw border
    page.draw_rect(fitz.Rect(30, 30, 565, 812), color=(0.85, 0.85, 0.88), width=1)

    # Top Purple Accent Header Band
    page.draw_rect(fitz.Rect(30, 30, 565, 95), color=(0.45, 0.35, 0.90), fill=(0.45, 0.35, 0.90))
    page.insert_text((45, 60), "LA ESFERA INFOTECH PRIVATE LIMITED", fontsize=14, fontname="helv", color=(1, 1, 1))
    page.insert_text((45, 78), "Official Monthly Payslip", fontsize=11, fontname="helv", color=(0.9, 0.9, 1))
    page.insert_text((420, 68), f"{month} {year}", fontsize=13, fontname="helv", color=(1, 1, 1))

    # Employee Summary Box
    page.draw_rect(fitz.Rect(45, 110, 550, 195), color=(0.9, 0.9, 0.92), fill=(0.97, 0.97, 0.99))
    page.insert_text((55, 130), f"Employee Name: {emp_name}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((55, 148), f"Employee ID:   {emp_code}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((55, 166), f"Department:    {dept}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((55, 184), f"Designation:   {desig}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))

    page.insert_text((320, 130), f"Financial Year: {fin_year}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((320, 148), f"Date of Joining: {join_str}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((320, 166), f"Total Days:     {tot_d}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))
    page.insert_text((320, 184), f"Payable Days:   {paid_d}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.15))

    # Earnings & Deductions Tables Header
    page.draw_rect(fitz.Rect(45, 215, 290, 240), color=(0.85, 0.85, 0.88), fill=(0.92, 0.94, 0.98))
    page.insert_text((55, 232), "EARNINGS", fontsize=10, fontname="helv", color=(0.15, 0.25, 0.6))
    page.insert_text((220, 232), "AMOUNT (INR)", fontsize=10, fontname="helv", color=(0.15, 0.25, 0.6))

    page.draw_rect(fitz.Rect(305, 215, 550, 240), color=(0.85, 0.85, 0.88), fill=(0.98, 0.93, 0.93))
    page.insert_text((315, 232), "DEDUCTIONS", fontsize=10, fontname="helv", color=(0.7, 0.15, 0.15))
    page.insert_text((480, 232), "AMOUNT (INR)", fontsize=10, fontname="helv", color=(0.7, 0.15, 0.15))

    # Earnings lines
    y_pos = 262
    page.insert_text((55, y_pos), "Basic Salary", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((220, y_pos), f"Rs. {basic:,.2f}", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((315, y_pos), "Provident Fund (PF)", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((480, y_pos), f"Rs. {pf:,.2f}", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))

    y_pos += 24
    page.insert_text((55, y_pos), "House Rent Allowance (HRA)", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((220, y_pos), f"Rs. {hra:,.2f}", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((315, y_pos), "Professional Tax (PT)", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((480, y_pos), f"Rs. {pt:,.2f}", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))

    y_pos += 24
    page.insert_text((55, y_pos), "Special Allowance", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((220, y_pos), f"Rs. {special:,.2f}", fontsize=9.5, fontname="helv", color=(0.2, 0.2, 0.2))

    # Total Earnings / Total Deductions
    y_pos += 35
    page.draw_line((45, y_pos - 12), (290, y_pos - 12), color=(0.8, 0.8, 0.85), width=1)
    page.draw_line((305, y_pos - 12), (550, y_pos - 12), color=(0.8, 0.8, 0.85), width=1)

    page.insert_text((55, y_pos), "Gross Earnings:", fontsize=10, fontname="helv", color=(0.1, 0.4, 0.2))
    page.insert_text((210, y_pos), f"Rs. {gross:,.2f}", fontsize=10, fontname="helv", color=(0.1, 0.4, 0.2))

    page.insert_text((315, y_pos), "Total Deductions:", fontsize=10, fontname="helv", color=(0.7, 0.15, 0.15))
    page.insert_text((475, y_pos), f"Rs. {tot_ded:,.2f}", fontsize=10, fontname="helv", color=(0.7, 0.15, 0.15))

    # Net Take Home Highlighting Card
    y_pos += 30
    page.draw_rect(fitz.Rect(45, y_pos, 550, y_pos + 60), color=(0.3, 0.65, 0.4), fill=(0.94, 0.99, 0.95), width=1.5)
    page.insert_text((60, y_pos + 26), "NET TAKE HOME PAY:", fontsize=12, fontname="helv", color=(0.15, 0.45, 0.25))
    page.insert_text((360, y_pos + 28), f"INR {net_pay:,.2f}", fontsize=16, fontname="helv", color=(0.1, 0.5, 0.2))
    page.insert_text((60, y_pos + 48), f"(Gross Earnings Rs. {gross:,.2f} minus Total Deductions Rs. {tot_ded:,.2f})", fontsize=8.5, fontname="helv", color=(0.35, 0.45, 0.35))

    # Employer Contributions & CTC
    y_pos += 85
    page.draw_rect(fitz.Rect(45, y_pos, 550, y_pos + 50), color=(0.85, 0.85, 0.9), fill=(0.97, 0.97, 0.98))
    page.insert_text((55, y_pos + 20), f"Employer PF Contribution: Rs. {employer_pf:,.2f}", fontsize=9.5, fontname="helv", color=(0.25, 0.25, 0.3))
    page.insert_text((55, y_pos + 38), f"Total Monthly Cost to Company (CTC): Rs. {ctc:,.2f}", fontsize=9.5, fontname="helv", color=(0.25, 0.25, 0.3))

    # Signature & Footer Note
    page.insert_text((45, 750), "Note: This is a system-generated payslip and does not require a physical signature.", fontsize=8.5, fontname="helv", color=(0.55, 0.55, 0.6))
    page.insert_text((420, 750), "Authorized Signatory", fontsize=9.5, fontname="helv", color=(0.3, 0.3, 0.35))
    page.draw_line((410, 742), (540, 742), color=(0.6, 0.6, 0.65), width=1)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def get_employee_payslip_data(db: Session, emp_code: str, financial_year: str = "2026-2027"):
    """
    Returns actual persisted payslips for Employee Portal.
    DO NOT GENERATE FAKE PAYSLIPS IF NONE EXIST!
    """
    init_payslips_table(db)

    rows = db.execute(text("""
        SELECT * FROM payslips
        WHERE (emp_code = :code OR LOWER(emp_code) = LOWER(:code))
        AND financial_year = :fin_year
        ORDER BY year ASC, 
            CASE month
                WHEN 'April' THEN 1 WHEN 'May' THEN 2 WHEN 'June' THEN 3
                WHEN 'July' THEN 4 WHEN 'August' THEN 5 WHEN 'September' THEN 6
                WHEN 'October' THEN 7 WHEN 'November' THEN 8 WHEN 'December' THEN 9
                WHEN 'January' THEN 10 WHEN 'February' THEN 11 WHEN 'March' THEN 12
                ELSE 99
            END ASC
    """), {"code": emp_code, "fin_year": financial_year}).mappings().fetchall()

    slips = []
    tot_gross = 0.0
    tot_net = 0.0
    tot_deductions = 0.0
    tot_contributions = 0.0
    tot_ctc = 0.0

    for r in rows:
        gross = float(r.get("gross_earnings") or 0.0)
        net = float(r.get("net_salary") or 0.0)
        ded = float(r.get("total_deductions") or 0.0)
        contrib = float(r.get("employer_contributions") or 0.0)
        ctc_val = float(r.get("ctc") or 0.0)

        tot_gross += gross
        tot_net += net
        tot_deductions += ded
        tot_contributions += contrib
        tot_ctc += ctc_val

        slips.append({
            "id": r.get("id"),
            "emp_code": r.get("emp_code"),
            "employee_name": r.get("employee_name"),
            "month": r.get("month"),
            "year": r.get("year"),
            "financial_year": r.get("financial_year"),
            "month_year": f"{r.get('month')} {r.get('year')}",
            "basic_salary": float(r.get("basic_salary") or 0.0),
            "hra": float(r.get("hra") or 0.0),
            "special_allowance": float(r.get("special_allowance") or 0.0),
            "gross_earnings": gross,
            "pf_deduction": float(r.get("pf_deduction") or 0.0),
            "pt_deduction": float(r.get("pt_deduction") or 0.0),
            "total_deductions": ded,
            "net_salary": net,
            "employer_pf": float(r.get("employer_pf") or 0.0),
            "employer_contributions": contrib,
            "ctc": ctc_val,
            "total_days": r.get("total_days") or 30,
            "paid_days": r.get("paid_days") or 30,
            "status": r.get("status") or "Paid",
            "generated_on": str(r.get("generated_on") or "")
        })

    months_paid = len(slips)
    net_pct = round((tot_net / tot_ctc * 100), 1) if tot_ctc > 0 else 100.0
    ded_pct = round((tot_deductions / tot_ctc * 100), 1) if tot_ctc > 0 else 0.0
    contrib_pct = round((tot_contributions / tot_ctc * 100), 1) if tot_ctc > 0 else 0.0

    return {
        "emp_code": emp_code,
        "financial_year": financial_year,
        "ytd_summary": {
            "months_paid": months_paid,
            "gross_earnings": round(tot_gross, 2),
            "net_take_home": round(tot_net, 2),
            "employer_contributions": round(tot_contributions, 2),
            "total_ctc": round(tot_ctc, 2),
            "composition": {
                "net_pct": net_pct,
                "deductions_pct": ded_pct,
                "contributions_pct": contrib_pct
            }
        },
        "slips": slips
    }
