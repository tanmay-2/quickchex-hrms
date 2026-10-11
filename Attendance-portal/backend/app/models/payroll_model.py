# app/models/payroll_model.py
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, Text, func, UniqueConstraint
from app.db.base import Base

class PayrollProfile(Base):
    __tablename__ = "payroll_profiles"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), unique=True, index=True, nullable=False)
    basic_salary = Column(Numeric(12, 2), default=0.00)
    hra = Column(Numeric(12, 2), default=0.00)
    special_allowance = Column(Numeric(12, 2), default=0.00)
    gross_salary = Column(Numeric(12, 2), default=0.00)
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    pt_deduction = Column(Numeric(12, 2), default=0.00)
    other_deductions = Column(Numeric(12, 2), default=0.00)
    net_salary = Column(Numeric(12, 2), default=0.00)
    employer_pf = Column(Numeric(12, 2), default=0.00)
    employer_contributions = Column(Numeric(12, 2), default=0.00)
    ctc = Column(Numeric(12, 2), default=0.00)
    pay_frequency = Column(String(50), default="Monthly")
    effective_date = Column(Date, nullable=True)
    status = Column(String(50), default="Payroll Setup Required")
    pt_applicable = Column(Boolean, default=True)
    pf_applicable = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), nullable=False, index=True)
    employee_name = Column(String(150), nullable=True)
    month = Column(String(20), nullable=False)
    year = Column(Integer, nullable=False)
    financial_year = Column(String(20), nullable=False)
    basic_salary = Column(Numeric(12, 2), default=0.00)
    hra = Column(Numeric(12, 2), default=0.00)
    special_allowance = Column(Numeric(12, 2), default=0.00)
    gross_earnings = Column(Numeric(12, 2), default=0.00)
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    pt_deduction = Column(Numeric(12, 2), default=200.00)
    total_deductions = Column(Numeric(12, 2), default=0.00)
    net_salary = Column(Numeric(12, 2), default=0.00)
    employer_pf = Column(Numeric(12, 2), default=0.00)
    employer_contributions = Column(Numeric(12, 2), default=0.00)
    ctc = Column(Numeric(12, 2), default=0.00)
    total_days = Column(Integer, default=30)
    paid_days = Column(Integer, default=30)
    status = Column(String(50), default="Paid")
    generated_on = Column(Date, server_default=func.current_date())
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("emp_code", "month", "year", name="unique_emp_month_year"),
    )


class PayrollSetting(Base):
    __tablename__ = "payroll_settings"

    id = Column(Integer, primary_key=True, index=True)
    salary_day_basis = Column(String(50), default="Calendar Days")
    pt_enabled = Column(Boolean, default=True)
    pt_amount = Column(Numeric(10, 2), default=200.00)
    pf_applicable = Column(Boolean, default=False)
    pf_wages_basis = Column(String(50), default="Basic + DA")
    pf_employee_percent = Column(Numeric(5, 2), default=12.00)
    pf_employer_percent = Column(Numeric(5, 2), default=12.00)
    pf_wage_ceiling = Column(Numeric(12, 2), default=15000.00)
    intern_eligibility_months = Column(Integer, default=6)
    intern_conversion_mode = Column(String(50), default="Manual HR Approval")
    intern_paid_leave_enabled = Column(Boolean, default=False)
    intern_paid_leave_quota = Column(Numeric(5, 1), default=0.0)
    intern_unpaid_leave_enabled = Column(Boolean, default=True)
    employee_paid_leave_enabled = Column(Boolean, default=True)
    weekly_off_paid = Column(Boolean, default=True)
    paid_holiday_paid = Column(Boolean, default=True)
    allow_negative_salary = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(100), default="Admin")


class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(20), nullable=False)
    year = Column(Integer, nullable=False)
    calendar_days = Column(Integer, default=30)
    status = Column(String(50), default="Draft")  # Draft, Calculated, Under Review, Finalized, Reopened
    total_employees = Column(Integer, default=0)
    total_interns = Column(Integer, default=0)
    total_gross = Column(Numeric(14, 2), default=0.00)
    total_lop = Column(Numeric(14, 2), default=0.00)
    total_pt = Column(Numeric(14, 2), default=0.00)
    total_other_deductions = Column(Numeric(14, 2), default=0.00)
    total_net = Column(Numeric(14, 2), default=0.00)
    total_exceptions = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    finalized_at = Column(DateTime, nullable=True)
    finalized_by = Column(String(100), nullable=True)
    reopened_at = Column(DateTime, nullable=True)
    reopened_by = Column(String(100), nullable=True)

    __table_args__ = (
        UniqueConstraint("month", "year", name="unique_payroll_run_month_year"),
    )


class InternConversionRecord(Base):
    __tablename__ = "intern_conversion_records"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), nullable=False, index=True)
    joining_date = Column(Date, nullable=True)
    internship_period_months = Column(Integer, default=6)
    eligibility_date = Column(Date, nullable=True)
    decision = Column(String(50), default="Pending HR Review")  # Pending HR Review, Converted, Extended, Not Converted
    effective_employee_date = Column(Date, nullable=True)
    extension_months = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    decided_by = Column(String(100), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PayrollRecord(Base):
    __tablename__ = "payroll_records"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(20), nullable=False)
    year = Column(Integer, nullable=False)
    emp_code = Column(String(50), nullable=False, index=True)
    employee_name = Column(String(150), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    worker_type = Column(String(50), default="Regular Employee")  # Regular Employee, Intern
    employment_status = Column(String(50), default="Active")
    joining_date = Column(Date, nullable=True)
    last_working_date = Column(Date, nullable=True)
    conversion_status = Column(String(50), default="N/A")
    conversion_date = Column(Date, nullable=True)
    monthly_compensation = Column(Numeric(12, 2), default=0.00)
    calendar_days = Column(Integer, default=30)
    eligible_days = Column(Integer, default=30)
    daily_salary = Column(Numeric(12, 4), default=0.0000)
    present_days = Column(Numeric(6, 2), default=0.00)
    half_days = Column(Numeric(6, 2), default=0.00)
    paid_leave_days = Column(Numeric(6, 2), default=0.00)
    unpaid_leave_days = Column(Numeric(6, 2), default=0.00)
    weekly_off_days = Column(Numeric(6, 2), default=0.00)
    holiday_days = Column(Numeric(6, 2), default=0.00)
    absent_days = Column(Numeric(6, 2), default=0.00)
    paid_equivalent_days = Column(Numeric(6, 2), default=0.00)
    lop_days = Column(Numeric(6, 2), default=0.00)
    lop_deduction = Column(Numeric(12, 2), default=0.00)
    # Detailed Salary Components & Allowances (Fixed Structure)
    basic_salary = Column(Numeric(12, 2), default=0.00)
    hra = Column(Numeric(12, 2), default=0.00)
    special_allowance = Column(Numeric(12, 2), default=0.00)  # Flexi Allowance / Other Allowance
    
    # Earned Salary Components (prorated by paid days / calendar days)
    earn_basic = Column(Numeric(12, 2), default=0.00)
    earn_hra = Column(Numeric(12, 2), default=0.00)
    earn_special_allowance = Column(Numeric(12, 2), default=0.00)
    
    # Statutory & Configured Deductions
    pf_applicable = Column(Boolean, default=False)
    pf_wages = Column(Numeric(12, 2), default=0.00)
    pf_deduction = Column(Numeric(12, 2), default=0.00)
    esic_deduction = Column(Numeric(12, 2), default=0.00)
    tds_deduction = Column(Numeric(12, 2), default=0.00)
    lwf_deduction = Column(Numeric(12, 2), default=0.00)
    arrears = Column(Numeric(12, 2), default=0.00)

    pt_applicable = Column(Boolean, default=True)
    pt_deduction = Column(Numeric(12, 2), default=0.00)
    other_deductions = Column(Numeric(12, 2), default=0.00)
    net_salary = Column(Numeric(12, 2), default=0.00)
    status = Column(String(50), default="Calculated")
    exceptions = Column(Text, nullable=True)
    calculation_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("emp_code", "month", "year", name="unique_payroll_record_emp_month_year"),
    )

