import sys
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
except Exception:
    pass

from app.models.profile_model import Profile
from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.core.security import hash_password


def seed_data():
    init_db()
    db = SessionLocal()
    try:
        default_password = "Welcome@123"
        hashed_pwd = hash_password(default_password)

        seed_users = [
            {
                "emp_code": "ADM001",
                "first_name": "Tanmay",
                "last_name": "S",
                "email": "tanmay.s@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM002",
                "first_name": "Migdad",
                "last_name": "Mirza",
                "email": "migdad.m@laesfera.co",
                "role": "admin",
                "designation": "Operations Director",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM003",
                "first_name": "Aaquib",
                "last_name": "Khan",
                "email": "aaquib.k@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "department": "Engineering",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM004",
                "first_name": "Janhavi",
                "last_name": "S",
                "email": "janhavi.s@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "department": "Administration",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM005",
                "first_name": "Shraddha",
                "last_name": "J",
                "email": "shraddha.j@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "department": "Administration",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM006",
                "first_name": "Payal",
                "last_name": "M",
                "email": "payal.m@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "department": "Administration",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "ADM007",
                "first_name": "Bikita",
                "last_name": "H",
                "email": "bikita.h@laesfera.co",
                "role": "admin",
                "designation": "Administrator",
                "department": "Administration",
                "branch_location": "Mumbai, IN",
            },
            {
                "emp_code": "MGR001",
                "first_name": "Payal",
                "last_name": "",
                "email": "payal@company.com",
                "role": "manager",
                "designation": "Manager",
                "department": "Operations",
                "branch_location": "Mumbai, IN",
                "mobile_no": "+91 98765 43210"
            },
            {
                "emp_code": "EMP001",
                "first_name": "Aaquib",
                "last_name": "Khan",
                "email": "aquib@company.com",
                "role": "employee",
                "designation": "UI/UX / WordPress Developer",
                "department": "Operations",
                "branch_location": "Mumbai, IN",
                "reporting_supervisor": "MGR001",
                "mobile_no": "+91 91234 56789"
            },
            {
                "emp_code": "EMP002",
                "first_name": "Jahnvi",
                "last_name": "Shah",
                "email": "jahnvi@company.com",
                "role": "employee",
                "designation": "Employee",
                "department": "Operations",
                "branch_location": "Mumbai, IN",
                "reporting_supervisor": "MGR001",
                "mobile_no": "+91 98765 12345"
            },
        ]

        for u in seed_users:
            profile = db.query(Profile).filter(Profile.emp_code == u["emp_code"]).first()
            if not profile:
                profile = db.query(Profile).filter(Profile.email == u["email"]).first()

            user_pwd = hashed_pwd

            if profile:
                profile.first_name = u["first_name"]
                profile.last_name = u["last_name"]
                profile.email = u["email"]
                profile.emp_code = u["emp_code"]
                profile.role = u["role"]
                profile.designation = u["designation"]
                if "branch_location" in u:
                    profile.branch_location = u["branch_location"]
                if "reporting_supervisor" in u:
                    profile.reporting_supervisor = u["reporting_supervisor"]
                if "mobile_no" in u:
                    profile.mobile_no = u["mobile_no"]
                if not profile.password_hash:
                    profile.password_hash = user_pwd
                    profile.must_change_password = True
                db.commit()
            else:
                new_profile = Profile(
                    emp_code=u["emp_code"],
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    email=u["email"],
                    role=u["role"],
                    designation=u["designation"],
                    branch_location=u.get("branch_location", "Mumbai, IN"),
                    reporting_supervisor=u.get("reporting_supervisor"),
                    mobile_no=u.get("mobile_no", "+91 99999 99999"),
                    password_hash=user_pwd,
                    must_change_password=True
                )
                db.add(new_profile)
                db.commit()
                print(f"[OK] Created seed account: {u['first_name']} {u['last_name']} ({u['email']}) as {u['role']}")

        # Ensure any profile without a password hash gets initialized
        all_profiles = db.query(Profile).all()
        for p in all_profiles:
            if not p.password_hash:
                p.password_hash = hashed_pwd
                p.must_change_password = True

        # Ensure leave balance exists for all profiles
        from app.models.leave import LeaveBalance
        for p in all_profiles:
            if p.emp_code:
                bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == p.emp_code).first()
                if not bal:
                    db.add(LeaveBalance(emp_code=p.emp_code, allowed_leaves=21.0, used_leaves=0.0))

        db.commit()
        print("[OK] Employee accounts verified.")

    except Exception as exc:
        db.rollback()
        print("[WARN] Seed failed:", exc)
    finally:
        db.close()