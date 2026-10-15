import os
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
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
        from app.db.base import Base
        Base.metadata.create_all(bind=db.get_bind())
    except Exception as e:
        logger.error(f"Error initializing payroll tables: {e}")



def calculate_salary_breakdown(monthly_gross: float, pf_applicable: bool = False):
    gross = max(0.0, float(monthly_gross or 0.0))
    basic = round(gross * 0.50, 2)
    hra = round(gross * 0.20, 2)
    special_allowance = max(0.0, round(gross - (basic + hra), 2))
    
    pf_deduction = round(basic * 0.12, 2) if pf_applicable else 0.0
    pt_deduction = 200.0 if gross >= 15000 else (175.0 if gross >= 10000 else 0.0)
    total_deductions = round(pf_deduction + pt_deduction, 2)
    
    net_salary = max(0.0, round(gross - total_deductions, 2))
    employer_pf = round(basic * 0.12, 2) if pf_applicable else 0.0
    employer_contributions = employer_pf
    ctc = round(gross + employer_contributions, 2)

    return {
        "basic_salary": basic,
        "hra": hra,
        "special_allowance": special_allowance,
        "gross_earnings": gross,
        "gross_salary": gross,
        "pf_applicable": pf_applicable,
        "pf_wages": basic if pf_applicable else 0.0,
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


def get_payroll_settings(db: Session) -> dict:
    """Returns company payroll configuration rules from payroll_settings table."""
    try:
        row = db.execute(text("SELECT * FROM payroll_settings ORDER BY id ASC LIMIT 1")).mappings().first()
        if not row:
            db.execute(text("""
                INSERT INTO payroll_settings (
                    salary_day_basis, pt_enabled, pt_amount, pf_applicable, pf_wages_basis,
                    pf_employee_percent, pf_employer_percent, pf_wage_ceiling,
                    intern_eligibility_months, intern_conversion_mode, intern_paid_leave_enabled,
                    intern_paid_leave_quota, intern_unpaid_leave_enabled, employee_paid_leave_enabled,
                    weekly_off_paid, paid_holiday_paid, allow_negative_salary, updated_by
                ) VALUES (
                    'Calendar Days', TRUE, 200.00, FALSE, 'Basic + DA',
                    12.00, 12.00, 15000.00,
                    6, 'Manual HR Approval', FALSE,
                    0.0, TRUE, TRUE,
                    TRUE, TRUE, FALSE, 'System Init'
                )
            """))
            db.commit()
            row = db.execute(text("SELECT * FROM payroll_settings ORDER BY id ASC LIMIT 1")).mappings().first()
        return dict(row)
    except Exception as e:
        logger.error(f"Error fetching payroll settings: {e}")
        return {
            "salary_day_basis": "Calendar Days",
            "pt_enabled": True,
            "pt_amount": 200.00,
            "pf_applicable": False,
            "pf_wages_basis": "Basic + DA",
            "pf_employee_percent": 12.00,
            "pf_employer_percent": 12.00,
            "pf_wage_ceiling": 15000.00,
            "intern_eligibility_months": 6,
            "intern_conversion_mode": "Manual HR Approval",
            "intern_paid_leave_enabled": False,
            "intern_paid_leave_quota": 0.0,
            "intern_unpaid_leave_enabled": True,
            "employee_paid_leave_enabled": True,
            "weekly_off_paid": True,
            "paid_holiday_paid": True,
            "allow_negative_salary": False
        }


def update_payroll_settings(db: Session, payload: dict, user_name: str = "Admin") -> dict:
    """Updates company payroll settings configured by HR/Admin."""
    current = get_payroll_settings(db)
    new_pt_enabled = payload.get("pt_enabled", current.get("pt_enabled", True))
    new_pt_amount = float(payload.get("pt_amount", current.get("pt_amount", 200.00)))
    new_pf_applicable = bool(payload.get("pf_applicable", current.get("pf_applicable", False)))
    new_pf_wages_basis = str(payload.get("pf_wages_basis", current.get("pf_wages_basis", "Basic + DA")))
    new_pf_emp_pct = float(payload.get("pf_employee_percent", current.get("pf_employee_percent", 12.00)))
    new_pf_empr_pct = float(payload.get("pf_employer_percent", current.get("pf_employer_percent", 12.00)))
    new_pf_ceiling = float(payload.get("pf_wage_ceiling", current.get("pf_wage_ceiling", 15000.00)))

    new_intern_eligibility = int(payload.get("intern_eligibility_months", current.get("intern_eligibility_months", 6)))
    new_intern_conv_mode = str(payload.get("intern_conversion_mode", current.get("intern_conversion_mode", "Manual HR Approval")))
    new_intern_paid_leave = bool(payload.get("intern_paid_leave_enabled", current.get("intern_paid_leave_enabled", False)))
    new_intern_paid_quota = float(payload.get("intern_paid_leave_quota", current.get("intern_paid_leave_quota", 0.0)))
    new_intern_unpaid = bool(payload.get("intern_unpaid_leave_enabled", current.get("intern_unpaid_leave_enabled", True)))
    new_emp_paid = bool(payload.get("employee_paid_leave_enabled", current.get("employee_paid_leave_enabled", True)))
    new_weekly_off = bool(payload.get("weekly_off_paid", current.get("weekly_off_paid", True)))
    new_paid_holiday = bool(payload.get("paid_holiday_paid", current.get("paid_holiday_paid", True)))
    new_allow_neg = bool(payload.get("allow_negative_salary", current.get("allow_negative_salary", False)))

    db.execute(text("""
        UPDATE payroll_settings
        SET pt_enabled = :pt_en,
            pt_amount = :pt_amt,
            pf_applicable = :pf_app,
            pf_wages_basis = :pf_wb,
            pf_employee_percent = :pf_ep,
            pf_employer_percent = :pf_er,
            pf_wage_ceiling = :pf_wc,
            intern_eligibility_months = :intern_el,
            intern_conversion_mode = :intern_conv,
            intern_paid_leave_enabled = :intern_pl_en,
            intern_paid_leave_quota = :intern_pl_q,
            intern_unpaid_leave_enabled = :intern_upl,
            employee_paid_leave_enabled = :emp_pl,
            weekly_off_paid = :wo_paid,
            paid_holiday_paid = :hol_paid,
            allow_negative_salary = :allow_neg,
            updated_by = :up_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM payroll_settings ORDER BY id ASC LIMIT 1)
    """), {
        "pt_en": new_pt_enabled,
        "pt_amt": new_pt_amount,
        "pf_app": new_pf_applicable,
        "pf_wb": new_pf_wages_basis,
        "pf_ep": new_pf_emp_pct,
        "pf_er": new_pf_empr_pct,
        "pf_wc": new_pf_ceiling,
        "intern_el": new_intern_eligibility,
        "intern_conv": new_intern_conv_mode,
        "intern_pl_en": new_intern_paid_leave,
        "intern_pl_q": new_intern_paid_quota,
        "intern_upl": new_intern_unpaid,
        "emp_pl": new_emp_paid,
        "wo_paid": new_weekly_off,
        "hol_paid": new_paid_holiday,
        "allow_neg": new_allow_neg,
        "up_by": user_name
    })
    db.commit()
    return get_payroll_settings(db)


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


def get_or_create_payroll_run(db: Session, month: str, year: int) -> dict:
    """Gets or initializes the PayrollRun master entry for the given month and year."""
    cal_days = get_days_in_month(month, year)
    run = db.execute(
        text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
        {"m": month, "y": year}
    ).mappings().first()

    if not run:
        db.execute(text("""
            INSERT INTO payroll_runs (month, year, calendar_days, status, created_at, updated_at)
            VALUES (:m, :y, :cd, 'Draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {"m": month, "y": year, "cd": cal_days})
        db.commit()
        run = db.execute(
            text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
            {"m": month, "y": year}
        ).mappings().first()
    return dict(run)


def calculate_employee_payroll_data(
    db: Session,
    emp: dict,
    settings: dict,
    month: str,
    year: int,
    cal_days: int,
    month_num: int,
    period_start: date,
    period_end: date,
    preloaded: dict = None
) -> dict:
    """
    Core salary calculator function adhering strictly to prompt formulas:
    - Daily Salary = Monthly Salary ÷ Actual Calendar Days (Never permanently 30 or 31)
    - Attendance payability: Present=1.0, Half Day=0.5, Paid Leave=1.0, Weekly Off=1.0, Holiday=1.0, Absent=0, Unpaid Leave=0
    - Duplicate-Date protection: Each calendar date classified exactly once
    - LOP Days = Absent + Unpaid Leave + (Half Days * 0.5)
    - LOP Deduction = Daily Salary * LOP Days
    - Gross Earned = Monthly Salary - LOP Deduction
    - Professional Tax (PT): Configurable, checks pt_applicable
    - Net Salary = Gross Earned - PT - Other Deductions
    - Intern leave policy and 6-month conversion eligibility workflow
    """
    if preloaded is None:
        preloaded = {}

    emp_code = str(emp.get("emp_code") or "").strip()
    first_n = str(emp.get("first_name") or "")
    last_n = str(emp.get("last_name") or "")
    full_name = f"{first_n} {last_n}".strip() or emp_code
    dept = str(emp.get("department") or "Operations")
    desig = str(emp.get("designation") or "Employee")
    emp_type_raw = str(emp.get("employment_type") or "").strip()
    emp_status_raw = str(emp.get("employment_status") or "Active").strip()

    # Worker type detection
    is_intern = (
        "intern" in emp_type_raw.lower() or
        "intern" in emp_status_raw.lower() or
        "intern" in desig.lower()
    )
    worker_type = "Intern" if is_intern else "Regular Employee"

    # Joining Date & Exit Date
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

    raw_exit = emp.get("emp_effective_to") or emp.get("job_effective_to")
    exit_d = None
    if raw_exit:
        if isinstance(raw_exit, date):
            exit_d = raw_exit
        elif isinstance(raw_exit, str):
            try:
                exit_d = date.fromisoformat(raw_exit[:10])
            except Exception:
                pass

    # Intern Conversion and Eligibility Tracking from preloaded map
    conv_map = preloaded.get("conv_map") or {}
    conversion_record = conv_map.get(emp_code)

    conversion_status = "N/A"
    conversion_effective_date = None
    mid_month_conversion = False

    if is_intern:
        eligibility_months = int(settings.get("intern_eligibility_months") or 6)
        months_completed = 0
        if join_d:
            months_completed = (period_end.year - join_d.year) * 12 + (period_end.month - join_d.month)
            if period_end.day < join_d.day:
                months_completed = max(0, months_completed - 1)

        if conversion_record:
            conv_decision = str(conversion_record.get("decision") or "Pending HR Review")
            conv_eff = conversion_record.get("effective_employee_date")
            conversion_status = conv_decision
            conversion_effective_date = conv_eff

            if conv_decision == "Converted" and conv_eff:
                if conv_eff <= period_start:
                    worker_type = "Regular Employee"
                    conversion_status = "Converted to Employee"
                elif period_start < conv_eff <= period_end:
                    mid_month_conversion = True
                    conversion_status = f"Converted mid-month on {conv_eff.strftime('%d %b %Y')}"
            elif conv_decision == "Extended":
                ext_m = conversion_record.get("extension_months") or 0
                conversion_status = f"Extended Internship (+{ext_m} months)"
        else:
            if months_completed >= eligibility_months:
                conversion_status = "Eligible for Conversion (Pending HR Review)"
            else:
                conversion_status = f"Active Intern ({months_completed}/{eligibility_months} mos)"

    # Compensation / Salary
    gross_configured = float(emp.get("gross_salary") or 0.0)
    salary_configured = (gross_configured > 0)
    pt_applicable_val = bool(emp.get("pt_applicable") is not False and emp.get("pt_applicable_pm") is not False)
    other_ded_val = float(emp.get("other_deductions") or 0.0)

    exceptions = []

    if not salary_configured:
        exceptions.append({
            "type": "Salary Not Configured",
            "message": f"No active salary / stipend configuration found for {month} {year}.",
            "action": "Configure Salary"
        })

    if is_intern and "Eligible for Conversion" in conversion_status:
        exceptions.append({
            "type": "Conversion Eligibility Reached",
            "message": f"Intern has completed {settings.get('intern_eligibility_months', 6)} months. Pending HR review.",
            "action": "Review Conversion"
        })

    # Attendance logs from preloaded map
    att_by_emp = preloaded.get("att_by_emp") or {}
    att_map = att_by_emp.get(emp_code, {})

    # Approved & pending regularizations from preloaded map
    regs_by_emp = preloaded.get("regs_by_emp") or {}
    reg_rows = regs_by_emp.get(emp_code, [])

    approved_regs = set()
    has_pending_reg = False
    for r in reg_rows:
        ov = str(r.get("overall_status") or r.get("status") or "").upper()
        if ov in ("APPROVED", "APPROVED_ADMIN", "APPROVED_MANAGER"):
            approved_regs.add(r.get("target_date"))
        elif "PENDING" in ov:
            has_pending_reg = True

    if has_pending_reg:
        exceptions.append({
            "type": "Unresolved Regularization",
            "message": "Employee has pending regularization request(s) for this month.",
            "action": "Review Regularization"
        })

    # Approved & pending leaves from preloaded map
    leaves_by_emp = preloaded.get("leaves_by_emp") or {}
    leave_rows = leaves_by_emp.get(emp_code, [])

    approved_leaves = {}
    has_pending_leave = False
    for lr in leave_rows:
        ov = str(lr.get("overall_status") or lr.get("status") or "").upper()
        if ov in ("APPROVED", "APPROVED_ADMIN", "APPROVED_MANAGER"):
            st_d = max(period_start, lr.get("start_date"))
            en_d = min(period_end, lr.get("end_date"))
            curr = st_d
            while curr <= en_d:
                approved_leaves[curr] = lr
                curr += timedelta(days=1)
        elif "PENDING" in ov:
            has_pending_leave = True

    if has_pending_leave:
        exceptions.append({
            "type": "Unresolved Leave",
            "message": "Employee has pending leave application(s) for this month.",
            "action": "Review Leave"
        })

    # Organization calendar from preloaded map
    org_cal = preloaded.get("org_cal") or {}

    # Daily Salary
    daily_salary = round(gross_configured / cal_days, 4) if cal_days > 0 and gross_configured > 0 else 0.0


    # Iteration counters
    eligible_days = 0
    present_days = 0.0
    half_days = 0.0
    paid_leave_days = 0.0
    unpaid_leave_days = 0.0
    weekly_off_days = 0.0
    holiday_days = 0.0
    absent_days = 0.0

    intern_paid_leave_used = 0.0
    intern_pl_enabled = bool(settings.get("intern_paid_leave_enabled", False))
    intern_pl_quota = float(settings.get("intern_paid_leave_quota", 0.0))

    # Day-by-Day Loop with Duplicate-Date Protection
    today = date.today()
    for d in range(1, cal_days + 1):
        cur_date = date(year, month_num, d)

        # Check joining date
        if join_d and cur_date < join_d:
            continue  # Not eligible before joining date

        # Check last working date
        if exit_d and cur_date > exit_d:
            continue  # Not eligible after last working date

        eligible_days += 1

        # Priority 1: Approved Regularization (Converts to Present = 1.0 paid day)
        if cur_date in approved_regs:
            present_days += 1.0
            continue

        # Priority 2: Approved Leave
        if cur_date in approved_leaves:
            l_info = approved_leaves[cur_date]
            cat_name = str(l_info.get("category") or "").lower()

            if is_intern:
                if intern_pl_enabled and intern_paid_leave_used < intern_pl_quota:
                    paid_leave_days += 1.0
                    intern_paid_leave_used += 1.0
                else:
                    unpaid_leave_days += 1.0
            else:
                if "unpaid" in cat_name or "lwp" in cat_name or "loss of pay" in cat_name:
                    unpaid_leave_days += 1.0
                else:
                    paid_leave_days += 1.0
            continue

        # Priority 3: Actual Attendance Record
        if cur_date in att_map:
            att = att_map[cur_date]
            st = str(att.get("status") or "").strip()
            if st in ("Present", "Punched In"):
                present_days += 1.0
            elif st == "Half Day":
                half_days += 1.0
            elif st == "Absent":
                absent_days += 1.0
            elif st == "Leave":
                unpaid_leave_days += 1.0
            else:
                absent_days += 1.0
            continue

        # Priority 4: Organization Calendar (Holiday / Weekly Off)
        if cur_date in org_cal:
            c_info = org_cal[cur_date]
            c_status = str(c_info.get("status") or "").upper()
            if c_status == "HOLIDAY":
                holiday_days += 1.0
            elif c_status == "WEEKLY_OFF":
                weekly_off_days += 1.0
            else:
                weekly_off_days += 1.0
            continue

        # Priority 5: Standard Weekend if not in org_cal
        if cur_date.weekday() in (5, 6):  # Saturday or Sunday
            weekly_off_days += 1.0
            continue

        # Priority 6: Unmarked working date
        if cur_date <= today:
            absent_days += 1.0
        else:
            # Future working date in an ongoing month: treated as regular scheduled
            present_days += 1.0

    # Formulas
    paid_equivalent_days = present_days + (half_days * 0.5) + paid_leave_days + weekly_off_days + holiday_days
    lop_days = absent_days + unpaid_leave_days + (half_days * 0.5)

    # Prorated days for mid-month joining or leaving
    unearned_days = max(0, cal_days - eligible_days)
    total_lop_effect = lop_days + unearned_days

    lop_deduction = round(daily_salary * total_lop_effect, 2)
    gross_earned_salary = max(0.0, round(gross_configured - lop_deduction, 2))

    # Detailed Salary Components (Standard Indian Payroll Structure as configured in company sheet)
    # Fixed Structure: Basic + DA = 50%, HRA = 25%, Flexi Allowance = 25% (or configured in payroll_profile)
    prof_basic = float(emp.get("basic_salary") or 0.0)
    prof_hra = float(emp.get("hra") or 0.0)
    prof_special = float(emp.get("special_allowance") or 0.0)

    if gross_configured > 0:
        if prof_basic > 0:
            fixed_basic = prof_basic
            fixed_hra = prof_hra
            fixed_flexi = prof_special if prof_special > 0 else max(0.0, round(gross_configured - fixed_basic - fixed_hra, 2))
        else:
            fixed_basic = round(gross_configured * 0.50, 2)
            fixed_hra = round(gross_configured * 0.25, 2)
            fixed_flexi = round(gross_configured - fixed_basic - fixed_hra, 2)
    else:
        fixed_basic = 0.0
        fixed_hra = 0.0
        fixed_flexi = 0.0

    fixed_gross = gross_configured

    # Earned Salary Components (prorated by paid days / calendar days)
    earned_ratio = (paid_equivalent_days / cal_days) if cal_days > 0 else 0.0
    earn_basic = round(fixed_basic * earned_ratio, 2)
    earn_hra = round(fixed_hra * earned_ratio, 2)
    earn_flexi = round(fixed_flexi * earned_ratio, 2)
    earn_gross = gross_earned_salary  # exactly matches gross_configured - lop_deduction

    # Statutory & Configured Deductions: PF (Provident Fund)
    # Default company setting is pf_applicable = False (Current Company Configuration: ₹0.00 PF)
    company_pf_applicable = bool(settings.get("pf_applicable", False))
    emp_pf_applicable = bool(emp.get("pf_applicable", False)) if "pf_applicable" in emp else False
    
    pf_wages = 0.00
    pf_val = 0.00
    if company_pf_applicable and emp_pf_applicable and gross_configured > 0:
        pf_basis = str(settings.get("pf_wages_basis", "Basic + DA"))
        pf_pct = float(settings.get("pf_employee_percent", 12.00))
        pf_ceiling = float(settings.get("pf_wage_ceiling", 15000.00))
        base_wages = earn_basic if pf_basis == "Basic + DA" else earn_gross
        pf_wages = round(min(base_wages, pf_ceiling) if pf_ceiling > 0 else base_wages, 2)
        pf_val = round(pf_wages * (pf_pct / 100.0), 2)
    else:
        # PF is currently not applicable / disabled per company policy
        pf_wages = 0.00
        pf_val = 0.00

    esic_val = float(emp.get("esic_deduction") or emp.get("esic") or 0.0)
    tds_val = float(emp.get("tds_deduction") or emp.get("tds") or 0.0)
    lwf_val = float(emp.get("lwf_deduction") or emp.get("lwf") or 0.0)
    arrears_val = float(emp.get("arrears") or 0.0)

    # Professional Tax (PT)
    pt_deduction = 0.00
    pt_enabled = bool(settings.get("pt_enabled", True))
    if pt_enabled and pt_applicable_val and gross_configured > 0:
        pt_amount_conf = float(settings.get("pt_amount", 200.00))
        pt_deduction = pt_amount_conf

    # Net Salary
    total_statutory_deductions = round(pt_deduction + pf_val + esic_val + tds_val + lwf_val + other_ded_val, 2)
    net_salary = round(earn_gross - total_statutory_deductions + arrears_val, 2)
    if net_salary < 0:
        if not bool(settings.get("allow_negative_salary", False)):
            exceptions.append({
                "type": "Negative Net Salary",
                "message": f"Deductions (₹{total_statutory_deductions:.2f}) exceed gross earnings (₹{earn_gross:.2f}).",
                "action": "Admin Review Required"
            })
            net_salary = 0.00

    record_status = "Calculated"
    if not salary_configured:
        record_status = "Salary Not Configured"
    elif len(exceptions) > 0:
        record_status = "Action Required"
    else:
        record_status = "Payroll Ready"

    return {
        "emp_code": emp_code,
        "employeeId": emp_code,
        "employeeName": full_name,
        "name": full_name,
        "department": dept,
        "designation": desig,
        "workerType": worker_type,
        "worker_type": worker_type,
        "employmentStatus": emp_status_raw,
        "joiningDate": join_d.strftime("%d %b %Y") if join_d else "—",
        "joining_date": str(join_d or ""),
        "lastWorkingDate": exit_d.strftime("%d %b %Y") if exit_d else "—",
        "last_working_date": str(exit_d or ""),
        "conversionStatus": conversion_status,
        "conversion_status": conversion_status,
        "conversionDate": str(conversion_effective_date or ""),
        "monthlyCompensation": gross_configured,
        "monthlySalary": gross_configured,
        "gross_salary": gross_configured,
        "calendarDays": cal_days,
        "calendar_days": cal_days,
        "eligibleDays": eligible_days,
        "dailySalary": round(daily_salary, 2),
        "daily_salary": round(daily_salary, 2),
        "dailySalaryPrecise": daily_salary,
        "presentDays": present_days,
        "present_days": present_days,
        "halfDays": half_days,
        "half_days": half_days,
        "paidLeaveDays": paid_leave_days,
        "paid_leave": paid_leave_days,
        "unpaidLeaveDays": unpaid_leave_days,
        "unpaid_leave": unpaid_leave_days,
        "leaveTaken": round(paid_leave_days + unpaid_leave_days, 1),
        "weeklyOffDays": weekly_off_days,
        "weekly_off_days": weekly_off_days,
        "holidayDays": holiday_days,
        "holiday_days": holiday_days,
        "absentDays": absent_days,
        "absent_days": absent_days,
        "paidEquivalentDays": paid_equivalent_days,
        "paid_equivalent_days": paid_equivalent_days,
        "lopDays": lop_days,
        "lop_days": lop_days,
        "lopDeduction": lop_deduction,
        "lop_deduction": lop_deduction,
        "grossEarnedSalary": gross_earned_salary,
        "grossSalary": gross_earned_salary,
        "gross_earnings": gross_earned_salary,
        
        # Detailed Salary Breakdown (Company Spreadsheet Structure)
        "fixedGrossSalary": fixed_gross,
        "basicSalary": fixed_basic,
        "basic_salary": fixed_basic,
        "hra": fixed_hra,
        "flexiAllowance": fixed_flexi,
        "special_allowance": fixed_flexi,
        "earnBasic": earn_basic,
        "earn_basic": earn_basic,
        "earnHra": earn_hra,
        "earn_hra": earn_hra,
        "earnOtherAllo": earn_flexi,
        "earn_special_allowance": earn_flexi,
        "earnGross": earn_gross,
        
        # Deductions & Adjustments
        "pfWages": pf_wages,
        "pf_wages": pf_wages,
        "pfDeduction": pf_val,
        "pf_deduction": pf_val,
        "pfApplicable": company_pf_applicable and emp_pf_applicable,
        "pf_applicable": company_pf_applicable and emp_pf_applicable,
        "pfExplanation": "PF is currently not applicable according to company payroll configuration." if not (company_pf_applicable and emp_pf_applicable) else f"PF calculated at {settings.get('pf_employee_percent', 12)}% of {settings.get('pf_wages_basis', 'Basic + DA')}.",
        "esicDeduction": esic_val,
        "esic_deduction": esic_val,
        "ptApplicable": pt_applicable_val,
        "pt_applicable": pt_applicable_val,
        "ptDeducted": pt_deduction,
        "pt_deduction": pt_deduction,
        "lwfDeduction": lwf_val,
        "lwf_deduction": lwf_val,
        "tdsDeduction": tds_val,
        "tds_deduction": tds_val,
        "leaveDeduction": lop_deduction,
        "otherDeductions": other_ded_val,
        "other_deductions": other_ded_val,
        "arrears": arrears_val,
        
        "netSalary": net_salary,
        "salaryCredited": net_salary,
        "finalAmountCredited": net_salary,
        "status": record_status,
        "exceptions": exceptions,
        "hasExceptions": len(exceptions) > 0,
        "month": month,
        "year": year
    }


def get_all_payroll_records(
    db: Session,
    search: str = "",
    month: str = "",
    year: str = "",
    department: str = "",
    status: str = "",
    worker_type: str = "",
    has_exceptions: str = "",
    force_recalculate: bool = False
) -> dict:
    """
    Comprehensive dynamic monthly payroll engine:
    - Calculates calendar days dynamically (Leap year logic verified)
    - Integrates attendance, regularizations, leaves, holidays
    - Identifies exceptions (missing salary, negative salary, unresolved items)
    - Computes dynamic KPIs for dashboard
    - Reconciles totals: Gross - LOP - PT - Other Deductions = Net Payroll
    """
    init_payslips_table(db)

    now = datetime.now()
    sel_month = month.strip() if month and month.strip() in MONTH_NAMES else MONTH_NAMES[now.month - 1]
    sel_year = int(year) if year and str(year).isdigit() else now.year
    cal_days = get_days_in_month(sel_month, sel_year)
    m_idx = get_month_index(sel_month)
    period_start = date(sel_year, m_idx, 1)
    period_end = date(sel_year, m_idx, cal_days)

    settings = get_payroll_settings(db)
    run = get_or_create_payroll_run(db, sel_month, sel_year)
    run_status = run.get("status") or "Draft"

    # Query all active employees in profile_master joined with payroll_profiles
    query = text("""
        SELECT p.emp_code, p.first_name, p.last_name, p.department, p.designation,
               p.employment_type, p.employment_status, p.emp_join_date, p.emp_effective_to,
               p.job_effective_to, p.pt_applicable as pt_applicable_pm,
               pp.id as profile_id, pp.gross_salary, pp.basic_salary, pp.hra, pp.special_allowance,
               pp.pf_applicable, pp.pf_deduction, pp.pt_deduction, pp.other_deductions, pp.pt_applicable,
               pp.tds, pp.lwf, pp.arrears, pp.esic,
               pp.status as payroll_profile_status
        FROM profile_master p
        LEFT JOIN payroll_profiles pp ON p.emp_code = pp.emp_code
        ORDER BY p.emp_code ASC
    """)
    emp_rows = db.execute(query).mappings().all()

    # Preload existing payslips to know if payslip was generated/finalized
    ps_rows = db.execute(
        text("SELECT * FROM payslips WHERE month = :m AND year = :y"),
        {"m": sel_month, "y": sel_year}
    ).mappings().all()
    ps_map = {r["emp_code"]: r for r in ps_rows}

    # Preload persisted payroll_records
    rec_rows = db.execute(
        text("SELECT * FROM payroll_records WHERE month = :m AND year = :y"),
        {"m": sel_month, "y": sel_year}
    ).mappings().all()
    rec_map = {r["emp_code"]: r for r in rec_rows}

    # Preload attendance if table exists (avoids aborted transaction in PostgreSQL)
    att_table = f"attendance_{sel_year}_{m_idx:02d}"
    att_by_emp = {}
    table_exists = False
    try:
        table_exists = bool(db.execute(
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"),
            {"t": att_table}
        ).scalar())
    except Exception:
        table_exists = False

    if table_exists:
        try:
            ar_rows = db.execute(text(f"""
                SELECT emp_code, date, status, hours_completed, punch_in_time, punch_out_time
                FROM {att_table}
            """)).mappings().all()
            for ar in ar_rows:
                ec = str(ar.get("emp_code") or "").strip()
                d_val = ar.get("date")
                if ec and d_val:
                    if ec not in att_by_emp:
                        att_by_emp[ec] = {}
                    att_by_emp[ec][d_val] = ar
        except Exception as e:
            logger.warning(f"Error reading {att_table}: {e}")

    # Preload regularizations
    regs_by_emp = {}
    try:
        reg_rows = db.execute(text("""
            SELECT emp_code, target_date, status, overall_status
            FROM regularizations
            WHERE target_date >= :s AND target_date <= :e
        """), {"s": period_start, "e": period_end}).mappings().all()
        for r in reg_rows:
            ec = str(r.get("emp_code") or "").strip()
            if ec not in regs_by_emp:
                regs_by_emp[ec] = []
            regs_by_emp[ec].append(r)
    except Exception as e:
        logger.warning(f"Error reading regularizations: {e}")

    # Preload leaves
    leaves_by_emp = {}
    try:
        leave_rows = db.execute(text("""
            SELECT emp_code, category, start_date, end_date, total_days, status, overall_status, has_half_days
            FROM leave_requests
            WHERE start_date <= :e AND end_date >= :s
        """), {"s": period_start, "e": period_end}).mappings().all()
        for lr in leave_rows:
            ec = str(lr.get("emp_code") or "").strip()
            if ec not in leaves_by_emp:
                leaves_by_emp[ec] = []
            leaves_by_emp[ec].append(lr)
    except Exception as e:
        logger.warning(f"Error reading leave_requests: {e}")

    # Preload organization calendar
    org_cal = {}
    try:
        cal_rows = db.execute(text("""
            SELECT date, status, holiday_name
            FROM organization_calendar
            WHERE date >= :s AND date <= :e
        """), {"s": period_start, "e": period_end}).mappings().all()
        org_cal = {cr.get("date"): cr for cr in cal_rows}
    except Exception as e:
        logger.warning(f"Error reading organization_calendar: {e}")

    # Preload intern conversions
    conv_map = {}
    try:
        conv_rows = db.execute(text("SELECT * FROM intern_conversion_records ORDER BY id ASC")).mappings().all()
        conv_map = {r["emp_code"]: r for r in conv_rows}
    except Exception as e:
        logger.warning(f"Error reading intern_conversion_records: {e}")

    preloaded = {
        "att_by_emp": att_by_emp,
        "regs_by_emp": regs_by_emp,
        "leaves_by_emp": leaves_by_emp,
        "org_cal": org_cal,
        "conv_map": conv_map
    }

    records = []

    for er in emp_rows:
        emp_code = str(er.get("emp_code") or "").strip()
        if not emp_code:
            continue

        # If run is Finalized and not forced, reuse persisted record if available
        if run_status == "Finalized" and not force_recalculate and emp_code in rec_map:
            pr = rec_map[emp_code]
            exc_list = []
            if pr.get("exceptions"):
                import json
                try:
                    exc_list = json.loads(pr.get("exceptions"))
                except Exception:
                    exc_list = [{"type": "Exception", "message": pr.get("exceptions"), "action": "Review"}]

            item = {
                "id": f"rec-{emp_code}-{sel_month}-{sel_year}",
                "employeeId": emp_code,
                "emp_code": emp_code,
                "employeeName": pr.get("employee_name") or emp_code,
                "name": pr.get("employee_name") or emp_code,
                "department": pr.get("department") or "Operations",
                "designation": pr.get("designation") or "Employee",
                "workerType": pr.get("worker_type") or "Regular Employee",
                "worker_type": pr.get("worker_type") or "Regular Employee",
                "employmentStatus": pr.get("employment_status") or "Active",
                "joiningDate": str(pr.get("joining_date") or "—"),
                "conversionStatus": pr.get("conversion_status") or "N/A",
                "monthlyCompensation": float(pr.get("monthly_compensation") or 0.0),
                "monthlySalary": float(pr.get("monthly_compensation") or 0.0),
                "calendarDays": pr.get("calendar_days") or cal_days,
                "eligibleDays": pr.get("eligible_days") or cal_days,
                "dailySalary": float(pr.get("daily_salary") or 0.0),
                "presentDays": float(pr.get("present_days") or 0.0),
                "halfDays": float(pr.get("half_days") or 0.0),
                "paidLeaveDays": float(pr.get("paid_leave_days") or 0.0),
                "unpaidLeaveDays": float(pr.get("unpaid_leave_days") or 0.0),
                "weeklyOffDays": float(pr.get("weekly_off_days") or 0.0),
                "holidayDays": float(pr.get("holiday_days") or 0.0),
                "absentDays": float(pr.get("absent_days") or 0.0),
                "paidEquivalentDays": float(pr.get("paid_equivalent_days") or 0.0),
                "lopDays": float(pr.get("lop_days") or 0.0),
                "lopDeduction": float(pr.get("lop_deduction") or 0.0),
                "grossEarnedSalary": float(pr.get("gross_earned_salary") or 0.0),
                "grossSalary": float(pr.get("gross_earned_salary") or 0.0),
                
                # Detailed Breakdown
                "fixedGrossSalary": float(pr.get("monthly_compensation") or 0.0),
                "basicSalary": float(pr.get("basic_salary") or 0.0),
                "hra": float(pr.get("hra") or 0.0),
                "flexiAllowance": float(pr.get("special_allowance") or 0.0),
                "earnBasic": float(pr.get("earn_basic") or 0.0),
                "earnHra": float(pr.get("earn_hra") or 0.0),
                "earnOtherAllo": float(pr.get("earn_special_allowance") or 0.0),
                "earnGross": float(pr.get("gross_earned_salary") or 0.0),
                "pfWages": float(pr.get("basic_salary") or 0.0) if float(pr.get("pf_deduction") or 0.0) > 0 else 0.0,
                "pfDeduction": float(pr.get("pf_deduction") or 0.0),
                "esicDeduction": float(pr.get("esic_deduction") or 0.0),
                "tdsDeduction": float(pr.get("tds_deduction") or 0.0),
                "lwfDeduction": float(pr.get("lwf_deduction") or 0.0),
                "leaveDeduction": float(pr.get("lop_deduction") or 0.0),
                "leaveTaken": float((pr.get("paid_leave_days") or 0) + (pr.get("unpaid_leave_days") or 0)),
                "arrears": float(pr.get("arrears") or 0.0),

                "ptDeducted": float(pr.get("pt_deduction") or 0.0),
                "otherDeductions": float(pr.get("other_deductions") or 0.0),
                "netSalary": float(pr.get("net_salary") or 0.0),
                "salaryCredited": float(pr.get("net_salary") or 0.0),
                "finalAmountCredited": float(pr.get("net_salary") or 0.0),
                "status": pr.get("status") or "Finalized",
                "exceptions": exc_list,
                "hasExceptions": len(exc_list) > 0,
                "payslipGenerated": (emp_code in ps_map),
                "payslipId": ps_map[emp_code]["id"] if emp_code in ps_map else None,
                "month": sel_month,
                "year": sel_year
            }
        else:
            calc_item = calculate_employee_payroll_data(
                db=db,
                emp=dict(er),
                settings=settings,
                month=sel_month,
                year=sel_year,
                cal_days=cal_days,
                month_num=m_idx,
                period_start=period_start,
                period_end=period_end,
                preloaded=preloaded
            )

            # Persist or update in payroll_records table
            import json
            exc_json = json.dumps(calc_item["exceptions"]) if calc_item["exceptions"] else None

            db.execute(text("""
                INSERT INTO payroll_records (
                    month, year, emp_code, employee_name, department, designation,
                    worker_type, employment_status, joining_date, conversion_status,
                    monthly_compensation, calendar_days, eligible_days, daily_salary,
                    present_days, half_days, paid_leave_days, unpaid_leave_days,
                    weekly_off_days, holiday_days, absent_days, paid_equivalent_days,
                    lop_days, lop_deduction, gross_earned_salary,
                    basic_salary, hra, special_allowance,
                    earn_basic, earn_hra, earn_special_allowance,
                    pf_applicable, pf_wages, pf_deduction, esic_deduction, tds_deduction, lwf_deduction, arrears,
                    pt_applicable, pt_deduction, other_deductions, net_salary, status, exceptions, updated_at
                ) VALUES (
                    :m, :y, :ec, :en, :dept, :desig,
                    :wt, :es, :jd, :cs,
                    :mc, :cd, :ed, :ds,
                    :pd, :hd, :pld, :upld,
                    :wod, :hold, :ad, :ped,
                    :ld, :lded, :ges,
                    :bs, :hra, :sa,
                    :eb, :ehra, :esa,
                    :pfa, :pfw, :pf, :esic, :tds, :lwf, :arr,
                    :pta, :ptd, :od, :ns, :st, :exc, CURRENT_TIMESTAMP
                )
                ON CONFLICT (emp_code, month, year) DO UPDATE SET
                    employee_name = EXCLUDED.employee_name,
                    department = EXCLUDED.department,
                    designation = EXCLUDED.designation,
                    worker_type = EXCLUDED.worker_type,
                    employment_status = EXCLUDED.employment_status,
                    conversion_status = EXCLUDED.conversion_status,
                    monthly_compensation = EXCLUDED.monthly_compensation,
                    calendar_days = EXCLUDED.calendar_days,
                    eligible_days = EXCLUDED.eligible_days,
                    daily_salary = EXCLUDED.daily_salary,
                    present_days = EXCLUDED.present_days,
                    half_days = EXCLUDED.half_days,
                    paid_leave_days = EXCLUDED.paid_leave_days,
                    unpaid_leave_days = EXCLUDED.unpaid_leave_days,
                    weekly_off_days = EXCLUDED.weekly_off_days,
                    holiday_days = EXCLUDED.holiday_days,
                    absent_days = EXCLUDED.absent_days,
                    paid_equivalent_days = EXCLUDED.paid_equivalent_days,
                    lop_days = EXCLUDED.lop_days,
                    lop_deduction = EXCLUDED.lop_deduction,
                    gross_earned_salary = EXCLUDED.gross_earned_salary,
                    basic_salary = EXCLUDED.basic_salary,
                    hra = EXCLUDED.hra,
                    special_allowance = EXCLUDED.special_allowance,
                    earn_basic = EXCLUDED.earn_basic,
                    earn_hra = EXCLUDED.earn_hra,
                    earn_special_allowance = EXCLUDED.earn_special_allowance,
                    pf_applicable = EXCLUDED.pf_applicable,
                    pf_wages = EXCLUDED.pf_wages,
                    pf_deduction = EXCLUDED.pf_deduction,
                    esic_deduction = EXCLUDED.esic_deduction,
                    tds_deduction = EXCLUDED.tds_deduction,
                    lwf_deduction = EXCLUDED.lwf_deduction,
                    arrears = EXCLUDED.arrears,
                    pt_applicable = EXCLUDED.pt_applicable,
                    pt_deduction = EXCLUDED.pt_deduction,
                    other_deductions = EXCLUDED.other_deductions,
                    net_salary = EXCLUDED.net_salary,
                    status = EXCLUDED.status,
                    exceptions = EXCLUDED.exceptions,
                    updated_at = CURRENT_TIMESTAMP;
            """), {
                "m": sel_month,
                "y": sel_year,
                "ec": emp_code,
                "en": calc_item["employeeName"],
                "dept": calc_item["department"],
                "desig": calc_item["designation"],
                "wt": calc_item["workerType"],
                "es": calc_item["employmentStatus"],
                "jd": er.get("emp_join_date"),
                "cs": calc_item["conversionStatus"],
                "mc": calc_item["monthlyCompensation"],
                "cd": cal_days,
                "ed": calc_item["eligibleDays"],
                "ds": calc_item["dailySalary"],
                "pd": calc_item["presentDays"],
                "hd": calc_item["halfDays"],
                "pld": calc_item["paidLeaveDays"],
                "upld": calc_item["unpaidLeaveDays"],
                "wod": calc_item["weeklyOffDays"],
                "hold": calc_item["holidayDays"],
                "ad": calc_item["absentDays"],
                "ped": calc_item["paidEquivalentDays"],
                "ld": calc_item["lopDays"],
                "lded": calc_item["lopDeduction"],
                "ges": calc_item["grossEarnedSalary"],
                "bs": calc_item["basicSalary"],
                "hra": calc_item["hra"],
                "sa": calc_item["flexiAllowance"],
                "eb": calc_item["earnBasic"],
                "ehra": calc_item["earnHra"],
                "esa": calc_item["earnOtherAllo"],
                "pfa": calc_item["pfApplicable"],
                "pfw": calc_item["pfWages"],
                "pf": calc_item["pfDeduction"],
                "esic": calc_item["esicDeduction"],
                "tds": calc_item["tdsDeduction"],
                "lwf": calc_item["lwfDeduction"],
                "arr": calc_item["arrears"],
                "pta": calc_item["ptApplicable"],
                "ptd": calc_item["ptDeducted"],
                "od": calc_item["otherDeductions"],
                "ns": calc_item["netSalary"],
                "st": calc_item["status"],
                "exc": exc_json
            })

            calc_item["id"] = f"rec-{emp_code}-{sel_month}-{sel_year}"
            calc_item["payslipGenerated"] = (emp_code in ps_map)
            calc_item["payslipId"] = ps_map[emp_code]["id"] if emp_code in ps_map else None
            item = calc_item

        records.append(item)

    db.commit()

    # Apply Filters for search, dept, status, worker_type, has_exceptions
    filtered_records = []
    for r in records:
        if search:
            st = search.strip().lower()
            if st not in r["employeeName"].lower() and st not in r["employeeId"].lower() and st not in r["department"].lower():
                continue

        if department and department.strip() and department.strip() != "—" and department.strip() != "All":
            if r["department"].lower() != department.strip().lower():
                continue

        if worker_type and worker_type.strip() and worker_type.strip() != "All":
            if r["workerType"].lower() != worker_type.strip().lower():
                continue

        if status and status.strip() and status.strip() != "All":
            st_filter = status.strip().lower()
            if st_filter not in r["status"].lower():
                continue

        if has_exceptions:
            if has_exceptions.lower() in ("true", "1", "yes") and not r["hasExceptions"]:
                continue
            elif has_exceptions.lower() in ("false", "0", "no") and r["hasExceptions"]:
                continue

        filtered_records.append(r)

    # Compute Aggregate KPIs
    total_emps = sum(1 for r in records if r["workerType"] == "Regular Employee")
    total_interns = sum(1 for r in records if r["workerType"] == "Intern")
    payroll_recs = len(records)
    total_gross = round(sum(r["monthlyCompensation"] for r in records), 2)
    total_lop = round(sum(r["lopDeduction"] for r in records), 2)
    gross_earned = round(sum(r["grossEarnedSalary"] for r in records), 2)
    total_pt = round(sum(r["ptDeducted"] for r in records), 2)
    total_other_ded = round(sum(r["otherDeductions"] for r in records), 2)
    total_ded = round(total_pt + total_other_ded, 2)
    total_net = round(sum(r["netSalary"] for r in records), 2)
    exception_cnt = sum(1 for r in records if r["hasExceptions"])

    # Update payroll_runs summary
    db.execute(text("""
        UPDATE payroll_runs
        SET total_employees = :te,
            total_interns = :ti,
            total_gross = :tg,
            total_lop = :tl,
            total_pt = :tpt,
            total_other_deductions = :tod,
            total_net = :tn,
            total_exceptions = :texc,
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {
        "te": total_emps,
        "ti": total_interns,
        "tg": gross_earned,
        "tl": total_lop,
        "tpt": total_pt,
        "tod": total_other_ded,
        "tn": total_net,
        "texc": exception_cnt,
        "m": sel_month,
        "y": sel_year
    })
    db.commit()

    run_updated = db.execute(
        text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
        {"m": sel_month, "y": sel_year}
    ).mappings().first()

    return {
        "records": filtered_records,
        "items": filtered_records,
        "data": filtered_records,
        "summary": {
            "totalEmployees": total_emps,
            "totalInterns": total_interns,
            "payrollRecords": payroll_recs,
            "grossPayroll": gross_earned,
            "grossConfigured": total_gross,
            "totalLop": total_lop,
            "totalPt": total_pt,
            "totalOtherDeductions": total_other_ded,
            "totalDeductions": total_ded,
            "netPayroll": total_net,
            "payrollExceptions": exception_cnt,
            "calendarDays": cal_days,
            "month": sel_month,
            "year": sel_year,
            "status": run_updated.get("status") if run_updated else "Draft",
            "isReconciled": abs((gross_earned - total_ded) - total_net) < 0.05
        },
        "run": dict(run_updated) if run_updated else {
            "month": sel_month, "year": sel_year, "status": "Draft", "calendar_days": cal_days
        },
        "settings": settings
    }


def finalize_monthly_payroll(
    db: Session,
    month: str,
    year: int,
    user_name: str = "Admin",
    allow_with_exceptions: bool = False
) -> dict:
    """
    Finalizes the monthly payroll:
    - Validates no blocking exceptions exist (unless authorized override)
    - Sets payroll run status to 'Finalized'
    - Synchronizes finalized payslips into `payslips` table so Employee Portal reflects them immediately.
    """
    init_payslips_table(db)
    payroll_data = get_all_payroll_records(db, month=month, year=str(year), force_recalculate=False)
    summary = payroll_data["summary"]
    records = payroll_data["records"]

    if summary["payrollExceptions"] > 0 and not allow_with_exceptions:
        raise ValueError(
            f"Cannot finalize payroll: {summary['payrollExceptions']} unresolved exceptions exist. "
            "Resolve exceptions or provide admin override."
        )

    # 1. Update PayrollRun
    db.execute(text("""
        UPDATE payroll_runs
        SET status = 'Finalized',
            finalized_at = CURRENT_TIMESTAMP,
            finalized_by = :u,
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"u": user_name, "m": month, "y": year})

    # 2. Update PayrollRecord rows
    db.execute(text("""
        UPDATE payroll_records
        SET status = 'Finalized',
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"m": month, "y": year})

    # 3. Synchronize with payslips table for Employee Portal
    m_idx = get_month_index(month)
    fin_year = f"{year}-{year + 1}" if m_idx >= 4 else f"{year - 1}-{year}"
    cal_days = summary["calendarDays"]

    for r in records:
        emp_code = r["employeeId"]
        net_sal = float(r["netSalary"] or 0.0)
        gross_earn = float(r["grossEarnedSalary"] or 0.0)
        if gross_earn <= 0:
            continue

        basic = round(gross_earn * 0.50, 2)
        hra = round(gross_earn * 0.20, 2)
        special = max(0.0, round(gross_earn - (basic + hra), 2))
        pt_val = float(r["ptDeducted"] or 0.0)
        other_val = float(r["otherDeductions"] or 0.0)
        total_ded = round(pt_val + other_val, 2)
        pf = round(basic * 0.12, 2) if r["workerType"] == "Regular Employee" else 0.0
        employer_pf = pf
        ctc_val = round(gross_earn + employer_pf, 2)

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
                :total_days, :paid_days, 'Finalized', CURRENT_DATE
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
                status = 'Finalized',
                generated_on = CURRENT_DATE;
        """), {
            "emp_code": emp_code,
            "employee_name": r["employeeName"],
            "month": month,
            "year": year,
            "fin_year": fin_year,
            "basic_salary": basic,
            "hra": hra,
            "special_allowance": special,
            "gross_earnings": gross_earn,
            "pf_deduction": pf,
            "pt_deduction": pt_val,
            "total_deductions": total_ded,
            "net_salary": net_sal,
            "employer_pf": employer_pf,
            "employer_contributions": employer_pf,
            "ctc": ctc_val,
            "total_days": cal_days,
            "paid_days": int(round(r["paidEquivalentDays"])),
        })

    db.commit()
    return {
        "status": "success",
        "message": f"Payroll for {month} {year} has been finalized and synchronized with Employee Payslips.",
        "month": month,
        "year": year
    }


def reopen_monthly_payroll(db: Session, month: str, year: int, user_name: str = "Admin") -> dict:
    """Reopens a finalized payroll back to Draft status for review and recalculation."""
    db.execute(text("""
        UPDATE payroll_runs
        SET status = 'Draft',
            reopened_at = CURRENT_TIMESTAMP,
            reopened_by = :u,
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"u": user_name, "m": month, "y": year})

    db.execute(text("""
        UPDATE payroll_records
        SET status = 'Calculated',
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"m": month, "y": year})

    db.commit()
    return {
        "status": "success",
        "message": f"Payroll for {month} {year} has been reopened to Draft.",
        "month": month,
        "year": year
    }


def record_intern_conversion(
    db: Session,
    emp_code: str,
    payload: dict,
    user_name: str = "Admin"
) -> dict:
    """
    HR / Admin records intern conversion decision:
    - Converted: updates profile_master to Employee and sets effective date
    - Extended: extends internship period by X months
    - Not Converted: maintains intern status
    - Sends official notification to employee
    """
    decision = payload.get("decision", "Converted")  # Converted, Extended, Not Converted
    eff_date_raw = payload.get("effective_employee_date")
    ext_months = int(payload.get("extension_months") or 0)
    notes = str(payload.get("notes") or "")
    new_salary = payload.get("new_salary")

    eff_date = None
    if eff_date_raw:
        try:
            eff_date = date.fromisoformat(str(eff_date_raw)[:10])
        except Exception:
            eff_date = date.today()
    elif decision == "Converted":
        eff_date = date.today()

    # Save to intern_conversion_records
    db.execute(text("""
        INSERT INTO intern_conversion_records (
            emp_code, decision, effective_employee_date, extension_months,
            notes, decided_by, decided_at, created_at, updated_at
        ) VALUES (
            :c, :dec, :eff, :ext,
            :n, :by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    """), {
        "c": emp_code,
        "dec": decision,
        "eff": eff_date,
        "ext": ext_months,
        "n": notes,
        "by": user_name
    })

    # If Converted, update profile_master and payroll_profiles
    if decision == "Converted":
        db.execute(text("""
            UPDATE profile_master
            SET employment_type = 'Full-time',
                employment_status = 'Active'
            WHERE emp_code = :c
        """), {"c": emp_code})

        if new_salary and float(new_salary) > 0:
            gross_val = float(new_salary)
            calc = calculate_salary_breakdown(gross_val)
            db.execute(text("""
                UPDATE payroll_profiles
                SET gross_salary = :gross_salary,
                    basic_salary = :basic_salary,
                    hra = :hra,
                    special_allowance = :special_allowance,
                    net_salary = :net_salary,
                    status = 'Configured',
                    effective_date = :eff,
                    updated_at = CURRENT_TIMESTAMP
                WHERE emp_code = :c
            """), {"c": emp_code, "eff": eff_date, **calc})

        # Send in-app notification if notifications table exists
        try:
            db.execute(text("""
                INSERT INTO notifications (
                    emp_code, title, message, type, is_read, created_at
                ) VALUES (
                    :c, 'Employment Status Updated',
                    'Your employment status has been updated from Intern to Employee. Your applicable leave policy is now Employee Leave Policy.',
                    'HR_UPDATE', FALSE, CURRENT_TIMESTAMP
                )
            """), {"c": emp_code})
        except Exception:
            pass

    db.commit()
    return {
        "status": "success",
        "message": f"Intern conversion recorded for {emp_code}: {decision}",
        "decision": decision,
        "effective_date": str(eff_date or "")
    }


def get_payroll_history(db: Session) -> list:
    """Returns all historical payroll runs with summaries."""
    rows = db.execute(text("""
        SELECT * FROM payroll_runs
        ORDER BY year DESC,
            CASE month
                WHEN 'December' THEN 12 WHEN 'November' THEN 11 WHEN 'October' THEN 10
                WHEN 'September' THEN 9 WHEN 'August' THEN 8 WHEN 'July' THEN 7
                WHEN 'June' THEN 6 WHEN 'May' THEN 5 WHEN 'April' THEN 4
                WHEN 'March' THEN 3 WHEN 'February' THEN 2 WHEN 'January' THEN 1
                ELSE 0
            END DESC
    """)).mappings().all()

    return [dict(r) for r in rows]



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

    settings = get_payroll_settings(db)
    co_pf = bool(settings.get("pf_applicable", False))
    emp_pf = bool(payload.get("pf_applicable", False)) if "pf_applicable" in payload else False
    calc = calculate_salary_breakdown(gross_val, pf_applicable=(co_pf and emp_pf))
    calc["pf_applicable"] = emp_pf

    if "basic_salary" in payload and float(payload.get("basic_salary") or 0) > 0:
        calc["basic_salary"] = float(payload.get("basic_salary"))
    if "hra" in payload and float(payload.get("hra") or 0) > 0:
        calc["hra"] = float(payload.get("hra"))
    if "special_allowance" in payload and float(payload.get("special_allowance") or 0) > 0:
        calc["special_allowance"] = float(payload.get("special_allowance"))
    elif "flexi_allowance" in payload and float(payload.get("flexi_allowance") or 0) > 0:
        calc["special_allowance"] = float(payload.get("flexi_allowance"))
    if "other_deductions" in payload:
        calc["other_deductions"] = float(payload.get("other_deductions") or 0.0)
    
    tds_val = float(payload.get("tds") or payload.get("tds_deduction") or 0.0)
    arrears_val = float(payload.get("arrears") or 0.0)
    calc["tds"] = tds_val
    calc["arrears"] = arrears_val

    if not (co_pf and emp_pf):
        calc["pf_deduction"] = 0.0
        calc["employer_pf"] = 0.0
        calc["employer_contributions"] = 0.0
        calc["net_salary"] = round(gross_val - calc["pt_deduction"] - calc["other_deductions"] - calc["tds"] + calc["arrears"], 2)

    db.execute(text("""
        INSERT INTO payroll_profiles (
            emp_code, basic_salary, hra, special_allowance, gross_salary,
            pf_applicable, pf_deduction, pt_deduction, other_deductions, net_salary,
            employer_pf, employer_contributions, ctc,
            tds, arrears, pay_frequency, status, updated_at
        ) VALUES (
            :c, :basic_salary, :hra, :special_allowance, :gross_salary,
            :pf_applicable, :pf_deduction, :pt_deduction, :other_deductions, :net_salary,
            :employer_pf, :employer_contributions, :ctc,
            :tds, :arrears, 'Monthly', 'Configured', CURRENT_TIMESTAMP
        )
        ON CONFLICT (emp_code) DO UPDATE SET
            basic_salary = EXCLUDED.basic_salary,
            hra = EXCLUDED.hra,
            special_allowance = EXCLUDED.special_allowance,
            gross_salary = EXCLUDED.gross_salary,
            pf_applicable = EXCLUDED.pf_applicable,
            pf_deduction = EXCLUDED.pf_deduction,
            pt_deduction = EXCLUDED.pt_deduction,
            other_deductions = EXCLUDED.other_deductions,
            net_salary = EXCLUDED.net_salary,
            employer_pf = EXCLUDED.employer_pf,
            employer_contributions = EXCLUDED.employer_contributions,
            ctc = EXCLUDED.ctc,
            tds = EXCLUDED.tds,
            arrears = EXCLUDED.arrears,
            status = 'Configured',
            updated_at = CURRENT_TIMESTAMP;
    """), {"c": emp_code, **calc})
    db.commit()

    return {"emp_code": emp_code, "status": "Configured", **calc}


def _convert_number_to_indian_words(num: float) -> str:
    """Converts a monetary figure to formal Indian currency words."""
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    n = int(round(num))
    if n == 0:
        return "Zero Rupees Only"

    def convert(val):
        if val < 20:
            return units[val]
        elif val < 100:
            return tens[val // 10] + (" " + units[val % 10] if val % 10 != 0 else "")
        elif val < 1000:
            return units[val // 100] + " Hundred" + (" and " + convert(val % 100) if val % 100 != 0 else "")
        elif val < 100000:
            return convert(val // 1000) + " Thousand" + (" " + convert(val % 1000) if val % 1000 != 0 else "")
        elif val < 10000000:
            return convert(val // 100000) + " Lakh" + (" " + convert(val % 100000) if val % 100000 != 0 else "")
        else:
            return convert(val // 10000000) + " Crore" + (" " + convert(val % 10000000) if val % 10000000 != 0 else "")

    return convert(n) + " Rupees Only"


def _format_inr_currency(val) -> str:
    """Formats numeric monetary values according to the Indian numbering system with Rupee symbol."""
    try:
        f_val = float(val or 0.0)
    except Exception:
        f_val = 0.0
    is_neg = f_val < 0
    f_val = abs(f_val)
    parts = f"{f_val:.2f}".split(".")
    int_part = parts[0]
    dec_part = parts[1]
    
    if len(int_part) <= 3:
        formatted = int_part
    else:
        last3 = int_part[-3:]
        rest = int_part[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted = ",".join(groups) + "," + last3
    
    sign = "-" if is_neg else ""
    return f"{sign}₹{formatted}.{dec_part}"


def generate_payslip_pdf(db: Session, payslip_id_or_code: str, month: str = "", year: str = "") -> bytes:
    """
    Generates official corporate PDF payslip bytes using PyMuPDF (fitz) from real database data.
    Flow per requirements:
      1. Identify Employee Code, Month, and Year from input (composite id, record id, or emp_code).
      2. Verify Employee exists in profile_master.
      3. Resolve payroll record in payroll_records for the selected month/year.
         If payroll record doesn't exist yet, computes it dynamically and persists it.
      4. Check if payslip already exists in payslips table; if missing, generate and persist it.
      5. Render comprehensive, auditable PDF matching all required earnings, deductions, and attendance fields.
    """
    init_payslips_table(db)

    raw_id = str(payslip_id_or_code or "").strip()
    target_code = raw_id
    target_month = str(month or "").strip()
    target_year = int(year) if str(year or "").strip().isdigit() else None

    # Step 1: Parse composite identifiers or numeric keys
    if raw_id.startswith("rec-"):
        parts = raw_id.split("-")
        if len(parts) >= 2:
            target_code = parts[1]
        if len(parts) >= 3 and not target_month:
            target_month = parts[2]
        if len(parts) >= 4 and not target_year:
            target_year = int(parts[3]) if parts[3].isdigit() else None

    pr_row = None
    if raw_id.isdigit():
        num_id = int(raw_id)
        # Check if num_id is a payroll_records primary key
        pr_match = db.execute(
            text("SELECT * FROM payroll_records WHERE id = :id"),
            {"id": num_id}
        ).mappings().first()
        if pr_match:
            pr_row = pr_match
            target_code = pr_row["emp_code"]
            if not target_month:
                target_month = pr_row["month"]
            if not target_year:
                target_year = int(pr_row["year"])
        else:
            # Check if num_id is a payslips primary key
            ps_match = db.execute(
                text("SELECT * FROM payslips WHERE id = :id"),
                {"id": num_id}
            ).mappings().first()
            if ps_match:
                target_code = ps_match["emp_code"]
                if not target_month:
                    target_month = ps_match["month"]
                if not target_year:
                    target_year = int(ps_match["year"])

    # Fallback to current period if month/year are still unspecified
    now = datetime.now()
    if not target_month or target_month not in MONTH_NAMES:
        target_month = "October" if now.year == 2026 else MONTH_NAMES[now.month - 1]
    if not target_year:
        target_year = 2026 if now.year == 2026 else now.year

    # Step 2: Validate Employee existence in profile_master
    emp = db.execute(
        text("SELECT * FROM profile_master WHERE emp_code = :c OR LOWER(emp_code) = LOWER(:c)"),
        {"c": target_code}
    ).mappings().first()

    if not emp:
        raise ValueError(f"Employee '{target_code}' not found in database.")

    emp_code = emp["emp_code"]

    # Step 3: Resolve Payroll Record for (emp_code, target_month, target_year)
    if not pr_row:
        pr_row = db.execute(
            text("""
                SELECT * FROM payroll_records 
                WHERE (emp_code = :c OR LOWER(emp_code) = LOWER(:c))
                  AND month = :m
                  AND year = :y
            """),
            {"c": emp_code, "m": target_month, "y": target_year}
        ).mappings().first()

    # If payroll_record does not exist for this month/year, run payroll calculation to populate it
    if not pr_row:
        try:
            get_all_payroll_records(db, search=emp_code, month=target_month, year=str(target_year))
            pr_row = db.execute(
                text("""
                    SELECT * FROM payroll_records 
                    WHERE (emp_code = :c OR LOWER(emp_code) = LOWER(:c))
                      AND month = :m
                      AND year = :y
                """),
                {"c": emp_code, "m": target_month, "y": target_year}
            ).mappings().first()
        except Exception as e:
            logger.warning(f"Could not auto-calculate payroll record for {emp_code}: {e}")

    # If still no payroll record found, or salary not configured
    if not pr_row:
        raise ValueError(f"Payroll record for employee '{emp_code}' not found for {target_month} {target_year}. Salary setup may be required.")

    # Step 4: Check if Payslip record exists in payslips table; if absent, persist it
    first_n = emp.get("first_name") or ""
    last_n = emp.get("last_name") or ""
    full_name = pr_row.get("employee_name") or f"{first_n} {last_n}".strip() or emp_code
    m_idx = get_month_index(target_month)
    fin_year = f"{target_year}-{target_year + 1}" if m_idx >= 4 else f"{target_year - 1}-{target_year}"
    cal_days = int(pr_row.get("calendar_days") or get_days_in_month(target_month, target_year))
    paid_days = int(float(pr_row.get("paid_equivalent_days") or cal_days))

    basic_val = float(pr_row.get("earn_basic") or pr_row.get("basic_salary") or 0.0)
    hra_val = float(pr_row.get("earn_hra") or pr_row.get("hra") or 0.0)
    special_val = float(pr_row.get("earn_special_allowance") or pr_row.get("special_allowance") or 0.0)
    gross_val = float(pr_row.get("gross_earned_salary") or 0.0)
    pf_val = float(pr_row.get("pf_deduction") or 0.0)
    pt_val = float(pr_row.get("pt_deduction") or 0.0)
    esic_val = float(pr_row.get("esic_deduction") or 0.0)
    tds_val = float(pr_row.get("tds_deduction") or 0.0)
    lwf_val = float(pr_row.get("lwf_deduction") or 0.0)
    lop_ded_val = float(pr_row.get("lop_deduction") or 0.0)
    other_ded_val = float(pr_row.get("other_deductions") or 0.0)
    arrears_val = float(pr_row.get("arrears") or 0.0)
    net_val = float(pr_row.get("net_salary") or 0.0)
    total_ded = round(pf_val + pt_val + esic_val + tds_val + lwf_val + other_ded_val, 2)
    monthly_comp = float(pr_row.get("monthly_compensation") or gross_val)

    # Persist or update payslip row (Prevents duplicate rows via ON CONFLICT)
    db.execute(text("""
        INSERT INTO payslips (
            emp_code, employee_name, month, year, financial_year,
            basic_salary, hra, special_allowance, gross_earnings,
            pf_deduction, pt_deduction, total_deductions, net_salary,
            employer_pf, employer_contributions, ctc,
            total_days, paid_days, status, generated_on
        ) VALUES (
            :emp_code, :employee_name, :month, :year, :fin_year,
            :basic, :hra, :special, :gross,
            :pf, :pt, :tot_ded, :net,
            0.0, 0.0, :ctc,
            :tot_days, :paid_days, 'Generated', CURRENT_DATE
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
            ctc = EXCLUDED.ctc,
            total_days = EXCLUDED.total_days,
            paid_days = EXCLUDED.paid_days,
            status = 'Generated',
            generated_on = CURRENT_DATE;
    """), {
        "emp_code": emp_code,
        "employee_name": full_name,
        "month": target_month,
        "year": target_year,
        "fin_year": fin_year,
        "basic": basic_val,
        "hra": hra_val,
        "special": special_val,
        "gross": gross_val,
        "pf": pf_val,
        "pt": pt_val,
        "tot_ded": total_ded,
        "net": net_val,
        "ctc": monthly_comp,
        "tot_days": cal_days,
        "paid_days": paid_days
    })
    db.commit()

    # Step 5: Render PyMuPDF Document
    dept = pr_row.get("department") or emp.get("department") or "Executive"
    desig = pr_row.get("designation") or emp.get("designation") or "Officer"
    worker_type = pr_row.get("worker_type") or emp.get("employment_type") or "Regular Employee"
    emp_status = pr_row.get("employment_status") or emp.get("employment_status") or "Active"
    raw_join = pr_row.get("joining_date") or emp.get("emp_join_date")
    try:
        join_str = datetime.strptime(str(raw_join)[:10], "%Y-%m-%d").strftime("%d %b %Y") if raw_join else "15 Jan 2024"
    except Exception:
        join_str = str(raw_join)[:10] if raw_join else "15 Jan 2024"

    is_intern = "intern" in str(worker_type).lower()

    pres_days = float(pr_row.get("present_days") or 0.0)
    half_days = float(pr_row.get("half_days") or 0.0)
    p_leave = float(pr_row.get("paid_leave_days") or 0.0)
    up_leave = float(pr_row.get("unpaid_leave_days") or 0.0)
    w_off = float(pr_row.get("weekly_off_days") or 0.0)
    holidays = float(pr_row.get("holiday_days") or 0.0)
    absent = float(pr_row.get("absent_days") or 0.0)
    lop_days = float(pr_row.get("lop_days") or 0.0)
    daily_sal = float(pr_row.get("daily_salary") or (monthly_comp / cal_days if cal_days else 0.0))
    pf_wages = float(pr_row.get("pf_wages") or 0.0)

    # Resolve Poppins Fonts
    fonts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts")
    font_reg = os.path.join(fonts_dir, "Poppins-Regular.ttf")
    font_med = os.path.join(fonts_dir, "Poppins-Medium.ttf")
    font_semi = os.path.join(fonts_dir, "Poppins-SemiBold.ttf")
    font_bold = os.path.join(fonts_dir, "Poppins-Bold.ttf")

    doc = fitz.open()
    page = doc.new_page(width=595.28, height=841.89)  # Standard A4: 595.28 x 841.89 points

    has_poppins = os.path.exists(font_reg) and os.path.exists(font_med) and os.path.exists(font_semi) and os.path.exists(font_bold)
    if has_poppins:
        page.insert_font(fontname="poppins-reg", fontfile=font_reg)
        page.insert_font(fontname="poppins-med", fontfile=font_med)
        page.insert_font(fontname="poppins-semi", fontfile=font_semi)
        page.insert_font(fontname="poppins-bold", fontfile=font_bold)
        f_obj_reg = fitz.Font(fontfile=font_reg)
        f_obj_med = fitz.Font(fontfile=font_med)
        f_obj_semi = fitz.Font(fontfile=font_semi)
        f_obj_bold = fitz.Font(fontfile=font_bold)
        fn_reg, fn_med, fn_semi, fn_bold = "poppins-reg", "poppins-med", "poppins-semi", "poppins-bold"
    else:
        f_obj_reg = fitz.Font("helv")
        f_obj_med = fitz.Font("helv")
        f_obj_semi = fitz.Font("helv-bold")
        f_obj_bold = fitz.Font("helv-bold")
        fn_reg, fn_med, fn_semi, fn_bold = "helv", "helv", "helv-bold", "helv-bold"

    # Outer Document Border
    page.draw_rect(fitz.Rect(26, 24, 569, 818), color=(0.84, 0.86, 0.90), width=1)

    # -------------------------------------------------------------
    # 1. HEADER BANNER (y: 24 to 92)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(26, 24, 569, 92), color=(0.38, 0.22, 0.82), fill=(0.38, 0.22, 0.82))
    page.insert_text((42, 54), "LA ESFERA INFOTECH PRIVATE LIMITED", fontsize=14.5, fontname=fn_bold, color=(1, 1, 1))
    page.insert_text((42, 73), "OFFICIAL MONTHLY SALARY STATEMENT / PAYSLIP", fontsize=9.2, fontname=fn_med, color=(0.88, 0.85, 0.98))

    # Month & Year Pill on Right
    page.draw_rect(fitz.Rect(415, 38, 555, 78), color=(1, 1, 1), fill=(0.46, 0.31, 0.88), width=0.8)
    month_txt = f"{target_month.upper()} {target_year}"
    page.insert_text((428, 56), month_txt, fontsize=11, fontname=fn_bold, color=(1, 1, 1))
    page.insert_text((428, 71), f"FINANCIAL YEAR {fin_year}", fontsize=7.8, fontname=fn_med, color=(0.92, 0.90, 0.99))

    # Helper for fitted text
    def insert_fitted(pt, text_val, max_w, f_obj, fontname, base_sz=9.0, color=(0.1, 0.1, 0.1)):
        sz = base_sz
        while sz > 7.0 and f_obj.text_length(str(text_val), fontsize=sz) > max_w:
            sz -= 0.5
        page.insert_text(pt, str(text_val), fontsize=sz, fontname=fontname, color=color)

    # -------------------------------------------------------------
    # 2. EMPLOYEE INFORMATION CARD (y: 102 to 200)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(36, 102, 559, 200), color=(0.86, 0.88, 0.93), fill=(0.975, 0.982, 0.995), width=0.8)
    page.draw_rect(fitz.Rect(36, 102, 559, 123), color=(0.86, 0.88, 0.93), fill=(0.93, 0.94, 0.98), width=0.8)
    page.insert_text((48, 117), "EMPLOYEE INFORMATION", fontsize=8.2, fontname=fn_bold, color=(0.30, 0.25, 0.65))

    # Row 1 (y: 140)
    page.insert_text((48, 140), "Employee Name:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    insert_fitted((144, 140), full_name, 160, f_obj_bold, fn_bold, 9.2, (0.08, 0.12, 0.20))
    page.insert_text((315, 140), "Worker Type:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    page.insert_text((408, 140), str(worker_type), fontsize=9, fontname=fn_semi, color=(0.10, 0.14, 0.22))

    # Row 2 (y: 156)
    page.insert_text((48, 156), "Employee ID:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    page.insert_text((144, 156), str(emp_code), fontsize=9, fontname=fn_bold, color=(0.35, 0.22, 0.78))
    page.insert_text((315, 156), "Status:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    page.insert_text((408, 156), str(emp_status), fontsize=9, fontname=fn_semi, color=(0.08, 0.50, 0.22))

    # Row 3 (y: 172)
    page.insert_text((48, 172), "Department:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    insert_fitted((144, 172), dept, 160, f_obj_med, fn_med, 8.8, (0.12, 0.16, 0.24))
    page.insert_text((315, 172), "Joining Date:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    page.insert_text((408, 172), str(join_str), fontsize=8.8, fontname=fn_med, color=(0.12, 0.16, 0.24))

    # Row 4 (y: 188)
    page.insert_text((48, 188), "Designation:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    insert_fitted((144, 188), desig, 160, f_obj_med, fn_med, 8.8, (0.12, 0.16, 0.24))
    page.insert_text((315, 188), "Financial Year:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    page.insert_text((408, 188), str(fin_year), fontsize=8.8, fontname=fn_med, color=(0.12, 0.16, 0.24))

    # -------------------------------------------------------------
    # 3. ATTENDANCE & PAYABILITY BREAKDOWN (y: 210 to 290)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(36, 210, 559, 290), color=(0.84, 0.88, 0.94), fill=(0.965, 0.978, 0.995), width=0.8)
    page.draw_rect(fitz.Rect(36, 210, 559, 230), color=(0.84, 0.88, 0.94), fill=(0.91, 0.94, 0.98), width=0.8)
    page.insert_text((48, 224), f"ATTENDANCE BREAKDOWN — {target_month.upper()} {target_year} ({cal_days} CALENDAR DAYS)", fontsize=8, fontname=fn_bold, color=(0.18, 0.32, 0.60))

    col_xs = [48, 150, 252, 355, 458]
    labels_r1 = ["Present Days", "Half Days", "Paid Leave", "Unpaid Leave", "Weekly Off"]
    vals_r1 = [f"{pres_days:.0f}", f"{half_days:.0f}", f"{p_leave:.0f}", f"{up_leave:.0f}", f"{w_off:.0f}"]
    for x, l, v in zip(col_xs, labels_r1, vals_r1):
        page.insert_text((x, 246), l, fontsize=7.6, fontname=fn_reg, color=(0.45, 0.48, 0.56))
        page.insert_text((x, 259), v, fontsize=9.2, fontname=fn_bold, color=(0.10, 0.14, 0.24))

    labels_r2 = ["Holidays", "Absent Days", "LOP Days", "Paid Days", "Calendar Days"]
    vals_r2 = [f"{holidays:.0f}", f"{absent:.0f}", f"{lop_days:.1f}", f"{paid_days:.1f}", f"{cal_days}"]
    for x, l, v in zip(col_xs, labels_r2, vals_r2):
        page.insert_text((x, 273), l, fontsize=7.6, fontname=fn_reg, color=(0.45, 0.48, 0.56))
        c_val = (0.78, 0.15, 0.15) if l == "LOP Days" and lop_days > 0 else (0.08, 0.50, 0.20) if l == "Paid Days" else (0.10, 0.14, 0.24)
        page.insert_text((x, 285), v, fontsize=9.2, fontname=fn_bold, color=c_val)

    # -------------------------------------------------------------
    # 4. DAILY SALARY CALCULATION STRIP (y: 298 to 326)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(36, 298, 559, 326), color=(0.85, 0.82, 0.96), fill=(0.96, 0.94, 0.995), width=0.8)
    sal_label = "Monthly Stipend" if is_intern else "Monthly Salary"
    formula_txt = f"DAILY SALARY CALCULATION: {sal_label} ({_format_inr_currency(monthly_comp)}) ÷ Calendar Days ({cal_days}) = {_format_inr_currency(daily_sal)} per day"
    page.insert_text((48, 315), formula_txt, fontsize=8.4, fontname=fn_semi, color=(0.35, 0.22, 0.72))

    # -------------------------------------------------------------
    # 5. EARNINGS & DEDUCTIONS COMPARATIVE TABLES (y: 334 to 572)
    # -------------------------------------------------------------
    e_left, e_right = 36, 292
    d_left, d_right = 303, 559
    
    page.draw_rect(fitz.Rect(e_left, 334, e_right, 572), color=(0.84, 0.87, 0.94), fill=(1, 1, 1), width=0.8)
    page.draw_rect(fitz.Rect(d_left, 334, d_right, 572), color=(0.94, 0.85, 0.85), fill=(1, 1, 1), width=0.8)

    # Headers
    page.draw_rect(fitz.Rect(e_left, 334, e_right, 358), color=(0.84, 0.87, 0.94), fill=(0.92, 0.94, 0.98), width=0.8)
    page.insert_text((48, 350), "EARNINGS", fontsize=8.8, fontname=fn_bold, color=(0.20, 0.28, 0.62))
    hdr_amt = "AMOUNT (INR)"
    page.insert_text((215, 350), hdr_amt, fontsize=8, fontname=fn_bold, color=(0.20, 0.28, 0.62))

    page.draw_rect(fitz.Rect(d_left, 334, d_right, 358), color=(0.94, 0.85, 0.85), fill=(0.98, 0.92, 0.92), width=0.8)
    page.insert_text((315, 350), "DEDUCTIONS", fontsize=8.8, fontname=fn_bold, color=(0.68, 0.15, 0.15))
    page.insert_text((482, 350), hdr_amt, fontsize=8, fontname=fn_bold, color=(0.68, 0.15, 0.15))

    earnings_rows = [
        ("Monthly Stipend" if is_intern else "Monthly Base Salary", monthly_comp),
        ("Earned Basic Salary", basic_val),
        ("Earned HRA", hra_val),
        ("Earned Flexi Allowance", special_val),
        ("Arrears / Additions", arrears_val),
        ("", None),
        ("", None),
        ("", None),
    ]

    deductions_rows = [
        ("PF Wages", pf_wages),
        ("Provident Fund (PF)", pf_val),
        ("Professional Tax (PT)", pt_val),
        ("ESIC", esic_val),
        ("Labour Welfare Fund (LWF)", lwf_val),
        ("TDS", tds_val),
        ("Leave Deduction", lop_ded_val),
        ("Other Deductions", other_ded_val),
    ]

    curr_y = 377
    for i in range(8):
        e_label, e_amt = earnings_rows[i]
        d_label, d_amt = deductions_rows[i]

        if i % 2 == 1:
            page.draw_rect(fitz.Rect(e_left + 1, curr_y - 13, e_right - 1, curr_y + 8), color=None, fill=(0.98, 0.985, 1.0))
            page.draw_rect(fitz.Rect(d_left + 1, curr_y - 13, d_right - 1, curr_y + 8), color=None, fill=(1.0, 0.985, 0.985))

        # Earnings Row
        if e_amt is not None and e_label:
            page.insert_text((48, curr_y), e_label, fontsize=8.4, fontname=fn_reg, color=(0.15, 0.18, 0.25))
            amt_str = _format_inr_currency(e_amt)
            tw = f_obj_med.text_length(amt_str, fontsize=8.6)
            page.insert_text((280 - tw, curr_y), amt_str, fontsize=8.6, fontname=fn_med, color=(0.10, 0.14, 0.24))

        # Deductions Row
        if d_label:
            page.insert_text((315, curr_y), d_label, fontsize=8.4, fontname=fn_reg, color=(0.15, 0.18, 0.25))
            amt_str = _format_inr_currency(d_amt)
            tw = f_obj_med.text_length(amt_str, fontsize=8.6)
            page.insert_text((548 - tw, curr_y), amt_str, fontsize=8.6, fontname=fn_med, color=(0.10, 0.14, 0.24))

        curr_y += 21

    # Totals Row (y: 546 to 572)
    page.draw_rect(fitz.Rect(e_left, 546, e_right, 572), color=(0.84, 0.87, 0.94), fill=(0.92, 0.97, 0.94), width=0.8)
    page.insert_text((48, 562), "GROSS EARNED SALARY", fontsize=8.5, fontname=fn_bold, color=(0.08, 0.45, 0.20))
    gross_str = _format_inr_currency(gross_val)
    gw = f_obj_bold.text_length(gross_str, fontsize=9.2)
    page.insert_text((280 - gw, 562), gross_str, fontsize=9.2, fontname=fn_bold, color=(0.08, 0.45, 0.20))

    page.draw_rect(fitz.Rect(d_left, 546, d_right, 572), color=(0.94, 0.85, 0.85), fill=(0.99, 0.92, 0.92), width=0.8)
    page.insert_text((315, 562), "TOTAL DEDUCTIONS", fontsize=8.5, fontname=fn_bold, color=(0.75, 0.15, 0.15))
    ded_str = _format_inr_currency(total_ded)
    dw = f_obj_bold.text_length(ded_str, fontsize=9.2)
    page.insert_text((548 - dw, 562), ded_str, fontsize=9.2, fontname=fn_bold, color=(0.75, 0.15, 0.15))

    # -------------------------------------------------------------
    # 6. NET SALARY PAYABLE HERO CARD (y: 582 to 662)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(36, 582, 559, 662), color=(0.14, 0.60, 0.30), fill=(0.94, 0.99, 0.95), width=1.4)
    
    # Net Title & Large Value
    page.insert_text((52, 608), "NET SALARY PAYABLE", fontsize=12.5, fontname=fn_bold, color=(0.08, 0.45, 0.20))
    net_str = _format_inr_currency(net_val)
    nw = f_obj_bold.text_length(net_str, fontsize=18)
    page.insert_text((545 - nw, 610), net_str, fontsize=18, fontname=fn_bold, color=(0.08, 0.45, 0.20))

    # Amount in Words
    words_txt = f"Amount in Words: {_convert_number_to_indian_words(net_val)}"
    insert_fitted((52, 630), words_txt, 490, f_obj_semi, fn_semi, 8.5, (0.12, 0.38, 0.20))

    # Reconciliation Breakdown
    recon_txt = f"Reconciliation: Gross Earned ({_format_inr_currency(gross_val)}) − Total Deductions ({_format_inr_currency(total_ded)}) = Net Salary ({_format_inr_currency(net_val)})"
    page.insert_text((52, 648), recon_txt, fontsize=8.0, fontname=fn_reg, color=(0.35, 0.42, 0.38))

    # -------------------------------------------------------------
    # 7. POLICY & STATUTORY NOTES (y: 672 to 742)
    # -------------------------------------------------------------
    page.draw_rect(fitz.Rect(36, 672, 559, 742), color=(0.86, 0.88, 0.92), fill=(0.975, 0.98, 0.99), width=0.8)
    page.insert_text((48, 688), "PAYROLL NOTES", fontsize=8.2, fontname=fn_bold, color=(0.28, 0.32, 0.45))
    page.insert_text((48, 704), f"• Provident Fund (PF): Currently not applicable under company configuration (PF Wages: {_format_inr_currency(pf_wages)}, PF: {_format_inr_currency(pf_val)}).", fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))
    page.insert_text((48, 718), f"• Professional Tax (PT): Applied according to configured payroll policy ({_format_inr_currency(pt_val)}).", fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))
    page.insert_text((48, 732), f"• Salary is calculated using actual calendar days of the payroll month ({cal_days} Days).", fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))

    # -------------------------------------------------------------
    # 8. FOOTER & AUTHORIZED SIGNATORY (y: 752 to 812)
    # -------------------------------------------------------------
    page.draw_line((36, 752), (559, 752), color=(0.85, 0.87, 0.92), width=0.8)
    
    # Left Note
    page.insert_text((38, 770), "This is a system-generated salary statement and does not require a physical signature.", fontsize=7.5, fontname=fn_reg, color=(0.55, 0.58, 0.65))
    now = datetime.now()
    page.insert_text((38, 784), f"Generated on: {now.strftime('%d %b %Y')} · Confidential document for employee use only.", fontsize=7.2, fontname=fn_reg, color=(0.60, 0.64, 0.70))

    # Right Signatory
    page.draw_line((390, 780), (545, 780), color=(0.60, 0.65, 0.75), width=0.8)
    page.insert_text((410, 794), "Authorized Signatory", fontsize=9, fontname=fn_semi, color=(0.15, 0.18, 0.28))
    page.insert_text((390, 807), "LA ESFERA INFOTECH PRIVATE LIMITED", fontsize=7.8, fontname=fn_bold, color=(0.38, 0.22, 0.78))

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
