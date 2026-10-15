from sqlalchemy.orm import Session
from app.models.profile_model import Profile
from app.repositories import profile_repository
from app.core.security import hash_password


def get_profile(db: Session, emp_code: str):
    profile = profile_repository.get_by_emp_code(db, emp_code)

    if not profile:
        profile = profile_repository.create_profile(db, {"emp_code": emp_code})

    return profile


def get_by_emp_code(db: Session, emp_code: str):
    return db.query(Profile).filter(Profile.emp_code == emp_code).first()


def create_profile(db: Session, data: dict):
    profile = Profile(**data)   # 🔥 THIS FIX

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


from datetime import datetime, date


def safe_parse_date(val):
    if not val:
        return None
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s or s in ('.', '-', '—'):
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%b %d, %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def update_profile(db: Session, emp_code: str, data: dict):
    clean = str(emp_code).strip()
    profile = get_by_emp_code(db, clean)

    if not profile:
        profile = db.query(Profile).filter(
            (Profile.emp_code.ilike(clean)) |
            (Profile.email.ilike(clean)) |
            (Profile.id == (int(clean) if clean.isdigit() else -1))
        ).first()

    if not profile:
        return None

    # Handle emp_code update
    new_emp_code = data.get("emp_code")
    if new_emp_code and str(new_emp_code).strip() and str(new_emp_code).strip().upper() != (profile.emp_code or "").upper():
        new_code_clean = str(new_emp_code).strip().upper()
        old_code = profile.emp_code
        profile.emp_code = new_code_clean
        from sqlalchemy import text
        for tbl in ['leave_requests', 'employee_documents', 'resignation_requests', 'notifications',
                    'attendance_2026_08', 'attendance_2026_09', 'attendance_2026_10', 'attendance_2026_11',
                    'tasks_2026_09', 'tasks_2026_10']:
            try:
                col = 'recipient_emp_code' if tbl == 'notifications' else 'emp_code'
                db.execute(text(f"UPDATE {tbl} SET {col} = :nc WHERE {col} = :oc"), {"nc": new_code_clean, "oc": old_code})
            except Exception as e:
                pass

    # Name handling
    if "name" in data and data["name"]:
        name_val = str(data.pop("name")).strip()
        parts = [p for p in name_val.split() if p]
        if parts:
            profile.first_name = parts[0]
            if len(parts) > 1:
                profile.last_name = " ".join(parts[1:])

    if "first_name" in data and data["first_name"] is not None:
        profile.first_name = str(data.pop("first_name")).strip()
    if "last_name" in data and data["last_name"] is not None:
        profile.last_name = str(data.pop("last_name")).strip()
    if "email" in data and data["email"] is not None and str(data["email"]).strip():
        profile.email = str(data.pop("email")).strip().lower()

    # Contact & location
    if "mobile" in data and data["mobile"] is not None:
        profile.mobile_no = str(data.pop("mobile")).strip()
    if "phone" in data and data["phone"] is not None:
        profile.mobile_no = str(data.pop("phone")).strip()
    if "mobile_no" in data and data["mobile_no"] is not None:
        profile.mobile_no = str(data.pop("mobile_no")).strip()
    if "location" in data and data["location"] is not None:
        profile.branch_location = str(data.pop("location")).strip()
    if "about" in data and data["about"] is not None:
        profile.about = str(data.pop("about")).strip()

    # Organization fields
    if "department" in data and data["department"] is not None:
        profile.department = str(data.pop("department")).strip()
    if "designation" in data and data["designation"] is not None:
        profile.designation = str(data.pop("designation")).strip()
    if "role" in data and data["role"] is not None:
        r = str(data.pop("role")).strip().lower()
        if r in ("admin", "manager", "employee", "teamleader"):
            profile.role = r
    if "employment_type" in data and data["employment_type"] is not None:
        profile.employment_type = str(data.pop("employment_type")).strip()
    if "type" in data and data["type"] is not None:
        profile.employment_type = str(data.pop("type")).strip()
    if "status" in data and data["status"] is not None:
        profile.employment_status = str(data.pop("status")).strip()
    if "employment_status" in data and data["employment_status"] is not None:
        profile.employment_status = str(data.pop("employment_status")).strip()

    # Dates
    join_val = data.pop("joining_date", None) or data.pop("joined", None)
    if join_val:
        parsed_d = safe_parse_date(join_val)
        if parsed_d:
            profile.emp_join_date = parsed_d

    dob_val = data.pop("dob", None)
    if dob_val:
        parsed_dob = safe_parse_date(dob_val)
        if parsed_dob:
            profile.dob = parsed_dob

    # Statutory & remaining
    if "pan" in data and data["pan"] is not None:
        profile.pan_no = str(data.pop("pan")).strip()
    if "aadhar" in data and data["aadhar"] is not None:
        profile.aadhar_no = str(data.pop("aadhar")).strip()

    allowed_fields = Profile.__table__.columns.keys()
    protected_fields = {"id", "emp_code", "password_hash"}
    for key, value in data.items():
        if key in allowed_fields and key not in protected_fields and value is not None:
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


def delete_profile(db: Session, emp_code: str) -> bool:
    clean = str(emp_code).strip()
    if not clean:
        return False

    profile = get_by_emp_code(db, clean)
    if not profile:
        profile = db.query(Profile).filter(
            (Profile.emp_code.ilike(clean)) |
            (Profile.email.ilike(clean)) |
            (Profile.id == (int(clean) if clean.isdigit() else -1))
        ).first()

    if not profile:
        return False

    actual_code = profile.emp_code
    profile_id = profile.id

    from sqlalchemy import text
    try:
        db.execute(text("DELETE FROM leave_requests WHERE emp_code = :c"), {"c": actual_code})
    except Exception:
        pass
    try:
        db.execute(text("DELETE FROM employee_documents WHERE emp_code = :c"), {"c": actual_code})
    except Exception:
        pass
    try:
        db.execute(text("DELETE FROM monthly_sheets WHERE employee_id = :id"), {"id": profile_id})
    except Exception:
        pass
    try:
        db.execute(text("DELETE FROM resignation_requests WHERE emp_code = :c"), {"c": actual_code})
    except Exception:
        pass
    try:
        db.execute(text("DELETE FROM notifications WHERE recipient_emp_code = :c"), {"c": actual_code})
    except Exception:
        pass

    for tbl in [
        'attendance_2026_08', 'attendance_2026_09', 'attendance_2026_10', 'attendance_2026_11',
        'leave_2026_08', 'leave_2026_09', 'leave_2026_10', 'leave_2026_11',
        'regularization_2026_08', 'regularization_2026_09', 'regularization_2026_10', 'regularization_2026_11',
        'tasks_2026_08', 'tasks_2026_09', 'tasks_2026_10', 'tasks_2026_11'
    ]:
        try:
            db.execute(text(f"DELETE FROM {tbl} WHERE emp_code = :c"), {"c": actual_code})
        except Exception:
            pass

    db.delete(profile)
    db.commit()
    return True


# ================= ADD EMP =================

def add_employee(db: Session, data):
    import datetime
    from app.models.user import User
    from app.models.leave import LeaveBalance
    from fastapi import HTTPException

    clean_code = str(data.emp_code or "").strip()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Employee ID is required.")

    clean_email = str(data.email or "").strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Work Email is required.")

    # 1. Reject duplicate Employee ID
    existing_by_code = db.query(Profile).filter(Profile.emp_code.ilike(clean_code)).first()
    if not existing_by_code:
        existing_by_code = db.query(User).filter(User.empcode.ilike(clean_code)).first()
    if existing_by_code:
        raise HTTPException(status_code=400, detail="Employee ID already exists.")

    # 2. Reject duplicate Email
    existing_by_email = db.query(Profile).filter(Profile.email.ilike(clean_email)).first()
    if not existing_by_email:
        existing_by_email = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing_by_email:
        raise HTTPException(status_code=400, detail="An employee account already exists with this email.")

    # 3. Parse names
    full_name_input = (getattr(data, "name", None) or "").strip()
    first = (getattr(data, "first_name", None) or "").strip() if getattr(data, "first_name", None) else ""
    last = (getattr(data, "last_name", None) or "").strip() if getattr(data, "last_name", None) else ""

    if full_name_input and not first:
        parts = [p.strip() for p in full_name_input.split() if p.strip()]
        if parts:
            first = parts[0]
            last = " ".join(parts[1:]) if len(parts) > 1 else ""

    if not first and not full_name_input:
        raise HTTPException(status_code=400, detail="Full Name is required.")

    full_name = f"{first} {last}".strip() if (first or last) else (full_name_input or clean_code)

    # 4. Parse joining date safely without timezone shift
    raw_date = getattr(data, "joining_date", None) or getattr(data, "joined", None)
    parsed_date = None
    if raw_date:
        if isinstance(raw_date, datetime.date):
            parsed_date = raw_date
        elif isinstance(raw_date, str) and raw_date.strip():
            date_str = raw_date.strip().split("T")[0]
            try:
                parsed_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            except Exception:
                try:
                    parsed_date = datetime.datetime.strptime(date_str, "%d-%m-%Y").date()
                except Exception:
                    parsed_date = datetime.date.today()
    if not parsed_date:
        parsed_date = datetime.date.today()

    # 5. Role and Designation separation
    raw_role = (getattr(data, "role", None) or "employee").strip().lower()
    valid_system_roles = ["admin", "manager", "employee", "teamleader"]
    system_role = raw_role if raw_role in valid_system_roles else "employee"

    designation_val = (getattr(data, "designation", None) or "").strip()
    if not designation_val:
        if raw_role not in valid_system_roles and raw_role:
            designation_val = getattr(data, "role", "").strip()
        else:
            designation_val = "Employee"

    dept_val = (getattr(data, "department", None) or "").strip()
    if not dept_val:
        raise HTTPException(status_code=400, detail="Department is required.")

    phone_val = str(getattr(data, "mobile", None) or getattr(data, "phone", None) or "").strip()
    type_val = (getattr(data, "employment_type", None) or getattr(data, "type", None) or "Full-time").strip()
    loc_val = (getattr(data, "location", None) or "Mumbai, IN").strip()
    about_val = (getattr(data, "about", None) or "").strip()
    common_password = getattr(data, "password", None) or "Admin@123"
    mgr_val = (
        getattr(data, "reporting_supervisor", None)
        or getattr(data, "manager_code", None)
        or getattr(data, "manager", None)
        or ""
    ).strip()

    # 6. Database Transaction
    try:
        new_profile = Profile(
            emp_code=clean_code,
            first_name=first or None,
            middle_name=getattr(data, "middle_name", None),
            last_name=last or None,
            email=clean_email,
            password_hash=hash_password(common_password),
            must_change_password=True,
            mobile_no=phone_val or None,
            role=system_role,
            department=dept_val,
            designation=designation_val,
            employment_type=type_val,
            employment_status="Active",
            branch_location=loc_val,
            emp_join_date=parsed_date,
            about=about_val or None,
            reporting_supervisor=mgr_val or None
        )
        db.add(new_profile)

        # Synchronize User account table
        user_record = db.query(User).filter((User.empcode.ilike(clean_code)) | (User.email.ilike(clean_email))).first()
        if not user_record:
            user_record = User(
                empcode=clean_code,
                username=full_name or clean_code,
                email=clean_email,
                password=hash_password(common_password),
                role=system_role,
                designation=designation_val
            )
            db.add(user_record)
        else:
            user_record.empcode = clean_code
            user_record.username = full_name or clean_code
            user_record.email = clean_email
            user_record.role = system_role
            user_record.designation = designation_val

        # Initialize LeaveBalance
        lb = db.query(LeaveBalance).filter(LeaveBalance.emp_code == clean_code).first()
        if not lb:
            db.add(LeaveBalance(emp_code=clean_code, allowed_leaves=21.0, used_leaves=0.0))

        db.commit()
        db.refresh(new_profile)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        print("Database error creating employee:", exc)
        raise HTTPException(status_code=500, detail=f"Database error creating employee: {str(exc)}")

    # 7. Initialize Payroll Profile (Dynamic, Database-Backed, NO fake payslips)
    try:
        from app.services.payroll_service import init_payroll_profile
        gross_val = getattr(data, "monthly_gross", None) or getattr(data, "salary", None) or None
        ctc_val = getattr(data, "annual_ctc", None) or None
        init_payroll_profile(
            db=db,
            emp_code=clean_code,
            monthly_gross=gross_val,
            annual_ctc=ctc_val,
            joining_date=parsed_date,
            employment_type=type_val
        )
    except Exception as e:
        print("Payroll profile initialization note:", e)

    return new_profile