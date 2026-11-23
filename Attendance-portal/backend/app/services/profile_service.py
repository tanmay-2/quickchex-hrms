# ==============================================================================
# QUICKCHEX HRMS BACKEND - PROFILE_SERVICE.PY
# Path: Attendance-portal/backend/app/services/profile_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'profile_service'.
# Primary Functions:
#   • get_profile()
#   • get_by_emp_code()
#   • create_profile()
#   • safe_parse_date()
#   • update_profile()
#   • delete_profile()
#   • add_employee()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import profile_repository from app.repositories for module operations
from app.repositories import profile_repository
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password


# Define get_profile function to handle get profile
def get_profile(db: Session, emp_code: str):
    # Set profile variable to store profile value
    profile = profile_repository.get_by_emp_code(db, emp_code)

    # Check if target condition is false or object is missing
    if not profile:
        # Set profile variable to store profile value
        profile = profile_repository.create_profile(db, {"emp_code": emp_code})

    # Return computed result or response payload to caller
    return profile


# Define get_by_emp_code function to handle get by emp code
def get_by_emp_code(db: Session, emp_code: str):
    # Initiate database query on specified model
    return db.query(Profile).filter(Profile.emp_code == emp_code).first()


# Define create_profile function to handle create profile
def create_profile(db: Session, data: dict):
    profile = Profile(**data)   # 🔥 THIS FIX

    # Stage new entity instance into database session
    db.add(profile)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(profile)

    # Return computed result or response payload to caller
    return profile


# Import datetime, date from datetime for module operations
from datetime import datetime, date


# Define safe_parse_date function to handle safe parse date
def safe_parse_date(val):
    # Check if target condition is false or object is missing
    if not val:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if isinstance(val, date):
        # Return computed result or response payload to caller
        return val
    # Set s variable to store s value
    s = str(val).strip()
    # Check if target condition is false or object is missing
    if not s or s in ('.', '-', '—'):
        # Return computed result or response payload to caller
        return None
    # Iterate through items in sequence loop
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%b %d, %Y", "%B %d, %Y"):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return datetime.strptime(s, fmt).date()
        # Catch and handle specific exception if raised
        except ValueError:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return None


# Define update_profile function to handle update profile
def update_profile(db: Session, emp_code: str, data: dict):
    # Set clean variable to store clean value
    clean = str(emp_code).strip()
    # Set profile variable to store profile value
    profile = get_by_emp_code(db, clean)

    # Check if target condition is false or object is missing
    if not profile:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(
            # Execute statement to process data and maintain state
            (Profile.emp_code.ilike(clean)) |
            # Execute statement to process data and maintain state
            (Profile.email.ilike(clean)) |
            # Execute statement to process data and maintain state
            (Profile.id == (int(clean) if clean.isdigit() else -1))
        # Execute statement to process data and maintain state
        ).first()

    # Check if target condition is false or object is missing
    if not profile:
        # Return computed result or response payload to caller
        return None

    # Handle emp_code update
    new_emp_code = data.get("emp_code")
    # Evaluate condition to control execution branch
    if new_emp_code and str(new_emp_code).strip() and str(new_emp_code).strip().upper() != (profile.emp_code or "").upper():
        # Set new_code_clean variable to store new code clean value
        new_code_clean = str(new_emp_code).strip().upper()
        # Set old_code variable to store old code value
        old_code = profile.emp_code
        # Execute statement to process data and maintain state
        profile.emp_code = new_code_clean
        # Import text from sqlalchemy for module operations
        from sqlalchemy import text
        # Iterate through items in sequence loop
        for tbl in ['leave_requests', 'employee_documents', 'resignation_requests', 'notifications',
                    # Execute statement to process data and maintain state
                    'attendance_2026_08', 'attendance_2026_09', 'attendance_2026_10', 'attendance_2026_11',
                    # Execute statement to process data and maintain state
                    'tasks_2026_09', 'tasks_2026_10']:
            # Begin guarded execution block to trap exceptions
            try:
                # Set col variable to store col value
                col = 'recipient_emp_code' if tbl == 'notifications' else 'emp_code'
                # Invoke db.execute to perform operational action
                db.execute(text(f"UPDATE {tbl} SET {col} = :nc WHERE {col} = :oc"), {"nc": new_code_clean, "oc": old_code})
            # Catch and handle specific exception if raised
            except Exception as e:
                # Placeholder statement performing no operation
                pass

    # Name handling
    if "name" in data and data["name"]:
        # Set name_val variable to store name val value
        name_val = str(data.pop("name")).strip()
        # Set parts variable to store parts value
        parts = [p for p in name_val.split() if p]
        # Evaluate condition to control execution branch
        if parts:
            # Execute statement to process data and maintain state
            profile.first_name = parts[0]
            # Evaluate condition to control execution branch
            if len(parts) == 1:
                # Execute statement to process data and maintain state
                profile.middle_name = None
                # Execute statement to process data and maintain state
                profile.last_name = ""
            # Evaluate alternate branch condition
            elif len(parts) == 2:
                # Execute statement to process data and maintain state
                profile.middle_name = None
                # Execute statement to process data and maintain state
                profile.last_name = parts[1]
            # Execute fallback branch when conditions are not met
            else:
                # Execute statement to process data and maintain state
                profile.middle_name = " ".join(parts[1:-1])
                # Execute statement to process data and maintain state
                profile.last_name = parts[-1]

    # Check if target condition is false or object is missing
    if "first_name" in data and data["first_name"] is not None:
        # Execute statement to process data and maintain state
        profile.first_name = str(data.pop("first_name")).strip()
    # Evaluate condition to control execution branch
    if "middle_name" in data:
        # Set m_val variable to store m val value
        m_val = str(data.pop("middle_name") or "").strip()
        # Execute statement to process data and maintain state
        profile.middle_name = m_val if m_val else None
    # Check if target condition is false or object is missing
    if "last_name" in data and data["last_name"] is not None:
        # Execute statement to process data and maintain state
        profile.last_name = str(data.pop("last_name")).strip()
    # Check if target condition is false or object is missing
    if "email" in data and data["email"] is not None and str(data["email"]).strip():
        # Execute statement to process data and maintain state
        profile.email = str(data.pop("email")).strip().lower()

    # Contact & location
    if "mobile" in data and data["mobile"] is not None:
        # Execute statement to process data and maintain state
        profile.mobile_no = str(data.pop("mobile")).strip()
    # Check if target condition is false or object is missing
    if "phone" in data and data["phone"] is not None:
        # Execute statement to process data and maintain state
        profile.mobile_no = str(data.pop("phone")).strip()
    # Check if target condition is false or object is missing
    if "mobile_no" in data and data["mobile_no"] is not None:
        # Execute statement to process data and maintain state
        profile.mobile_no = str(data.pop("mobile_no")).strip()
    # Check if target condition is false or object is missing
    if "location" in data and data["location"] is not None:
        # Execute statement to process data and maintain state
        profile.branch_location = str(data.pop("location")).strip()
    # Check if target condition is false or object is missing
    if "about" in data and data["about"] is not None:
        # Execute statement to process data and maintain state
        profile.about = str(data.pop("about")).strip()

    # Address mappings
    if "current_address" in data and data["current_address"] is not None:
        # Execute statement to process data and maintain state
        profile.address1 = str(data.pop("current_address")).strip()
    # Check if target condition is false or object is missing
    if "address1" in data and data["address1"] is not None:
        # Execute statement to process data and maintain state
        profile.address1 = str(data.pop("address1")).strip()
    # Check if target condition is false or object is missing
    if "permanent_address" in data and data["permanent_address"] is not None:
        # Execute statement to process data and maintain state
        profile.address2 = str(data.pop("permanent_address")).strip()
    # Check if target condition is false or object is missing
    if "address2" in data and data["address2"] is not None:
        # Execute statement to process data and maintain state
        profile.address2 = str(data.pop("address2")).strip()

    # Emergency contact mappings
    emerg_name = data.pop("emergency_name", None) or data.pop("emergency_contact_name", None)
    # Evaluate condition to control execution branch
    if emerg_name:
        # Execute statement to process data and maintain state
        profile.father_name = str(emerg_name).strip()
    # Set emerg_phone variable to store emerg phone value
    emerg_phone = data.pop("emergency_phone", None) or data.pop("emergency_contact_phone", None)
    # Evaluate condition to control execution branch
    if emerg_phone:
        # Execute statement to process data and maintain state
        profile.family_contact = str(emerg_phone).strip()

    # Organization fields
    if "department" in data and data["department"] is not None:
        # Execute statement to process data and maintain state
        profile.department = str(data.pop("department")).strip()
    # Check if target condition is false or object is missing
    if "designation" in data and data["designation"] is not None:
        # Execute statement to process data and maintain state
        profile.designation = str(data.pop("designation")).strip()
    # Check if target condition is false or object is missing
    if "role" in data and data["role"] is not None:
        # Set r variable to store r value
        r = str(data.pop("role")).strip().lower()
        # Evaluate condition to control execution branch
        if r in ("admin", "manager", "employee", "teamleader"):
            # Execute statement to process data and maintain state
            profile.role = r
    # Check if target condition is false or object is missing
    if "employment_type" in data and data["employment_type"] is not None:
        # Execute statement to process data and maintain state
        profile.employment_type = str(data.pop("employment_type")).strip()
    # Check if target condition is false or object is missing
    if "type" in data and data["type"] is not None:
        # Execute statement to process data and maintain state
        profile.employment_type = str(data.pop("type")).strip()
    # Check if target condition is false or object is missing
    if "status" in data and data["status"] is not None:
        # Execute statement to process data and maintain state
        profile.employment_status = str(data.pop("status")).strip()
    # Check if target condition is false or object is missing
    if "employment_status" in data and data["employment_status"] is not None:
        # Execute statement to process data and maintain state
        profile.employment_status = str(data.pop("employment_status")).strip()

    # Dates
    join_val = data.pop("joining_date", None) or data.pop("joined", None)
    # Evaluate condition to control execution branch
    if join_val:
        # Set parsed_d variable to store parsed d value
        parsed_d = safe_parse_date(join_val)
        # Evaluate condition to control execution branch
        if parsed_d:
            # Execute statement to process data and maintain state
            profile.emp_join_date = parsed_d

    # Set dob_val variable to store dob val value
    dob_val = data.pop("dob", None)
    # Evaluate condition to control execution branch
    if dob_val:
        # Set parsed_dob variable to store parsed dob value
        parsed_dob = safe_parse_date(dob_val)
        # Evaluate condition to control execution branch
        if parsed_dob:
            # Execute statement to process data and maintain state
            profile.dob = parsed_dob

    # Statutory & remaining
    if "pan" in data and data["pan"] is not None:
        # Execute statement to process data and maintain state
        profile.pan_no = str(data.pop("pan")).strip()
    # Check if target condition is false or object is missing
    if "aadhar" in data and data["aadhar"] is not None:
        # Execute statement to process data and maintain state
        profile.aadhar_no = str(data.pop("aadhar")).strip()
    # Check if target condition is false or object is missing
    if "blood_group" in data and data["blood_group"] is not None:
        # Execute statement to process data and maintain state
        profile.blood_group = str(data.pop("blood_group")).strip()


    # Set allowed_fields variable to store allowed fields value
    allowed_fields = Profile.__table__.columns.keys()
    # Set protected_fields variable to store protected fields value
    protected_fields = {"id", "emp_code", "password_hash"}
    # Iterate through items in sequence loop
    for key, value in data.items():
        # Check if target condition is false or object is missing
        if key in allowed_fields and key not in protected_fields and value is not None:
            # Invoke setattr to perform operational action
            setattr(profile, key, value)

    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(profile)
    # Return computed result or response payload to caller
    return profile


# Define delete_profile function to handle delete profile
def delete_profile(db: Session, emp_code: str) -> bool:
    # Set clean variable to store clean value
    clean = str(emp_code).strip()
    # Check if target condition is false or object is missing
    if not clean:
        # Return computed result or response payload to caller
        return False

    # Set profile variable to store profile value
    profile = get_by_emp_code(db, clean)
    # Check if target condition is false or object is missing
    if not profile:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(
            # Execute statement to process data and maintain state
            (Profile.emp_code.ilike(clean)) |
            # Execute statement to process data and maintain state
            (Profile.email.ilike(clean)) |
            # Execute statement to process data and maintain state
            (Profile.id == (int(clean) if clean.isdigit() else -1))
        # Execute statement to process data and maintain state
        ).first()

    # Check if target condition is false or object is missing
    if not profile:
        # Return computed result or response payload to caller
        return False

    # Set actual_code variable to store actual code value
    actual_code = profile.emp_code
    # Set profile_id variable to store profile id value
    profile_id = profile.id

    # Import text from sqlalchemy for module operations
    from sqlalchemy import text
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM leave_requests WHERE emp_code = :c"), {"c": actual_code})
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM employee_documents WHERE emp_code = :c"), {"c": actual_code})
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM monthly_sheets WHERE employee_id = :id"), {"id": profile_id})
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM resignation_requests WHERE emp_code = :c"), {"c": actual_code})
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass
    # Begin guarded execution block to trap exceptions
    try:
        # Invoke db.execute to perform operational action
        db.execute(text("DELETE FROM notifications WHERE recipient_emp_code = :c"), {"c": actual_code})
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Iterate through items in sequence loop
    for tbl in [
        # Execute statement to process data and maintain state
        'attendance_2026_08', 'attendance_2026_09', 'attendance_2026_10', 'attendance_2026_11',
        # Execute statement to process data and maintain state
        'leave_2026_08', 'leave_2026_09', 'leave_2026_10', 'leave_2026_11',
        # Execute statement to process data and maintain state
        'regularization_2026_08', 'regularization_2026_09', 'regularization_2026_10', 'regularization_2026_11',
        # Execute statement to process data and maintain state
        'tasks_2026_08', 'tasks_2026_09', 'tasks_2026_10', 'tasks_2026_11'
    # Execute statement to process data and maintain state
    ]:
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke db.execute to perform operational action
            db.execute(text(f"DELETE FROM {tbl} WHERE emp_code = :c"), {"c": actual_code})
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Mark entity instance for deletion in database
    db.delete(profile)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return True


# ================= ADD EMP =================

# Define add_employee function to handle add employee
def add_employee(db: Session, data):
    # Import module datetime for system functionality
    import datetime
    # Import User from app.models.user for module operations
    from app.models.user import User
    # Import LeaveBalance from app.models.leave for module operations
    from app.models.leave import LeaveBalance
    # Import HTTPException from fastapi for module operations
    from fastapi import HTTPException

    # Set clean_code variable to store clean code value
    clean_code = str(data.emp_code or "").strip()
    # Check if target condition is false or object is missing
    if not clean_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Employee ID is required.")

    # Set clean_email variable to store clean email value
    clean_email = str(data.email or "").strip().lower()
    # Check if target condition is false or object is missing
    if not clean_email:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Work Email is required.")

    # 1. Reject duplicate Employee ID
    existing_by_code = db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first()
    # Check if target condition is false or object is missing
    if not existing_by_code:
        # Initiate database query on specified model
        existing_by_code = db.query(User).filter(User.empcode.ilike(clean_code)).first()
    # Evaluate condition to control execution branch
    if existing_by_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Employee ID already exists.")

    # 2. Reject duplicate Email
    existing_by_email = db.query(Profile).filter(Profile.email.ilike(clean_email)).first()
    # Check if target condition is false or object is missing
    if not existing_by_email:
        # Initiate database query on specified model
        existing_by_email = db.query(User).filter(User.email.ilike(clean_email)).first()
    # Evaluate condition to control execution branch
    if existing_by_email:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="An employee account already exists with this email.")

    # 3. Parse names
    full_name_input = (getattr(data, "name", None) or "").strip()
    # Set first variable to store first value
    first = (getattr(data, "first_name", None) or "").strip() if getattr(data, "first_name", None) else ""
    # Set last variable to store last value
    last = (getattr(data, "last_name", None) or "").strip() if getattr(data, "last_name", None) else ""

    # Check if target condition is false or object is missing
    if full_name_input and not first:
        # Set parts variable to store parts value
        parts = [p.strip() for p in full_name_input.split() if p.strip()]
        # Evaluate condition to control execution branch
        if parts:
            # Set first variable to store first value
            first = parts[0]
            # Set last variable to store last value
            last = " ".join(parts[1:]) if len(parts) > 1 else ""

    # Check if target condition is false or object is missing
    if not first and not full_name_input:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Full Name is required.")

    # Set full_name variable to store full name value
    full_name = f"{first} {last}".strip() if (first or last) else (full_name_input or clean_code)

    # 4. Parse joining date safely without timezone shift
    raw_date = getattr(data, "joining_date", None) or getattr(data, "joined", None)
    # Set parsed_date variable to store parsed date value
    parsed_date = None
    # Evaluate condition to control execution branch
    if raw_date:
        # Evaluate condition to control execution branch
        if isinstance(raw_date, datetime.date):
            # Set parsed_date variable to store parsed date value
            parsed_date = raw_date
        # Evaluate alternate branch condition
        elif isinstance(raw_date, str) and raw_date.strip():
            # Set date_str variable to store date str value
            date_str = raw_date.strip().split("T")[0]
            # Begin guarded execution block to trap exceptions
            try:
                # Set parsed_date variable to store parsed date value
                parsed_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            # Catch and handle specific exception if raised
            except Exception:
                # Begin guarded execution block to trap exceptions
                try:
                    # Set parsed_date variable to store parsed date value
                    parsed_date = datetime.datetime.strptime(date_str, "%d-%m-%Y").date()
                # Catch and handle specific exception if raised
                except Exception:
                    # Set parsed_date variable to store parsed date value
                    parsed_date = datetime.date.today()
    # Check if target condition is false or object is missing
    if not parsed_date:
        # Set parsed_date variable to store parsed date value
        parsed_date = datetime.date.today()

    # 5. Role and Designation separation
    raw_role = (getattr(data, "role", None) or "employee").strip().lower()
    # Set valid_system_roles variable to store valid system roles value
    valid_system_roles = ["admin", "manager", "employee", "teamleader"]
    # Set system_role variable to store system role value
    system_role = raw_role if raw_role in valid_system_roles else "employee"

    # Set designation_val variable to store designation val value
    designation_val = (getattr(data, "designation", None) or "").strip()
    # Check if target condition is false or object is missing
    if not designation_val:
        # Check if target condition is false or object is missing
        if raw_role not in valid_system_roles and raw_role:
            # Set designation_val variable to store designation val value
            designation_val = getattr(data, "role", "").strip()
        # Execute fallback branch when conditions are not met
        else:
            # Set designation_val variable to store designation val value
            designation_val = "Employee"

    # Set dept_val variable to store dept val value
    dept_val = (getattr(data, "department", None) or "").strip()
    # Check if target condition is false or object is missing
    if not dept_val:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Department is required.")

    # Set phone_val variable to store phone val value
    phone_val = str(getattr(data, "mobile", None) or getattr(data, "phone", None) or "").strip()
    # Set type_val variable to store type val value
    type_val = (getattr(data, "employment_type", None) or getattr(data, "type", None) or "Full-time").strip()
    # Set loc_val variable to store loc val value
    loc_val = (getattr(data, "location", None) or "Mumbai, IN").strip()
    # Set about_val variable to store about val value
    about_val = (getattr(data, "about", None) or "").strip()
    # Set common_password variable to store common password value
    common_password = getattr(data, "password", None) or "Admin@123"
    # Set mgr_val variable to store mgr val value
    mgr_val = (
        # Invoke getattr to perform operational action
        getattr(data, "reporting_supervisor", None)
        # Execute statement to process data and maintain state
        or getattr(data, "manager_code", None)
        # Execute statement to process data and maintain state
        or getattr(data, "manager", None)
        # Execute statement to process data and maintain state
        or ""
    # Execute statement to process data and maintain state
    ).strip()

    # 6. Database Transaction
    try:
        # Set new_profile variable to store new profile value
        new_profile = Profile(
            # Set emp_code variable to store emp code value
            emp_code=clean_code,
            # Set first_name variable to store first name value
            first_name=first or None,
            # Set middle_name variable to store middle name value
            middle_name=getattr(data, "middle_name", None),
            # Set last_name variable to store last name value
            last_name=last or None,
            # Set email variable to store email value
            email=clean_email,
            # Placeholder statement performing no operation
            password_hash=hash_password(common_password),
            # Set must_change_password variable to store must change password value
            must_change_password=True,
            # Set mobile_no variable to store mobile no value
            mobile_no=phone_val or None,
            # Set role variable to store role value
            role=system_role,
            # Set department variable to store department value
            department=dept_val,
            # Set designation variable to store designation value
            designation=designation_val,
            # Set employment_type variable to store employment type value
            employment_type=type_val,
            # Set employment_status variable to store employment status value
            employment_status="Active",
            # Set branch_location variable to store branch location value
            branch_location=loc_val,
            # Set emp_join_date variable to store emp join date value
            emp_join_date=parsed_date,
            # Set about variable to store about value
            about=about_val or None,
            # Set reporting_supervisor variable to store reporting supervisor value
            reporting_supervisor=mgr_val or None
        # Execute statement to process data and maintain state
        )
        # Stage new entity instance into database session
        db.add(new_profile)

        # Synchronize User account table
        user_record = db.query(User).filter((User.empcode.ilike(clean_code)) | (User.email.ilike(clean_email))).first()
        # Check if target condition is false or object is missing
        if not user_record:
            # Set user_record variable to store user record value
            user_record = User(
                # Set empcode variable to store empcode value
                empcode=clean_code,
                # Set username variable to store username value
                username=full_name or clean_code,
                # Set email variable to store email value
                email=clean_email,
                # Placeholder statement performing no operation
                password=hash_password(common_password),
                # Set role variable to store role value
                role=system_role,
                # Set designation variable to store designation value
                designation=designation_val
            # Execute statement to process data and maintain state
            )
            # Stage new entity instance into database session
            db.add(user_record)
        # Execute fallback branch when conditions are not met
        else:
            # Execute statement to process data and maintain state
            user_record.empcode = clean_code
            # Execute statement to process data and maintain state
            user_record.username = full_name or clean_code
            # Execute statement to process data and maintain state
            user_record.email = clean_email
            # Execute statement to process data and maintain state
            user_record.role = system_role
            # Execute statement to process data and maintain state
            user_record.designation = designation_val

        # Initialize LeaveBalance
        lb = db.query(LeaveBalance).filter(LeaveBalance.emp_code == clean_code).first()
        # Check if target condition is false or object is missing
        if not lb:
            # Stage new entity instance into database session
            db.add(LeaveBalance(emp_code=clean_code, allowed_leaves=21.0, used_leaves=0.0))

        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(new_profile)
    # Catch and handle specific exception if raised
    except HTTPException:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as exc:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Invoke print to perform operational action
        print("Database error creating employee:", exc)
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Database error creating employee: {str(exc)}")

    # 7. Initialize Payroll Profile (Dynamic, Database-Backed, NO fake payslips)
    try:
        # Import init_payroll_profile from app.services.payroll_service for module operations
        from app.services.payroll_service import init_payroll_profile
        # Set gross_val variable to store gross val value
        gross_val = getattr(data, "monthly_gross", None) or getattr(data, "salary", None) or None
        # Set ctc_val variable to store ctc val value
        ctc_val = getattr(data, "annual_ctc", None) or None
        # Execute statement to process data and maintain state
        init_payroll_profile(
            # Set db variable to store db value
            db=db,
            # Set emp_code variable to store emp code value
            emp_code=clean_code,
            # Set monthly_gross variable to store monthly gross value
            monthly_gross=gross_val,
            # Set annual_ctc variable to store annual ctc value
            annual_ctc=ctc_val,
            # Set joining_date variable to store joining date value
            joining_date=parsed_date,
            # Set employment_type variable to store employment type value
            employment_type=type_val
        # Execute statement to process data and maintain state
        )
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke print to perform operational action
        print("Payroll profile initialization note:", e)

    # Return computed result or response payload to caller
    return new_profile