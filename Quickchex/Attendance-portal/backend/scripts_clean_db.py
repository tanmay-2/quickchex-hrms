import psycopg2
from app.core.security import hash_password

def run_migration():
    conn = psycopg2.connect("postgresql://postgres:root@127.0.0.1:5432/hrms_db")
    cur = conn.cursor()
    pwd_hash = hash_password("Welcome@123")

    print("1. Updating regularizations tables...")
    for tbl in ["regularizations", "regularization_2026_08", "regularization_2026_09", "regularization_2026_10"]:
        try:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {tbl} (
                    id SERIAL PRIMARY KEY,
                    emp_code VARCHAR(50) NOT NULL,
                    target_date DATE NOT NULL,
                    issued_for_in_time TIMESTAMP,
                    issued_for_out_time TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'PENDING_MANAGER',
                    comment TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            # Add new columns if not exist
            columns = [
                ("employee_id", "VARCHAR(50)"),
                ("employee_name", "VARCHAR(150)"),
                ("manager_id", "VARCHAR(50)"),
                ("manager_name", "VARCHAR(150)"),
                ("approval_level", "INTEGER DEFAULT 1"),
                ("manager_action", "VARCHAR(50)"),
                ("manager_comment", "TEXT"),
                ("admin_action", "VARCHAR(50)"),
                ("admin_comment", "TEXT"),
                ("updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            ]
            for col_name, col_type in columns:
                cur.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
        except Exception as e:
            conn.rollback()
            print(f"Error updating {tbl}: {e}")
            continue
    conn.commit()
    print("Regularization tables updated.")

    print("2. Cleaning duplicate Aaquib row 12...")
    cur.execute("""
        UPDATE profile_master
        SET email = 'aaquib.ops@laesfera.co',
            first_name = 'Aaquib',
            last_name = 'Ansari',
            role = 'employee',
            designation = 'Operations Associate',
            department = 'Operations',
            branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
            reporting_supervisor = 'LE249',
            password_hash = %s,
            must_change_password = FALSE
        WHERE id = 12 AND emp_code = '2';
    """, (pwd_hash,))

    print("3. Updating Aaquib Khan (ADM001)...")
    cur.execute("""
        UPDATE profile_master
        SET first_name = 'Aaquib',
            last_name = 'Khan',
            email = 'aaquib.k@laesfera.co',
            role = 'admin',
            designation = 'Administrator',
            department = 'Administration',
            branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
            reporting_supervisor = 'Meera Iyer',
            mobile_no = '+91 98765 43201',
            password_hash = %s,
            must_change_password = FALSE
        WHERE emp_code = 'ADM001';
    """, (pwd_hash,))

    print("4. Updating Bikita Hait (15)...")
    cur.execute("""
        UPDATE profile_master
        SET first_name = 'Bikita',
            last_name = 'Hait',
            email = 'bikita.h@laesfera.co',
            role = 'employee',
            designation = 'Operations Executive',
            department = 'Operations',
            branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
            reporting_supervisor = 'LE249',
            mobile_no = '+91 98765 43215',
            password_hash = %s,
            must_change_password = FALSE
        WHERE emp_code = '15';
    """, (pwd_hash,))

    print("5. Updating Managers...")
    managers = [
        ('LE249', 'Payal', 'Mishra', 'payal.m@laesfera.co', 'Operations Manager', 'Operations', '+91 98765 43249'),
        ('16', 'Bipin', 'Gupta', 'bipin.g@laesfera.co', 'Operations Manager', 'Operations', '+91 98765 43216'),
        ('17', 'Chaitanya', 'Agrawal', 'chaitanya.a@laesfera.co', 'Team Lead - Operations', 'Operations', '+91 98765 43217'),
        ('28', 'Kevin', 'Joshi', 'kevin.j@laesfera.co', 'Operations Manager', 'Operations', '+91 98765 43228'),
        ('MGR001', 'Payal', 'Kaur', 'payal@company.com', 'Engineering Manager', 'Engineering', '+91 98765 43210'),
    ]
    for code, fn, ln, em, desig, dept, phone in managers:
        cur.execute("""
            UPDATE profile_master
            SET first_name = %s,
                last_name = %s,
                email = %s,
                role = 'manager',
                designation = %s,
                department = %dept,
                branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
                reporting_supervisor = 'ADM001',
                mobile_no = %s,
                password_hash = %s,
                must_change_password = FALSE
            WHERE emp_code = %s;
        """.replace("%dept", "%s"), (fn, ln, em, desig, dept, phone, pwd_hash, code))

    print("6. Cleaning names and assigning supervisors for all employees...")
    clean_names = {
        '1': ('Aachal', 'Patel'),
        '3': ('Abhay', 'Patil'),
        '4': ('Abhay', 'Sharma'),
        '5': ('Abhishek', 'Kumar'),
        '6': ('Abu', 'Bakar'),
        '7': ('Akash', 'Mishra'),
        '8': ('Aman', 'Malik'),
        '9': ('Amit', 'More'),
        '10': ('Anish', 'Verma'),
        '11': ('Ashok', 'Rajbhar'),
        '12': ('Atharva', 'Karlekar'),
        '13': ('Avinash', 'Nair'),
        '14': ('Bhagyashri', 'Bhosale'),
        '18': ('Chirag', 'Shah'),
        '19': ('Daniel', 'Thomas'),
        '20': ('Danish', 'Malik'),
        '21': ('Dipesh', 'Mane'),
        '22': ('Harsh', 'Sharma'),
        '23': ('Hitesh', 'Patil'),
        '24': ('Himanshu', 'Rana'),
        '25': ('Janhavi', 'Samant'),
        '26': ('Jasmeet', 'Singh'),
        '27': ('Kasim', 'Chamcham'),
        '29': ('Krishna', 'Prasad'),
        '30': ('Madhuri', 'Tiwari'),
        '31': ('Mansi', 'Parab'),
        '32': ('Mayur', 'More'),
        '33': ('Migdad', 'Mirza'),
        '34': ('Minal', 'Gavhane'),
        '35': ('Mohit', 'Sharma'),
        '36': ('Monika', 'Tambe'),
        '37': ('Nilesh', 'Pawar'),
        '38': ('Pankaj', 'Gupta'),
        '39': ('Paresh', 'Kadam'),
        '40': ('Parth', 'Patel'),
        '42': ('Prakash', 'Kshirsagar'),
        '43': ('Prashant', 'Maurya'),
        '44': ('Prashant', 'Singh'),
        '45': ('Pratik', 'Shinde'),
        '46': ('Rahi', 'Khan'),
        '47': ('Rajan', 'Chauhan'),
        '48': ('Rakesh', 'Yadav'),
        '49': ('Ravi', 'Patil'),
        '50': ('Rinky', 'Prasad'),
        '51': ('Roshan', 'Rao'),
        '52': ('Rutuja', 'Maravade'),
        '53': ('Sagar', 'Patil'),
        '54': ('Sakshi', 'Parab'),
        '55': ('Sandip', 'Sawant'),
        '56': ('Shraddha', 'Joshi'),
        '57': ('Shravani', 'Sawant'),
        '58': ('Siddhant', 'Tiwari'),
        '59': ('Sudhir', 'Sawant'),
        '60': ('Sunita', 'Joshi'),
        '61': ('Suraj', 'Gupta'),
        '62': ('Tanmay', 'Sharma'),
        '63': ('Tanvi', 'Sawant'),
        '64': ('Umesh', 'Jadhav'),
        '65': ('Vaishnavi', 'Kadam'),
        '66': ('Vinay', 'Sharma'),
        '67': ('Vinod', 'Gupta'),
        '68': ('Vishwaja', 'Patil'),
        '69': ('Vivek', 'Kumar')
    }

    # Supervisor distribution map:
    # Manager 16: codes 1 to 14 (13 members)
    # Manager 17: codes 18 to 27 (10 members)
    # Manager 28: codes 29 to 40 (11 members)
    # Manager LE249: code 15 (Bikita), and 42 to 55, plus 56-69 (28 members)
    # Manager MGR001: EMP001, EMP002 (2 members)

    for code, (fn, ln) in clean_names.items():
        c_int = int(code)
        if c_int in range(1, 15):
            sup = '16'
        elif c_int in range(18, 28):
            sup = '17'
        elif c_int in range(29, 41):
            sup = '28'
        else:
            sup = 'LE249'

        cur.execute("""
            UPDATE profile_master
            SET first_name = %s,
                last_name = %s,
                role = 'employee',
                designation = 'Operations Executive',
                department = 'Operations',
                branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
                reporting_supervisor = %s,
                mobile_no = COALESCE(mobile_no, '+91 98765 00000'),
                password_hash = COALESCE(password_hash, %s),
                must_change_password = FALSE
            WHERE emp_code = %s;
        """, (fn, ln, sup, pwd_hash, code))

    # EMP001 and EMP002 under MGR001
    cur.execute("""
        UPDATE profile_master
        SET reporting_supervisor = 'MGR001',
            branch_location = 'Hyde Park, Saki Vihar Road, Mumbai',
            password_hash = %s,
            must_change_password = FALSE
        WHERE emp_code IN ('EMP001', 'EMP002');
    """, (pwd_hash,))

    # Fix existing regularization requests for Bikita (emp_code='15')
    cur.execute("""
        UPDATE regularization_2026_09
        SET employee_id = '15',
            employee_name = 'Bikita Hait',
            manager_id = 'LE249',
            manager_name = 'Payal Mishra',
            approval_level = 1,
            status = 'PENDING_MANAGER'
        WHERE emp_code = '15';
    """)

    conn.commit()
    print("Database data cleanup and sync completed successfully!")
    conn.close()

if __name__ == '__main__':
    run_migration()
