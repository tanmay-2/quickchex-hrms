# ==============================================================================
# QUICKCHEX HRMS BACKEND - PAYROLL_MODEL.PY
# Path: Attendance-portal/backend/app/models/payroll_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'payroll_model'.
# Classes / Data Models:
#   • PayrollProfile
#   • Payslip
#   • PayrollSetting
#   • PayrollRun
#   • InternConversionRecord
#   • PayrollRecord
# ==============================================================================

# app/models/payroll_model.py
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, Text, func, UniqueConstraint
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class PayrollProfile inheriting from Base
class PayrollProfile(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "payroll_profiles"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), unique=True, index=True, nullable=False)
    # Define database column schema mapping for basic salary
    basic_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for hra
    hra = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for special allowance
    special_allowance = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for gross salary
    gross_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pf deduction
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pt deduction
    pt_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for other deductions
    other_deductions = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for tds
    tds = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for lwf
    lwf = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for arrears
    arrears = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for esic
    esic = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for net salary
    net_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for employer pf
    employer_pf = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for employer contributions
    employer_contributions = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for ctc
    ctc = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pay frequency
    pay_frequency = Column(String(50), default="Monthly")
    # Define database column schema mapping for effective date
    effective_date = Column(Date, nullable=True)
    # Define database column schema mapping for status
    status = Column(String(50), default="Payroll Setup Required")
    # Define database column schema mapping for pt applicable
    pt_applicable = Column(Boolean, default=True)
    # Define database column schema mapping for pf applicable
    pf_applicable = Column(Boolean, default=False)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# Define class Payslip inheriting from Base
class Payslip(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "payslips"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), nullable=False, index=True)
    # Define database column schema mapping for employee name
    employee_name = Column(String(150), nullable=True)
    # Define database column schema mapping for month
    month = Column(String(20), nullable=False)
    # Define database column schema mapping for year
    year = Column(Integer, nullable=False)
    # Define database column schema mapping for financial year
    financial_year = Column(String(20), nullable=False)
    # Define database column schema mapping for basic salary
    basic_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for hra
    hra = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for special allowance
    special_allowance = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for gross earnings
    gross_earnings = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pf deduction
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pt deduction
    pt_deduction = Column(Numeric(12, 2), default=200.00)
    # Define database column schema mapping for total deductions
    total_deductions = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for net salary
    net_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for employer pf
    employer_pf = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for employer contributions
    employer_contributions = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for ctc
    ctc = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for total days
    total_days = Column(Integer, default=30)
    # Define database column schema mapping for paid days
    paid_days = Column(Integer, default=30)
    # Define database column schema mapping for status
    status = Column(String(50), default="Paid")
    # Define database column schema mapping for generated on
    generated_on = Column(Date, server_default=func.current_date())
    # Define database column schema mapping for created at
    created_at = Column(DateTime, server_default=func.now())

    # Set __table_args__ variable to store   table args   value
    __table_args__ = (
        # Invoke UniqueConstraint to perform operational action
        UniqueConstraint("emp_code", "month", "year", name="unique_emp_month_year"),
    # Execute statement to process data and maintain state
    )


# Define class PayrollSetting inheriting from Base
class PayrollSetting(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "payroll_settings"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for salary day basis
    salary_day_basis = Column(String(50), default="Calendar Days")
    # Define database column schema mapping for pt enabled
    pt_enabled = Column(Boolean, default=True)
    # Define database column schema mapping for pt amount
    pt_amount = Column(Numeric(10, 2), default=200.00)
    # Define database column schema mapping for pf applicable
    pf_applicable = Column(Boolean, default=False)
    # Define database column schema mapping for pf wages basis
    pf_wages_basis = Column(String(50), default="Basic + DA")
    # Define database column schema mapping for pf employee percent
    pf_employee_percent = Column(Numeric(5, 2), default=12.00)
    # Define database column schema mapping for pf employer percent
    pf_employer_percent = Column(Numeric(5, 2), default=12.00)
    # Define database column schema mapping for pf wage ceiling
    pf_wage_ceiling = Column(Numeric(12, 2), default=15000.00)
    # Define database column schema mapping for intern eligibility months
    intern_eligibility_months = Column(Integer, default=6)
    # Define database column schema mapping for intern conversion mode
    intern_conversion_mode = Column(String(50), default="Manual HR Approval")
    # Define database column schema mapping for intern paid leave enabled
    intern_paid_leave_enabled = Column(Boolean, default=False)
    # Define database column schema mapping for intern paid leave quota
    intern_paid_leave_quota = Column(Numeric(5, 1), default=0.0)
    # Define database column schema mapping for intern unpaid leave enabled
    intern_unpaid_leave_enabled = Column(Boolean, default=True)
    # Define database column schema mapping for employee paid leave enabled
    employee_paid_leave_enabled = Column(Boolean, default=True)
    # Define database column schema mapping for weekly off paid
    weekly_off_paid = Column(Boolean, default=True)
    # Define database column schema mapping for paid holiday paid
    paid_holiday_paid = Column(Boolean, default=True)
    # Define database column schema mapping for allow negative salary
    allow_negative_salary = Column(Boolean, default=False)
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    # Define database column schema mapping for updated by
    updated_by = Column(String(100), default="Admin")


# Define class PayrollRun inheriting from Base
class PayrollRun(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "payroll_runs"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for month
    month = Column(String(20), nullable=False)
    # Define database column schema mapping for year
    year = Column(Integer, nullable=False)
    # Define database column schema mapping for calendar days
    calendar_days = Column(Integer, default=30)
    status = Column(String(50), default="Draft")  # Draft, Calculated, Under Review, Finalized, Reopened
    # Define database column schema mapping for total employees
    total_employees = Column(Integer, default=0)
    # Define database column schema mapping for total interns
    total_interns = Column(Integer, default=0)
    # Define database column schema mapping for total gross
    total_gross = Column(Numeric(14, 2), default=0.00)
    # Define database column schema mapping for total lop
    total_lop = Column(Numeric(14, 2), default=0.00)
    # Define database column schema mapping for total pt
    total_pt = Column(Numeric(14, 2), default=0.00)
    # Define database column schema mapping for total other deductions
    total_other_deductions = Column(Numeric(14, 2), default=0.00)
    # Define database column schema mapping for total net
    total_net = Column(Numeric(14, 2), default=0.00)
    # Define database column schema mapping for total exceptions
    total_exceptions = Column(Integer, default=0)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    # Define database column schema mapping for finalized at
    finalized_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for finalized by
    finalized_by = Column(String(100), nullable=True)
    # Define database column schema mapping for reopened at
    reopened_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for reopened by
    reopened_by = Column(String(100), nullable=True)

    # Set __table_args__ variable to store   table args   value
    __table_args__ = (
        # Invoke UniqueConstraint to perform operational action
        UniqueConstraint("month", "year", name="unique_payroll_run_month_year"),
    # Execute statement to process data and maintain state
    )


# Define class InternConversionRecord inheriting from Base
class InternConversionRecord(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "intern_conversion_records"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), nullable=False, index=True)
    # Define database column schema mapping for joining date
    joining_date = Column(Date, nullable=True)
    # Define database column schema mapping for internship period months
    internship_period_months = Column(Integer, default=6)
    # Define database column schema mapping for eligibility date
    eligibility_date = Column(Date, nullable=True)
    decision = Column(String(50), default="Pending HR Review")  # Pending HR Review, Converted, Extended, Not Converted
    # Define database column schema mapping for effective employee date
    effective_employee_date = Column(Date, nullable=True)
    # Define database column schema mapping for extension months
    extension_months = Column(Integer, default=0)
    # Define database column schema mapping for notes
    notes = Column(Text, nullable=True)
    # Define database column schema mapping for decided by
    decided_by = Column(String(100), nullable=True)
    # Define database column schema mapping for decided at
    decided_at = Column(DateTime, nullable=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# Define class PayrollRecord inheriting from Base
class PayrollRecord(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "payroll_records"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for month
    month = Column(String(20), nullable=False)
    # Define database column schema mapping for year
    year = Column(Integer, nullable=False)
    # Define database column schema mapping for emp code
    emp_code = Column(String(50), nullable=False, index=True)
    # Define database column schema mapping for employee name
    employee_name = Column(String(150), nullable=True)
    # Define database column schema mapping for department
    department = Column(String(100), nullable=True)
    # Define database column schema mapping for designation
    designation = Column(String(100), nullable=True)
    worker_type = Column(String(50), default="Regular Employee")  # Regular Employee, Intern
    # Define database column schema mapping for employment status
    employment_status = Column(String(50), default="Active")
    # Define database column schema mapping for joining date
    joining_date = Column(Date, nullable=True)
    # Define database column schema mapping for last working date
    last_working_date = Column(Date, nullable=True)
    # Define database column schema mapping for conversion status
    conversion_status = Column(String(50), default="N/A")
    # Define database column schema mapping for conversion date
    conversion_date = Column(Date, nullable=True)
    # Define database column schema mapping for monthly compensation
    monthly_compensation = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for calendar days
    calendar_days = Column(Integer, default=30)
    # Define database column schema mapping for eligible days
    eligible_days = Column(Integer, default=30)
    # Define database column schema mapping for daily salary
    daily_salary = Column(Numeric(12, 4), default=0.0000)
    # Define database column schema mapping for present days
    present_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for half days
    half_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for paid leave days
    paid_leave_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for unpaid leave days
    unpaid_leave_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for weekly off days
    weekly_off_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for holiday days
    holiday_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for absent days
    absent_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for paid equivalent days
    paid_equivalent_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for lop days
    lop_days = Column(Numeric(6, 2), default=0.00)
    # Define database column schema mapping for lop deduction
    lop_deduction = Column(Numeric(12, 2), default=0.00)
    # Detailed Salary Components & Allowances (Fixed Structure)
    basic_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for hra
    hra = Column(Numeric(12, 2), default=0.00)
    special_allowance = Column(Numeric(12, 2), default=0.00)  # Flexi Allowance / Other Allowance
    
    # Earned Salary Components (prorated by paid days / calendar days)
    earn_basic = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for earn hra
    earn_hra = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for earn special allowance
    earn_special_allowance = Column(Numeric(12, 2), default=0.00)
    
    # Statutory & Configured Deductions
    pf_applicable = Column(Boolean, default=False)
    # Define database column schema mapping for pf wages
    pf_wages = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for pf deduction
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for esic deduction
    esic_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for tds deduction
    tds_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for lwf deduction
    lwf_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for arrears
    arrears = Column(Numeric(12, 2), default=0.00)

    # Define database column schema mapping for pt applicable
    pt_applicable = Column(Boolean, default=True)
    # Define database column schema mapping for pt deduction
    pt_deduction = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for other deductions
    other_deductions = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for net salary
    net_salary = Column(Numeric(12, 2), default=0.00)
    # Define database column schema mapping for status
    status = Column(String(50), default="Calculated")
    # Catch and handle specific exception if raised
    exceptions = Column(Text, nullable=True)
    # Define database column schema mapping for calculation notes
    calculation_notes = Column(Text, nullable=True)
    # Define database column schema mapping for created at
    created_at = Column(DateTime, server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Set __table_args__ variable to store   table args   value
    __table_args__ = (
        # Invoke UniqueConstraint to perform operational action
        UniqueConstraint("emp_code", "month", "year", name="unique_payroll_record_emp_month_year"),
    # Execute statement to process data and maintain state
    )

