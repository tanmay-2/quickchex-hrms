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


# ✅ FIXED FUNCTION
def update_profile(db: Session, emp_code: str, data: dict):
    profile = get_by_emp_code(db, emp_code)

    if not profile:
        return None

    # Handle emp_code update
    new_emp_code = data.get("emp_code")
    if new_emp_code and str(new_emp_code).strip() and str(new_emp_code).strip() != emp_code:
        new_code_clean = str(new_emp_code).strip()
        profile.emp_code = new_code_clean
        try:
            from sqlalchemy import text
            db.execute(text("UPDATE employee_directory SET id = :new_code, emp_code = :new_code WHERE id = :old_code OR emp_code = :old_code"), {"new_code": new_code_clean, "old_code": emp_code})
        except Exception as e:
            print("Note on employee_directory emp_code update:", e)

    # ================= FIELD MAPPING =================

    if "pan" in data:
        data["pan_no"] = data.pop("pan")

    if "mobile" in data:
        mobile_val = data.pop("mobile")
        data["mobile_no"] = str(mobile_val) if mobile_val else None

    if "aadhar" in data:
        data["aadhar_no"] = str(data.pop("aadhar")) if data.get("aadhar") else None

    if "joining_date" in data:
        data["emp_join_date"] = data.pop("joining_date")

    if "location" in data:
        data["branch_location"] = data.pop("location")

    if "status" in data:
        data["employment_status"] = data.pop("status")

    if "family_contact" in data:
        data["family_contact"] = (
            str(data.get("family_contact")) if data.get("family_contact") else None
        )

    # ================= DEBUG =================
    print("FINAL UPDATE DATA:", data)

    # ================= UPDATE =================

    allowed_fields = Profile.__table__.columns.keys()

    for key, value in data.items():
        if key in allowed_fields and key != "emp_code":
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    print("UPDATED PROFILE:", profile.__dict__)

    return profile


# ================= ADD EMP =================

def add_employee(db: Session, data):
    existing = profile_repository.get_by_emp_code(db, data.emp_code)
    if not existing and data.email:
        email_clean = str(data.email).strip().lower()
        existing = profile_repository.get_profile_by_email(db, email_clean)

    first = (data.first_name or "").strip() if data.first_name else None
    last = (data.last_name or "").strip() if data.last_name else None
    email_str = (data.email or "").strip() if data.email else ""

    if first and last and first.lower() == last.lower():
        last = None
    if first and email_str and first.lower() == email_str.lower():
        first = None
    if last and email_str and last.lower() == email_str.lower():
        last = None

    if existing:
        update_data = {
            "first_name": first,
            "middle_name": data.middle_name,
            "last_name": last,
            "email": data.email,
            "mobile_no": data.mobile,
            "role": (data.role or "employee").lower(),
            "department": data.department,
            "designation": data.designation or data.role,
            "emp_join_date": data.joining_date
        }
        return update_profile(db, existing.emp_code, update_data)

    common_password = data.password or "Admin@123"
    new_profile_data = {
        "emp_code": data.emp_code,
        "first_name": first,
        "middle_name": data.middle_name,
        "last_name": last,
        "email": data.email,
        "password_hash": hash_password(common_password),
        "must_change_password": True,
        "mobile_no": data.mobile,
        "role": (data.role or "employee").lower(),
        "department": data.department,
        "designation": data.designation,
        "emp_join_date": data.joining_date
    }

    profile = profile_repository.create_profile(db, new_profile_data)
    try:
        from sqlalchemy import text
        full_name = f"{first or ''} {last or ''}".strip() or None
        if full_name and email_str and full_name.lower() == email_str.lower():
            full_name = None

        db.execute(text("""
            INSERT INTO employee_directory 
            (id, emp_code, name, role, department, designation, email, phone, location, type, joined, about, profile_image)
            VALUES (:id, :code, :name, :role, :dept, :desig, :email, :phone, :loc, :type, :joined, '', '')
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                designation = EXCLUDED.designation,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone;
        """), {
            "id": data.emp_code,
            "code": data.emp_code,
            "name": full_name,
            "role": (data.role or "employee").lower(),
            "dept": data.department or "General",
            "desig": data.designation or "Employee",
            "email": data.email,
            "phone": data.mobile or "",
            "loc": "Mumbai, IN",
            "type": "Full-time",
            "joined": str(data.joining_date)
        })
        db.commit()
    except Exception as e:
        print("Note on employee_directory sync:", e)

    # Automatically generate salary slip for newly added employee
    try:
        from app.services.payroll_service import generate_payslips_for_employee
        full_name = f"{first or ''} {last or ''}".strip() or email_str
        gross_val = data.monthly_gross or data.salary or None
        ctc_val = data.annual_ctc or None
        generate_payslips_for_employee(
            db=db,
            emp_code=data.emp_code,
            employee_name=full_name,
            monthly_gross=gross_val,
            annual_ctc=ctc_val,
            role=data.role or data.designation or ""
        )
    except Exception as e:
        print("Auto payslip generation note:", e)

    return profile