# ==============================================================================
# QUICKCHEX HRMS BACKEND - SYNC_ALL_COMPANY_EMPLOYEES.PY
# Path: Attendance-portal/backend/sync_all_company_employees.py
# Purpose: Backend module.
# Primary Functions:
#   • parse_date()
#   • clean_name()
#   • clean_code()
# ==============================================================================

# Import module csv for system functionality
import csv
# Import module io for system functionality
import io
# Import module re for system functionality
import re
# Import module os for system functionality
import os
# Import module sys for system functionality
import sys
# Import datetime from datetime for module operations
from datetime import datetime

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import SessionLocal, engine from app.db.session for module operations
from app.db.session import SessionLocal, engine
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password
# Import text from sqlalchemy for module operations
from sqlalchemy import text

# Acquire context manager resource for enclosed block
with open('parse_tsv.py', 'r', encoding='utf-8') as f:
    # Set text_content variable to store text content value
    text_content = f.read()

# Set raw variable to store raw value
raw = text_content.split('raw_tsv = """')[1].split('"""')[0]
# Set reader variable to store reader value
reader = csv.reader(io.StringIO(raw), delimiter='\t')
# Set header variable to store header value
header = next(reader)
# Set rows variable to store rows value
rows = list(reader)

# Define parse_date function to handle parse date
def parse_date(d_str):
    # Check if target condition is false or object is missing
    if not d_str:
        # Return computed result or response payload to caller
        return None
    # Set d_str variable to store d str value
    d_str = d_str.strip()
    # Check if target condition is false or object is missing
    if not d_str or d_str == '.':
        # Return computed result or response payload to caller
        return None
    # Iterate through items in sequence loop
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return datetime.strptime(d_str, fmt).date()
        # Catch and handle specific exception if raised
        except ValueError:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return None

# Define clean_name function to handle clean name
def clean_name(val):
    # Check if target condition is false or object is missing
    if not val:
        # Return computed result or response payload to caller
        return None
    # Set v variable to store v value
    v = val.strip()
    # Check if target condition is false or object is missing
    if not v or v == '.':
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if v.isupper() or v.islower():
        # Return computed result or response payload to caller
        return v.title()
    # Return computed result or response payload to caller
    return v

# Define clean_code function to handle clean code
def clean_code(val):
    # Check if target condition is false or object is missing
    if not val:
        # Return computed result or response payload to caller
        return ""
    # Return computed result or response payload to caller
    return re.sub(r'\s+', '', val.strip()).upper()

# Set desig_map variable to store desig map value
desig_map = {
    # Execute statement to process data and maintain state
    'technical head': 'Technical Head',
    # Execute statement to process data and maintain state
    'admin': 'Admin',
    # Execute statement to process data and maintain state
    'technical architect': 'Technical Architect',
    # Execute statement to process data and maintain state
    'senior software developer': 'Senior Software Developer',
    # Execute statement to process data and maintain state
    'project manager': 'Project Manager',
    # Execute statement to process data and maintain state
    'software developer': 'Software Developer',
    # Execute statement to process data and maintain state
    'team leader': 'Team Leader',
    # Execute statement to process data and maintain state
    'pre sales': 'Pre Sales',
    # Execute statement to process data and maintain state
    'senior accountant': 'Senior Accountant',
    # Execute statement to process data and maintain state
    'business analyst': 'Business Analyst',
    # Execute statement to process data and maintain state
    'office boy': 'Office Boy',
    # Execute statement to process data and maintain state
    'ai/ml developer': 'AI/ML Developer',
    # Execute statement to process data and maintain state
    'software trainee': 'Software Trainee',
    # Execute statement to process data and maintain state
    'ai/ml trainee': 'AI/ML Trainee',
    # Execute statement to process data and maintain state
    'intern developer': 'Intern Developer',
    # Execute statement to process data and maintain state
    'senior developer': 'Senior Developer',
    # Execute statement to process data and maintain state
    'ui/ux designer': 'UI/UX Designer',
    # Execute statement to process data and maintain state
    'intern': 'Intern',
    # Execute statement to process data and maintain state
    'software intern': 'Software Intern',
# Execute statement to process data and maintain state
}

# Set parsed_employees variable to store parsed employees value
parsed_employees = []
# Iterate through items in sequence loop
for r in rows:
    # Set email variable to store email value
    email = r[0].strip().lower()
    # Set code variable to store code value
    code = clean_code(r[1])
    # Set first_name variable to store first name value
    first_name = clean_name(r[4])
    # Set middle_name variable to store middle name value
    middle_name = clean_name(r[5])
    # Set last_name variable to store last name value
    last_name = clean_name(r[6])
    # Set mobile variable to store mobile value
    mobile = re.sub(r'[^0-9+]', '', r[8].strip()) if r[8].strip() else None
    # Set gender variable to store gender value
    gender = r[9].strip().lower() if r[9].strip() else 'male'
    # Set dob variable to store dob value
    dob = parse_date(r[10])
    # Set marital variable to store marital value
    marital = r[11].strip().title() if r[11].strip() else 'Single'
    # Set father variable to store father value
    father = clean_name(r[13])
    # Set mother variable to store mother value
    mother = clean_name(r[14])
    # Set family_contact variable to store family contact value
    family_contact = re.sub(r'[^0-9+]', '', r[16].strip()) if r[16].strip() else None
    
    # Set addr1 variable to store addr1 value
    addr1 = r[18].strip() if r[18].strip() and r[18].strip() != '.' else None
    # Set addr2 variable to store addr2 value
    addr2 = r[19].strip() if r[19].strip() and r[19].strip() != '.' else None
    # Set city variable to store city value
    city = clean_name(r[20]) or 'Mumbai'
    # Set state variable to store state value
    state = clean_name(r[21]) or 'Maharashtra'
    # Set country variable to store country value
    country = clean_name(r[22]) or 'India'
    # Set pincode variable to store pincode value
    pincode = r[23].strip() if r[23].strip() and r[23].strip() != '.' else None

    # Set join_date variable to store join date value
    join_date = parse_date(r[26])
    # Set emp_type variable to store emp type value
    emp_type = r[27].strip()
    # Evaluate condition to control execution branch
    if emp_type.lower() in ('full time', 'full-time'):
        # Set emp_type variable to store emp type value
        emp_type = 'Full-time'
    # Evaluate alternate branch condition
    elif emp_type.lower() == 'intern':
        # Set emp_type variable to store emp type value
        emp_type = 'Intern'
    # Execute fallback branch when conditions are not met
    else:
        # Set emp_type variable to store emp type value
        emp_type = 'Full-time'

    # Set conf_due variable to store conf due value
    conf_due = r[28].strip() if r[28].strip() and r[28].strip() != '.' else None
    # Set conf_date variable to store conf date value
    conf_date = r[29].strip() if r[29].strip() and r[29].strip() != '.' else None
    # Set emp_status variable to store emp status value
    emp_status = r[36].strip().title() if r[36].strip() and r[36].strip() != '.' else 'Active'
    
    # Set loc_raw variable to store loc raw value
    loc_raw = r[43].strip()
    # Evaluate condition to control execution branch
    if '*' in loc_raw:
        # Set branch variable to store branch value
        branch = loc_raw.split('*')[0].strip()
    # Execute fallback branch when conditions are not met
    else:
        # Set branch variable to store branch value
        branch = loc_raw if loc_raw and loc_raw != '.' else 'Mumbai'

    # Set desig variable to store desig value
    desig = r[45].strip()
    # Check if target condition is false or object is missing
    if not desig or desig == '.':
        # Evaluate condition to control execution branch
        if 'admin' in email or code == '1001':
            # Set desig variable to store desig value
            desig = 'Admin'
        # Execute fallback branch when conditions are not met
        else:
            # Set desig variable to store desig value
            desig = 'Software Developer'
    # Set cleaned_desig variable to store cleaned desig value
    cleaned_desig = desig_map.get(desig.lower().strip(), desig.strip())
    # Set dept variable to store dept value
    dept = cleaned_desig

    # Set supervisor variable to store supervisor value
    supervisor = r[46].strip().lower() if r[46].strip() and r[46].strip() != '.' else None

    # Set role variable to store role value
    role = 'employee'
    # Evaluate condition to control execution branch
    if email in ('accounts@laesfera.co', 'rakesh@laesfera.co', 'jain.jitendra564@gmail.com', 'tanmay.s@laesfera.co'):
        # Set role variable to store role value
        role = 'admin'
    # Evaluate alternate branch condition
    elif email in ('migdad.m@laesfera.co', 'avinash.n@laesfera.co', 'kevin.j@laesfera.co', 'sudhir.s@laesfera.co', 'janhavi.s@laesfera.co'):
        # Set role variable to store role value
        role = 'manager'

    # Execute statement to process data and maintain state
    parsed_employees.append({
        # Execute statement to process data and maintain state
        'emp_code': code,
        # Execute statement to process data and maintain state
        'email': email,
        # Execute statement to process data and maintain state
        'first_name': first_name,
        # Execute statement to process data and maintain state
        'middle_name': middle_name,
        # Execute statement to process data and maintain state
        'last_name': last_name,
        # Execute statement to process data and maintain state
        'mobile_no': mobile,
        # Execute statement to process data and maintain state
        'gender': gender,
        # Execute statement to process data and maintain state
        'dob': dob,
        # Execute statement to process data and maintain state
        'marital_status': marital,
        # Execute statement to process data and maintain state
        'father_name': father,
        # Execute statement to process data and maintain state
        'mother_name': mother,
        # Execute statement to process data and maintain state
        'family_contact': family_contact,
        # Execute statement to process data and maintain state
        'address1': addr1,
        # Execute statement to process data and maintain state
        'address2': addr2,
        # Execute statement to process data and maintain state
        'city': city,
        # Execute statement to process data and maintain state
        'state': state,
        # Execute statement to process data and maintain state
        'country': country,
        # Execute statement to process data and maintain state
        'pincode': pincode,
        # Execute statement to process data and maintain state
        'emp_join_date': join_date,
        # Execute statement to process data and maintain state
        'employment_type': emp_type,
        # Execute statement to process data and maintain state
        'confirmation_due': conf_due,
        # Execute statement to process data and maintain state
        'confirmation_date': conf_date,
        # Execute statement to process data and maintain state
        'employment_status': emp_status,
        # Execute statement to process data and maintain state
        'branch_location': branch,
        # Execute statement to process data and maintain state
        'designation': cleaned_desig,
        # Execute statement to process data and maintain state
        'department': dept,
        # Execute statement to process data and maintain state
        'reporting_supervisor': supervisor,
        # Execute statement to process data and maintain state
        'role': role
    # Execute statement to process data and maintain state
    })

# Invoke print to perform operational action
print(f"Loaded {len(parsed_employees)} employees from user roster.")

# Set code_remap variable to store code remap value
code_remap = {
    # Execute statement to process data and maintain state
    'ADM001': 'LE239',
    # Execute statement to process data and maintain state
    'EMP001': 'LE239',
    # Execute statement to process data and maintain state
    'LE198': 'LE239',
    # Execute statement to process data and maintain state
    'ADM002': 'LE109',
    # Execute statement to process data and maintain state
    'ADM003': 'LE250',
    # Execute statement to process data and maintain state
    'EMP003': 'LE243',
    # Execute statement to process data and maintain state
    'LE622': 'LE131',
    # Execute statement to process data and maintain state
    'LE144': 'LE210',
    # Execute statement to process data and maintain state
    'LE883': 'LE214',
    # Execute statement to process data and maintain state
    'LE873': 'LE214',
    # Execute statement to process data and maintain state
    'LE714': 'LE216',
    # Execute statement to process data and maintain state
    'LE673': 'LE223',
    # Execute statement to process data and maintain state
    'LE369': 'LE238',
    # Execute statement to process data and maintain state
    'LE855': 'LE254',
    # Execute statement to process data and maintain state
    'LE752': 'LE176',
# Execute statement to process data and maintain state
}

# Set tables_to_update variable to store tables to update value
tables_to_update = [
    # Execute statement to process data and maintain state
    'attendance_2026_09',
    # Execute statement to process data and maintain state
    'attendance_2026_10',
    # Execute statement to process data and maintain state
    'attendance_2026_11',
    # Execute statement to process data and maintain state
    'leave_requests',
    # Execute statement to process data and maintain state
    'leave_2026_09',
    # Execute statement to process data and maintain state
    'leave_2026_10',
    # Execute statement to process data and maintain state
    'leave_2026_11',
    # Execute statement to process data and maintain state
    'regularization_2026_09',
    # Execute statement to process data and maintain state
    'regularization_2026_10',
    # Execute statement to process data and maintain state
    'tasks_2026_09',
    # Execute statement to process data and maintain state
    'tasks_2026_10',
    # Execute statement to process data and maintain state
    'employee_documents',
    # Execute statement to process data and maintain state
    'resignation_requests',
    # Execute statement to process data and maintain state
    'notifications'
# Execute statement to process data and maintain state
]

# Step 1: Temporarily drop FK constraints referencing profile_master(emp_code)
with engine.begin() as conn:
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke conn.execute to perform operational action
        conn.execute(text("ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_emp_code_fkey"))
        # Invoke print to perform operational action
        print("Dropped constraint leave_requests_emp_code_fkey")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Note on leave_requests FK:", e)

    # Begin guarded execution block to trap exceptions
    try:
        # Invoke conn.execute to perform operational action
        conn.execute(text("ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_emp_code_fkey"))
        # Invoke print to perform operational action
        print("Dropped constraint employee_documents_emp_code_fkey")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Note on employee_documents FK:", e)

# Step 2: Remap foreign table emp_codes
with engine.begin() as conn:
    # Iterate through items in sequence loop
    for tbl in tables_to_update:
        # Iterate through items in sequence loop
        for old_c, new_c in code_remap.items():
            # Begin guarded execution block to trap exceptions
            try:
                # Set col variable to store col value
                col = 'recipient_emp_code' if tbl == 'notifications' else 'emp_code'
                # Set res variable to store res value
                res = conn.execute(
                    # Invoke text to perform operational action
                    text(f"UPDATE {tbl} SET {col} = :new_c WHERE {col} = :old_c"),
                    # Execute statement to process data and maintain state
                    {"new_c": new_c, "old_c": old_c}
                # Execute statement to process data and maintain state
                )
                # Evaluate condition to control execution branch
                if res.rowcount > 0:
                    # Invoke print to perform operational action
                    print(f"Updated {res.rowcount} rows in {tbl}: {old_c} -> {new_c}")
            # Catch and handle specific exception if raised
            except Exception as e:
                # Placeholder statement performing no operation
                pass

# Step 3: Synchronize profile_master
default_pwd_hash = hash_password("Welcome@123")

# Set db variable to store db value
db = SessionLocal()
# Begin guarded execution block to trap exceptions
try:
    # Remove dummy demo accounts
    dummy_codes = [
        # Execute statement to process data and maintain state
        'EMP002', 'EMP004', 'EMP005', 'EMP007', 'EMP008', 'EMP009', 'EMP010',
        # Execute statement to process data and maintain state
        'EMP011', 'EMP012', 'EMP013', 'EMP014', 'EMP015', 'EMP016', 'EMP017',
        # Execute statement to process data and maintain state
        'EMP018', 'EMP019', 'EMP020', 'MGR001'
    # Execute statement to process data and maintain state
    ]
    # Initiate database query on specified model
    del_res = db.query(Profile).filter(Profile.emp_code.in_(dummy_codes)).delete(synchronize_session=False)
    # Invoke print to perform operational action
    print(f"Removed {del_res} demo template accounts.")

    # Remove duplicate test records
    dupe_codes = ['ADM001', 'LE198', 'EMP003', 'LE873']
    # Initiate database query on specified model
    del_dupes = db.query(Profile).filter(Profile.emp_code.in_(dupe_codes)).delete(synchronize_session=False)
    # Invoke print to perform operational action
    print(f"Removed {del_dupes} duplicate test records.")

    # Commit transaction to persist changes in database
    db.commit()

    # Load current profiles
    current_profiles = db.query(Profile).all()
    # Set profiles_by_code variable to store profiles by code value
    profiles_by_code = {p.emp_code.upper(): p for p in current_profiles if p.emp_code}
    # Set profiles_by_email variable to store profiles by email value
    profiles_by_email = {p.email.lower(): p for p in current_profiles if p.email}

    # Set updated_count variable to store updated count value
    updated_count = 0
    # Set created_count variable to store created count value
    created_count = 0

    # Iterate through items in sequence loop
    for emp_data in parsed_employees:
        # Set code variable to store code value
        code = emp_data['emp_code']
        # Set email variable to store email value
        email = emp_data['email']

        # Set matched_profile variable to store matched profile value
        matched_profile = profiles_by_code.get(code)
        # Check if target condition is false or object is missing
        if not matched_profile and email:
            # Set matched_profile variable to store matched profile value
            matched_profile = profiles_by_email.get(email)
        
        # Check if target condition is false or object is missing
        if not matched_profile:
            # Iterate through items in sequence loop
            for old_c, new_c in code_remap.items():
                # Evaluate condition to control execution branch
                if new_c == code and old_c in profiles_by_code:
                    # Set matched_profile variable to store matched profile value
                    matched_profile = profiles_by_code[old_c]
                    # Break out of current loop early
                    break

        # Evaluate condition to control execution branch
        if matched_profile:
            # Execute statement to process data and maintain state
            matched_profile.emp_code = code
            # Execute statement to process data and maintain state
            matched_profile.email = email
            # Execute statement to process data and maintain state
            matched_profile.first_name = emp_data['first_name']
            # Execute statement to process data and maintain state
            matched_profile.middle_name = emp_data['middle_name']
            # Execute statement to process data and maintain state
            matched_profile.last_name = emp_data['last_name']
            # Execute statement to process data and maintain state
            matched_profile.mobile_no = emp_data['mobile_no']
            # Execute statement to process data and maintain state
            matched_profile.gender = emp_data['gender']
            # Execute statement to process data and maintain state
            matched_profile.dob = emp_data['dob']
            # Execute statement to process data and maintain state
            matched_profile.marital_status = emp_data['marital_status']
            # Execute statement to process data and maintain state
            matched_profile.father_name = emp_data['father_name']
            # Execute statement to process data and maintain state
            matched_profile.mother_name = emp_data['mother_name']
            # Execute statement to process data and maintain state
            matched_profile.family_contact = emp_data['family_contact']
            # Execute statement to process data and maintain state
            matched_profile.address1 = emp_data['address1']
            # Execute statement to process data and maintain state
            matched_profile.address2 = emp_data['address2']
            # Execute statement to process data and maintain state
            matched_profile.city = emp_data['city']
            # Execute statement to process data and maintain state
            matched_profile.state = emp_data['state']
            # Execute statement to process data and maintain state
            matched_profile.country = emp_data['country']
            # Execute statement to process data and maintain state
            matched_profile.pincode = emp_data['pincode']
            # Execute statement to process data and maintain state
            matched_profile.emp_join_date = emp_data['emp_join_date']
            # Execute statement to process data and maintain state
            matched_profile.employment_type = emp_data['employment_type']
            # Execute statement to process data and maintain state
            matched_profile.confirmation_due = emp_data['confirmation_due']
            # Execute statement to process data and maintain state
            matched_profile.confirmation_date = emp_data['confirmation_date']
            # Execute statement to process data and maintain state
            matched_profile.employment_status = emp_data['employment_status']
            # Execute statement to process data and maintain state
            matched_profile.branch_location = emp_data['branch_location']
            # Execute statement to process data and maintain state
            matched_profile.designation = emp_data['designation']
            # Execute statement to process data and maintain state
            matched_profile.department = emp_data['department']
            # Execute statement to process data and maintain state
            matched_profile.reporting_supervisor = emp_data['reporting_supervisor']
            
            # Evaluate condition to control execution branch
            if matched_profile.role in ('admin', 'manager') and emp_data['role'] == 'employee':
                # Placeholder statement performing no operation
                pass
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                matched_profile.role = emp_data['role']
                
            # Execute statement to process data and maintain state
            updated_count += 1
        # Execute fallback branch when conditions are not met
        else:
            # Set new_p variable to store new p value
            new_p = Profile(
                # Set emp_code variable to store emp code value
                emp_code=code,
                # Set email variable to store email value
                email=email,
                # Set first_name variable to store first name value
                first_name=emp_data['first_name'],
                # Set middle_name variable to store middle name value
                middle_name=emp_data['middle_name'],
                # Set last_name variable to store last name value
                last_name=emp_data['last_name'],
                # Set mobile_no variable to store mobile no value
                mobile_no=emp_data['mobile_no'],
                # Set gender variable to store gender value
                gender=emp_data['gender'],
                # Set dob variable to store dob value
                dob=emp_data['dob'],
                # Set marital_status variable to store marital status value
                marital_status=emp_data['marital_status'],
                # Set father_name variable to store father name value
                father_name=emp_data['father_name'],
                # Set mother_name variable to store mother name value
                mother_name=emp_data['mother_name'],
                # Set family_contact variable to store family contact value
                family_contact=emp_data['family_contact'],
                # Set address1 variable to store address1 value
                address1=emp_data['address1'],
                # Set address2 variable to store address2 value
                address2=emp_data['address2'],
                # Set city variable to store city value
                city=emp_data['city'],
                # Set state variable to store state value
                state=emp_data['state'],
                # Set country variable to store country value
                country=emp_data['country'],
                # Set pincode variable to store pincode value
                pincode=emp_data['pincode'],
                # Set emp_join_date variable to store emp join date value
                emp_join_date=emp_data['emp_join_date'],
                # Set employment_type variable to store employment type value
                employment_type=emp_data['employment_type'],
                # Set confirmation_due variable to store confirmation due value
                confirmation_due=emp_data['confirmation_due'],
                # Set confirmation_date variable to store confirmation date value
                confirmation_date=emp_data['confirmation_date'],
                # Set employment_status variable to store employment status value
                employment_status=emp_data['employment_status'],
                # Set branch_location variable to store branch location value
                branch_location=emp_data['branch_location'],
                # Set designation variable to store designation value
                designation=emp_data['designation'],
                # Set department variable to store department value
                department=emp_data['department'],
                # Set reporting_supervisor variable to store reporting supervisor value
                reporting_supervisor=emp_data['reporting_supervisor'],
                # Set role variable to store role value
                role=emp_data['role'],
                # Placeholder statement performing no operation
                password_hash=default_pwd_hash,
                # Set must_change_password variable to store must change password value
                must_change_password=True,
            # Execute statement to process data and maintain state
            )
            # Stage new entity instance into database session
            db.add(new_p)
            # Execute statement to process data and maintain state
            created_count += 1

    # Commit transaction to persist changes in database
    db.commit()
    # Invoke print to perform operational action
    print(f"\n[SUCCESS] Updated {updated_count} existing employee profiles.")
    # Invoke print to perform operational action
    print(f"[SUCCESS] Created {created_count} new employee profiles.")
    
    # Initiate database query on specified model
    total = db.query(Profile).count()
    # Invoke print to perform operational action
    print(f"[SUCCESS] Total profiles in database now: {total}")

# Catch and handle specific exception if raised
except Exception as e:
    # Roll back transaction to revert changes on failure
    db.rollback()
    # Invoke print to perform operational action
    print(f"[ERROR] Transaction failed: {e}")
    # Raise exception to abort current operation with error
    raise
# Execute cleanup actions regardless of exceptions
finally:
    # Invoke db.close to perform operational action
    db.close()

# Step 4: Re-add FK constraints with ON UPDATE CASCADE
with engine.begin() as conn:
    # Begin guarded execution block to trap exceptions
    try:
        # Execute statement to process data and maintain state
        conn.execute(text("""
            ALTER TABLE leave_requests 
            ADD CONSTRAINT leave_requests_emp_code_fkey 
            FOREIGN KEY (emp_code) REFERENCES profile_master (emp_code) 
            ON UPDATE CASCADE ON DELETE CASCADE
        """))
        # Invoke print to perform operational action
        print("Restored constraint leave_requests_emp_code_fkey with CASCADE")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Error restoring leave_requests FK:", e)

    # Begin guarded execution block to trap exceptions
    try:
        # Execute statement to process data and maintain state
        conn.execute(text("""
            ALTER TABLE employee_documents 
            ADD CONSTRAINT employee_documents_emp_code_fkey 
            FOREIGN KEY (emp_code) REFERENCES profile_master (emp_code) 
            ON UPDATE CASCADE ON DELETE CASCADE
        """))
        # Invoke print to perform operational action
        print("Restored constraint employee_documents_emp_code_fkey with CASCADE")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Error restoring employee_documents FK:", e)

# Invoke print to perform operational action
print("\nMigration completed successfully!")
