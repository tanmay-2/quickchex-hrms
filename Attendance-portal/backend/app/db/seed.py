# ==============================================================================
# QUICKCHEX HRMS BACKEND - SEED.PY
# Path: Attendance-portal/backend/app/db/seed.py
# Purpose: Database management, migration, or lifecycle initialization module for 'seed'.
# Primary Functions:
#   • seed_data()
# ==============================================================================

# Import module sys for system functionality
import sys
# Begin guarded execution block to trap exceptions
try:
    # Evaluate condition to control execution branch
    if hasattr(sys.stdout, "reconfigure"):
        # Invoke sys.stdout.reconfigure to perform operational action
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    # Evaluate condition to control execution branch
    if hasattr(sys.stderr, "reconfigure"):
        # Invoke sys.stderr.reconfigure to perform operational action
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
# Catch and handle specific exception if raised
except Exception:
    # Placeholder statement performing no operation
    pass

# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import SessionLocal from app.db.session for module operations
from app.db.session import SessionLocal
# Import init_db from app.db.init_db for module operations
from app.db.init_db import init_db
# Import hash_password from app.core.security for module operations
from app.core.security import hash_password


# Define seed_data function to handle seed data
def seed_data():
    # Invoke init_db to perform operational action
    init_db()
    # Set db variable to store db value
    db = SessionLocal()
    # Begin guarded execution block to trap exceptions
    try:
        # Set default_password variable to store default password value
        default_password = "Welcome@123"
        # Set hashed_pwd variable to store hashed pwd value
        hashed_pwd = hash_password(default_password)

        # Set seed_users variable to store seed users value
        seed_users = [
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "ADM001",
                # Execute statement to process data and maintain state
                "first_name": "Aaquib",
                # Execute statement to process data and maintain state
                "last_name": "Khan",
                # Execute statement to process data and maintain state
                "email": "aaquib.k@laesfera.co",
                # Execute statement to process data and maintain state
                "role": "admin",
                # Execute statement to process data and maintain state
                "designation": "Administrator",
                # Execute statement to process data and maintain state
                "department": "Administration",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "ADM002",
                # Execute statement to process data and maintain state
                "first_name": "Migdad",
                # Execute statement to process data and maintain state
                "last_name": "Mirza",
                # Execute statement to process data and maintain state
                "email": "migdad.m@laesfera.co",
                # Execute statement to process data and maintain state
                "role": "admin",
                # Execute statement to process data and maintain state
                "designation": "Operations Director",
                # Execute statement to process data and maintain state
                "department": "Operations",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "ADM003",
                # Execute statement to process data and maintain state
                "first_name": "Janhavi",
                # Execute statement to process data and maintain state
                "last_name": "Samant",
                # Execute statement to process data and maintain state
                "email": "janhavi.s@laesfera.co",
                # Execute statement to process data and maintain state
                "role": "admin",
                # Execute statement to process data and maintain state
                "designation": "Administrator",
                # Execute statement to process data and maintain state
                "department": "Administration",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 98765 12345",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "LE249",
                # Execute statement to process data and maintain state
                "first_name": "Payal",
                # Execute statement to process data and maintain state
                "last_name": "Mishra",
                # Execute statement to process data and maintain state
                "email": "payal.m@laesfera.co",
                # Execute statement to process data and maintain state
                "role": "employee",
                # Execute statement to process data and maintain state
                "designation": "Operations Executive",
                # Execute statement to process data and maintain state
                "department": "Operations",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "reporting_supervisor": "ADM003",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 98765 43249",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "MGR001",
                # Execute statement to process data and maintain state
                "first_name": "Kevin",
                # Execute statement to process data and maintain state
                "last_name": "John",
                # Execute statement to process data and maintain state
                "email": "kevin.john@laesfera.co",
                # Execute statement to process data and maintain state
                "role": "manager",
                # Execute statement to process data and maintain state
                "designation": "Manager",
                # Execute statement to process data and maintain state
                "department": "Operations",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 98765 43210",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "EMP001",
                # Execute statement to process data and maintain state
                "first_name": "Aaquib",
                # Execute statement to process data and maintain state
                "last_name": "Khan",
                # Execute statement to process data and maintain state
                "email": "aquib@company.com",
                # Execute statement to process data and maintain state
                "role": "employee",
                # Execute statement to process data and maintain state
                "designation": "UI/UX / WordPress Developer",
                # Execute statement to process data and maintain state
                "department": "Operations",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "reporting_supervisor": "MGR001",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 91234 56789",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "EMP002",
                # Execute statement to process data and maintain state
                "first_name": "Janhavi",
                # Execute statement to process data and maintain state
                "last_name": "Shah",
                # Execute statement to process data and maintain state
                "email": "jahnvi@company.com",
                # Execute statement to process data and maintain state
                "role": "admin",
                # Execute statement to process data and maintain state
                "designation": "Administrator",
                # Execute statement to process data and maintain state
                "department": "Administration",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 98765 12345",
            # Execute statement to process data and maintain state
            },
            # Execute statement to process data and maintain state
            {
                # Execute statement to process data and maintain state
                "emp_code": "EMP003",
                # Execute statement to process data and maintain state
                "first_name": "Payal",
                # Execute statement to process data and maintain state
                "last_name": "Kaur",
                # Execute statement to process data and maintain state
                "email": "payal@company.com",
                # Execute statement to process data and maintain state
                "role": "employee",
                # Execute statement to process data and maintain state
                "designation": "Operations Executive",
                # Execute statement to process data and maintain state
                "department": "Operations",
                # Execute statement to process data and maintain state
                "branch_location": "Mumbai, IN",
                # Execute statement to process data and maintain state
                "reporting_supervisor": "ADM003",
                # Execute statement to process data and maintain state
                "mobile_no": "+91 98765 43210",
            # Execute statement to process data and maintain state
            },
        # Execute statement to process data and maintain state
        ]


        # Iterate through items in sequence loop
        for u in seed_users:
            # Initiate database query on specified model
            profile = db.query(Profile).filter(Profile.emp_code == u["emp_code"]).first()
            # Check if target condition is false or object is missing
            if not profile:
                # Initiate database query on specified model
                profile = db.query(Profile).filter(Profile.email == u["email"]).first()

            # Set user_pwd variable to store user pwd value
            user_pwd = hashed_pwd

            # Evaluate condition to control execution branch
            if profile:
                # IMPORTANT: DO NOT overwrite existing fields edited by admins/users in production!
                # Only initialize missing password hash if none exists.
                if not profile.password_hash:
                    # Execute statement to process data and maintain state
                    profile.password_hash = user_pwd
                    # Execute statement to process data and maintain state
                    profile.must_change_password = True
                    # Commit transaction to persist changes in database
                    db.commit()
            # Execute fallback branch when conditions are not met
            else:
                # Set new_profile variable to store new profile value
                new_profile = Profile(
                    # Set emp_code variable to store emp code value
                    emp_code=u["emp_code"],
                    # Set first_name variable to store first name value
                    first_name=u["first_name"],
                    # Set last_name variable to store last name value
                    last_name=u["last_name"],
                    # Set email variable to store email value
                    email=u["email"],
                    # Set role variable to store role value
                    role=u["role"],
                    # Set designation variable to store designation value
                    designation=u["designation"],
                    # Set branch_location variable to store branch location value
                    branch_location=u.get("branch_location", "Mumbai, IN"),
                    # Set reporting_supervisor variable to store reporting supervisor value
                    reporting_supervisor=u.get("reporting_supervisor"),
                    # Set mobile_no variable to store mobile no value
                    mobile_no=u.get("mobile_no", "+91 99999 99999"),
                    # Placeholder statement performing no operation
                    password_hash=user_pwd,
                    # Set must_change_password variable to store must change password value
                    must_change_password=True
                # Execute statement to process data and maintain state
                )
                # Stage new entity instance into database session
                db.add(new_profile)
                # Commit transaction to persist changes in database
                db.commit()
                # Invoke print to perform operational action
                print(f"[OK] Created seed account: {u['first_name']} {u['last_name']} ({u['email']}) as {u['role']}")

        # Ensure any profile without a password hash gets initialized
        all_profiles = db.query(Profile).all()
        # Iterate through items in sequence loop
        for p in all_profiles:
            # Check if target condition is false or object is missing
            if not p.password_hash:
                # Execute statement to process data and maintain state
                p.password_hash = hashed_pwd
                # Execute statement to process data and maintain state
                p.must_change_password = True

        # Ensure leave balance exists for all profiles
        from app.models.leave import LeaveBalance
        # Iterate through items in sequence loop
        for p in all_profiles:
            # Evaluate condition to control execution branch
            if p.emp_code:
                # Initiate database query on specified model
                bal = db.query(LeaveBalance).filter(LeaveBalance.emp_code == p.emp_code).first()
                # Check if target condition is false or object is missing
                if not bal:
                    # Stage new entity instance into database session
                    db.add(LeaveBalance(emp_code=p.emp_code, allowed_leaves=21.0, used_leaves=0.0))

        # Commit transaction to persist changes in database
        db.commit()
        # Invoke print to perform operational action
        print("[OK] Employee accounts verified.")

    # Catch and handle specific exception if raised
    except Exception as exc:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Invoke print to perform operational action
        print("[WARN] Seed failed:", exc)
    # Execute cleanup actions regardless of exceptions
    finally:
        # Invoke db.close to perform operational action
        db.close()