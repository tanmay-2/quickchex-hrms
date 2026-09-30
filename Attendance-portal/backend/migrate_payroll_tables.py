import sqlite3

def run():
    conn = sqlite3.connect('app/attendance.db')
    cursor = conn.cursor()

    # 1. Create payroll_profiles table
    cursor.execute("""
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
    """)

    # 2. Fix payslips table primary key to INTEGER PRIMARY KEY AUTOINCREMENT if id is None
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payslips'")
    if cursor.fetchone():
        cursor.execute("SELECT COUNT(*) FROM payslips WHERE id IS NULL")
        null_ids = cursor.fetchone()[0]
        print(f"Payslips with NULL id: {null_ids}")
        if null_ids > 0:
            cursor.execute("""
            CREATE TABLE payslips_new (
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
                status VARCHAR(50) DEFAULT 'Paid',
                generated_on DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_emp_month_year UNIQUE (emp_code, month, year)
            );
            """)
            cursor.execute("""
            INSERT OR IGNORE INTO payslips_new (
                emp_code, employee_name, month, year, financial_year,
                basic_salary, hra, special_allowance, gross_earnings,
                pf_deduction, pt_deduction, total_deductions, net_salary,
                employer_pf, employer_contributions, ctc,
                total_days, paid_days, status, generated_on, created_at
            )
            SELECT
                emp_code, employee_name, month, year, financial_year,
                basic_salary, hra, special_allowance, gross_earnings,
                pf_deduction, pt_deduction, total_deductions, net_salary,
                employer_pf, employer_contributions, ctc,
                total_days, paid_days, status, generated_on, created_at
            FROM payslips;
            """)
            cursor.execute("DROP TABLE payslips")
            cursor.execute("ALTER TABLE payslips_new RENAME TO payslips")
            print("Successfully migrated payslips to auto-incrementing integer id.")

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    run()
