# app/models/payroll_model.py
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, func, UniqueConstraint
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
