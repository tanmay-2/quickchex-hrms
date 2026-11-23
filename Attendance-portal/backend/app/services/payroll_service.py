# ==============================================================================
# "import" means: bring in ready-made tools that this file needs to work.
import os  # Tool to work with files and folders on the computer
import logging  # Tool to write down problems/messages so we can read them later
from sqlalchemy import text  # Tool that lets us write plain instructions to the saved-records storage
from sqlalchemy.orm import Session  # A "Session" is an open connection to the saved-records storage
from datetime import date, datetime, timedelta  # Tools to work with dates and times
import calendar  # Tool that knows how many days each month has
import io  # Tool for handling data in memory (kept here for file handling)
import json  # Tool to convert Python lists/dicts to text and back, for saving data
import functools  # Tool that helps save the result of a slow task so it is not repeated
# Begin guarded execution block to trap exceptions
try:
    # Try to bring in the PDF-drawing tool using its newer name
    import pymupdf as fitz
# Catch and handle specific exception if raised
except ImportError:
    # If the newer name is not found, use the older name of the same tool
    import fitz


# This is a notebook where this file writes down warnings and errors
logger = logging.getLogger("payroll_service")

# This flag remembers whether the database tables have already been set up.
# Once set to True, we skip the setup step on every later call (saves time).
_tables_ready = False

# List of all month names. The position in the list helps us find month numbers.
MONTH_NAMES = [
    # Execute statement to process data and maintain state
    "January", "February", "March", "April", "May", "June",
    # Execute statement to process data and maintain state
    "July", "August", "September", "October", "November", "December"
# Execute statement to process data and maintain state
]


# Apply decorator to wrap function behavior
@functools.lru_cache(maxsize=1)
# Define _get_poppins_font_paths function to handle  get poppins font paths
def _get_poppins_font_paths():
    """
    Returns the file paths for the four Poppins font files.
    The result is cached so the disk is only checked once, no matter how many
    payslip PDFs are generated in a single session.
    """
    # Find the 'assets/fonts' folder that lives next to the 'services' folder
    fonts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "fonts")
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "reg":  os.path.join(fonts_dir, "Poppins-Regular.ttf"),
        # Execute statement to process data and maintain state
        "med":  os.path.join(fonts_dir, "Poppins-Medium.ttf"),
        # Execute statement to process data and maintain state
        "semi": os.path.join(fonts_dir, "Poppins-SemiBold.ttf"),
        # Execute statement to process data and maintain state
        "bold": os.path.join(fonts_dir, "Poppins-Bold.ttf"),
    # Execute statement to process data and maintain state
    }


# Define init_payslips_table function to handle init payslips table
def init_payslips_table(db: Session):
    """Ensures payslips and payroll_profiles tables exist."""
    # If the tables were already set up earlier, skip the work entirely
    global _tables_ready
    # Evaluate condition to control execution branch
    if _tables_ready:
        # Return computed result or response payload to caller
        return
    # Make sure all the storage tables (like payslips and salary details) are ready
    try:
        # Import Base from app.db.base for module operations
        from app.db.base import Base
        # Create any table that is missing. Tables that already exist are left alone.
        Base.metadata.create_all(bind=db.get_bind())
        # Mark that the tables are now ready so we do not do this again
        _tables_ready = True
    # Catch and handle specific exception if raised
    except Exception as e:
        # If something goes wrong, write the problem in the notebook but do not stop the program
        logger.error(f"Error initializing payroll tables: {e}")



# ==============================================================================
# SALARY CALCULATOR (Dividing total salary into simple parts)
# ==============================================================================
# This takes the employee's monthly salary and splits it into easy parts:
# 1. Basic Pay: Half (50%) of the total salary.
# 2. House Rent (HRA): 25% of the total salary to help pay for home rent.
# 3. Special Allowance: Whatever money is left after Basic and HRA are taken out.
# 4. Provident Fund (PF): 12% savings taken from the "PF wages" (Basic + any allowance money above half of the salary), up to the PF wage limit.
# 5. Professional Tax (PT): Government fee (Rs 200 if salary is Rs 15,000 or more; Rs 175 if Rs 10,000 or more).
# 6. Take-Home Salary (Net Pay): The real money put into the employee's bank account.
# ==============================================================================
def calculate_salary_breakdown(monthly_gross: float, pf_applicable: bool = False, pf_wage_ceiling: float = 25000.0):
    # Make sure salary number is not negative (cannot be less than 0)
    gross = max(0.0, float(monthly_gross or 0.0))
    
    # 1. Basic Pay: Exactly half (50%) of the total salary
    basic = round(gross * 0.50, 2)
    
    # 2. House Rent Allowance (HRA): 25% of the total salary
    hra = round(gross * 0.25, 2)
    
    # 3. Special Allowance: The remaining money (Total salary minus Basic minus HRA)
    special_allowance = max(0.0, round(gross - (basic + hra), 2))
    
    # 4. PF savings: 12% taken from the PF wages if employee has PF savings turned on
    # New wage rule: if allowances are more than half of the salary, the extra
    # allowance money is counted as wages. PF wages = Basic + that extra money.
    allowance_excess = max(0.0, round((hra + special_allowance) - (gross * 0.50), 2))
    # Set statutory_wages variable to store statutory wages value
    statutory_wages = round(basic + allowance_excess, 2)
    # PF is taken only up to the PF wage limit (a limit of 0 means no limit)
    pf_wages = round(min(statutory_wages, pf_wage_ceiling) if pf_wage_ceiling > 0 else statutory_wages, 2)
    # Set pf_deduction variable to store pf deduction value
    pf_deduction = round(pf_wages * 0.12, 2) if pf_applicable else 0.0
    
    # 5. Government Tax (PT): Rs 200 if salary is Rs 15,000 or more, Rs 175 if Rs 10,000 or more
    pt_deduction = 200.0 if gross >= 15000 else (175.0 if gross >= 10000 else 0.0)
    
    # Total cuts: Add up all money taken out (PF savings + Government tax)
    total_deductions = round(pf_deduction + pt_deduction, 2)
    
    # In-Hand Salary: The real money paid into the employee's bank account (Total salary minus Total cuts)
    net_salary = max(0.0, round(gross - total_deductions, 2))
    
    # Company's matching PF savings contribution for the employee
    employer_pf = round(pf_wages * 0.12, 2) if pf_applicable else 0.0
    # Set employer_contributions variable to store employer contributions value
    employer_contributions = employer_pf
    
    # Total Company Cost (CTC): Total salary plus the company's matching PF contribution
    ctc = round(gross + employer_contributions, 2)

    # Give back all the numbers together as one packet (name -> value)
    return {
        # Execute statement to process data and maintain state
        "basic_salary": basic,
        # Execute statement to process data and maintain state
        "hra": hra,
        # Execute statement to process data and maintain state
        "special_allowance": special_allowance,
        # Execute statement to process data and maintain state
        "gross_earnings": gross,
        # Execute statement to process data and maintain state
        "gross_salary": gross,
        # Execute statement to process data and maintain state
        "pf_applicable": pf_applicable,
        # Execute statement to process data and maintain state
        "pf_wages": pf_wages if pf_applicable else 0.0,
        # Execute statement to process data and maintain state
        "pf_deduction": pf_deduction,
        # Execute statement to process data and maintain state
        "pt_deduction": pt_deduction,
        # Execute statement to process data and maintain state
        "other_deductions": 0.0,
        # Execute statement to process data and maintain state
        "total_deductions": total_deductions,
        # Execute statement to process data and maintain state
        "net_salary": net_salary,
        # Execute statement to process data and maintain state
        "employer_pf": employer_pf,
        # Execute statement to process data and maintain state
        "employer_contributions": employer_contributions,
        # Execute statement to process data and maintain state
        "ctc": ctc
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# SET UP EMPLOYEE SALARY (init_payroll_profile)
# ==============================================================================
# This saves or updates an employee's salary in the database:
# 1. Takes the employee's ID code.
# 2. Checks if monthly salary or yearly package (CTC) was provided.
# 3. Calculates all salary parts (Basic, HRA, Allowance, PF, PT, and Take-Home).
# 4. Saves the numbers to the computer database.
# ==============================================================================
def init_payroll_profile(
    # Define db schema field with type Session,
    db: Session,
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define monthly_gross schema field with type float and default value
    monthly_gross: float = None,
    # Define annual_ctc schema field with type float and default value
    annual_ctc: float = None,
    # Define joining_date schema field with type date and default value
    joining_date: date = None,
    # Define employment_type schema field with type str and default value
    employment_type: str = "Full-time"
# Execute statement to process data and maintain state
) -> dict:
    """
    Sets up salary for a new employee.
    If no salary is given, it marks status as 'Payroll Setup Required'.
    """
    # Make sure the database tables are ready
    init_payslips_table(db)

    # Clean up the employee ID code by removing extra spaces
    clean_code = str(emp_code or "").strip()
    # If there is no employee code at all, we cannot continue, so give back nothing
    if not clean_code:
        # Return computed result or response payload to caller
        return {}

    # Check if this employee already has a salary saved in the database
    existing = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payroll_profiles WHERE emp_code = :c"),
        # Execute statement to process data and maintain state
        {"c": clean_code}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Start with "no salary known yet"
    gross_val = 0.0
    # Set has_salary variable to store has salary value
    has_salary = False
    
    # --------------------------------------------------------------------------
    # FIND MONTHLY SALARY:
    # --------------------------------------------------------------------------
    if monthly_gross and float(monthly_gross) > 0:
        # If monthly salary was directly entered, use it
        gross_val = float(monthly_gross)
        # Set has_salary variable to store has salary value
        has_salary = True
    # Evaluate alternate branch condition
    elif annual_ctc and float(annual_ctc) > 0:
        # If a yearly salary package (CTC) was entered instead:
        # 1. Divide by 12 to find how much they earn in one single month.
        # 2. Divide by 1.06 to remove the 6% money the company keeps for the PF savings fund.
        # This gives the true monthly salary before any cuts.
        gross_val = float(annual_ctc) / 12.0 / 1.06
        # Set has_salary variable to store has salary value
        has_salary = True

    # If salary was entered, calculate all parts. If not entered yet, set everything to 0.
    calc = calculate_salary_breakdown(gross_val) if has_salary else {
        # Execute statement to process data and maintain state
        "basic_salary": 0.0,
        # Execute statement to process data and maintain state
        "hra": 0.0,
        # Execute statement to process data and maintain state
        "special_allowance": 0.0,
        # Execute statement to process data and maintain state
        "gross_salary": 0.0,
        # Execute statement to process data and maintain state
        "pf_deduction": 0.0,
        # Execute statement to process data and maintain state
        "pt_deduction": 0.0,
        # Execute statement to process data and maintain state
        "other_deductions": 0.0,
        # Execute statement to process data and maintain state
        "total_deductions": 0.0,
        # Execute statement to process data and maintain state
        "net_salary": 0.0,
        # Execute statement to process data and maintain state
        "employer_pf": 0.0,
        # Execute statement to process data and maintain state
        "employer_contributions": 0.0,
        # Execute statement to process data and maintain state
        "ctc": 0.0
    # Execute statement to process data and maintain state
    }

    # If salary is configured, show status 'Configured'. If missing, show 'Payroll Setup Required'
    status_str = "Configured" if has_salary else "Payroll Setup Required"
    # Date when this salary starts (joining date or today's date)
    eff_date = joining_date or date.today()

    # Step 1: If employee is already in the database, update their salary with the new numbers
    if existing:
        # Only change the saved salary when a new salary was actually given
        if has_salary:
            # Write all the new salary numbers over the old ones for this employee
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
            # "commit" means: make the change permanent
            db.commit()
    # Step 2: If this is a brand new employee with no salary row yet, insert a new record
    else:
        # Add a brand new salary line for this employee
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
        # Make the new line permanent
        db.commit()

    # Give back a short summary of what was saved
    return {"emp_code": clean_code, "status": status_str, **calc}


# ==============================================================================
# PAYROLL CONFIGURATION SETTINGS RETRIEVER
# ==============================================================================
# Queries the global company payroll rules (PT amount, PF%, intern leave quota).
# If no configuration row exists yet, seeds the default Indian corporate baseline.
# ==============================================================================
def get_payroll_settings(db: Session) -> dict:
    """Returns company payroll configuration rules from payroll_settings table."""
    try:
        # Step 1: Query the primary configuration row from payroll_settings table
        row = db.execute(text("SELECT * FROM payroll_settings ORDER BY id ASC LIMIT 1")).mappings().first()
        
        # Step 2: Auto-initialize default company configuration if table is currently empty
        if not row:
            # No rules saved yet, so save a standard starting set of company rules
            db.execute(text("""
                INSERT INTO payroll_settings (
                    salary_day_basis, pt_enabled, pt_amount, pf_applicable, pf_wages_basis,
                    pf_employee_percent, pf_employer_percent, pf_wage_ceiling,
                    intern_eligibility_months, intern_conversion_mode, intern_paid_leave_enabled,
                    intern_paid_leave_quota, intern_unpaid_leave_enabled, employee_paid_leave_enabled,
                    weekly_off_paid, paid_holiday_paid, allow_negative_salary, updated_by
                ) VALUES (
                    'Calendar Days', TRUE, 200.00, FALSE, 'Basic + DA',
                    12.00, 12.00, 25000.00,
                    6, 'Manual HR Approval', FALSE,
                    0.0, TRUE, TRUE,
                    TRUE, TRUE, FALSE, 'System Init'
                )
            """))
            # Commit transaction to persist changes in database
            db.commit()
            # Read the rules again now that they exist
            row = db.execute(text("SELECT * FROM payroll_settings ORDER BY id ASC LIMIT 1")).mappings().first()
        
        # Return settings as a clean Python dictionary
        return dict(row)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Fallback safe defaults in case database connection encounters a temporary error
        logger.error(f"Error fetching payroll settings: {e}")
        # If reading failed, use a safe standard set of rules so the work can go on
        return {
            # Execute statement to process data and maintain state
            "salary_day_basis": "Calendar Days",
            # Execute statement to process data and maintain state
            "pt_enabled": True,
            # Execute statement to process data and maintain state
            "pt_amount": 200.00,
            # Execute statement to process data and maintain state
            "pf_applicable": False,
            # Execute statement to process data and maintain state
            "pf_wages_basis": "Basic + DA",
            # Execute statement to process data and maintain state
            "pf_employee_percent": 12.00,
            # Execute statement to process data and maintain state
            "pf_employer_percent": 12.00,
            # Execute statement to process data and maintain state
            "pf_wage_ceiling": 25000.00,
            # Execute statement to process data and maintain state
            "intern_eligibility_months": 6,
            # Execute statement to process data and maintain state
            "intern_conversion_mode": "Manual HR Approval",
            # Execute statement to process data and maintain state
            "intern_paid_leave_enabled": False,
            # Execute statement to process data and maintain state
            "intern_paid_leave_quota": 0.0,
            # Execute statement to process data and maintain state
            "intern_unpaid_leave_enabled": True,
            # Execute statement to process data and maintain state
            "employee_paid_leave_enabled": True,
            # Execute statement to process data and maintain state
            "weekly_off_paid": True,
            # Execute statement to process data and maintain state
            "paid_holiday_paid": True,
            # Execute statement to process data and maintain state
            "allow_negative_salary": False
        # Execute statement to process data and maintain state
        }


# ==============================================================================
# PAYROLL CONFIGURATION SETTINGS UPDATER
# ==============================================================================
# Allows HR / Admin to modify tax, PF, and internship conversion policies.
# ==============================================================================
def update_payroll_settings(db: Session, payload: dict, user_name: str = "Admin") -> dict:
    """Updates company payroll settings configured by HR/Admin."""
    # Retrieve existing settings to preserve values that are not changing
    current = get_payroll_settings(db)
    # Rule used below: "use the new value if HR sent one, otherwise keep the old value"
    
    # Extract updated Professional Tax (PT) parameters
    new_pt_enabled = payload.get("pt_enabled", current.get("pt_enabled", True))
    # Set new_pt_amount variable to store new pt amount value
    new_pt_amount = float(payload.get("pt_amount", current.get("pt_amount", 200.00)))
    
    # Extract Provident Fund (PF) configurations
    new_pf_applicable = bool(payload.get("pf_applicable", current.get("pf_applicable", False)))
    # Set new_pf_wages_basis variable to store new pf wages basis value
    new_pf_wages_basis = str(payload.get("pf_wages_basis", current.get("pf_wages_basis", "Basic + DA")))
    # Set new_pf_emp_pct variable to store new pf emp pct value
    new_pf_emp_pct = float(payload.get("pf_employee_percent", current.get("pf_employee_percent", 12.00)))
    # Set new_pf_empr_pct variable to store new pf empr pct value
    new_pf_empr_pct = float(payload.get("pf_employer_percent", current.get("pf_employer_percent", 12.00)))
    # Set new_pf_ceiling variable to store new pf ceiling value
    new_pf_ceiling = float(payload.get("pf_wage_ceiling", current.get("pf_wage_ceiling", 25000.00)))

    # Extract Internship policies & conversion rules
    new_intern_eligibility = int(payload.get("intern_eligibility_months", current.get("intern_eligibility_months", 6)))
    # Set new_intern_conv_mode variable to store new intern conv mode value
    new_intern_conv_mode = str(payload.get("intern_conversion_mode", current.get("intern_conversion_mode", "Manual HR Approval")))
    # Set new_intern_paid_leave variable to store new intern paid leave value
    new_intern_paid_leave = bool(payload.get("intern_paid_leave_enabled", current.get("intern_paid_leave_enabled", False)))
    # Set new_intern_paid_quota variable to store new intern paid quota value
    new_intern_paid_quota = float(payload.get("intern_paid_leave_quota", current.get("intern_paid_leave_quota", 0.0)))
    # Set new_intern_unpaid variable to store new intern unpaid value
    new_intern_unpaid = bool(payload.get("intern_unpaid_leave_enabled", current.get("intern_unpaid_leave_enabled", True)))
    
    # Extract leave paidness flags
    new_emp_paid = bool(payload.get("employee_paid_leave_enabled", current.get("employee_paid_leave_enabled", True)))
    # Set new_weekly_off variable to store new weekly off value
    new_weekly_off = bool(payload.get("weekly_off_paid", current.get("weekly_off_paid", True)))
    # Set new_paid_holiday variable to store new paid holiday value
    new_paid_holiday = bool(payload.get("paid_holiday_paid", current.get("paid_holiday_paid", True)))
    # Set new_allow_neg variable to store new allow neg value
    new_allow_neg = bool(payload.get("allow_negative_salary", current.get("allow_negative_salary", False)))

    # Persist updated configuration fields to PostgreSQL
    # Save all the chosen rules over the old rules, and note who changed them and when
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
        # Execute statement to process data and maintain state
        "pt_en": new_pt_enabled,
        # Execute statement to process data and maintain state
        "pt_amt": new_pt_amount,
        # Execute statement to process data and maintain state
        "pf_app": new_pf_applicable,
        # Execute statement to process data and maintain state
        "pf_wb": new_pf_wages_basis,
        # Execute statement to process data and maintain state
        "pf_ep": new_pf_emp_pct,
        # Execute statement to process data and maintain state
        "pf_er": new_pf_empr_pct,
        # Execute statement to process data and maintain state
        "pf_wc": new_pf_ceiling,
        # Execute statement to process data and maintain state
        "intern_el": new_intern_eligibility,
        # Execute statement to process data and maintain state
        "intern_conv": new_intern_conv_mode,
        # Execute statement to process data and maintain state
        "intern_pl_en": new_intern_paid_leave,
        # Execute statement to process data and maintain state
        "intern_pl_q": new_intern_paid_quota,
        # Execute statement to process data and maintain state
        "intern_upl": new_intern_unpaid,
        # Execute statement to process data and maintain state
        "emp_pl": new_emp_paid,
        # Execute statement to process data and maintain state
        "wo_paid": new_weekly_off,
        # Execute statement to process data and maintain state
        "hol_paid": new_paid_holiday,
        # Execute statement to process data and maintain state
        "allow_neg": new_allow_neg,
        # Execute statement to process data and maintain state
        "up_by": user_name
    # Execute statement to process data and maintain state
    })
    # Make the saved rules permanent
    db.commit()
    # Return freshly committed settings object
    return get_payroll_settings(db)


# ==============================================================================
# CALENDAR DATE & MONTH UTILITY HELPERS
# ==============================================================================
def get_month_index(month_name: str) -> int:
    """Converts English month name string ('January'..'December') to 1-based integer (1..12)."""
    try:
        # Find the month in the list. Position 0 is January, so add 1 to get 1..12.
        return MONTH_NAMES.index(month_name) + 1
    # Catch and handle specific exception if raised
    except ValueError:
        # If the name is not a real month, use the current month instead
        return datetime.now().month


# Define get_days_in_month function to handle get days in month
def get_days_in_month(month: str, year: int) -> int:
    """
    Dynamically returns exact calendar days in the specified month and year
    (e.g., February 2024 returns 29, February 2026 returns 28).
    """
    # Turn the month name into a number first
    m_idx = get_month_index(month)
    # Begin guarded execution block to trap exceptions
    try:
        # calendar.monthrange returns (first_weekday, num_days_in_month)
        # Take the second value, which is the number of days in that month
        return calendar.monthrange(int(year), m_idx)[1]
    # Catch and handle specific exception if raised
    except Exception:
        # If anything goes wrong, assume 30 days
        return 30


# Define get_or_create_payroll_run function to handle get or create payroll run
def get_or_create_payroll_run(db: Session, month: str, year: int) -> dict:
    """Gets or initializes the PayrollRun master entry for the given month and year."""
    # Find how many days this month has
    cal_days = get_days_in_month(month, year)
    # Look for the "salary file" of this month
    run = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
        # Execute statement to process data and maintain state
        {"m": month, "y": year}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # If this month has no salary file yet, create a new one marked "Draft" (not final)
    if not run:
        # Execute statement to process data and maintain state
        db.execute(text("""
            INSERT INTO payroll_runs (month, year, calendar_days, status, created_at, updated_at)
            VALUES (:m, :y, :cd, 'Draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """), {"m": month, "y": year, "cd": cal_days})
        # Commit transaction to persist changes in database
        db.commit()
        # Read the new file back so we can return it
        run = db.execute(
            # Invoke text to perform operational action
            text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
            # Execute statement to process data and maintain state
            {"m": month, "y": year}
        # Execute statement to process data and maintain state
        ).mappings().first()
    # Return computed result or response payload to caller
    return dict(run)


# ==============================================================================
# WORK OUT ONE EMPLOYEE'S SALARY FOR ONE MONTH (calculate_employee_payroll_data)
# ==============================================================================
# This is the heart of the file. For one employee and one month it:
#   1. Finds out if the person is an intern or a regular employee.
#   2. Checks joining date and last working day.
#   3. Goes through every day of the month and decides: paid day or unpaid day?
#   4. Cuts salary for unpaid days, adds government fees, and finds take-home pay.
#   5. Collects "problems to fix" (for example: salary missing, leave not decided).
# ==============================================================================
def calculate_employee_payroll_data(
    # Define db schema field with type Session,
    db: Session,
    # Define emp schema field with type dict,
    emp: dict,
    # Define settings schema field with type dict,
    settings: dict,
    # Define month schema field with type str,
    month: str,
    # Define year schema field with type int,
    year: int,
    # Define cal_days schema field with type int,
    cal_days: int,
    # Define month_num schema field with type int,
    month_num: int,
    # Define period_start schema field with type date,
    period_start: date,
    # Define period_end schema field with type date,
    period_end: date,
    # Define preloaded schema field with type dict and default value
    preloaded: dict = None
# Execute statement to process data and maintain state
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
    # If no ready-made data bundle was given, start with an empty one
    if preloaded is None:
        # Set preloaded variable to store preloaded value
        preloaded = {}

    # ---- Basic details about the person (name, department, job title, etc.) ----
    emp_code = str(emp.get("emp_code") or "").strip()
    # Set first_n variable to store first n value
    first_n = str(emp.get("first_name") or "")
    # Set last_n variable to store last n value
    last_n = str(emp.get("last_name") or "")
    # Full name = first + last name. If both are empty, show the employee code.
    full_name = f"{first_n} {last_n}".strip() or emp_code
    # Set dept variable to store dept value
    dept = str(emp.get("department") or "Operations")
    # Set desig variable to store desig value
    desig = str(emp.get("designation") or "Employee")
    # Set emp_type_raw variable to store emp type raw value
    emp_type_raw = str(emp.get("employment_type") or "").strip()
    # Set emp_status_raw variable to store emp status raw value
    emp_status_raw = str(emp.get("employment_status") or "Active").strip()

    # Worker type detection
    # Treat the person as an intern if the word "intern" appears in their type, status or job title
    is_intern = (
        # Execute statement to process data and maintain state
        "intern" in emp_type_raw.lower() or
        # Execute statement to process data and maintain state
        "intern" in emp_status_raw.lower() or
        # Execute statement to process data and maintain state
        "intern" in desig.lower()
    # Execute statement to process data and maintain state
    )
    # Set worker_type variable to store worker type value
    worker_type = "Intern" if is_intern else "Regular Employee"

    # Joining Date & Exit Date
    # Read the joining date. It may come as a real date or as text, so handle both.
    raw_join = emp.get("emp_join_date")
    # Set join_d variable to store join d value
    join_d = None
    # Evaluate condition to control execution branch
    if raw_join:
        # Evaluate condition to control execution branch
        if isinstance(raw_join, date):
            # Set join_d variable to store join d value
            join_d = raw_join
        # Evaluate alternate branch condition
        elif isinstance(raw_join, str):
            # Begin guarded execution block to trap exceptions
            try:
                # Take the first 10 letters (like 2026-03-15) and turn them into a date
                join_d = date.fromisoformat(raw_join[:10])
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

    # Read the last working day (if the person is leaving or has left)
    raw_exit = emp.get("emp_effective_to") or emp.get("job_effective_to")
    # Set exit_d variable to store exit d value
    exit_d = None
    # Evaluate condition to control execution branch
    if raw_exit:
        # Evaluate condition to control execution branch
        if isinstance(raw_exit, date):
            # Set exit_d variable to store exit d value
            exit_d = raw_exit
        # Evaluate alternate branch condition
        elif isinstance(raw_exit, str):
            # Begin guarded execution block to trap exceptions
            try:
                # Set exit_d variable to store exit d value
                exit_d = date.fromisoformat(raw_exit[:10])
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

    # Intern Conversion and Eligibility Tracking from preloaded map
    # Look up HR's decision about this intern (if any decision was saved)
    conv_map = preloaded.get("conv_map") or {}
    # Set conversion_record variable to store conversion record value
    conversion_record = conv_map.get(emp_code)

    # Set conversion_status variable to store conversion status value
    conversion_status = "N/A"
    # Set conversion_effective_date variable to store conversion effective date value
    conversion_effective_date = None
    # Set mid_month_conversion variable to store mid month conversion value
    mid_month_conversion = False

    # Only interns need this part (checking if they can become a regular employee)
    if is_intern:
        # How many months an intern must finish before becoming eligible (default 6)
        eligibility_months = int(settings.get("intern_eligibility_months") or 6)
        # Set months_completed variable to store months completed value
        months_completed = 0
        # Evaluate condition to control execution branch
        if join_d:
            # Count full months between joining date and the end of this salary month
            months_completed = (period_end.year - join_d.year) * 12 + (period_end.month - join_d.month)
            # If the month is not fully finished yet, take away one month
            if period_end.day < join_d.day:
                # Set months_completed variable to store months completed value
                months_completed = max(0, months_completed - 1)

        # If HR already made a decision, use it
        if conversion_record:
            # Set conv_decision variable to store conv decision value
            conv_decision = str(conversion_record.get("decision") or "Pending HR Review")
            # Set conv_eff variable to store conv eff value
            conv_eff = conversion_record.get("effective_employee_date")
            # Set conversion_status variable to store conversion status value
            conversion_status = conv_decision
            # Set conversion_effective_date variable to store conversion effective date value
            conversion_effective_date = conv_eff

            # Evaluate condition to control execution branch
            if conv_decision == "Converted" and conv_eff:
                # Evaluate condition to control execution branch
                if conv_eff <= period_start:
                    # Became employee before this month began, so treat as regular employee all month
                    worker_type = "Regular Employee"
                    # Set conversion_status variable to store conversion status value
                    conversion_status = "Converted to Employee"
                # Evaluate alternate branch condition
                elif period_start < conv_eff <= period_end:
                    # Became employee during this month
                    mid_month_conversion = True
                    # Set conversion_status variable to store conversion status value
                    conversion_status = f"Converted mid-month on {conv_eff.strftime('%d %b %Y')}"
            # Evaluate alternate branch condition
            elif conv_decision == "Extended":
                # HR extended the internship by some months
                ext_m = conversion_record.get("extension_months") or 0
                # Set conversion_status variable to store conversion status value
                conversion_status = f"Extended Internship (+{ext_m} months)"
        # Execute fallback branch when conditions are not met
        else:
            # No decision yet. Say whether the intern is ready for review or still working towards it.
            if months_completed >= eligibility_months:
                # Set conversion_status variable to store conversion status value
                conversion_status = "Eligible for Conversion (Pending HR Review)"
            # Execute fallback branch when conditions are not met
            else:
                # Set conversion_status variable to store conversion status value
                conversion_status = f"Active Intern ({months_completed}/{eligibility_months} mos)"

    # Compensation / Salary
    # Read the monthly salary and related choices for this employee
    gross_configured = float(emp.get("gross_salary") or 0.0)
    # Salary is "set up" only if it is more than zero
    salary_configured = (gross_configured > 0)
    # Government fee (PT) applies unless it was clearly switched off
    pt_applicable_val = bool(emp.get("pt_applicable") is not False and emp.get("pt_applicable_pm") is not False)
    # Set other_ded_val variable to store other ded val value
    other_ded_val = float(emp.get("other_deductions") or 0.0)

    # This list will collect "problems HR must look at"
    exceptions = []

    # Problem 1: no salary has been set up for this person
    if not salary_configured:
        # Catch and handle specific exception if raised
        exceptions.append({
            # Execute statement to process data and maintain state
            "type": "Salary Not Configured",
            # Execute statement to process data and maintain state
            "message": f"No active salary / stipend configuration found for {month} {year}.",
            # Execute statement to process data and maintain state
            "action": "Configure Salary"
        # Execute statement to process data and maintain state
        })

    # Problem 2: an intern has finished enough months and HR has not decided yet
    if is_intern and "Eligible for Conversion" in conversion_status:
        # Catch and handle specific exception if raised
        exceptions.append({
            # Execute statement to process data and maintain state
            "type": "Conversion Eligibility Reached",
            # Execute statement to process data and maintain state
            "message": f"Intern has completed {settings.get('intern_eligibility_months', 6)} months. Pending HR review.",
            # Execute statement to process data and maintain state
            "action": "Review Conversion"
        # Execute statement to process data and maintain state
        })

    # Attendance logs from preloaded map
    # Get this person's daily attendance (who came on which day)
    att_by_emp = preloaded.get("att_by_emp") or {}
    # Set att_map variable to store att map value
    att_map = att_by_emp.get(emp_code, {})

    # Approved & pending regularizations from preloaded map
    # "Regularization" = the person asks to fix a missed or wrong attendance entry
    regs_by_emp = preloaded.get("regs_by_emp") or {}
    # Set reg_rows variable to store reg rows value
    reg_rows = regs_by_emp.get(emp_code, [])

    approved_regs = set()  # dates where the fix request was approved
    has_pending_reg = False  # becomes True if some request is still waiting
    # Iterate through items in sequence loop
    for r in reg_rows:
        # Set ov variable to store ov value
        ov = str(r.get("overall_status") or r.get("status") or "").upper()
        # Evaluate condition to control execution branch
        if ov in ("APPROVED", "APPROVED_ADMIN", "APPROVED_MANAGER"):
            # Invoke approved_regs.add to perform operational action
            approved_regs.add(r.get("target_date"))
        # Evaluate alternate branch condition
        elif "PENDING" in ov:
            # Set has_pending_reg variable to store has pending reg value
            has_pending_reg = True

    # Problem 3: attendance fix requests are still waiting for a decision
    if has_pending_reg:
        # Catch and handle specific exception if raised
        exceptions.append({
            # Execute statement to process data and maintain state
            "type": "Unresolved Regularization",
            # Execute statement to process data and maintain state
            "message": "Employee has pending regularization request(s) for this month.",
            # Execute statement to process data and maintain state
            "action": "Review Regularization"
        # Execute statement to process data and maintain state
        })

    # Approved & pending leaves from preloaded map
    # Get this person's leave requests for the month
    leaves_by_emp = preloaded.get("leaves_by_emp") or {}
    # Set leave_rows variable to store leave rows value
    leave_rows = leaves_by_emp.get(emp_code, [])

    approved_leaves = {}  # date -> leave details, for approved leave days only
    # Set has_pending_leave variable to store has pending leave value
    has_pending_leave = False
    # Iterate through items in sequence loop
    for lr in leave_rows:
        # Set ov variable to store ov value
        ov = str(lr.get("overall_status") or lr.get("status") or "").upper()
        # Evaluate condition to control execution branch
        if ov in ("APPROVED", "APPROVED_ADMIN", "APPROVED_MANAGER"):
            # Only look at the part of the leave that falls inside this month
            st_d = max(period_start, lr.get("start_date"))
            # Set en_d variable to store en d value
            en_d = min(period_end, lr.get("end_date"))
            # Set curr variable to store curr value
            curr = st_d
            # Mark each leave day, one by one
            while curr <= en_d:
                # Execute statement to process data and maintain state
                approved_leaves[curr] = lr
                # Execute statement to process data and maintain state
                curr += timedelta(days=1)
        # Evaluate alternate branch condition
        elif "PENDING" in ov:
            # Set has_pending_leave variable to store has pending leave value
            has_pending_leave = True

    # Problem 4: leave requests are still waiting for a decision
    if has_pending_leave:
        # Catch and handle specific exception if raised
        exceptions.append({
            # Execute statement to process data and maintain state
            "type": "Unresolved Leave",
            # Execute statement to process data and maintain state
            "message": "Employee has pending leave application(s) for this month.",
            # Execute statement to process data and maintain state
            "action": "Review Leave"
        # Execute statement to process data and maintain state
        })

    # Organization calendar from preloaded map
    # The company calendar lists holidays and weekly off days
    org_cal = preloaded.get("org_cal") or {}

    # Daily Salary
    # One day's pay = monthly salary divided by the real number of days in the month
    daily_salary = round(gross_configured / cal_days, 4) if cal_days > 0 and gross_configured > 0 else 0.0


    # Iteration counters
    # These counters start at zero and go up as we look at each day
    eligible_days = 0  # days the person was actually part of the company
    # Set present_days variable to store present days value
    present_days = 0.0
    # Set half_days variable to store half days value
    half_days = 0.0
    # Set paid_leave_days variable to store paid leave days value
    paid_leave_days = 0.0
    # Set unpaid_leave_days variable to store unpaid leave days value
    unpaid_leave_days = 0.0
    # Set weekly_off_days variable to store weekly off days value
    weekly_off_days = 0.0
    # Set holiday_days variable to store holiday days value
    holiday_days = 0.0
    # Set absent_days variable to store absent days value
    absent_days = 0.0

    # Interns may get a small number of paid leave days (if the company allows it)
    intern_paid_leave_used = 0.0
    # Set intern_pl_enabled variable to store intern pl enabled value
    intern_pl_enabled = bool(settings.get("intern_paid_leave_enabled", False))
    # Set intern_pl_quota variable to store intern pl quota value
    intern_pl_quota = float(settings.get("intern_paid_leave_quota", 0.0))

    # ==============================================================================
    # STEP-BY-STEP CALENDAR DAY EVALUATION (Duplicate-Date Safe)
    # ==============================================================================
    # Loops through each day of the month (1 to cal_days) to determine payability:
    # 1. Filters out days before joining or after exit (proration).
    # 2. Applies prioritized business rules: Regularization > Approved Leave >
    #    Attendance Punch > Organization Holiday/Weekly Off > Weekend > Absent.
    # ==============================================================================
    today = date.today()
    # Go through each day of the month, from day 1 to the last day
    for d in range(1, cal_days + 1):
        # Set cur_date variable to store cur date value
        cur_date = date(year, month_num, d)

        # Skip days if employee had not yet joined the organization
        if join_d and cur_date < join_d:
            # Skip to next iteration of active loop
            continue

        # Skip days after employee's official last working exit date
        if exit_d and cur_date > exit_d:
            # Skip to next iteration of active loop
            continue

        # Day falls within active employment tenure
        eligible_days += 1

        # Priority 1: Approved Regularization (Supervisor approved missed punch -> Present = 1.0 paid day)
        # If the attendance fix was approved, count the day as a full working day
        if cur_date in approved_regs:
            # Execute statement to process data and maintain state
            present_days += 1.0
            # Skip to next iteration of active loop
            continue

        # Priority 2: Approved Leave (Check category to classify as Paid vs Unpaid Loss-of-Pay)
        # If the person was on approved leave, decide if that day is paid or unpaid
        if cur_date in approved_leaves:
            # Set l_info variable to store l info value
            l_info = approved_leaves[cur_date]
            # Set cat_name variable to store cat name value
            cat_name = str(l_info.get("category") or "").lower()

            # Evaluate condition to control execution branch
            if is_intern:
                # Interns receive paid leave only if quota is enabled and available
                if intern_pl_enabled and intern_paid_leave_used < intern_pl_quota:
                    # Execute statement to process data and maintain state
                    paid_leave_days += 1.0
                    # Execute statement to process data and maintain state
                    intern_paid_leave_used += 1.0
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    unpaid_leave_days += 1.0
            # Execute fallback branch when conditions are not met
            else:
                # Regular employees: check if leave is marked as Loss of Pay (LWP)
                if "unpaid" in cat_name or "lwp" in cat_name or "loss of pay" in cat_name:
                    # Execute statement to process data and maintain state
                    unpaid_leave_days += 1.0
                # Execute fallback branch when conditions are not met
                else:
                    # Execute statement to process data and maintain state
                    paid_leave_days += 1.0
            # Skip to next iteration of active loop
            continue

        # Priority 3: Actual Attendance Record from biometric / app punch logs
        # If there is an attendance entry for this day, use what it says
        if cur_date in att_map:
            # Set att variable to store att value
            att = att_map[cur_date]
            # Set st variable to store st value
            st = str(att.get("status") or "").strip()
            # Evaluate condition to control execution branch
            if st in ("Present", "Punched In"):
                # Execute statement to process data and maintain state
                present_days += 1.0
            # Evaluate alternate branch condition
            elif st == "Half Day":
                # Execute statement to process data and maintain state
                half_days += 1.0
            # Evaluate alternate branch condition
            elif st == "Absent":
                # Execute statement to process data and maintain state
                absent_days += 1.0
            # Evaluate alternate branch condition
            elif st == "Leave":
                # Execute statement to process data and maintain state
                unpaid_leave_days += 1.0
            # Execute fallback branch when conditions are not met
            else:
                # Anything unknown is treated as absent
                absent_days += 1.0
            # Skip to next iteration of active loop
            continue

        # Priority 4: Organization Calendar (Company declared gazetted holiday or weekly off)
        # If the company calendar marks this day, count it as a holiday or weekly off
        if cur_date in org_cal:
            # Set c_info variable to store c info value
            c_info = org_cal[cur_date]
            # Set c_status variable to store c status value
            c_status = str(c_info.get("status") or "").upper()
            # Evaluate condition to control execution branch
            if c_status == "HOLIDAY":
                # Execute statement to process data and maintain state
                holiday_days += 1.0
            # Evaluate alternate branch condition
            elif c_status == "WEEKLY_OFF":
                # Execute statement to process data and maintain state
                weekly_off_days += 1.0
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                weekly_off_days += 1.0
            # Skip to next iteration of active loop
            continue

        # Priority 5: Standard Weekend (Saturday & Sunday are paid weekly offs)
        # Saturday (5) and Sunday (6) are paid days off
        if cur_date.weekday() in (5, 6):
            # Execute statement to process data and maintain state
            weekly_off_days += 1.0
            # Skip to next iteration of active loop
            continue

        # Priority 6: Unmarked working date
        if cur_date <= today:
            # Past working day with no punch, leave, or holiday -> Absent
            absent_days += 1.0
        # Execute fallback branch when conditions are not met
        else:
            # Future working date in current ongoing month -> treated as scheduled work
            present_days += 1.0

    # ==============================================================================
    # PAYROLL DEDUCTION & EARNINGS FORMULAS
    # ==============================================================================
    # Paid Equivalent Days: sum of all payable days (Present + Half Days*0.5 + Leaves + Offs)
    # Total days the person gets paid for (a half day counts as half)
    paid_equivalent_days = present_days + (half_days * 0.5) + paid_leave_days + weekly_off_days + holiday_days
    
    # Loss of Pay (LOP) Days: Absent days + Unpaid Leave + unworked half day portions
    # Days the person is NOT paid for (absent + unpaid leave + the missing half of half-days)
    lop_days = absent_days + unpaid_leave_days + (half_days * 0.5)

    # Prorate for mid-month joinees or resignations
    # Days before joining or after leaving are also unpaid
    unearned_days = max(0, cal_days - eligible_days)
    # Set total_lop_effect variable to store total lop effect value
    total_lop_effect = lop_days + unearned_days

    # Financial deduction for unpaid days: Daily Salary * LOP Days
    # Money cut = one day's pay x number of unpaid days
    lop_deduction = round(daily_salary * total_lop_effect, 2)
    
    # Actual gross compensation earned after deducting unpaid days
    # Salary earned = full monthly salary minus the money cut
    gross_earned_salary = max(0.0, round(gross_configured - lop_deduction, 2))

    # Detailed Salary Components (Standard Indian Payroll Structure as configured in company sheet)
    # Fixed Structure: Basic + DA = 50%, HRA = 25%, Flexi Allowance = 25% (or configured in payroll_profile)
    # Read the saved salary parts (basic, house rent, special allowance)
    prof_basic = float(emp.get("basic_salary") or 0.0)
    # Set prof_hra variable to store prof hra value
    prof_hra = float(emp.get("hra") or 0.0)
    # Set prof_special variable to store prof special value
    prof_special = float(emp.get("special_allowance") or 0.0)

    # Evaluate condition to control execution branch
    if gross_configured > 0:
        # Evaluate condition to control execution branch
        if prof_basic > 0:
            # Use the parts that were saved for this employee
            fixed_basic = prof_basic
            # Set fixed_hra variable to store fixed hra value
            fixed_hra = prof_hra
            # Set fixed_flexi variable to store fixed flexi value
            fixed_flexi = prof_special if prof_special > 0 else max(0.0, round(gross_configured - fixed_basic - fixed_hra, 2))
        # Execute fallback branch when conditions are not met
        else:
            # Nothing saved, so split the salary as 50% basic, 25% house rent, rest flexible
            fixed_basic = round(gross_configured * 0.50, 2)
            # Set fixed_hra variable to store fixed hra value
            fixed_hra = round(gross_configured * 0.25, 2)
            # Set fixed_flexi variable to store fixed flexi value
            fixed_flexi = round(gross_configured - fixed_basic - fixed_hra, 2)
    # Execute fallback branch when conditions are not met
    else:
        # No salary at all, so all parts are zero
        fixed_basic = 0.0
        # Set fixed_hra variable to store fixed hra value
        fixed_hra = 0.0
        # Set fixed_flexi variable to store fixed flexi value
        fixed_flexi = 0.0

    # Set fixed_gross variable to store fixed gross value
    fixed_gross = gross_configured

    # Earned Salary Components (prorated by paid days / calendar days)
    # Each part is reduced in the same proportion as the paid days
    earned_ratio = (paid_equivalent_days / cal_days) if cal_days > 0 else 0.0
    # Set earn_basic variable to store earn basic value
    earn_basic = round(fixed_basic * earned_ratio, 2)
    # Set earn_hra variable to store earn hra value
    earn_hra = round(fixed_hra * earned_ratio, 2)
    # Set earn_flexi variable to store earn flexi value
    earn_flexi = round(fixed_flexi * earned_ratio, 2)
    earn_gross = gross_earned_salary  # exactly matches gross_configured - lop_deduction

    # Statutory & Configured Deductions: PF (Provident Fund)
    # Default company setting is pf_applicable = False (Current Company Configuration: ₹0.00 PF)
    # PF savings are cut only if BOTH the company and this employee have PF switched on
    company_pf_applicable = bool(settings.get("pf_applicable", False))
    # Set emp_pf_applicable variable to store emp pf applicable value
    emp_pf_applicable = bool(emp.get("pf_applicable", False)) if "pf_applicable" in emp else False
    
    # NEW WAGE RULE (50% rule):
    # Allowances (house rent + flexible allowance) can be at most half of the salary.
    # If they are more, the extra money is counted as wages when working out PF.
    # PF wages = Basic + (allowances - half of the salary), only if allowances are more than half.
    allowance_total = round(fixed_hra + fixed_flexi, 2)
    # Set allowance_limit variable to store allowance limit value
    allowance_limit = round(fixed_gross * 0.50, 2)
    # Set wage_excess variable to store wage excess value
    wage_excess = max(0.0, round(allowance_total - allowance_limit, 2))
    # Set statutory_fixed_wages variable to store statutory fixed wages value
    statutory_fixed_wages = round(fixed_basic + wage_excess, 2)
    # Like the other earned amounts, reduce it for unpaid days
    statutory_earned_wages = round(statutory_fixed_wages * earned_ratio, 2)

    # Set pf_wages variable to store pf wages value
    pf_wages = 0.00
    # Set pf_val variable to store pf val value
    pf_val = 0.00
    # Evaluate condition to control execution branch
    if company_pf_applicable and emp_pf_applicable and gross_configured > 0:
        # Set pf_basis variable to store pf basis value
        pf_basis = str(settings.get("pf_wages_basis", "Basic + DA"))
        # Set pf_pct variable to store pf pct value
        pf_pct = float(settings.get("pf_employee_percent", 12.00))
        # Set pf_ceiling variable to store pf ceiling value
        pf_ceiling = float(settings.get("pf_wage_ceiling", 25000.00))
        # Choose which amount PF is counted on: the new wages (basic + extra allowance money) or total earned pay
        base_wages = statutory_earned_wages if pf_basis == "Basic + DA" else earn_gross
        # PF is not counted on money above the ceiling limit
        pf_wages = round(min(base_wages, pf_ceiling) if pf_ceiling > 0 else base_wages, 2)
        # PF amount = percentage of that amount
        pf_val = round(pf_wages * (pf_pct / 100.0), 2)
    # Execute fallback branch when conditions are not met
    else:
        # PF is currently not applicable / disabled per company policy
        pf_wages = 0.00
        # Set pf_val variable to store pf val value
        pf_val = 0.00

    # Other possible cuts and additions (ESIC, TDS, LWF, arrears)
    esic_val = float(emp.get("esic_deduction") or emp.get("esic") or 0.0)
    # Set tds_val variable to store tds val value
    tds_val = float(emp.get("tds_deduction") or emp.get("tds") or 0.0)
    # Set lwf_val variable to store lwf val value
    lwf_val = float(emp.get("lwf_deduction") or emp.get("lwf") or 0.0)
    # Set arrears_val variable to store arrears val value
    arrears_val = float(emp.get("arrears") or 0.0)

    # Professional Tax (PT)
    # Government fee: cut only if the company has it on, the employee needs it, and salary exists
    pt_deduction = 0.00
    # Set pt_enabled variable to store pt enabled value
    pt_enabled = bool(settings.get("pt_enabled", True))
    # Evaluate condition to control execution branch
    if pt_enabled and pt_applicable_val and gross_configured > 0:
        # Set pt_amount_conf variable to store pt amount conf value
        pt_amount_conf = float(settings.get("pt_amount", 200.00))
        # Set pt_deduction variable to store pt deduction value
        pt_deduction = pt_amount_conf

    # Net Salary
    # Total of all cuts (fees, PF, ESIC, TDS, LWF, other)
    total_statutory_deductions = round(pt_deduction + pf_val + esic_val + tds_val + lwf_val + other_ded_val, 2)
    # Take-home = earned salary - all cuts + any extra money owed (arrears)
    net_salary = round(earn_gross - total_statutory_deductions + arrears_val, 2)
    # If take-home goes below zero, flag it as a problem and show zero (unless company allows minus)
    if net_salary < 0:
        # Check if target condition is false or object is missing
        if not bool(settings.get("allow_negative_salary", False)):
            # Catch and handle specific exception if raised
            exceptions.append({
                # Execute statement to process data and maintain state
                "type": "Negative Net Salary",
                # Execute statement to process data and maintain state
                "message": f"Deductions (₹{total_statutory_deductions:.2f}) exceed gross earnings (₹{earn_gross:.2f}).",
                # Execute statement to process data and maintain state
                "action": "Admin Review Required"
            # Execute statement to process data and maintain state
            })
            # Set net_salary variable to store net salary value
            net_salary = 0.00

    # Decide the overall label for this employee's salary record
    record_status = "Calculated"
    # Check if target condition is false or object is missing
    if not salary_configured:
        # Set record_status variable to store record status value
        record_status = "Salary Not Configured"
    # Evaluate alternate branch condition
    elif len(exceptions) > 0:
        # Set record_status variable to store record status value
        record_status = "Action Required"
    # Execute fallback branch when conditions are not met
    else:
        # Set record_status variable to store record status value
        record_status = "Payroll Ready"

    # Give back everything we worked out as one big packet.
    # Many values appear twice with two spellings because different screens and
    # other parts of the software ask for the same value using different names.
    return {
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "employeeId": emp_code,
        # Execute statement to process data and maintain state
        "employeeName": full_name,
        # Execute statement to process data and maintain state
        "name": full_name,
        # Execute statement to process data and maintain state
        "department": dept,
        # Execute statement to process data and maintain state
        "designation": desig,
        # Execute statement to process data and maintain state
        "workerType": worker_type,
        # Execute statement to process data and maintain state
        "worker_type": worker_type,
        # Execute statement to process data and maintain state
        "employmentStatus": emp_status_raw,
        # Execute statement to process data and maintain state
        "joiningDate": join_d.strftime("%d %b %Y") if join_d else "—",
        # Execute statement to process data and maintain state
        "joining_date": str(join_d or ""),
        # Execute statement to process data and maintain state
        "lastWorkingDate": exit_d.strftime("%d %b %Y") if exit_d else "—",
        # Execute statement to process data and maintain state
        "last_working_date": str(exit_d or ""),
        # Execute statement to process data and maintain state
        "conversionStatus": conversion_status,
        # Execute statement to process data and maintain state
        "conversion_status": conversion_status,
        # Execute statement to process data and maintain state
        "conversionDate": str(conversion_effective_date or ""),
        # Execute statement to process data and maintain state
        "monthlyCompensation": gross_configured,
        # Execute statement to process data and maintain state
        "monthlySalary": gross_configured,
        # Execute statement to process data and maintain state
        "gross_salary": gross_configured,
        # Execute statement to process data and maintain state
        "calendarDays": cal_days,
        # Execute statement to process data and maintain state
        "calendar_days": cal_days,
        # Execute statement to process data and maintain state
        "eligibleDays": eligible_days,
        # Execute statement to process data and maintain state
        "dailySalary": round(daily_salary, 2),
        # Execute statement to process data and maintain state
        "daily_salary": round(daily_salary, 2),
        # Execute statement to process data and maintain state
        "dailySalaryPrecise": daily_salary,
        # Execute statement to process data and maintain state
        "presentDays": present_days,
        # Execute statement to process data and maintain state
        "present_days": present_days,
        # Execute statement to process data and maintain state
        "halfDays": half_days,
        # Execute statement to process data and maintain state
        "half_days": half_days,
        # Execute statement to process data and maintain state
        "paidLeaveDays": paid_leave_days,
        # Execute statement to process data and maintain state
        "paid_leave": paid_leave_days,
        # Execute statement to process data and maintain state
        "unpaidLeaveDays": unpaid_leave_days,
        # Execute statement to process data and maintain state
        "unpaid_leave": unpaid_leave_days,
        # Execute statement to process data and maintain state
        "leaveTaken": round(paid_leave_days + unpaid_leave_days, 1),
        # Execute statement to process data and maintain state
        "weeklyOffDays": weekly_off_days,
        # Execute statement to process data and maintain state
        "weekly_off_days": weekly_off_days,
        # Execute statement to process data and maintain state
        "holidayDays": holiday_days,
        # Execute statement to process data and maintain state
        "holiday_days": holiday_days,
        # Execute statement to process data and maintain state
        "absentDays": absent_days,
        # Execute statement to process data and maintain state
        "absent_days": absent_days,
        # Execute statement to process data and maintain state
        "paidEquivalentDays": paid_equivalent_days,
        # Execute statement to process data and maintain state
        "paid_equivalent_days": paid_equivalent_days,
        # Execute statement to process data and maintain state
        "lopDays": lop_days,
        # Execute statement to process data and maintain state
        "lop_days": lop_days,
        # Execute statement to process data and maintain state
        "lopDeduction": lop_deduction,
        # Execute statement to process data and maintain state
        "lop_deduction": lop_deduction,
        # Execute statement to process data and maintain state
        "grossEarnedSalary": gross_earned_salary,
        # Execute statement to process data and maintain state
        "grossSalary": gross_earned_salary,
        # Execute statement to process data and maintain state
        "gross_earnings": gross_earned_salary,
        
        # Detailed Salary Breakdown (Company Spreadsheet Structure)
        "fixedGrossSalary": fixed_gross,
        # Execute statement to process data and maintain state
        "basicSalary": fixed_basic,
        # Execute statement to process data and maintain state
        "basic_salary": fixed_basic,
        # Execute statement to process data and maintain state
        "hra": fixed_hra,
        # Execute statement to process data and maintain state
        "flexiAllowance": fixed_flexi,
        # Execute statement to process data and maintain state
        "special_allowance": fixed_flexi,
        # Execute statement to process data and maintain state
        "earnBasic": earn_basic,
        # Execute statement to process data and maintain state
        "earn_basic": earn_basic,
        # Execute statement to process data and maintain state
        "earnHra": earn_hra,
        # Execute statement to process data and maintain state
        "earn_hra": earn_hra,
        # Execute statement to process data and maintain state
        "earnOtherAllo": earn_flexi,
        # Execute statement to process data and maintain state
        "earn_special_allowance": earn_flexi,
        # Execute statement to process data and maintain state
        "earnGross": earn_gross,
        # Execute statement to process data and maintain state
        "statutoryWages": statutory_earned_wages,
        # Execute statement to process data and maintain state
        "wageRuleExcess": wage_excess,
        
        # Deductions & Adjustments
        "pfWages": pf_wages,
        # Execute statement to process data and maintain state
        "pf_wages": pf_wages,
        # Execute statement to process data and maintain state
        "pfDeduction": pf_val,
        # Execute statement to process data and maintain state
        "pf_deduction": pf_val,
        # Execute statement to process data and maintain state
        "pfApplicable": company_pf_applicable and emp_pf_applicable,
        # Execute statement to process data and maintain state
        "pf_applicable": company_pf_applicable and emp_pf_applicable,
        # Execute statement to process data and maintain state
        "pfExplanation": "PF is currently not applicable according to company payroll configuration." if not (company_pf_applicable and emp_pf_applicable) else f"PF calculated at {settings.get('pf_employee_percent', 12)}% of PF wages (basic + allowances above half of the salary), up to the PF wage limit.",
        # Execute statement to process data and maintain state
        "esicDeduction": esic_val,
        # Execute statement to process data and maintain state
        "esic_deduction": esic_val,
        # Execute statement to process data and maintain state
        "ptApplicable": pt_applicable_val,
        # Execute statement to process data and maintain state
        "pt_applicable": pt_applicable_val,
        # Execute statement to process data and maintain state
        "ptDeducted": pt_deduction,
        # Execute statement to process data and maintain state
        "pt_deduction": pt_deduction,
        # Execute statement to process data and maintain state
        "lwfDeduction": lwf_val,
        # Execute statement to process data and maintain state
        "lwf_deduction": lwf_val,
        # Execute statement to process data and maintain state
        "tdsDeduction": tds_val,
        # Execute statement to process data and maintain state
        "tds_deduction": tds_val,
        # Execute statement to process data and maintain state
        "leaveDeduction": lop_deduction,
        # Execute statement to process data and maintain state
        "otherDeductions": other_ded_val,
        # Execute statement to process data and maintain state
        "other_deductions": other_ded_val,
        # Execute statement to process data and maintain state
        "arrears": arrears_val,
        
        # Execute statement to process data and maintain state
        "netSalary": net_salary,
        # Execute statement to process data and maintain state
        "salaryCredited": net_salary,
        # Execute statement to process data and maintain state
        "finalAmountCredited": net_salary,
        # Execute statement to process data and maintain state
        "status": record_status,
        # Execute statement to process data and maintain state
        "exceptions": exceptions,
        # Execute statement to process data and maintain state
        "hasExceptions": len(exceptions) > 0,
        # Execute statement to process data and maintain state
        "month": month,
        # Execute statement to process data and maintain state
        "year": year
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# COMPREHENSIVE MONTHLY PAYROLL ENGINE (get_all_payroll_records)
# ==============================================================================
# Master payroll calculation coordinator:
# 1. Resolves month, year, and exact calendar days (factoring leap years).
# 2. Joins employee profiles with configured compensation packages.
# 3. Batch preloads attendance punches, regularizations, leaves, and calendar data
#    to eliminate N+1 database queries.
# 4. Computes daily wages, LOP deductions, statutory taxes, and net salaries.
# 5. Persists calculated values into 'payroll_records' with UPSERT protection.
# 6. Aggregates company-wide KPI summaries (Gross Payroll, Total LOP, Net Pay).
#
# IN SIMPLE WORDS: this function works out the salary of EVERY employee for one
# month. It first collects all the information it needs in one go (so it is fast),
# then calculates each person's salary, saves it, applies any search/filter the
# screen asked for, and finally adds up company-wide totals for the dashboard.
# ==============================================================================
def get_all_payroll_records(
    # Define db schema field with type Session,
    db: Session,
    # Define search schema field with type str and default value
    search: str = "",
    # Define month schema field with type str and default value
    month: str = "",
    # Define year schema field with type str and default value
    year: str = "",
    # Define department schema field with type str and default value
    department: str = "",
    # Define status schema field with type str and default value
    status: str = "",
    # Define worker_type schema field with type str and default value
    worker_type: str = "",
    # Define has_exceptions schema field with type str and default value
    has_exceptions: str = "",
    # Define force_recalculate schema field with type bool and default value
    force_recalculate: bool = False
# Execute statement to process data and maintain state
) -> dict:
    """
    Comprehensive dynamic monthly payroll engine:
    - Calculates calendar days dynamically (Leap year logic verified)
    - Integrates attendance, regularizations, leaves, holidays
    - Identifies exceptions (missing salary, negative salary, unresolved items)
    - Computes dynamic KPIs for dashboard
    - Reconciles totals: Gross - LOP - PT - Other Deductions = Net Payroll
    """
    # Ensure database tables exist
    init_payslips_table(db)

    # Step 1: Parse and validate target payroll month and year
    # If no valid month/year was asked for, use the current month and year
    now = datetime.now()
    # Set month_str variable to store month str value
    month_str = str(month).strip() if month is not None else ""
    # Set sel_month variable to store sel month value
    sel_month = month_str if month_str in MONTH_NAMES else MONTH_NAMES[now.month - 1]
    # Set sel_year variable to store sel year value
    sel_year = int(year) if year and str(year).isdigit() else now.year
    
    # Calculate exact calendar days for this specific month (e.g. 28, 29, 30, or 31)
    cal_days = get_days_in_month(sel_month, sel_year)
    # Set m_idx variable to store m idx value
    m_idx = get_month_index(sel_month)
    # First day and last day of this salary month
    period_start = date(sel_year, m_idx, 1)
    # Set period_end variable to store period end value
    period_end = date(sel_year, m_idx, cal_days)

    # Step 2: Retrieve global company payroll rules (PT slab, PF rates, intern quotas)
    settings = get_payroll_settings(db)
    
    # Step 3: Fetch or initialize the master PayrollRun record for this month
    # Open (or create) this month's salary file and see if it is locked ("Finalized") or still open ("Draft")
    run = get_or_create_payroll_run(db, sel_month, sel_year)
    # Set run_status variable to store run status value
    run_status = run.get("status") or "Draft"

    # Step 4: Query all employees in profile_master joined with their compensation package
    # Get every employee together with their saved salary details
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
    # Set emp_rows variable to store emp rows value
    emp_rows = db.execute(query).mappings().all()

    # Preload existing payslips to know if payslip was generated/finalized
    # Find which employees already have a payslip for this month
    ps_rows = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payslips WHERE month = :m AND year = :y"),
        # Execute statement to process data and maintain state
        {"m": sel_month, "y": sel_year}
    # Execute statement to process data and maintain state
    ).mappings().all()
    # Set ps_map variable to store ps map value
    ps_map = {r["emp_code"]: r for r in ps_rows}

    # Preload persisted payroll_records — only needed when the month is already locked
    # Loading these saved results for every call wastes time when the month is still open.
    # We only read them when the month is "Finalized" and we are not being asked to recalculate.
    rec_map = {}
    # Check if target condition is false or object is missing
    if run_status == "Finalized" and not force_recalculate:
        # Set rec_rows variable to store rec rows value
        rec_rows = db.execute(
            # Invoke text to perform operational action
            text("SELECT * FROM payroll_records WHERE month = :m AND year = :y"),
            # Execute statement to process data and maintain state
            {"m": sel_month, "y": sel_year}
        # Execute statement to process data and maintain state
        ).mappings().all()
        # Set rec_map variable to store rec map value
        rec_map = {r["emp_code"]: r for r in rec_rows}

    # Preload attendance if table exists (avoids aborted transaction in PostgreSQL)
    # Attendance is kept in a separate table for each month. Its name looks like attendance_2026_03.
    att_table = f"attendance_{sel_year}_{m_idx:02d}"
    # Set att_by_emp variable to store att by emp value
    att_by_emp = {}
    # Set table_exists variable to store table exists value
    table_exists = False
    # Begin guarded execution block to trap exceptions
    try:
        # First check that this month's attendance table really exists
        table_exists = bool(db.execute(
            # Invoke text to perform operational action
            text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"),
            # Execute statement to process data and maintain state
            {"t": att_table}
        # Execute statement to process data and maintain state
        ).scalar())
    # Catch and handle specific exception if raised
    except Exception:
        # Set table_exists variable to store table exists value
        table_exists = False

    # Only read attendance if the table is there
    if table_exists:
        # Begin guarded execution block to trap exceptions
        try:
            # Set ar_rows variable to store ar rows value
            ar_rows = db.execute(text(f"""
                SELECT emp_code, date, status, hours_completed, punch_in_time, punch_out_time
                FROM {att_table}
            """)).mappings().all()
            # Sort the attendance like a filing cabinet: employee -> date -> entry
            for ar in ar_rows:
                # Set ec variable to store ec value
                ec = str(ar.get("emp_code") or "").strip()
                # Set d_val variable to store d val value
                d_val = ar.get("date")
                # Evaluate condition to control execution branch
                if ec and d_val:
                    # Check if target condition is false or object is missing
                    if ec not in att_by_emp:
                        # Execute statement to process data and maintain state
                        att_by_emp[ec] = {}
                    # Execute statement to process data and maintain state
                    att_by_emp[ec][d_val] = ar
        # Catch and handle specific exception if raised
        except Exception as e:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Error reading {att_table}: {e}")

    # Preload regularizations
    # Collect all attendance-fix requests that fall in this month, grouped by employee
    regs_by_emp = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set reg_rows variable to store reg rows value
        reg_rows = db.execute(text("""
            SELECT emp_code, target_date, status, overall_status
            FROM regularizations
            WHERE target_date >= :s AND target_date <= :e
        """), {"s": period_start, "e": period_end}).mappings().all()
        # Iterate through items in sequence loop
        for r in reg_rows:
            # Set ec variable to store ec value
            ec = str(r.get("emp_code") or "").strip()
            # Check if target condition is false or object is missing
            if ec not in regs_by_emp:
                # Execute statement to process data and maintain state
                regs_by_emp[ec] = []
            # Execute statement to process data and maintain state
            regs_by_emp[ec].append(r)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Error reading regularizations: {e}")

    # Preload leaves
    # Collect all leave requests that touch this month, grouped by employee
    leaves_by_emp = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set leave_rows variable to store leave rows value
        leave_rows = db.execute(text("""
            SELECT emp_code, category, start_date, end_date, total_days, status, overall_status, has_half_days
            FROM leave_requests
            WHERE start_date <= :e AND end_date >= :s
        """), {"s": period_start, "e": period_end}).mappings().all()
        # Iterate through items in sequence loop
        for lr in leave_rows:
            # Set ec variable to store ec value
            ec = str(lr.get("emp_code") or "").strip()
            # Check if target condition is false or object is missing
            if ec not in leaves_by_emp:
                # Execute statement to process data and maintain state
                leaves_by_emp[ec] = []
            # Execute statement to process data and maintain state
            leaves_by_emp[ec].append(lr)
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Error reading leave_requests: {e}")

    # Preload organization calendar
    # Collect the company's holidays and weekly offs for this month
    org_cal = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set cal_rows variable to store cal rows value
        cal_rows = db.execute(text("""
            SELECT date, status, holiday_name
            FROM organization_calendar
            WHERE date >= :s AND date <= :e
        """), {"s": period_start, "e": period_end}).mappings().all()
        # Set org_cal variable to store org cal value
        org_cal = {cr.get("date"): cr for cr in cal_rows}
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Error reading organization_calendar: {e}")

    # Preload intern conversions
    # Collect HR's saved decisions about interns
    conv_map = {}
    # Begin guarded execution block to trap exceptions
    try:
        # Set conv_rows variable to store conv rows value
        conv_rows = db.execute(text("SELECT * FROM intern_conversion_records ORDER BY id ASC")).mappings().all()
        # Set conv_map variable to store conv map value
        conv_map = {r["emp_code"]: r for r in conv_rows}
    # Catch and handle specific exception if raised
    except Exception as e:
        # Log warning message for non-fatal unexpected condition
        logger.warning(f"Error reading intern_conversion_records: {e}")

    # Put all the collected information into one bundle to hand to the salary calculator
    preloaded = {
        # Execute statement to process data and maintain state
        "att_by_emp": att_by_emp,
        # Execute statement to process data and maintain state
        "regs_by_emp": regs_by_emp,
        # Execute statement to process data and maintain state
        "leaves_by_emp": leaves_by_emp,
        # Execute statement to process data and maintain state
        "org_cal": org_cal,
        # Execute statement to process data and maintain state
        "conv_map": conv_map
    # Execute statement to process data and maintain state
    }

    # This list will hold one result per employee
    records = []
    # This list collects the data to save for each employee so we can
    # send it all to the database in one go instead of one by one.
    rows_to_save = []

    # Go through the employees one by one
    for er in emp_rows:
        # Set emp_code variable to store emp code value
        emp_code = str(er.get("emp_code") or "").strip()
        # Skip any line that has no employee code
        if not emp_code:
            # Skip to next iteration of active loop
            continue

        # If run is Finalized and not forced, reuse persisted record if available
        # If this month is already locked, do NOT calculate again. Just use the saved result.
        if run_status == "Finalized" and not force_recalculate and emp_code in rec_map:
            # Set pr variable to store pr value
            pr = rec_map[emp_code]
            # Set exc_list variable to store exc list value
            exc_list = []
            # The saved "problems" are stored as text, so turn them back into a list
            if pr.get("exceptions"):
                # Begin guarded execution block to trap exceptions
                try:
                    # Set exc_list variable to store exc list value
                    exc_list = json.loads(pr.get("exceptions"))
                # Catch and handle specific exception if raised
                except Exception:
                    # Set exc_list variable to store exc list value
                    exc_list = [{"type": "Exception", "message": pr.get("exceptions"), "action": "Review"}]

            # Build the employee's result from the saved values
            item = {
                # Execute statement to process data and maintain state
                "id": f"rec-{emp_code}-{sel_month}-{sel_year}",
                # Execute statement to process data and maintain state
                "employeeId": emp_code,
                # Execute statement to process data and maintain state
                "emp_code": emp_code,
                # Execute statement to process data and maintain state
                "employeeName": pr.get("employee_name") or emp_code,
                # Execute statement to process data and maintain state
                "name": pr.get("employee_name") or emp_code,
                # Execute statement to process data and maintain state
                "department": pr.get("department") or "Operations",
                # Execute statement to process data and maintain state
                "designation": pr.get("designation") or "Employee",
                # Execute statement to process data and maintain state
                "workerType": pr.get("worker_type") or "Regular Employee",
                # Execute statement to process data and maintain state
                "worker_type": pr.get("worker_type") or "Regular Employee",
                # Execute statement to process data and maintain state
                "employmentStatus": pr.get("employment_status") or "Active",
                # Execute statement to process data and maintain state
                "joiningDate": str(pr.get("joining_date") or "—"),
                # Execute statement to process data and maintain state
                "conversionStatus": pr.get("conversion_status") or "N/A",
                # Execute statement to process data and maintain state
                "monthlyCompensation": float(pr.get("monthly_compensation") or 0.0),
                # Execute statement to process data and maintain state
                "monthlySalary": float(pr.get("monthly_compensation") or 0.0),
                # Execute statement to process data and maintain state
                "calendarDays": pr.get("calendar_days") or cal_days,
                # Execute statement to process data and maintain state
                "eligibleDays": pr.get("eligible_days") or cal_days,
                # Execute statement to process data and maintain state
                "dailySalary": float(pr.get("daily_salary") or 0.0),
                # Execute statement to process data and maintain state
                "presentDays": float(pr.get("present_days") or 0.0),
                # Execute statement to process data and maintain state
                "halfDays": float(pr.get("half_days") or 0.0),
                # Execute statement to process data and maintain state
                "paidLeaveDays": float(pr.get("paid_leave_days") or 0.0),
                # Execute statement to process data and maintain state
                "unpaidLeaveDays": float(pr.get("unpaid_leave_days") or 0.0),
                # Execute statement to process data and maintain state
                "weeklyOffDays": float(pr.get("weekly_off_days") or 0.0),
                # Execute statement to process data and maintain state
                "holidayDays": float(pr.get("holiday_days") or 0.0),
                # Execute statement to process data and maintain state
                "absentDays": float(pr.get("absent_days") or 0.0),
                # Execute statement to process data and maintain state
                "paidEquivalentDays": float(pr.get("paid_equivalent_days") or 0.0),
                # Execute statement to process data and maintain state
                "lopDays": float(pr.get("lop_days") or 0.0),
                # Execute statement to process data and maintain state
                "lopDeduction": float(pr.get("lop_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "grossEarnedSalary": float(pr.get("gross_earned_salary") or 0.0),
                # Execute statement to process data and maintain state
                "grossSalary": float(pr.get("gross_earned_salary") or 0.0),
                # Detailed Breakdown
                "fixedGrossSalary": float(pr.get("monthly_compensation") or 0.0),
                # Execute statement to process data and maintain state
                "basicSalary": float(pr.get("basic_salary") or 0.0),
                # Execute statement to process data and maintain state
                "hra": float(pr.get("hra") or 0.0),
                # Execute statement to process data and maintain state
                "flexiAllowance": float(pr.get("special_allowance") or 0.0),
                # Execute statement to process data and maintain state
                "earnBasic": float(pr.get("earn_basic") or 0.0),
                # Execute statement to process data and maintain state
                "earnHra": float(pr.get("earn_hra") or 0.0),
                # Execute statement to process data and maintain state
                "earnOtherAllo": float(pr.get("earn_special_allowance") or 0.0),
                # Execute statement to process data and maintain state
                "earnGross": float(pr.get("gross_earned_salary") or 0.0),
                # Execute statement to process data and maintain state
                "pfWages": float(pr.get("basic_salary") or 0.0) if float(pr.get("pf_deduction") or 0.0) > 0 else 0.0,
                # Execute statement to process data and maintain state
                "pfDeduction": float(pr.get("pf_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "esicDeduction": float(pr.get("esic_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "tdsDeduction": float(pr.get("tds_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "lwfDeduction": float(pr.get("lwf_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "leaveDeduction": float(pr.get("lop_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "leaveTaken": float((pr.get("paid_leave_days") or 0) + (pr.get("unpaid_leave_days") or 0)),
                # Execute statement to process data and maintain state
                "arrears": float(pr.get("arrears") or 0.0),

                # Execute statement to process data and maintain state
                "ptDeducted": float(pr.get("pt_deduction") or 0.0),
                # Execute statement to process data and maintain state
                "otherDeductions": float(pr.get("other_deductions") or 0.0),
                # Execute statement to process data and maintain state
                "netSalary": float(pr.get("net_salary") or 0.0),
                # Execute statement to process data and maintain state
                "salaryCredited": float(pr.get("net_salary") or 0.0),
                # Execute statement to process data and maintain state
                "finalAmountCredited": float(pr.get("net_salary") or 0.0),
                # Execute statement to process data and maintain state
                "status": pr.get("status") or "Finalized",
                # Execute statement to process data and maintain state
                "exceptions": exc_list,
                # Execute statement to process data and maintain state
                "hasExceptions": len(exc_list) > 0,
                # Execute statement to process data and maintain state
                "payslipGenerated": (emp_code in ps_map),
                # Execute statement to process data and maintain state
                "payslipId": ps_map[emp_code]["id"] if emp_code in ps_map else None,
                # Execute statement to process data and maintain state
                "month": sel_month,
                # Execute statement to process data and maintain state
                "year": sel_year
            # Execute statement to process data and maintain state
            }
        # Execute fallback branch when conditions are not met
        else:
            # The month is still open, so work out this employee's salary fresh
            calc_item = calculate_employee_payroll_data(
                # Set db variable to store db value
                db=db,
                # Set emp variable to store emp value
                emp=dict(er),
                # Set settings variable to store settings value
                settings=settings,
                # Set month variable to store month value
                month=sel_month,
                # Set year variable to store year value
                year=sel_year,
                # Set cal_days variable to store cal days value
                cal_days=cal_days,
                # Set month_num variable to store month num value
                month_num=m_idx,
                # Set period_start variable to store period start value
                period_start=period_start,
                # Set period_end variable to store period end value
                period_end=period_end,
                # Set preloaded variable to store preloaded value
                preloaded=preloaded
            # Execute statement to process data and maintain state
            )

            # Collect this employee's data so it can be saved in one batch after the loop
            # Turn the list of problems into text so it can be saved
            exc_json = json.dumps(calc_item["exceptions"]) if calc_item["exceptions"] else None

            # Add this employee's row to the batch list instead of hitting the database now.
            # This means we make one database call for all employees instead of one per employee.
            rows_to_save.append({
                # Execute statement to process data and maintain state
                "m": sel_month,
                # Execute statement to process data and maintain state
                "y": sel_year,
                # Execute statement to process data and maintain state
                "ec": emp_code,
                # Execute statement to process data and maintain state
                "en": calc_item["employeeName"],
                # Execute statement to process data and maintain state
                "dept": calc_item["department"],
                # Execute statement to process data and maintain state
                "desig": calc_item["designation"],
                # Execute statement to process data and maintain state
                "wt": calc_item["workerType"],
                # Execute statement to process data and maintain state
                "es": calc_item["employmentStatus"],
                # Execute statement to process data and maintain state
                "jd": er.get("emp_join_date"),
                # Execute statement to process data and maintain state
                "cs": calc_item["conversionStatus"],
                # Execute statement to process data and maintain state
                "mc": calc_item["monthlyCompensation"],
                # Execute statement to process data and maintain state
                "cd": cal_days,
                # Execute statement to process data and maintain state
                "ed": calc_item["eligibleDays"],
                # Execute statement to process data and maintain state
                "ds": calc_item["dailySalary"],
                # Execute statement to process data and maintain state
                "pd": calc_item["presentDays"],
                # Execute statement to process data and maintain state
                "hd": calc_item["halfDays"],
                # Execute statement to process data and maintain state
                "pld": calc_item["paidLeaveDays"],
                # Execute statement to process data and maintain state
                "upld": calc_item["unpaidLeaveDays"],
                # Execute statement to process data and maintain state
                "wod": calc_item["weeklyOffDays"],
                # Execute statement to process data and maintain state
                "hold": calc_item["holidayDays"],
                # Execute statement to process data and maintain state
                "ad": calc_item["absentDays"],
                # Execute statement to process data and maintain state
                "ped": calc_item["paidEquivalentDays"],
                # Execute statement to process data and maintain state
                "ld": calc_item["lopDays"],
                # Execute statement to process data and maintain state
                "lded": calc_item["lopDeduction"],
                # Execute statement to process data and maintain state
                "ges": calc_item["grossEarnedSalary"],
                # Execute statement to process data and maintain state
                "bs": calc_item["basicSalary"],
                # Execute statement to process data and maintain state
                "hra": calc_item["hra"],
                # Execute statement to process data and maintain state
                "sa": calc_item["flexiAllowance"],
                # Execute statement to process data and maintain state
                "eb": calc_item["earnBasic"],
                # Execute statement to process data and maintain state
                "ehra": calc_item["earnHra"],
                # Execute statement to process data and maintain state
                "esa": calc_item["earnOtherAllo"],
                # Execute statement to process data and maintain state
                "pfa": calc_item["pfApplicable"],
                # Execute statement to process data and maintain state
                "pfw": calc_item["pfWages"],
                # Execute statement to process data and maintain state
                "pf": calc_item["pfDeduction"],
                # Execute statement to process data and maintain state
                "esic": calc_item["esicDeduction"],
                # Execute statement to process data and maintain state
                "tds": calc_item["tdsDeduction"],
                # Execute statement to process data and maintain state
                "lwf": calc_item["lwfDeduction"],
                # Execute statement to process data and maintain state
                "arr": calc_item["arrears"],
                # Execute statement to process data and maintain state
                "pta": calc_item["ptApplicable"],
                # Execute statement to process data and maintain state
                "ptd": calc_item["ptDeducted"],
                # Execute statement to process data and maintain state
                "od": calc_item["otherDeductions"],
                # Execute statement to process data and maintain state
                "ns": calc_item["netSalary"],
                # Execute statement to process data and maintain state
                "st": calc_item["status"],
                # Execute statement to process data and maintain state
                "exc": exc_json
            # Execute statement to process data and maintain state
            })

            # Add a record id and payslip information to the result
            calc_item["id"] = f"rec-{emp_code}-{sel_month}-{sel_year}"
            # Execute statement to process data and maintain state
            calc_item["payslipGenerated"] = (emp_code in ps_map)
            # Execute statement to process data and maintain state
            calc_item["payslipId"] = ps_map[emp_code]["id"] if emp_code in ps_map else None
            # Set item variable to store item value
            item = calc_item

        # Add this employee's result to the list
        records.append(item)

    # Now save all employees' salary data to the database in a single call.
    # One trip to the database is much faster than one trip per employee.
    if rows_to_save:
        # Execute statement to process data and maintain state
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
        """), rows_to_save)

    # Make all the saved salary results permanent (one commit for everything)
    db.commit()

    # Apply Filters for search, dept, status, worker_type, has_exceptions
    # Keep only the employees that match what the screen asked for (search box, department, etc.)
    filtered_records = []
    # Iterate through items in sequence loop
    for r in records:
        # Search box: match on name, employee code or department
        if search:
            # Set st variable to store st value
            st = search.strip().lower()
            # Check if target condition is false or object is missing
            if st not in r["employeeName"].lower() and st not in r["employeeId"].lower() and st not in r["department"].lower():
                # Skip to next iteration of active loop
                continue

        # Department filter
        if department and department.strip() and department.strip() != "—" and department.strip() != "All":
            # Evaluate condition to control execution branch
            if r["department"].lower() != department.strip().lower():
                # Skip to next iteration of active loop
                continue

        # Intern / regular employee filter
        if worker_type and worker_type.strip() and worker_type.strip() != "All":
            # Evaluate condition to control execution branch
            if r["workerType"].lower() != worker_type.strip().lower():
                # Skip to next iteration of active loop
                continue

        # Status filter
        if status and status.strip() and status.strip() != "All":
            # Set st_filter variable to store st filter value
            st_filter = status.strip().lower()
            # Check if target condition is false or object is missing
            if st_filter not in r["status"].lower():
                # Skip to next iteration of active loop
                continue

        # "Show only people with problems" / "only people without problems" filter
        if has_exceptions:
            # Check if target condition is false or object is missing
            if has_exceptions.lower() in ("true", "1", "yes") and not r["hasExceptions"]:
                # Skip to next iteration of active loop
                continue
            # Evaluate alternate branch condition
            elif has_exceptions.lower() in ("false", "0", "no") and r["hasExceptions"]:
                # Skip to next iteration of active loop
                continue

        # Invoke filtered_records.append to perform operational action
        filtered_records.append(r)

    # Compute Aggregate KPIs
    # Add up company-wide totals (these use ALL employees, not only the filtered ones)
    total_emps = sum(1 for r in records if r["workerType"] == "Regular Employee")
    # Set total_interns variable to store total interns value
    total_interns = sum(1 for r in records if r["workerType"] == "Intern")
    # Set payroll_recs variable to store payroll recs value
    payroll_recs = len(records)
    total_gross = round(sum(r["monthlyCompensation"] for r in records), 2)  # full salaries before cuts
    total_lop = round(sum(r["lopDeduction"] for r in records), 2)  # money cut for unpaid days
    gross_earned = round(sum(r["grossEarnedSalary"] for r in records), 2)  # salaries actually earned
    total_pt = round(sum(r["ptDeducted"] for r in records), 2)  # total government fee
    # Set total_other_ded variable to store total other ded value
    total_other_ded = round(sum(r["otherDeductions"] for r in records), 2)
    # Set total_ded variable to store total ded value
    total_ded = round(total_pt + total_other_ded, 2)
    total_net = round(sum(r["netSalary"] for r in records), 2)  # total take-home money
    exception_cnt = sum(1 for r in records if r["hasExceptions"])  # how many people have problems

    # Update payroll_runs summary
    # Save these company totals on the month's salary file
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
        # Execute statement to process data and maintain state
        "te": total_emps,
        # Execute statement to process data and maintain state
        "ti": total_interns,
        # Execute statement to process data and maintain state
        "tg": gross_earned,
        # Execute statement to process data and maintain state
        "tl": total_lop,
        # Execute statement to process data and maintain state
        "tpt": total_pt,
        # Execute statement to process data and maintain state
        "tod": total_other_ded,
        # Execute statement to process data and maintain state
        "tn": total_net,
        # Execute statement to process data and maintain state
        "texc": exception_cnt,
        # Execute statement to process data and maintain state
        "m": sel_month,
        # Execute statement to process data and maintain state
        "y": sel_year
    # Execute statement to process data and maintain state
    })
    # Commit transaction to persist changes in database
    db.commit()

    # Read the month's salary file again so we return the latest version
    run_updated = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payroll_runs WHERE month = :m AND year = :y"),
        # Execute statement to process data and maintain state
        {"m": sel_month, "y": sel_year}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Give back everything the screen needs: the list, the totals, the month's file and the rules.
    # The same list is given under three names (records, items, data) because different screens use different names.
    return {
        # Execute statement to process data and maintain state
        "records": filtered_records,
        # Execute statement to process data and maintain state
        "items": filtered_records,
        # Execute statement to process data and maintain state
        "data": filtered_records,
        # Execute statement to process data and maintain state
        "summary": {
            # Execute statement to process data and maintain state
            "totalEmployees": total_emps,
            # Execute statement to process data and maintain state
            "totalInterns": total_interns,
            # Execute statement to process data and maintain state
            "payrollRecords": payroll_recs,
            # Execute statement to process data and maintain state
            "grossPayroll": gross_earned,
            # Execute statement to process data and maintain state
            "grossConfigured": total_gross,
            # Execute statement to process data and maintain state
            "totalLop": total_lop,
            # Execute statement to process data and maintain state
            "totalPt": total_pt,
            # Execute statement to process data and maintain state
            "totalOtherDeductions": total_other_ded,
            # Execute statement to process data and maintain state
            "totalDeductions": total_ded,
            # Execute statement to process data and maintain state
            "netPayroll": total_net,
            # Execute statement to process data and maintain state
            "payrollExceptions": exception_cnt,
            # Execute statement to process data and maintain state
            "calendarDays": cal_days,
            # Execute statement to process data and maintain state
            "month": sel_month,
            # Execute statement to process data and maintain state
            "year": sel_year,
            # Execute statement to process data and maintain state
            "status": run_updated.get("status") if run_updated else "Draft",
            # "Reconciled" = the numbers add up correctly (earned - cuts = take-home, within 5 paise)
            "isReconciled": abs((gross_earned - total_ded) - total_net) < 0.05
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "run": dict(run_updated) if run_updated else {
            # Execute statement to process data and maintain state
            "month": sel_month, "year": sel_year, "status": "Draft", "calendar_days": cal_days
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "settings": settings
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# PAYROLL FINALIZATION & PAYSLIP SYNCHRONIZATION
# ==============================================================================
# Locks in the monthly payroll run:
# 1. Guards against unhandled exceptions (unpaid salaries, unapproved leaves).
# 2. Marks the status in 'payroll_runs' and 'payroll_records' as 'Finalized'.
# 3. Synchronizes finalized pay data directly into the 'payslips' table so employees
#    can view and download their official payslips from their mobile app and web portal.
#
# IN SIMPLE WORDS: when HR is happy with the month's salaries, this function
# "locks" the month so numbers cannot change by mistake, and creates the payslip
# for every employee so they can see it in the app.
# ==============================================================================
def finalize_monthly_payroll(
    # Define db schema field with type Session,
    db: Session,
    # Define month schema field with type str,
    month: str,
    # Define year schema field with type int,
    year: int,
    # Define user_name schema field with type str and default value
    user_name: str = "Admin",
    # Define allow_with_exceptions schema field with type bool and default value
    allow_with_exceptions: bool = False
# Execute statement to process data and maintain state
) -> dict:
    """
    Finalizes the monthly payroll:
    - Validates no blocking exceptions exist (unless authorized override)
    - Sets payroll run status to 'Finalized'
    - Synchronizes finalized payslips into `payslips` table so Employee Portal reflects them immediately.
    """
    # Ensure tables exist
    init_payslips_table(db)
    
    # Calculate current state of payroll for the month
    # Work out the latest salary numbers for the month
    payroll_data = get_all_payroll_records(db, month=month, year=str(year), force_recalculate=False)
    # Set summary variable to store summary value
    summary = payroll_data["summary"]
    # Set records variable to store records value
    records = payroll_data["records"]
    # Set settings variable to store settings value
    settings = payroll_data["settings"]

    # Block finalization if unresolved payroll exceptions exist without explicit override
    # If some people still have problems, stop here (unless the admin says "go ahead anyway")
    if summary["payrollExceptions"] > 0 and not allow_with_exceptions:
        # Raise exception to abort current operation with error
        raise ValueError(
            # Execute statement to process data and maintain state
            f"Cannot finalize payroll: {summary['payrollExceptions']} unresolved exceptions exist. "
            "Resolve exceptions or provide admin override."
        # Execute statement to process data and maintain state
        )

    # Step 1: Update master payroll run status to 'Finalized' and record timestamp & admin user
    # Mark the month as locked, and write down who locked it and when
    db.execute(text("""
        UPDATE payroll_runs
        SET status = 'Finalized',
            finalized_at = CURRENT_TIMESTAMP,
            finalized_by = :u,
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"u": user_name, "m": month, "y": year})

    # Step 2: Mark all employee records for this month as 'Finalized'
    # Mark every employee's salary line of this month as locked too
    db.execute(text("""
        UPDATE payroll_records
        SET status = 'Finalized',
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"m": month, "y": year})

    # Step 3: Synchronize each employee's salary record into the employee-facing 'payslips' table
    m_idx = get_month_index(month)
    # Indian financial year: April to March (e.g. 2026-2027)
    # From April onwards the money year is "this year - next year", before April it is "last year - this year"
    fin_year = f"{year}-{year + 1}" if m_idx >= 4 else f"{year - 1}-{year}"
    # Set cal_days variable to store cal days value
    cal_days = summary["calendarDays"]

    # Collect payslip rows to save in one batch instead of one by one
    payslip_rows_to_save = []
    # Create a payslip for each employee
    for r in records:
        # Set emp_code variable to store emp code value
        emp_code = r["employeeId"]
        # Set net_sal variable to store net sal value
        net_sal = float(r["netSalary"] or 0.0)
        # Set gross_earn variable to store gross earn value
        gross_earn = float(r["grossEarnedSalary"] or 0.0)
        
        # Skip employees without active gross earnings
        # No earnings means no payslip, so move on to the next person
        if gross_earn <= 0:
            # Skip to next iteration of active loop
            continue

        # Use the SAME salary parts and cuts that the payroll screen already worked out,
        # so the payslip always agrees with the payroll screen.
        basic = float(r.get("earnBasic") or 0.0)
        # Set hra variable to store hra value
        hra = float(r.get("earnHra") or 0.0)
        # Set special variable to store special value
        special = float(r.get("earnOtherAllo") or 0.0)
        # Set pt_val variable to store pt val value
        pt_val = float(r["ptDeducted"] or 0.0)
        # Set other_val variable to store other val value
        other_val = float(r["otherDeductions"] or 0.0)
        # Set pf variable to store pf value
        pf = float(r.get("pfDeduction") or 0.0)
        # Set esic_val variable to store esic val value
        esic_val = float(r.get("esicDeduction") or 0.0)
        # Set tds_val variable to store tds val value
        tds_val = float(r.get("tdsDeduction") or 0.0)
        # Set lwf_val variable to store lwf val value
        lwf_val = float(r.get("lwfDeduction") or 0.0)
        # Total of ALL cuts (before, PF was shown on the payslip but not added to the total)
        total_ded = round(pt_val + other_val + pf + esic_val + tds_val + lwf_val, 2)
        # Company share of PF: only when PF is really being cut for this person
        empr_pct = float(settings.get("pf_employer_percent", 12.00) or 12.00)
        # Set pf_wages_val variable to store pf wages val value
        pf_wages_val = float(r.get("pfWages") or 0.0)
        # Set employer_pf variable to store employer pf value
        employer_pf = round(pf_wages_val * empr_pct / 100.0, 2) if pf > 0 else 0.0
        # Set ctc_val variable to store ctc val value
        ctc_val = round(gross_earn + employer_pf, 2)

        # Add this employee's payslip data to the batch list.
        # The actual save to the database happens after the loop.
        payslip_rows_to_save.append({
            # Execute statement to process data and maintain state
            "emp_code": emp_code,
            # Execute statement to process data and maintain state
            "employee_name": r["employeeName"],
            # Execute statement to process data and maintain state
            "month": month,
            # Execute statement to process data and maintain state
            "year": year,
            # Execute statement to process data and maintain state
            "fin_year": fin_year,
            # Execute statement to process data and maintain state
            "basic_salary": basic,
            # Execute statement to process data and maintain state
            "hra": hra,
            # Execute statement to process data and maintain state
            "special_allowance": special,
            # Execute statement to process data and maintain state
            "gross_earnings": gross_earn,
            # Execute statement to process data and maintain state
            "pf_deduction": pf,
            # Execute statement to process data and maintain state
            "pt_deduction": pt_val,
            # Execute statement to process data and maintain state
            "total_deductions": total_ded,
            # Execute statement to process data and maintain state
            "net_salary": net_sal,
            # Execute statement to process data and maintain state
            "employer_pf": employer_pf,
            # Execute statement to process data and maintain state
            "employer_contributions": employer_pf,
            # Execute statement to process data and maintain state
            "ctc": ctc_val,
            # Execute statement to process data and maintain state
            "total_days": cal_days,
            # Execute statement to process data and maintain state
            "paid_days": int(round(r["paidEquivalentDays"])),
        # Execute statement to process data and maintain state
        })

    # Save all payslips in one database call (much faster than one call per employee)
    if payslip_rows_to_save:
        # Execute statement to process data and maintain state
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
        """), payslip_rows_to_save)

    # Make everything permanent and tell the caller it worked
    db.commit()
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Payroll for {month} {year} has been finalized and synchronized with Employee Payslips.",
        # Execute statement to process data and maintain state
        "month": month,
        # Execute statement to process data and maintain state
        "year": year
    # Execute statement to process data and maintain state
    }


# Define reopen_monthly_payroll function to handle reopen monthly payroll
def reopen_monthly_payroll(db: Session, month: str, year: int, user_name: str = "Admin") -> dict:
    """Reopens a finalized payroll back to Draft status for review and recalculation."""
    # Unlock the month: set it back to "Draft" and note who reopened it and when
    db.execute(text("""
        UPDATE payroll_runs
        SET status = 'Draft',
            reopened_at = CURRENT_TIMESTAMP,
            reopened_by = :u,
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"u": user_name, "m": month, "y": year})

    # Set every employee's salary line of that month back to "Calculated"
    db.execute(text("""
        UPDATE payroll_records
        SET status = 'Calculated',
            updated_at = CURRENT_TIMESTAMP
        WHERE month = :m AND year = :y
    """), {"m": month, "y": year})

    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Payroll for {month} {year} has been reopened to Draft.",
        # Execute statement to process data and maintain state
        "month": month,
        # Execute statement to process data and maintain state
        "year": year
    # Execute statement to process data and maintain state
    }


# Define record_intern_conversion function to handle record intern conversion
def record_intern_conversion(
    # Define db schema field with type Session,
    db: Session,
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type dict,
    payload: dict,
    # Define user_name schema field with type str and default value
    user_name: str = "Admin"
# Execute statement to process data and maintain state
) -> dict:
    """
    HR / Admin records intern conversion decision:
    - Converted: updates profile_master to Employee and sets effective date
    - Extended: extends internship period by X months
    - Not Converted: maintains intern status
    - Sends official notification to employee
    """
    # Read HR's decision and the details that came with it
    decision = payload.get("decision", "Converted")  # Converted, Extended, Not Converted
    # Set eff_date_raw variable to store eff date raw value
    eff_date_raw = payload.get("effective_employee_date")
    # Set ext_months variable to store ext months value
    ext_months = int(payload.get("extension_months") or 0)
    # Set notes variable to store notes value
    notes = str(payload.get("notes") or "")
    # Set new_salary variable to store new salary value
    new_salary = payload.get("new_salary")

    # Work out the date from which the change starts
    eff_date = None
    # Evaluate condition to control execution branch
    if eff_date_raw:
        # Begin guarded execution block to trap exceptions
        try:
            # Set eff_date variable to store eff date value
            eff_date = date.fromisoformat(str(eff_date_raw)[:10])
        # Catch and handle specific exception if raised
        except Exception:
            # If the date is not readable, use today
            eff_date = date.today()
    # Evaluate alternate branch condition
    elif decision == "Converted":
        # No date given but the intern is converted, so start from today
        eff_date = date.today()

    # Save to intern_conversion_records
    # Write the decision down, with who decided and when
    db.execute(text("""
        INSERT INTO intern_conversion_records (
            emp_code, decision, effective_employee_date, extension_months,
            notes, decided_by, decided_at, created_at, updated_at
        ) VALUES (
            :c, :dec, :eff, :ext,
            :n, :by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    """), {
        # Execute statement to process data and maintain state
        "c": emp_code,
        # Execute statement to process data and maintain state
        "dec": decision,
        # Execute statement to process data and maintain state
        "eff": eff_date,
        # Execute statement to process data and maintain state
        "ext": ext_months,
        # Execute statement to process data and maintain state
        "n": notes,
        # Execute statement to process data and maintain state
        "by": user_name
    # Execute statement to process data and maintain state
    })

    # If Converted, update profile_master and payroll_profiles
    if decision == "Converted":
        # Change the person from intern to a full-time active employee
        db.execute(text("""
            UPDATE profile_master
            SET employment_type = 'Full-time',
                employment_status = 'Active'
            WHERE emp_code = :c
        """), {"c": emp_code})

        # If a new salary was given, save the new salary parts too
        if new_salary and float(new_salary) > 0:
            # Set gross_val variable to store gross val value
            gross_val = float(new_salary)
            # Set calc variable to store calc value
            calc = calculate_salary_breakdown(gross_val)
            # Execute statement to process data and maintain state
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
        # Send the person a message in the app telling them they are now an employee
        try:
            # Execute statement to process data and maintain state
            db.execute(text("""
                INSERT INTO notifications (
                    emp_code, title, message, type, is_read, created_at
                ) VALUES (
                    :c, 'Employment Status Updated',
                    'Your employment status has been updated from Intern to Employee. Your applicable leave policy is now Employee Leave Policy.',
                    'HR_UPDATE', FALSE, CURRENT_TIMESTAMP
                )
            """), {"c": emp_code})
        # Catch and handle specific exception if raised
        except Exception:
            # If the message could not be sent, ignore it; the main work is already done
            pass

    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "status": "success",
        # Execute statement to process data and maintain state
        "message": f"Intern conversion recorded for {emp_code}: {decision}",
        # Execute statement to process data and maintain state
        "decision": decision,
        # Execute statement to process data and maintain state
        "effective_date": str(eff_date or "")
    # Execute statement to process data and maintain state
    }


# Define get_payroll_history function to handle get payroll history
def get_payroll_history(db: Session) -> list:
    """Returns all historical payroll runs with summaries."""
    # Get all past salary months, newest first.
    # Month names are turned into numbers (December = 12 ... January = 1) so they sort in the right order.
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

    # Return computed result or response payload to caller
    return [dict(r) for r in rows]



# Define generate_payslip_for_employee_record function to handle generate payslip for employee record
def generate_payslip_for_employee_record(
    # Define db schema field with type Session,
    db: Session,
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define month schema field with type str,
    month: str,
    # Define year schema field with type int
    year: int
# Execute statement to process data and maintain state
) -> dict:
    """
    Generates and persists an actual payslip in the database.
    Throws error if salary is not configured.
    Prorates according to joining date if mid-month joining.
    Prevents duplicates using (emp_code, month, year) unique key.
    """
    init_payslips_table(db)

    # 1. Fetch employee profile & payroll profile
    # Find the employee's personal details
    emp = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM profile_master WHERE emp_code = :c"),
        # Execute statement to process data and maintain state
        {"c": emp_code}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Stop with a clear message if the employee does not exist
    if not emp:
        # Raise exception to abort current operation with error
        raise ValueError(f"Employee {emp_code} not found.")

    # Find the employee's saved salary details
    prof = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payroll_profiles WHERE emp_code = :c"),
        # Execute statement to process data and maintain state
        {"c": emp_code}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Stop if no salary has been set up
    gross_salary = float(prof.get("gross_salary") or 0.0) if prof else 0.0
    # Evaluate condition to control execution branch
    if gross_salary <= 0:
        # Raise exception to abort current operation with error
        raise ValueError(f"Cannot generate payslip: Payroll setup required for {emp_code}.")

    # 2. Check Joining Date eligibility
    # Find the first and last day of the month
    total_days = get_days_in_month(month, year)
    # Set m_idx variable to store m idx value
    m_idx = get_month_index(month)
    # Set period_start variable to store period start value
    period_start = date(year, m_idx, 1)
    # Set period_end variable to store period end value
    period_end = date(year, m_idx, total_days)

    # Read the joining date (it may be a date or text)
    raw_join = emp.get("emp_join_date")
    # Set join_d variable to store join d value
    join_d = None
    # Evaluate condition to control execution branch
    if raw_join:
        # Evaluate condition to control execution branch
        if isinstance(raw_join, date):
            # Set join_d variable to store join d value
            join_d = raw_join
        # Evaluate alternate branch condition
        elif isinstance(raw_join, str):
            # Begin guarded execution block to trap exceptions
            try:
                # Set join_d variable to store join d value
                join_d = date.fromisoformat(raw_join[:10])
            # Catch and handle specific exception if raised
            except Exception:
                # Placeholder statement performing no operation
                pass

    # A person cannot get a payslip for a month before they joined
    if join_d and join_d > period_end:
        # Raise exception to abort current operation with error
        raise ValueError(f"Cannot generate payslip: Employee joined on {join_d}, after this pay period ({month} {year}).")

    # Evaluate condition to control execution branch
    if join_d and join_d >= period_start and join_d <= period_end:
        # Mid-month joining proration
        # Joined during the month: pay only for the days from joining date to month end
        paid_days = total_days - join_d.day + 1
        # Set ratio variable to store ratio value
        ratio = paid_days / total_days
        # Set actual_gross variable to store actual gross value
        actual_gross = round(gross_salary * ratio, 2)
    # Execute fallback branch when conditions are not met
    else:
        # Worked the full month: pay the full salary
        paid_days = total_days
        # Set actual_gross variable to store actual gross value
        actual_gross = gross_salary

    # Split the salary into its parts
    calc = calculate_salary_breakdown(actual_gross)

    # Make the full name and the money-year label (April to March)
    first_n = emp.get("first_name") or ""
    # Set last_n variable to store last n value
    last_n = emp.get("last_name") or ""
    # Set full_name variable to store full name value
    full_name = f"{first_n} {last_n}".strip() or emp_code
    # Set fin_year variable to store fin year value
    fin_year = f"{year}-{year + 1}" if m_idx >= 4 else f"{year - 1}-{year}"

    # 3. Insert or update existing payslip (No duplicates!)
    # Save the payslip; if one already exists for this month, update it instead of adding a copy
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
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "employee_name": full_name,
        # Execute statement to process data and maintain state
        "month": month,
        # Execute statement to process data and maintain state
        "year": year,
        # Execute statement to process data and maintain state
        "fin_year": fin_year,
        # Execute statement to process data and maintain state
        "total_days": total_days,
        # Execute statement to process data and maintain state
        "paid_days": paid_days,
        # Execute statement to process data and maintain state
        **calc
    # Execute statement to process data and maintain state
    })
    # Commit transaction to persist changes in database
    db.commit()

    # Read the saved payslip back and return it
    saved = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM payslips WHERE emp_code = :c AND month = :m AND year = :y"),
        # Execute statement to process data and maintain state
        {"c": emp_code, "m": month, "y": year}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Return computed result or response payload to caller
    return dict(saved) if saved else {"emp_code": emp_code, "month": month, "year": year, **calc}


# Define approve_payroll_record function to handle approve payroll record
def approve_payroll_record(db: Session, record_id: str, month: str = "", year: int = None) -> dict:
    """Marks payslip or payroll record as Approved."""
    init_payslips_table(db)

    # If numeric ID, update directly
    # If the id is just a number, it is the payslip's own number, so mark that payslip as approved
    if str(record_id).isdigit():
        # Execute statement to process data and maintain state
        db.execute(
            # Invoke text to perform operational action
            text("UPDATE payslips SET status = 'Approved' WHERE id = :id"),
            # Execute statement to process data and maintain state
            {"id": int(record_id)}
        # Execute statement to process data and maintain state
        )
        # Commit transaction to persist changes in database
        db.commit()
        # Return computed result or response payload to caller
        return {"id": record_id, "status": "Approved"}

    # If composite string like rec-LE724-September-2026
    # If the id looks like "rec-CODE-Month-Year", pull out the employee code, month and year
    parts = str(record_id).split("-")
    # Evaluate condition to control execution branch
    if len(parts) >= 4:
        # Set emp_c variable to store emp c value
        emp_c = parts[1]
        # Set m variable to store m value
        m = parts[2]
        # Set y variable to store y value
        y = int(parts[3])
        # Generate payslip first if needed, then approve
        ps = generate_payslip_for_employee_record(db, emp_c, m, y)
        # Execute statement to process data and maintain state
        db.execute(
            # Invoke text to perform operational action
            text("UPDATE payslips SET status = 'Approved' WHERE emp_code = :c AND month = :m AND year = :y"),
            # Execute statement to process data and maintain state
            {"c": emp_c, "m": m, "y": y}
        # Execute statement to process data and maintain state
        )
        # Commit transaction to persist changes in database
        db.commit()
        # Return computed result or response payload to caller
        return {"id": ps.get("id"), "emp_code": emp_c, "status": "Approved"}

    # If the id was not understood, just report "Approved"
    return {"status": "Approved"}


# Define update_employee_salary_configuration function to handle update employee salary configuration
def update_employee_salary_configuration(
    # Define db schema field with type Session,
    db: Session,
    # Define emp_code schema field with type str,
    emp_code: str,
    # Define payload schema field with type dict
    payload: dict
# Execute statement to process data and maintain state
) -> dict:
    """Admin updates salary components for an employee."""
    init_payslips_table(db)

    # Find the new monthly salary from whatever name the screen used for it
    gross_val = None
    # Evaluate condition to control execution branch
    if "gross_salary" in payload or "grossSalary" in payload or "gross" in payload:
        # Set gross_val variable to store gross val value
        gross_val = float(payload.get("gross_salary") or payload.get("grossSalary") or payload.get("gross") or 0.0)
    # Evaluate alternate branch condition
    elif "basic_salary" in payload or "basicSalary" in payload:
        # Only basic pay was given, so the total salary is double of it (basic is half)
        b = float(payload.get("basic_salary") or payload.get("basicSalary") or 0.0)
        gross_val = b * 2.0 # 50% basic rule

    # A real salary above zero is a must
    if gross_val is None or gross_val <= 0:
        # Raise exception to abort current operation with error
        raise ValueError("Valid gross salary is required.")

    # PF is applied only if the company AND the employee both have it switched on
    settings = get_payroll_settings(db)
    # Set co_pf variable to store co pf value
    co_pf = bool(settings.get("pf_applicable", False))
    # Set emp_pf variable to store emp pf value
    emp_pf = bool(payload.get("pf_applicable", False)) if "pf_applicable" in payload else False
    # Set calc variable to store calc value
    calc = calculate_salary_breakdown(gross_val, pf_applicable=(co_pf and emp_pf), pf_wage_ceiling=float(settings.get("pf_wage_ceiling", 25000.00)))
    # Execute statement to process data and maintain state
    calc["pf_applicable"] = emp_pf

    # If HR typed their own values for any part, use those instead of the automatic split
    if "basic_salary" in payload and float(payload.get("basic_salary") or 0) > 0:
        # Execute statement to process data and maintain state
        calc["basic_salary"] = float(payload.get("basic_salary"))
    # Evaluate condition to control execution branch
    if "hra" in payload and float(payload.get("hra") or 0) > 0:
        # Execute statement to process data and maintain state
        calc["hra"] = float(payload.get("hra"))
    # Evaluate condition to control execution branch
    if "special_allowance" in payload and float(payload.get("special_allowance") or 0) > 0:
        # Execute statement to process data and maintain state
        calc["special_allowance"] = float(payload.get("special_allowance"))
    # Evaluate alternate branch condition
    elif "flexi_allowance" in payload and float(payload.get("flexi_allowance") or 0) > 0:
        # Execute statement to process data and maintain state
        calc["special_allowance"] = float(payload.get("flexi_allowance"))
    # Evaluate condition to control execution branch
    if "other_deductions" in payload:
        # Execute statement to process data and maintain state
        calc["other_deductions"] = float(payload.get("other_deductions") or 0.0)
    
    # Income tax cut (TDS) and extra money owed (arrears)
    tds_val = float(payload.get("tds") or payload.get("tds_deduction") or 0.0)
    # Set arrears_val variable to store arrears val value
    arrears_val = float(payload.get("arrears") or 0.0)
    # Execute statement to process data and maintain state
    calc["tds"] = tds_val
    # Execute statement to process data and maintain state
    calc["arrears"] = arrears_val

    # HR may have typed their own salary parts, so work out the PF wages again from the final parts.
    # PF wages = Basic + any allowance money above half of the salary, up to the PF wage limit.
    allowance_excess = max(0.0, round((calc["hra"] + calc["special_allowance"]) - (gross_val * 0.50), 2))
    # Set statutory_wages variable to store statutory wages value
    statutory_wages = round(calc["basic_salary"] + allowance_excess, 2)
    # Set pf_limit variable to store pf limit value
    pf_limit = float(settings.get("pf_wage_ceiling", 25000.00))
    # Set pf_wages_final variable to store pf wages final value
    pf_wages_final = round(min(statutory_wages, pf_limit) if pf_limit > 0 else statutory_wages, 2)

    # Evaluate condition to control execution branch
    if co_pf and emp_pf:
        # PF is on: use the company's percentages
        pf_pct = float(settings.get("pf_employee_percent", 12.00))
        # Set empr_pct variable to store empr pct value
        empr_pct = float(settings.get("pf_employer_percent", 12.00))
        # Execute statement to process data and maintain state
        calc["pf_wages"] = pf_wages_final
        # Execute statement to process data and maintain state
        calc["pf_deduction"] = round(pf_wages_final * pf_pct / 100.0, 2)
        # Execute statement to process data and maintain state
        calc["employer_pf"] = round(pf_wages_final * empr_pct / 100.0, 2)
        # Execute statement to process data and maintain state
        calc["employer_contributions"] = calc["employer_pf"]
    # Execute fallback branch when conditions are not met
    else:
        # PF is off: no PF money at all
        calc["pf_wages"] = 0.0
        # Execute statement to process data and maintain state
        calc["pf_deduction"] = 0.0
        # Execute statement to process data and maintain state
        calc["employer_pf"] = 0.0
        # Execute statement to process data and maintain state
        calc["employer_contributions"] = 0.0

    # Take-home = salary - all cuts + extra money owed (this now includes PF when PF is on)
    calc["total_deductions"] = round(calc["pt_deduction"] + calc["pf_deduction"] + calc["other_deductions"] + calc["tds"], 2)
    # Execute statement to process data and maintain state
    calc["net_salary"] = round(gross_val - calc["total_deductions"] + calc["arrears"], 2)
    # Execute statement to process data and maintain state
    calc["ctc"] = round(gross_val + calc["employer_contributions"], 2)

    # Show the new wage figure and a warning (a warning only, it does not stop saving)
    calc["statutory_pf_wages"] = statutory_wages
    # Execute statement to process data and maintain state
    calc["wage_rule_warning"] = (
        # Execute statement to process data and maintain state
        f"Basic pay is below 50% of salary. Allowance money above half ({allowance_excess:.2f}) is counted as wages for PF."
        # Evaluate condition to control execution branch
        if allowance_excess > 0 else ""
    # Execute statement to process data and maintain state
    )

    # Save the salary details. If the employee already has one, update it; if not, add a new one.
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
    # Commit transaction to persist changes in database
    db.commit()

    # Return computed result or response payload to caller
    return {"emp_code": emp_code, "status": "Configured", **calc}


# Define _convert_number_to_indian_words function to handle  convert number to indian words
def _convert_number_to_indian_words(num: float) -> str:
    """Converts a monetary figure to formal Indian currency words."""
    # Word lists used to build the sentence: 0-19, and the "tens" (twenty, thirty...)
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             # Execute statement to process data and maintain state
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    # Set tens variable to store tens value
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    # Round to a whole rupee
    n = int(round(num))
    # Evaluate condition to control execution branch
    if n == 0:
        # Return computed result or response payload to caller
        return "Zero Rupees Only"

    # A small helper that turns a number into words, using Indian names
    # (Thousand, Lakh = 1,00,000, Crore = 1,00,00,000)
    def convert(val):
        # Evaluate condition to control execution branch
        if val < 20:
            # Return computed result or response payload to caller
            return units[val]
        # Evaluate alternate branch condition
        elif val < 100:
            # Return computed result or response payload to caller
            return tens[val // 10] + (" " + units[val % 10] if val % 10 != 0 else "")
        # Evaluate alternate branch condition
        elif val < 1000:
            # Return computed result or response payload to caller
            return units[val // 100] + " Hundred" + (" and " + convert(val % 100) if val % 100 != 0 else "")
        # Evaluate alternate branch condition
        elif val < 100000:
            # Return computed result or response payload to caller
            return convert(val // 1000) + " Thousand" + (" " + convert(val % 1000) if val % 1000 != 0 else "")
        # Evaluate alternate branch condition
        elif val < 10000000:
            # Return computed result or response payload to caller
            return convert(val // 100000) + " Lakh" + (" " + convert(val % 100000) if val % 100000 != 0 else "")
        # Execute fallback branch when conditions are not met
        else:
            # Return computed result or response payload to caller
            return convert(val // 10000000) + " Crore" + (" " + convert(val % 10000000) if val % 10000000 != 0 else "")

    # Return computed result or response payload to caller
    return convert(n) + " Rupees Only"


# Define _format_inr_currency function to handle  format inr currency
def _format_inr_currency(val) -> str:
    """Formats numeric monetary values according to the Indian numbering system with Rupee symbol."""
    # Turn the value into a number. If it is not a number, use zero.
    try:
        # Set f_val variable to store f val value
        f_val = float(val or 0.0)
    # Catch and handle specific exception if raised
    except Exception:
        # Set f_val variable to store f val value
        f_val = 0.0
    # Remember if it is negative, then work with the positive number
    is_neg = f_val < 0
    # Set f_val variable to store f val value
    f_val = abs(f_val)
    # Split into rupees (before the dot) and paise (after the dot)
    parts = f"{f_val:.2f}".split(".")
    # Set int_part variable to store int part value
    int_part = parts[0]
    # Set dec_part variable to store dec part value
    dec_part = parts[1]
    
    # Evaluate condition to control execution branch
    if len(int_part) <= 3:
        # Small amounts need no commas
        formatted = int_part
    # Execute fallback branch when conditions are not met
    else:
        # Indian style commas: last 3 digits together, then groups of 2 (e.g. 12,34,567)
        last3 = int_part[-3:]
        # Set rest variable to store rest value
        rest = int_part[:-3]
        # Set groups variable to store groups value
        groups = []
        # Execute loop while boolean condition remains true
        while len(rest) > 2:
            # Invoke groups.insert to perform operational action
            groups.insert(0, rest[-2:])
            # Set rest variable to store rest value
            rest = rest[:-2]
        # Evaluate condition to control execution branch
        if rest:
            # Invoke groups.insert to perform operational action
            groups.insert(0, rest)
        # Set formatted variable to store formatted value
        formatted = ",".join(groups) + "," + last3
    
    # Put the minus sign (if any), the rupee symbol, the amount and the paise together
    sign = "-" if is_neg else ""
    # Return computed result or response payload to caller
    return f"{sign}₹{formatted}.{dec_part}"


# ==============================================================================
# PYMUPDF OFFICIAL PAYSLIP PDF GENERATOR (A4 PRINT READY)
# ==============================================================================
# Programmatically draws an authentic, corporate A4 PDF payslip using PyMuPDF (fitz):
# 1. Resolves employee identification, compensation, and month/year period.
# 2. Renders corporate header with purple brand banner and financial year pill.
# 3. Formats employee credentials card (name, designation, department, join date).
# 4. Draws attendance payability grid (Present, Half Days, Leaves, Holidays, LOP).
# 5. Renders side-by-side comparative tables for Earnings vs Statutory Deductions.
# 6. Emphasizes Net Pay in a large green summary box with number-to-words transcription.
# 7. Embeds authorized corporate signatory and system generation disclaimer.
#
# IN SIMPLE WORDS: this function "draws" the payslip page. It finds the right
# employee and month, makes sure the payslip is saved, then draws boxes, lines
# and text on an A4 sheet: company banner, employee details, attendance,
# earnings and cuts side by side, the final take-home amount, and a signature area.
# Numbers like (36, 102, 559, 200) are positions on the page: left, top, right, bottom.
# ==============================================================================
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
    # Ensure tables are initialized
    init_payslips_table(db)

    # Clean up what we were given (an id, an employee code, etc.)
    raw_id = str(payslip_id_or_code or "").strip()
    # Set target_code variable to store target code value
    target_code = raw_id
    # Set target_month variable to store target month value
    target_month = str(month or "").strip()
    # Set target_year variable to store target year value
    target_year = int(year) if str(year or "").strip().isdigit() else None

    # Step 1: Parse composite identifiers or numeric keys
    # If the id looks like "rec-CODE-Month-Year", pull the employee code, month and year out of it
    if raw_id.startswith("rec-"):
        # Set parts variable to store parts value
        parts = raw_id.split("-")
        # Evaluate condition to control execution branch
        if len(parts) >= 2:
            # Set target_code variable to store target code value
            target_code = parts[1]
        # Check if target condition is false or object is missing
        if len(parts) >= 3 and not target_month:
            # Set target_month variable to store target month value
            target_month = parts[2]
        # Check if target condition is false or object is missing
        if len(parts) >= 4 and not target_year:
            # Set target_year variable to store target year value
            target_year = int(parts[3]) if parts[3].isdigit() else None

    # Set pr_row variable to store pr row value
    pr_row = None
    # If the id is only a number, it may be the number of a salary line or of a payslip
    if raw_id.isdigit():
        # Set num_id variable to store num id value
        num_id = int(raw_id)
        # Check if num_id is a payroll_records primary key
        # First try: is it the number of a salary line?
        pr_match = db.execute(
            # Invoke text to perform operational action
            text("SELECT * FROM payroll_records WHERE id = :id"),
            # Execute statement to process data and maintain state
            {"id": num_id}
        # Execute statement to process data and maintain state
        ).mappings().first()
        # Evaluate condition to control execution branch
        if pr_match:
            # Set pr_row variable to store pr row value
            pr_row = pr_match
            # Set target_code variable to store target code value
            target_code = pr_row["emp_code"]
            # Check if target condition is false or object is missing
            if not target_month:
                # Set target_month variable to store target month value
                target_month = pr_row["month"]
            # Check if target condition is false or object is missing
            if not target_year:
                # Set target_year variable to store target year value
                target_year = int(pr_row["year"])
        # Execute fallback branch when conditions are not met
        else:
            # Check if num_id is a payslips primary key
            # Second try: is it the number of a payslip?
            ps_match = db.execute(
                # Invoke text to perform operational action
                text("SELECT * FROM payslips WHERE id = :id"),
                # Execute statement to process data and maintain state
                {"id": num_id}
            # Execute statement to process data and maintain state
            ).mappings().first()
            # Evaluate condition to control execution branch
            if ps_match:
                # Set target_code variable to store target code value
                target_code = ps_match["emp_code"]
                # Check if target condition is false or object is missing
                if not target_month:
                    # Set target_month variable to store target month value
                    target_month = ps_match["month"]
                # Check if target condition is false or object is missing
                if not target_year:
                    # Set target_year variable to store target year value
                    target_year = int(ps_match["year"])

    # Fallback to current period if month/year are still unspecified
    # If month or year is still unknown, pick a default one
    now = datetime.now()
    # Check if target condition is false or object is missing
    if not target_month or target_month not in MONTH_NAMES:
        # Set target_month variable to store target month value
        target_month = "October" if now.year == 2026 else MONTH_NAMES[now.month - 1]
    # Check if target condition is false or object is missing
    if not target_year:
        # Set target_year variable to store target year value
        target_year = 2026 if now.year == 2026 else now.year

    # Step 2: Validate Employee existence in profile_master
    # Make sure this employee really exists (capital/small letters do not matter)
    emp = db.execute(
        # Invoke text to perform operational action
        text("SELECT * FROM profile_master WHERE emp_code = :c OR LOWER(emp_code) = LOWER(:c)"),
        # Execute statement to process data and maintain state
        {"c": target_code}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Check if target condition is false or object is missing
    if not emp:
        # Raise exception to abort current operation with error
        raise ValueError(f"Employee '{target_code}' not found in database.")

    # Set emp_code variable to store emp code value
    emp_code = emp["emp_code"]

    # Step 3: Resolve Payroll Record for (emp_code, target_month, target_year)
    # Find this employee's saved salary line for the month
    if not pr_row:
        # Set pr_row variable to store pr row value
        pr_row = db.execute(
            # Execute statement to process data and maintain state
            text("""
                SELECT * FROM payroll_records 
                WHERE (emp_code = :c OR LOWER(emp_code) = LOWER(:c))
                  AND month = :m
                  AND year = :y
            """),
            # Execute statement to process data and maintain state
            {"c": emp_code, "m": target_month, "y": target_year}
        # Execute statement to process data and maintain state
        ).mappings().first()

    # If payroll_record does not exist for this month/year, run payroll calculation to populate it
    # If it is not there, calculate the month's salary now, then look again
    if not pr_row:
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke get_all_payroll_records to perform operational action
            get_all_payroll_records(db, search=emp_code, month=target_month, year=str(target_year))
            # Set pr_row variable to store pr row value
            pr_row = db.execute(
                # Execute statement to process data and maintain state
                text("""
                    SELECT * FROM payroll_records 
                    WHERE (emp_code = :c OR LOWER(emp_code) = LOWER(:c))
                      AND month = :m
                      AND year = :y
                """),
                # Execute statement to process data and maintain state
                {"c": emp_code, "m": target_month, "y": target_year}
            # Execute statement to process data and maintain state
            ).mappings().first()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Log warning message for non-fatal unexpected condition
            logger.warning(f"Could not auto-calculate payroll record for {emp_code}: {e}")

    # If still no payroll record found, or salary not configured
    if not pr_row:
        # Raise exception to abort current operation with error
        raise ValueError(f"Payroll record for employee '{emp_code}' not found for {target_month} {target_year}. Salary setup may be required.")

    # Step 4: Check if Payslip record exists in payslips table; if absent, persist it
    # Collect all the numbers that will be written on the payslip
    first_n = emp.get("first_name") or ""
    # Set last_n variable to store last n value
    last_n = emp.get("last_name") or ""
    # Set full_name variable to store full name value
    full_name = pr_row.get("employee_name") or f"{first_n} {last_n}".strip() or emp_code
    # Set m_idx variable to store m idx value
    m_idx = get_month_index(target_month)
    # Set fin_year variable to store fin year value
    fin_year = f"{target_year}-{target_year + 1}" if m_idx >= 4 else f"{target_year - 1}-{target_year}"
    # Set cal_days variable to store cal days value
    cal_days = int(pr_row.get("calendar_days") or get_days_in_month(target_month, target_year))
    # Set paid_days variable to store paid days value
    paid_days = int(float(pr_row.get("paid_equivalent_days") or cal_days))

    # Set basic_val variable to store basic val value
    basic_val = float(pr_row.get("earn_basic") or pr_row.get("basic_salary") or 0.0)
    # Set hra_val variable to store hra val value
    hra_val = float(pr_row.get("earn_hra") or pr_row.get("hra") or 0.0)
    # Set special_val variable to store special val value
    special_val = float(pr_row.get("earn_special_allowance") or pr_row.get("special_allowance") or 0.0)
    # Set gross_val variable to store gross val value
    gross_val = float(pr_row.get("gross_earned_salary") or 0.0)
    # Set pf_val variable to store pf val value
    pf_val = float(pr_row.get("pf_deduction") or 0.0)
    # Set pt_val variable to store pt val value
    pt_val = float(pr_row.get("pt_deduction") or 0.0)
    # Set esic_val variable to store esic val value
    esic_val = float(pr_row.get("esic_deduction") or 0.0)
    # Set tds_val variable to store tds val value
    tds_val = float(pr_row.get("tds_deduction") or 0.0)
    # Set lwf_val variable to store lwf val value
    lwf_val = float(pr_row.get("lwf_deduction") or 0.0)
    # Set lop_ded_val variable to store lop ded val value
    lop_ded_val = float(pr_row.get("lop_deduction") or 0.0)
    # Set other_ded_val variable to store other ded val value
    other_ded_val = float(pr_row.get("other_deductions") or 0.0)
    # Set arrears_val variable to store arrears val value
    arrears_val = float(pr_row.get("arrears") or 0.0)
    # Set net_val variable to store net val value
    net_val = float(pr_row.get("net_salary") or 0.0)
    # Total of all cuts shown on the payslip
    total_ded = round(pf_val + pt_val + esic_val + tds_val + lwf_val + other_ded_val, 2)
    # Set monthly_comp variable to store monthly comp value
    monthly_comp = float(pr_row.get("monthly_compensation") or gross_val)

    # Persist or update payslip row (Prevents duplicate rows via ON CONFLICT)
    # Save the payslip (or update it if it already exists, so there are no duplicates)
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
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "employee_name": full_name,
        # Execute statement to process data and maintain state
        "month": target_month,
        # Execute statement to process data and maintain state
        "year": target_year,
        # Execute statement to process data and maintain state
        "fin_year": fin_year,
        # Execute statement to process data and maintain state
        "basic": basic_val,
        # Execute statement to process data and maintain state
        "hra": hra_val,
        # Execute statement to process data and maintain state
        "special": special_val,
        # Execute statement to process data and maintain state
        "gross": gross_val,
        # Execute statement to process data and maintain state
        "pf": pf_val,
        # Execute statement to process data and maintain state
        "pt": pt_val,
        # Execute statement to process data and maintain state
        "tot_ded": total_ded,
        # Execute statement to process data and maintain state
        "net": net_val,
        # Execute statement to process data and maintain state
        "ctc": monthly_comp,
        # Execute statement to process data and maintain state
        "tot_days": cal_days,
        # Execute statement to process data and maintain state
        "paid_days": paid_days
    # Execute statement to process data and maintain state
    })
    # Commit transaction to persist changes in database
    db.commit()

    # Step 5: Render PyMuPDF Document
    # Get the details that will be printed on the page (department, job title, joining date, etc.)
    dept = pr_row.get("department") or emp.get("department") or "Executive"
    # Set desig variable to store desig value
    desig = pr_row.get("designation") or emp.get("designation") or "Officer"
    # Set worker_type variable to store worker type value
    worker_type = pr_row.get("worker_type") or emp.get("employment_type") or "Regular Employee"
    # Set emp_status variable to store emp status value
    emp_status = pr_row.get("employment_status") or emp.get("employment_status") or "Active"
    # Set raw_join variable to store raw join value
    raw_join = pr_row.get("joining_date") or emp.get("emp_join_date")
    # Write the joining date like "15 Jan 2024". If missing, a sample date is shown.
    try:
        # Set join_str variable to store join str value
        join_str = datetime.strptime(str(raw_join)[:10], "%Y-%m-%d").strftime("%d %b %Y") if raw_join else "15 Jan 2024"
    # Catch and handle specific exception if raised
    except Exception:
        # Set join_str variable to store join str value
        join_str = str(raw_join)[:10] if raw_join else "15 Jan 2024"

    # Set is_intern variable to store is intern value
    is_intern = "intern" in str(worker_type).lower()

    # Attendance numbers to show on the page
    pres_days = float(pr_row.get("present_days") or 0.0)
    # Set half_days variable to store half days value
    half_days = float(pr_row.get("half_days") or 0.0)
    # Set p_leave variable to store p leave value
    p_leave = float(pr_row.get("paid_leave_days") or 0.0)
    # Set up_leave variable to store up leave value
    up_leave = float(pr_row.get("unpaid_leave_days") or 0.0)
    # Set w_off variable to store w off value
    w_off = float(pr_row.get("weekly_off_days") or 0.0)
    # Set holidays variable to store holidays value
    holidays = float(pr_row.get("holiday_days") or 0.0)
    # Set absent variable to store absent value
    absent = float(pr_row.get("absent_days") or 0.0)
    # Set lop_days variable to store lop days value
    lop_days = float(pr_row.get("lop_days") or 0.0)
    # Set daily_sal variable to store daily sal value
    daily_sal = float(pr_row.get("daily_salary") or (monthly_comp / cal_days if cal_days else 0.0))
    # Set pf_wages variable to store pf wages value
    pf_wages = float(pr_row.get("pf_wages") or 0.0)

    # Resolve Poppins Fonts (paths are cached — the disk is only read once per session)
    _fpaths = _get_poppins_font_paths()
    # Set font_reg variable to store font reg value
    font_reg  = _fpaths["reg"]
    # Set font_med variable to store font med value
    font_med  = _fpaths["med"]
    # Set font_semi variable to store font semi value
    font_semi = _fpaths["semi"]
    # Set font_bold variable to store font bold value
    font_bold = _fpaths["bold"]

    # Start a new empty PDF and add one A4 page
    doc = fitz.open()
    page = doc.new_page(width=595.28, height=841.89)  # Standard A4: 595.28 x 841.89 points

    # If all four Poppins font files are present, use them; otherwise use plain built-in fonts
    has_poppins = os.path.exists(font_reg) and os.path.exists(font_med) and os.path.exists(font_semi) and os.path.exists(font_bold)
    # Evaluate condition to control execution branch
    if has_poppins:
        # Invoke page.insert_font to perform operational action
        page.insert_font(fontname="poppins-reg", fontfile=font_reg)
        # Invoke page.insert_font to perform operational action
        page.insert_font(fontname="poppins-med", fontfile=font_med)
        # Invoke page.insert_font to perform operational action
        page.insert_font(fontname="poppins-semi", fontfile=font_semi)
        # Invoke page.insert_font to perform operational action
        page.insert_font(fontname="poppins-bold", fontfile=font_bold)
        # Set f_obj_reg variable to store f obj reg value
        f_obj_reg = fitz.Font(fontfile=font_reg)
        # Set f_obj_med variable to store f obj med value
        f_obj_med = fitz.Font(fontfile=font_med)
        # Set f_obj_semi variable to store f obj semi value
        f_obj_semi = fitz.Font(fontfile=font_semi)
        # Set f_obj_bold variable to store f obj bold value
        f_obj_bold = fitz.Font(fontfile=font_bold)
        # Execute statement to process data and maintain state
        fn_reg, fn_med, fn_semi, fn_bold = "poppins-reg", "poppins-med", "poppins-semi", "poppins-bold"
    # Execute fallback branch when conditions are not met
    else:
        # Set f_obj_reg variable to store f obj reg value
        f_obj_reg = fitz.Font("helv")
        # Set f_obj_med variable to store f obj med value
        f_obj_med = fitz.Font("helv")
        # Set f_obj_semi variable to store f obj semi value
        f_obj_semi = fitz.Font("helv-bold")
        # Set f_obj_bold variable to store f obj bold value
        f_obj_bold = fitz.Font("helv-bold")
        # Execute statement to process data and maintain state
        fn_reg, fn_med, fn_semi, fn_bold = "helv", "helv", "helv-bold", "helv-bold"

    # Outer Document Border
    # Draw a thin frame around the whole page
    page.draw_rect(fitz.Rect(26, 24, 569, 818), color=(0.84, 0.86, 0.90), width=1)

    # -------------------------------------------------------------
    # 1. HEADER BANNER (y: 24 to 92)
    # -------------------------------------------------------------
    # Draw the purple strip at the top with the company name and the payslip title
    page.draw_rect(fitz.Rect(26, 24, 569, 92), color=(0.38, 0.22, 0.82), fill=(0.38, 0.22, 0.82))
    # Invoke page.insert_text to perform operational action
    page.insert_text((42, 54), "LA ESFERA INFOTECH PRIVATE LIMITED", fontsize=14.5, fontname=fn_bold, color=(1, 1, 1))
    # Invoke page.insert_text to perform operational action
    page.insert_text((42, 73), "OFFICIAL MONTHLY SALARY STATEMENT / PAYSLIP", fontsize=9.2, fontname=fn_med, color=(0.88, 0.85, 0.98))

    # Month & Year Pill on Right
    # Draw a small box on the right showing the month, year and money-year
    page.draw_rect(fitz.Rect(415, 38, 555, 78), color=(1, 1, 1), fill=(0.46, 0.31, 0.88), width=0.8)
    # Set month_txt variable to store month txt value
    month_txt = f"{target_month.upper()} {target_year}"
    # Invoke page.insert_text to perform operational action
    page.insert_text((428, 56), month_txt, fontsize=11, fontname=fn_bold, color=(1, 1, 1))
    # Invoke page.insert_text to perform operational action
    page.insert_text((428, 71), f"FINANCIAL YEAR {fin_year}", fontsize=7.8, fontname=fn_med, color=(0.92, 0.90, 0.99))

    # Helper for fitted text
    # Small helper: writes text and makes the letters smaller if the text is too long for the space
    def insert_fitted(pt, text_val, max_w, f_obj, fontname, base_sz=9.0, color=(0.1, 0.1, 0.1)):
        # Set sz variable to store sz value
        sz = base_sz
        # Execute loop while boolean condition remains true
        while sz > 7.0 and f_obj.text_length(str(text_val), fontsize=sz) > max_w:
            # Execute statement to process data and maintain state
            sz -= 0.5
        # Invoke page.insert_text to perform operational action
        page.insert_text(pt, str(text_val), fontsize=sz, fontname=fontname, color=color)

    # -------------------------------------------------------------
    # 2. EMPLOYEE INFORMATION CARD (y: 102 to 200)
    # -------------------------------------------------------------
    # Draw the box that holds the employee's details, with a light heading strip
    page.draw_rect(fitz.Rect(36, 102, 559, 200), color=(0.86, 0.88, 0.93), fill=(0.975, 0.982, 0.995), width=0.8)
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(fitz.Rect(36, 102, 559, 123), color=(0.86, 0.88, 0.93), fill=(0.93, 0.94, 0.98), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 117), "EMPLOYEE INFORMATION", fontsize=8.2, fontname=fn_bold, color=(0.30, 0.25, 0.65))

    # Row 1 (y: 140)
    # Left side: name. Right side: worker type.
    page.insert_text((48, 140), "Employee Name:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke insert_fitted to perform operational action
    insert_fitted((144, 140), full_name, 160, f_obj_bold, fn_bold, 9.2, (0.08, 0.12, 0.20))
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 140), "Worker Type:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke page.insert_text to perform operational action
    page.insert_text((408, 140), str(worker_type), fontsize=9, fontname=fn_semi, color=(0.10, 0.14, 0.22))

    # Row 2 (y: 156)
    # Employee code and status
    page.insert_text((48, 156), "Employee ID:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke page.insert_text to perform operational action
    page.insert_text((144, 156), str(emp_code), fontsize=9, fontname=fn_bold, color=(0.35, 0.22, 0.78))
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 156), "Status:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke page.insert_text to perform operational action
    page.insert_text((408, 156), str(emp_status), fontsize=9, fontname=fn_semi, color=(0.08, 0.50, 0.22))

    # Row 3 (y: 172)
    # Department and joining date
    page.insert_text((48, 172), "Department:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke insert_fitted to perform operational action
    insert_fitted((144, 172), dept, 160, f_obj_med, fn_med, 8.8, (0.12, 0.16, 0.24))
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 172), "Joining Date:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke page.insert_text to perform operational action
    page.insert_text((408, 172), str(join_str), fontsize=8.8, fontname=fn_med, color=(0.12, 0.16, 0.24))

    # Row 4 (y: 188)
    # Job title and money-year
    page.insert_text((48, 188), "Designation:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke insert_fitted to perform operational action
    insert_fitted((144, 188), desig, 160, f_obj_med, fn_med, 8.8, (0.12, 0.16, 0.24))
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 188), "Financial Year:", fontsize=8.5, fontname=fn_reg, color=(0.42, 0.46, 0.54))
    # Invoke page.insert_text to perform operational action
    page.insert_text((408, 188), str(fin_year), fontsize=8.8, fontname=fn_med, color=(0.12, 0.16, 0.24))

    # -------------------------------------------------------------
    # 3. ATTENDANCE & PAYABILITY BREAKDOWN (y: 210 to 290)
    # -------------------------------------------------------------
    # Draw the attendance box with a heading that shows the month and its number of days
    page.draw_rect(fitz.Rect(36, 210, 559, 290), color=(0.84, 0.88, 0.94), fill=(0.965, 0.978, 0.995), width=0.8)
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(fitz.Rect(36, 210, 559, 230), color=(0.84, 0.88, 0.94), fill=(0.91, 0.94, 0.98), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 224), f"ATTENDANCE BREAKDOWN — {target_month.upper()} {target_year} ({cal_days} CALENDAR DAYS)", fontsize=8, fontname=fn_bold, color=(0.18, 0.32, 0.60))

    # Five columns across the page; first row of labels and numbers
    col_xs = [48, 150, 252, 355, 458]
    # Set labels_r1 variable to store labels r1 value
    labels_r1 = ["Present Days", "Half Days", "Paid Leave", "Unpaid Leave", "Weekly Off"]
    # Set vals_r1 variable to store vals r1 value
    vals_r1 = [f"{pres_days:.0f}", f"{half_days:.0f}", f"{p_leave:.0f}", f"{up_leave:.0f}", f"{w_off:.0f}"]
    # Iterate through items in sequence loop
    for x, l, v in zip(col_xs, labels_r1, vals_r1):
        # Invoke page.insert_text to perform operational action
        page.insert_text((x, 246), l, fontsize=7.6, fontname=fn_reg, color=(0.45, 0.48, 0.56))
        # Invoke page.insert_text to perform operational action
        page.insert_text((x, 259), v, fontsize=9.2, fontname=fn_bold, color=(0.10, 0.14, 0.24))

    # Second row of labels and numbers (unpaid days show in red, paid days in green)
    labels_r2 = ["Holidays", "Absent Days", "LOP Days", "Paid Days", "Calendar Days"]
    # Set vals_r2 variable to store vals r2 value
    vals_r2 = [f"{holidays:.0f}", f"{absent:.0f}", f"{lop_days:.1f}", f"{paid_days:.1f}", f"{cal_days}"]
    # Iterate through items in sequence loop
    for x, l, v in zip(col_xs, labels_r2, vals_r2):
        # Invoke page.insert_text to perform operational action
        page.insert_text((x, 273), l, fontsize=7.6, fontname=fn_reg, color=(0.45, 0.48, 0.56))
        # Set c_val variable to store c val value
        c_val = (0.78, 0.15, 0.15) if l == "LOP Days" and lop_days > 0 else (0.08, 0.50, 0.20) if l == "Paid Days" else (0.10, 0.14, 0.24)
        # Invoke page.insert_text to perform operational action
        page.insert_text((x, 285), v, fontsize=9.2, fontname=fn_bold, color=c_val)

    # -------------------------------------------------------------
    # 4. DAILY SALARY CALCULATION STRIP (y: 298 to 326)
    # -------------------------------------------------------------
    # A thin strip that explains how one day's pay was found
    page.draw_rect(fitz.Rect(36, 298, 559, 326), color=(0.85, 0.82, 0.96), fill=(0.96, 0.94, 0.995), width=0.8)
    # Set sal_label variable to store sal label value
    sal_label = "Monthly Stipend" if is_intern else "Monthly Salary"
    # Set formula_txt variable to store formula txt value
    formula_txt = f"DAILY SALARY CALCULATION: {sal_label} ({_format_inr_currency(monthly_comp)}) ÷ Calendar Days ({cal_days}) = {_format_inr_currency(daily_sal)} per day"
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 315), formula_txt, fontsize=8.4, fontname=fn_semi, color=(0.35, 0.22, 0.72))

    # -------------------------------------------------------------
    # 5. EARNINGS & DEDUCTIONS COMPARATIVE TABLES (y: 334 to 572)
    # -------------------------------------------------------------
    # Two tables side by side: money earned on the left, money cut on the right
    e_left, e_right = 36, 292
    # Execute statement to process data and maintain state
    d_left, d_right = 303, 559
    
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(fitz.Rect(e_left, 334, e_right, 572), color=(0.84, 0.87, 0.94), fill=(1, 1, 1), width=0.8)
    # Invoke page.draw_rect to perform operational action
    page.draw_rect(fitz.Rect(d_left, 334, d_right, 572), color=(0.94, 0.85, 0.85), fill=(1, 1, 1), width=0.8)

    # Headers
    # Table headings: "EARNINGS" (blue) and "DEDUCTIONS" (red), each with an amount column
    page.draw_rect(fitz.Rect(e_left, 334, e_right, 358), color=(0.84, 0.87, 0.94), fill=(0.92, 0.94, 0.98), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 350), "EARNINGS", fontsize=8.8, fontname=fn_bold, color=(0.20, 0.28, 0.62))
    # Set hdr_amt variable to store hdr amt value
    hdr_amt = "AMOUNT (INR)"
    # Invoke page.insert_text to perform operational action
    page.insert_text((215, 350), hdr_amt, fontsize=8, fontname=fn_bold, color=(0.20, 0.28, 0.62))

    # Invoke page.draw_rect to perform operational action
    page.draw_rect(fitz.Rect(d_left, 334, d_right, 358), color=(0.94, 0.85, 0.85), fill=(0.98, 0.92, 0.92), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 350), "DEDUCTIONS", fontsize=8.8, fontname=fn_bold, color=(0.68, 0.15, 0.15))
    # Invoke page.insert_text to perform operational action
    page.insert_text((482, 350), hdr_amt, fontsize=8, fontname=fn_bold, color=(0.68, 0.15, 0.15))

    # The lines of the left table (blank lines keep both tables the same height)
    earnings_rows = [
        # Execute statement to process data and maintain state
        ("Monthly Stipend" if is_intern else "Monthly Base Salary", monthly_comp),
        # Execute statement to process data and maintain state
        ("Earned Basic Salary", basic_val),
        # Execute statement to process data and maintain state
        ("Earned HRA", hra_val),
        # Execute statement to process data and maintain state
        ("Earned Flexi Allowance", special_val),
        # Execute statement to process data and maintain state
        ("Arrears / Additions", arrears_val),
        # Execute statement to process data and maintain state
        ("", None),
        # Execute statement to process data and maintain state
        ("", None),
        # Execute statement to process data and maintain state
        ("", None),
    # Execute statement to process data and maintain state
    ]

    # The lines of the right table
    deductions_rows = [
        # Execute statement to process data and maintain state
        ("PF Wages", pf_wages),
        # Execute statement to process data and maintain state
        ("Provident Fund (PF)", pf_val),
        # Execute statement to process data and maintain state
        ("Professional Tax (PT)", pt_val),
        # Execute statement to process data and maintain state
        ("ESIC", esic_val),
        # Execute statement to process data and maintain state
        ("Labour Welfare Fund (LWF)", lwf_val),
        # Execute statement to process data and maintain state
        ("TDS", tds_val),
        # Execute statement to process data and maintain state
        ("Leave Deduction", lop_ded_val),
        # Execute statement to process data and maintain state
        ("Other Deductions", other_ded_val),
    # Execute statement to process data and maintain state
    ]

    # Write the 8 lines of both tables, moving down 21 points each time
    curr_y = 377
    # Iterate through items in sequence loop
    for i in range(8):
        # Execute statement to process data and maintain state
        e_label, e_amt = earnings_rows[i]
        # Execute statement to process data and maintain state
        d_label, d_amt = deductions_rows[i]

        # Colour every second line lightly so the rows are easy to follow
        if i % 2 == 1:
            # Invoke page.draw_rect to perform operational action
            page.draw_rect(fitz.Rect(e_left + 1, curr_y - 13, e_right - 1, curr_y + 8), color=None, fill=(0.98, 0.985, 1.0))
            # Invoke page.draw_rect to perform operational action
            page.draw_rect(fitz.Rect(d_left + 1, curr_y - 13, d_right - 1, curr_y + 8), color=None, fill=(1.0, 0.985, 0.985))

        # Earnings Row
        # Left table line: label on the left, amount pushed to the right edge
        if e_amt is not None and e_label:
            # Invoke page.insert_text to perform operational action
            page.insert_text((48, curr_y), e_label, fontsize=8.4, fontname=fn_reg, color=(0.15, 0.18, 0.25))
            # Set amt_str variable to store amt str value
            amt_str = _format_inr_currency(e_amt)
            # Set tw variable to store tw value
            tw = f_obj_med.text_length(amt_str, fontsize=8.6)
            # Invoke page.insert_text to perform operational action
            page.insert_text((280 - tw, curr_y), amt_str, fontsize=8.6, fontname=fn_med, color=(0.10, 0.14, 0.24))

        # Deductions Row
        # Right table line: same style
        if d_label:
            # Invoke page.insert_text to perform operational action
            page.insert_text((315, curr_y), d_label, fontsize=8.4, fontname=fn_reg, color=(0.15, 0.18, 0.25))
            # Set amt_str variable to store amt str value
            amt_str = _format_inr_currency(d_amt)
            # Set tw variable to store tw value
            tw = f_obj_med.text_length(amt_str, fontsize=8.6)
            # Invoke page.insert_text to perform operational action
            page.insert_text((548 - tw, curr_y), amt_str, fontsize=8.6, fontname=fn_med, color=(0.10, 0.14, 0.24))

        # Execute statement to process data and maintain state
        curr_y += 21

    # Totals Row (y: 546 to 572)
    # Bottom strip of the left table: total salary earned (green)
    page.draw_rect(fitz.Rect(e_left, 546, e_right, 572), color=(0.84, 0.87, 0.94), fill=(0.92, 0.97, 0.94), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 562), "GROSS EARNED SALARY", fontsize=8.5, fontname=fn_bold, color=(0.08, 0.45, 0.20))
    # Set gross_str variable to store gross str value
    gross_str = _format_inr_currency(gross_val)
    # Set gw variable to store gw value
    gw = f_obj_bold.text_length(gross_str, fontsize=9.2)
    # Invoke page.insert_text to perform operational action
    page.insert_text((280 - gw, 562), gross_str, fontsize=9.2, fontname=fn_bold, color=(0.08, 0.45, 0.20))

    # Bottom strip of the right table: total money cut (red)
    page.draw_rect(fitz.Rect(d_left, 546, d_right, 572), color=(0.94, 0.85, 0.85), fill=(0.99, 0.92, 0.92), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((315, 562), "TOTAL DEDUCTIONS", fontsize=8.5, fontname=fn_bold, color=(0.75, 0.15, 0.15))
    # Set ded_str variable to store ded str value
    ded_str = _format_inr_currency(total_ded)
    # Set dw variable to store dw value
    dw = f_obj_bold.text_length(ded_str, fontsize=9.2)
    # Invoke page.insert_text to perform operational action
    page.insert_text((548 - dw, 562), ded_str, fontsize=9.2, fontname=fn_bold, color=(0.75, 0.15, 0.15))

    # -------------------------------------------------------------
    # 6. NET SALARY PAYABLE HERO CARD (y: 582 to 662)
    # -------------------------------------------------------------
    # Big green box showing the final take-home money
    page.draw_rect(fitz.Rect(36, 582, 559, 662), color=(0.14, 0.60, 0.30), fill=(0.94, 0.99, 0.95), width=1.4)
    
    # Net Title & Large Value
    page.insert_text((52, 608), "NET SALARY PAYABLE", fontsize=12.5, fontname=fn_bold, color=(0.08, 0.45, 0.20))
    # Set net_str variable to store net str value
    net_str = _format_inr_currency(net_val)
    # Set nw variable to store nw value
    nw = f_obj_bold.text_length(net_str, fontsize=18)
    # Invoke page.insert_text to perform operational action
    page.insert_text((545 - nw, 610), net_str, fontsize=18, fontname=fn_bold, color=(0.08, 0.45, 0.20))

    # Amount in Words
    # The same amount written in words
    words_txt = f"Amount in Words: {_convert_number_to_indian_words(net_val)}"
    # Invoke insert_fitted to perform operational action
    insert_fitted((52, 630), words_txt, 490, f_obj_semi, fn_semi, 8.5, (0.12, 0.38, 0.20))

    # Reconciliation Breakdown
    # One line showing that earned money minus cuts equals take-home money
    recon_txt = f"Reconciliation: Gross Earned ({_format_inr_currency(gross_val)}) − Total Deductions ({_format_inr_currency(total_ded)}) = Net Salary ({_format_inr_currency(net_val)})"
    # Invoke page.insert_text to perform operational action
    page.insert_text((52, 648), recon_txt, fontsize=8.0, fontname=fn_reg, color=(0.35, 0.42, 0.38))

    # -------------------------------------------------------------
    # 7. POLICY & STATUTORY NOTES (y: 672 to 742)
    # -------------------------------------------------------------
    # A small notes box explaining PF, government fee and how days were counted
    page.draw_rect(fitz.Rect(36, 672, 559, 742), color=(0.86, 0.88, 0.92), fill=(0.975, 0.98, 0.99), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 688), "PAYROLL NOTES", fontsize=8.2, fontname=fn_bold, color=(0.28, 0.32, 0.45))
    # Evaluate condition to control execution branch
    if pf_val > 0:
        # Set pf_note variable to store pf note value
        pf_note = f"• Provident Fund (PF): Calculated on PF wages of {_format_inr_currency(pf_wages)} (PF: {_format_inr_currency(pf_val)})."
    # Execute fallback branch when conditions are not met
    else:
        # Set pf_note variable to store pf note value
        pf_note = f"• Provident Fund (PF): Currently not applicable under company configuration (PF Wages: {_format_inr_currency(pf_wages)}, PF: {_format_inr_currency(pf_val)})."
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 704), pf_note, fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 718), f"• Professional Tax (PT): Applied according to configured payroll policy ({_format_inr_currency(pt_val)}).", fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))
    # Invoke page.insert_text to perform operational action
    page.insert_text((48, 732), f"• Salary is calculated using actual calendar days of the payroll month ({cal_days} Days).", fontsize=7.8, fontname=fn_reg, color=(0.38, 0.42, 0.50))

    # -------------------------------------------------------------
    # 8. FOOTER & AUTHORIZED SIGNATORY (y: 752 to 812)
    # -------------------------------------------------------------
    # A line that separates the footer from the rest of the page
    page.draw_line((36, 752), (559, 752), color=(0.85, 0.87, 0.92), width=0.8)
    
    # Left Note
    # Left side of the footer: a note that no signature is needed, and the date it was made
    page.insert_text((38, 770), "This is a system-generated salary statement and does not require a physical signature.", fontsize=7.5, fontname=fn_reg, color=(0.55, 0.58, 0.65))
    # Set now variable to store now value
    now = datetime.now()
    # Invoke page.insert_text to perform operational action
    page.insert_text((38, 784), f"Generated on: {now.strftime('%d %b %Y')} · Confidential document for employee use only.", fontsize=7.2, fontname=fn_reg, color=(0.60, 0.64, 0.70))

    # Right Signatory
    # Right side of the footer: a signature line with the company name below it
    page.draw_line((390, 780), (545, 780), color=(0.60, 0.65, 0.75), width=0.8)
    # Invoke page.insert_text to perform operational action
    page.insert_text((410, 794), "Authorized Signatory", fontsize=9, fontname=fn_semi, color=(0.15, 0.18, 0.28))
    # Invoke page.insert_text to perform operational action
    page.insert_text((390, 807), "LA ESFERA INFOTECH PRIVATE LIMITED", fontsize=7.8, fontname=fn_bold, color=(0.38, 0.22, 0.78))

    # Turn the drawn page into PDF data, close it, and hand the data back
    pdf_bytes = doc.tobytes()
    # Invoke doc.close to perform operational action
    doc.close()
    # Return computed result or response payload to caller
    return pdf_bytes


# ==============================================================================
# EMPLOYEE'S OWN PAYSLIP LIST (get_employee_payslip_data)
# ==============================================================================
# Gives an employee all their saved payslips for one money-year (April to March),
# plus yearly totals. Only real saved payslips are shown. Nothing is made up.
# ==============================================================================
def get_employee_payslip_data(db: Session, emp_code: str, financial_year: str = "2026-2027"):
    """
    Returns actual persisted payslips for Employee Portal.
    DO NOT GENERATE FAKE PAYSLIPS IF NONE EXIST!
    """
    init_payslips_table(db)

    # Get this employee's payslips for the chosen money-year, in order from April to March
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

    # Running totals for the whole year, all starting at zero
    slips = []
    # Set tot_gross variable to store tot gross value
    tot_gross = 0.0
    # Set tot_net variable to store tot net value
    tot_net = 0.0
    # Set tot_deductions variable to store tot deductions value
    tot_deductions = 0.0
    # Set tot_contributions variable to store tot contributions value
    tot_contributions = 0.0
    # Set tot_ctc variable to store tot ctc value
    tot_ctc = 0.0

    # Go through each payslip: read its numbers, add them to the yearly totals, and make a clean entry
    for r in rows:
        # Set gross variable to store gross value
        gross = float(r.get("gross_earnings") or 0.0)
        # Set net variable to store net value
        net = float(r.get("net_salary") or 0.0)
        # Set ded variable to store ded value
        ded = float(r.get("total_deductions") or 0.0)
        # Set contrib variable to store contrib value
        contrib = float(r.get("employer_contributions") or 0.0)
        # Set ctc_val variable to store ctc val value
        ctc_val = float(r.get("ctc") or 0.0)

        # Execute statement to process data and maintain state
        tot_gross += gross
        # Execute statement to process data and maintain state
        tot_net += net
        # Execute statement to process data and maintain state
        tot_deductions += ded
        # Execute statement to process data and maintain state
        tot_contributions += contrib
        # Execute statement to process data and maintain state
        tot_ctc += ctc_val

        # Execute statement to process data and maintain state
        slips.append({
            # Execute statement to process data and maintain state
            "id": r.get("id"),
            # Execute statement to process data and maintain state
            "emp_code": r.get("emp_code"),
            # Execute statement to process data and maintain state
            "employee_name": r.get("employee_name"),
            # Execute statement to process data and maintain state
            "month": r.get("month"),
            # Execute statement to process data and maintain state
            "year": r.get("year"),
            # Execute statement to process data and maintain state
            "financial_year": r.get("financial_year"),
            # Execute statement to process data and maintain state
            "month_year": f"{r.get('month')} {r.get('year')}",
            # Execute statement to process data and maintain state
            "basic_salary": float(r.get("basic_salary") or 0.0),
            # Execute statement to process data and maintain state
            "hra": float(r.get("hra") or 0.0),
            # Execute statement to process data and maintain state
            "special_allowance": float(r.get("special_allowance") or 0.0),
            # Execute statement to process data and maintain state
            "gross_earnings": gross,
            # Execute statement to process data and maintain state
            "pf_deduction": float(r.get("pf_deduction") or 0.0),
            # Execute statement to process data and maintain state
            "pt_deduction": float(r.get("pt_deduction") or 0.0),
            # Execute statement to process data and maintain state
            "total_deductions": ded,
            # Execute statement to process data and maintain state
            "net_salary": net,
            # Execute statement to process data and maintain state
            "employer_pf": float(r.get("employer_pf") or 0.0),
            # Execute statement to process data and maintain state
            "employer_contributions": contrib,
            # Execute statement to process data and maintain state
            "ctc": ctc_val,
            # Execute statement to process data and maintain state
            "total_days": r.get("total_days") or 30,
            # Execute statement to process data and maintain state
            "paid_days": r.get("paid_days") or 30,
            # Execute statement to process data and maintain state
            "status": r.get("status") or "Paid",
            # Execute statement to process data and maintain state
            "generated_on": str(r.get("generated_on") or "")
        # Execute statement to process data and maintain state
        })

    # Work out how many months were paid and what share of the company cost goes to
    # take-home pay, cuts and company contributions (shown as percentages)
    months_paid = len(slips)
    # Set net_pct variable to store net pct value
    net_pct = round((tot_net / tot_ctc * 100), 1) if tot_ctc > 0 else 100.0
    # Set ded_pct variable to store ded pct value
    ded_pct = round((tot_deductions / tot_ctc * 100), 1) if tot_ctc > 0 else 0.0
    # Set contrib_pct variable to store contrib pct value
    contrib_pct = round((tot_contributions / tot_ctc * 100), 1) if tot_ctc > 0 else 0.0

    # Give back the yearly summary and the list of payslips
    return {
        # Execute statement to process data and maintain state
        "emp_code": emp_code,
        # Execute statement to process data and maintain state
        "financial_year": financial_year,
        # Execute statement to process data and maintain state
        "ytd_summary": {
            # Execute statement to process data and maintain state
            "months_paid": months_paid,
            # Execute statement to process data and maintain state
            "gross_earnings": round(tot_gross, 2),
            # Execute statement to process data and maintain state
            "net_take_home": round(tot_net, 2),
            # Execute statement to process data and maintain state
            "employer_contributions": round(tot_contributions, 2),
            # Execute statement to process data and maintain state
            "total_ctc": round(tot_ctc, 2),
            # Execute statement to process data and maintain state
            "composition": {
                # Execute statement to process data and maintain state
                "net_pct": net_pct,
                # Execute statement to process data and maintain state
                "deductions_pct": ded_pct,
                # Execute statement to process data and maintain state
                "contributions_pct": contrib_pct
            # Execute statement to process data and maintain state
            }
        # Execute statement to process data and maintain state
        },
        # Execute statement to process data and maintain state
        "slips": slips
    # Execute statement to process data and maintain state
    }