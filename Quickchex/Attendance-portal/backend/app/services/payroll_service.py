import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date, datetime

logger = logging.getLogger("payroll_service")

def init_payslips_table(db: Session):
    """Ensures the payslips table exists in PostgreSQL."""
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS payslips (
                id SERIAL PRIMARY KEY,
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
                status VARCHAR(50) DEFAULT 'Paid',
                generated_on DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_emp_month_year UNIQUE (emp_code, month, year)
            );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error initializing payslips table: {e}")

def calculate_salary_breakdown(monthly_gross: float):
    gross = max(0.0, float(monthly_gross))
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
        "pf_deduction": pf_deduction,
        "pt_deduction": pt_deduction,
        "total_deductions": total_deductions,
        "net_salary": net_salary,
        "employer_pf": employer_pf,
        "employer_contributions": employer_contributions,
        "ctc": ctc
    }

def get_default_gross_by_role(role: str = ""):
    role_str = str(role or "").lower()
    if "intern" in role_str or "trainee" in role_str:
        return 18000.0
    if "lead" in role_str or "senior" in role_str or "manager" in role_str or "admin" in role_str:
        return 65000.0
    if "director" in role_str or "head" in role_str or "vp" in role_str:
        return 110000.0
    if "developer" in role_str or "engineer" in role_str or "designer" in role_str:
        return 45000.0
    return 32000.0

def generate_payslips_for_employee(db: Session, emp_code: str, employee_name: str = "", monthly_gross: float = None, annual_ctc: float = None, role: str = ""):
    init_payslips_table(db)

    # Resolve monthly gross
    gross_val = 0.0
    if monthly_gross and float(monthly_gross) > 0:
        gross_val = float(monthly_gross)
    elif annual_ctc and float(annual_ctc) > 0:
        gross_val = float(annual_ctc) / 12.0 / 1.06 # approx gross from ctc
    else:
        gross_val = get_default_gross_by_role(role)

    calc = calculate_salary_breakdown(gross_val)

    # FY 2026-2027 elapsed months: April 2026 to September 2026
    fy_months = [
        ("April", 2026, "2026-2027"),
        ("May", 2026, "2026-2027"),
        ("June", 2026, "2026-2027"),
        ("July", 2026, "2026-2027"),
        ("August", 2026, "2026-2027"),
        ("September", 2026, "2026-2027")
    ]

    for month, year, fin_year in fy_months:
        try:
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
                    30, 30, 'Paid', CURRENT_DATE
                )
                ON CONFLICT (emp_code, month, year) DO UPDATE SET
                    employee_name = EXCLUDED.employee_name,
                    financial_year = EXCLUDED.financial_year,
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
                    ctc = EXCLUDED.ctc;
            """), {
                "emp_code": emp_code,
                "employee_name": employee_name or emp_code,
                "month": month,
                "year": year,
                "fin_year": fin_year,
                **calc
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed inserting payslip for {emp_code} {month} {year}: {e}")

    return calc

def get_employee_payslip_data(db: Session, emp_code: str, financial_year: str = "2026-2027"):
    init_payslips_table(db)

    # 1. Fetch records
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

    # 2. If no rows found, try auto-generating for this employee
    if not rows:
        # Get employee profile name & role
        prof = db.execute(text("""
            SELECT first_name, last_name, role, emp_code FROM profiles
            WHERE emp_code = :code OR LOWER(emp_code) = LOWER(:code)
            LIMIT 1
        """), {"code": emp_code}).mappings().first()

        name = ""
        role = ""
        if prof:
            name = f"{prof.get('first_name', '')} {prof.get('last_name', '')}".strip()
            role = prof.get('role', '')

        generate_payslips_for_employee(db, emp_code=emp_code, employee_name=name, role=role)

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
        gross = float(r["gross_earnings"] or 0)
        net = float(r["net_salary"] or 0)
        ded = float(r["total_deductions"] or 0)
        contrib = float(r["employer_contributions"] or 0)
        ctc_val = float(r["ctc"] or 0)

        tot_gross += gross
        tot_net += net
        tot_deductions += ded
        tot_contributions += contrib
        tot_ctc += ctc_val

        slips.append({
            "id": r["id"],
            "emp_code": r["emp_code"],
            "employee_name": r["employee_name"],
            "month": r["month"],
            "year": r["year"],
            "financial_year": r["financial_year"],
            "month_year": f"{r['month']} {r['year']}",
            "basic_salary": float(r["basic_salary"] or 0),
            "hra": float(r["hra"] or 0),
            "special_allowance": float(r["special_allowance"] or 0),
            "gross_earnings": gross,
            "pf_deduction": float(r["pf_deduction"] or 0),
            "pt_deduction": float(r["pt_deduction"] or 0),
            "total_deductions": ded,
            "net_salary": net,
            "employer_pf": float(r["employer_pf"] or 0),
            "employer_contributions": contrib,
            "ctc": ctc_val,
            "total_days": r["total_days"],
            "paid_days": r["paid_days"],
            "status": r["status"] or "Paid",
            "generated_on": str(r["generated_on"] or "")
        })

    months_paid = len(slips)
    
    # Composition calculations
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
