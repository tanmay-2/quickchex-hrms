import csv
import io
import re
import os
import sys
from datetime import datetime

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine
from app.models.profile_model import Profile
from app.core.security import hash_password
from sqlalchemy import text

with open('parse_tsv.py', 'r', encoding='utf-8') as f:
    text_content = f.read()

raw = text_content.split('raw_tsv = """')[1].split('"""')[0]
reader = csv.reader(io.StringIO(raw), delimiter='\t')
header = next(reader)
rows = list(reader)

def parse_date(d_str):
    if not d_str:
        return None
    d_str = d_str.strip()
    if not d_str or d_str == '.':
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(d_str, fmt).date()
        except ValueError:
            pass
    return None

def clean_name(val):
    if not val:
        return None
    v = val.strip()
    if not v or v == '.':
        return None
    if v.isupper() or v.islower():
        return v.title()
    return v

def clean_code(val):
    if not val:
        return ""
    return re.sub(r'\s+', '', val.strip()).upper()

desig_map = {
    'technical head': 'Technical Head',
    'admin': 'Admin',
    'technical architect': 'Technical Architect',
    'senior software developer': 'Senior Software Developer',
    'project manager': 'Project Manager',
    'software developer': 'Software Developer',
    'team leader': 'Team Leader',
    'pre sales': 'Pre Sales',
    'senior accountant': 'Senior Accountant',
    'business analyst': 'Business Analyst',
    'office boy': 'Office Boy',
    'ai/ml developer': 'AI/ML Developer',
    'software trainee': 'Software Trainee',
    'ai/ml trainee': 'AI/ML Trainee',
    'intern developer': 'Intern Developer',
    'senior developer': 'Senior Developer',
    'ui/ux designer': 'UI/UX Designer',
    'intern': 'Intern',
    'software intern': 'Software Intern',
}

parsed_employees = []
for r in rows:
    email = r[0].strip().lower()
    code = clean_code(r[1])
    first_name = clean_name(r[4])
    middle_name = clean_name(r[5])
    last_name = clean_name(r[6])
    mobile = re.sub(r'[^0-9+]', '', r[8].strip()) if r[8].strip() else None
    gender = r[9].strip().lower() if r[9].strip() else 'male'
    dob = parse_date(r[10])
    marital = r[11].strip().title() if r[11].strip() else 'Single'
    father = clean_name(r[13])
    mother = clean_name(r[14])
    family_contact = re.sub(r'[^0-9+]', '', r[16].strip()) if r[16].strip() else None
    
    addr1 = r[18].strip() if r[18].strip() and r[18].strip() != '.' else None
    addr2 = r[19].strip() if r[19].strip() and r[19].strip() != '.' else None
    city = clean_name(r[20]) or 'Mumbai'
    state = clean_name(r[21]) or 'Maharashtra'
    country = clean_name(r[22]) or 'India'
    pincode = r[23].strip() if r[23].strip() and r[23].strip() != '.' else None

    join_date = parse_date(r[26])
    emp_type = r[27].strip()
    if emp_type.lower() in ('full time', 'full-time'):
        emp_type = 'Full-time'
    elif emp_type.lower() == 'intern':
        emp_type = 'Intern'
    else:
        emp_type = 'Full-time'

    conf_due = r[28].strip() if r[28].strip() and r[28].strip() != '.' else None
    conf_date = r[29].strip() if r[29].strip() and r[29].strip() != '.' else None
    emp_status = r[36].strip().title() if r[36].strip() and r[36].strip() != '.' else 'Active'
    
    loc_raw = r[43].strip()
    if '*' in loc_raw:
        branch = loc_raw.split('*')[0].strip()
    else:
        branch = loc_raw if loc_raw and loc_raw != '.' else 'Mumbai'

    desig = r[45].strip()
    if not desig or desig == '.':
        if 'admin' in email or code == '1001':
            desig = 'Admin'
        else:
            desig = 'Software Developer'
    cleaned_desig = desig_map.get(desig.lower().strip(), desig.strip())
    dept = cleaned_desig

    supervisor = r[46].strip().lower() if r[46].strip() and r[46].strip() != '.' else None

    role = 'employee'
    if email in ('accounts@laesfera.co', 'rakesh@laesfera.co', 'jain.jitendra564@gmail.com', 'tanmay.s@laesfera.co'):
        role = 'admin'
    elif email in ('migdad.m@laesfera.co', 'avinash.n@laesfera.co', 'kevin.j@laesfera.co', 'sudhir.s@laesfera.co', 'janhavi.s@laesfera.co'):
        role = 'manager'

    parsed_employees.append({
        'emp_code': code,
        'email': email,
        'first_name': first_name,
        'middle_name': middle_name,
        'last_name': last_name,
        'mobile_no': mobile,
        'gender': gender,
        'dob': dob,
        'marital_status': marital,
        'father_name': father,
        'mother_name': mother,
        'family_contact': family_contact,
        'address1': addr1,
        'address2': addr2,
        'city': city,
        'state': state,
        'country': country,
        'pincode': pincode,
        'emp_join_date': join_date,
        'employment_type': emp_type,
        'confirmation_due': conf_due,
        'confirmation_date': conf_date,
        'employment_status': emp_status,
        'branch_location': branch,
        'designation': cleaned_desig,
        'department': dept,
        'reporting_supervisor': supervisor,
        'role': role
    })

print(f"Loaded {len(parsed_employees)} employees from user roster.")

code_remap = {
    'ADM001': 'LE239',
    'EMP001': 'LE239',
    'LE198': 'LE239',
    'ADM002': 'LE109',
    'ADM003': 'LE250',
    'EMP003': 'LE243',
    'LE622': 'LE131',
    'LE144': 'LE210',
    'LE883': 'LE214',
    'LE873': 'LE214',
    'LE714': 'LE216',
    'LE673': 'LE223',
    'LE369': 'LE238',
    'LE855': 'LE254',
    'LE752': 'LE176',
}

tables_to_update = [
    'attendance_2026_09',
    'attendance_2026_10',
    'attendance_2026_11',
    'leave_requests',
    'leave_2026_09',
    'leave_2026_10',
    'leave_2026_11',
    'regularization_2026_09',
    'regularization_2026_10',
    'tasks_2026_09',
    'tasks_2026_10',
    'employee_documents',
    'resignation_requests',
    'notifications'
]

# Step 1: Temporarily drop FK constraints referencing profile_master(emp_code)
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_emp_code_fkey"))
        print("Dropped constraint leave_requests_emp_code_fkey")
    except Exception as e:
        print("Note on leave_requests FK:", e)

    try:
        conn.execute(text("ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_emp_code_fkey"))
        print("Dropped constraint employee_documents_emp_code_fkey")
    except Exception as e:
        print("Note on employee_documents FK:", e)

# Step 2: Remap foreign table emp_codes
with engine.begin() as conn:
    for tbl in tables_to_update:
        for old_c, new_c in code_remap.items():
            try:
                col = 'recipient_emp_code' if tbl == 'notifications' else 'emp_code'
                res = conn.execute(
                    text(f"UPDATE {tbl} SET {col} = :new_c WHERE {col} = :old_c"),
                    {"new_c": new_c, "old_c": old_c}
                )
                if res.rowcount > 0:
                    print(f"Updated {res.rowcount} rows in {tbl}: {old_c} -> {new_c}")
            except Exception as e:
                pass

# Step 3: Synchronize profile_master
default_pwd_hash = hash_password("Welcome@123")

db = SessionLocal()
try:
    # Remove dummy demo accounts
    dummy_codes = [
        'EMP002', 'EMP004', 'EMP005', 'EMP007', 'EMP008', 'EMP009', 'EMP010',
        'EMP011', 'EMP012', 'EMP013', 'EMP014', 'EMP015', 'EMP016', 'EMP017',
        'EMP018', 'EMP019', 'EMP020', 'MGR001'
    ]
    del_res = db.query(Profile).filter(Profile.emp_code.in_(dummy_codes)).delete(synchronize_session=False)
    print(f"Removed {del_res} demo template accounts.")

    # Remove duplicate test records
    dupe_codes = ['ADM001', 'LE198', 'EMP003', 'LE873']
    del_dupes = db.query(Profile).filter(Profile.emp_code.in_(dupe_codes)).delete(synchronize_session=False)
    print(f"Removed {del_dupes} duplicate test records.")

    db.commit()

    # Load current profiles
    current_profiles = db.query(Profile).all()
    profiles_by_code = {p.emp_code.upper(): p for p in current_profiles if p.emp_code}
    profiles_by_email = {p.email.lower(): p for p in current_profiles if p.email}

    updated_count = 0
    created_count = 0

    for emp_data in parsed_employees:
        code = emp_data['emp_code']
        email = emp_data['email']

        matched_profile = profiles_by_code.get(code)
        if not matched_profile and email:
            matched_profile = profiles_by_email.get(email)
        
        if not matched_profile:
            for old_c, new_c in code_remap.items():
                if new_c == code and old_c in profiles_by_code:
                    matched_profile = profiles_by_code[old_c]
                    break

        if matched_profile:
            matched_profile.emp_code = code
            matched_profile.email = email
            matched_profile.first_name = emp_data['first_name']
            matched_profile.middle_name = emp_data['middle_name']
            matched_profile.last_name = emp_data['last_name']
            matched_profile.mobile_no = emp_data['mobile_no']
            matched_profile.gender = emp_data['gender']
            matched_profile.dob = emp_data['dob']
            matched_profile.marital_status = emp_data['marital_status']
            matched_profile.father_name = emp_data['father_name']
            matched_profile.mother_name = emp_data['mother_name']
            matched_profile.family_contact = emp_data['family_contact']
            matched_profile.address1 = emp_data['address1']
            matched_profile.address2 = emp_data['address2']
            matched_profile.city = emp_data['city']
            matched_profile.state = emp_data['state']
            matched_profile.country = emp_data['country']
            matched_profile.pincode = emp_data['pincode']
            matched_profile.emp_join_date = emp_data['emp_join_date']
            matched_profile.employment_type = emp_data['employment_type']
            matched_profile.confirmation_due = emp_data['confirmation_due']
            matched_profile.confirmation_date = emp_data['confirmation_date']
            matched_profile.employment_status = emp_data['employment_status']
            matched_profile.branch_location = emp_data['branch_location']
            matched_profile.designation = emp_data['designation']
            matched_profile.department = emp_data['department']
            matched_profile.reporting_supervisor = emp_data['reporting_supervisor']
            
            if matched_profile.role in ('admin', 'manager') and emp_data['role'] == 'employee':
                pass
            else:
                matched_profile.role = emp_data['role']
                
            updated_count += 1
        else:
            new_p = Profile(
                emp_code=code,
                email=email,
                first_name=emp_data['first_name'],
                middle_name=emp_data['middle_name'],
                last_name=emp_data['last_name'],
                mobile_no=emp_data['mobile_no'],
                gender=emp_data['gender'],
                dob=emp_data['dob'],
                marital_status=emp_data['marital_status'],
                father_name=emp_data['father_name'],
                mother_name=emp_data['mother_name'],
                family_contact=emp_data['family_contact'],
                address1=emp_data['address1'],
                address2=emp_data['address2'],
                city=emp_data['city'],
                state=emp_data['state'],
                country=emp_data['country'],
                pincode=emp_data['pincode'],
                emp_join_date=emp_data['emp_join_date'],
                employment_type=emp_data['employment_type'],
                confirmation_due=emp_data['confirmation_due'],
                confirmation_date=emp_data['confirmation_date'],
                employment_status=emp_data['employment_status'],
                branch_location=emp_data['branch_location'],
                designation=emp_data['designation'],
                department=emp_data['department'],
                reporting_supervisor=emp_data['reporting_supervisor'],
                role=emp_data['role'],
                password_hash=default_pwd_hash,
                must_change_password=True,
            )
            db.add(new_p)
            created_count += 1

    db.commit()
    print(f"\n[SUCCESS] Updated {updated_count} existing employee profiles.")
    print(f"[SUCCESS] Created {created_count} new employee profiles.")
    
    total = db.query(Profile).count()
    print(f"[SUCCESS] Total profiles in database now: {total}")

except Exception as e:
    db.rollback()
    print(f"[ERROR] Transaction failed: {e}")
    raise
finally:
    db.close()

# Step 4: Re-add FK constraints with ON UPDATE CASCADE
with engine.begin() as conn:
    try:
        conn.execute(text("""
            ALTER TABLE leave_requests 
            ADD CONSTRAINT leave_requests_emp_code_fkey 
            FOREIGN KEY (emp_code) REFERENCES profile_master (emp_code) 
            ON UPDATE CASCADE ON DELETE CASCADE
        """))
        print("Restored constraint leave_requests_emp_code_fkey with CASCADE")
    except Exception as e:
        print("Error restoring leave_requests FK:", e)

    try:
        conn.execute(text("""
            ALTER TABLE employee_documents 
            ADD CONSTRAINT employee_documents_emp_code_fkey 
            FOREIGN KEY (emp_code) REFERENCES profile_master (emp_code) 
            ON UPDATE CASCADE ON DELETE CASCADE
        """))
        print("Restored constraint employee_documents_emp_code_fkey with CASCADE")
    except Exception as e:
        print("Error restoring employee_documents FK:", e)

print("\nMigration completed successfully!")
