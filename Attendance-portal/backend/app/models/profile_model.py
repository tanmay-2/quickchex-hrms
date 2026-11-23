# ==============================================================================
# QUICKCHEX HRMS BACKEND - PROFILE_MODEL.PY
# Path: Attendance-portal/backend/app/models/profile_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'profile_model'.
# Classes / Data Models:
#   • Profile
# ==============================================================================

# app/models/profile_model.py
from sqlalchemy.orm import relationship
# Import Column, Integer, String, Date, Boolean from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, Boolean
# Import Base from app.db.base for module operations
from app.db.base import Base

# Define class Profile inheriting from Base
class Profile(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "profile_master"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)

    # Define database column schema mapping for emp code
    emp_code = Column(String, unique=True, index=True)

    # PERSONAL
    first_name = Column(String)
    # Define database column schema mapping for middle name
    middle_name = Column(String)
    # Define database column schema mapping for last name
    last_name = Column(String)
    # Define database column schema mapping for email
    email = Column(String)

    mobile_no = Column(String)   # ✅ FIXED

    # Define database column schema mapping for gender
    gender = Column(String)
    # Define database column schema mapping for dob
    dob = Column(Date)
    # Define database column schema mapping for marital status
    marital_status = Column(String)
    # Define database column schema mapping for blood group
    blood_group = Column(String, nullable=True)

    pan_no = Column(String)      # ✅ FIXED
    aadhar_no = Column(String)   # ✅ FIXED

    # Define database column schema mapping for father name
    father_name=Column(String)
    # Define database column schema mapping for mother name
    mother_name=Column(String)
    # Define database column schema mapping for family contact
    family_contact=Column(String)

    # Define database column schema mapping for address1
    address1=Column(String)
    # Define database column schema mapping for address2
    address2=Column(String)
    # Define database column schema mapping for country
    country=Column(String)
    # Define database column schema mapping for state
    state=Column(String)
    # Define database column schema mapping for city
    city=Column(String)
    # Define database column schema mapping for pincode
    pincode=Column(String)

    # EMPLOYMENT
   

    # Define database column schema mapping for employment type
    employment_type=Column(String)
    # Define database column schema mapping for skill level
    skill_level=Column(String)
    # Define database column schema mapping for emp effective from
    emp_effective_from=Column(String)
    # Define database column schema mapping for emp effective to
    emp_effective_to=Column(String)
    # Define database column schema mapping for confirmation due
    confirmation_due=Column(String)
    # Define database column schema mapping for confirmation date
    confirmation_date=Column(String)
    # Define database column schema mapping for employment status
    employment_status=Column(String)
    # Define database column schema mapping for job effective from
    job_effective_from=Column(String)
    # Define database column schema mapping for job effective to
    job_effective_to=Column(String)
    # Define database column schema mapping for branch location
    branch_location=Column(String)
    # Define database column schema mapping for role
    role=Column(String)
    # Define database column schema mapping for designation
    designation = Column(String)
    # Define database column schema mapping for department
    department = Column(String)
    # Define database column schema mapping for reporting supervisor
    reporting_supervisor=Column(String)
    
    
    emp_join_date = Column(Date)  # ✅ FIXED
    # Define database column schema mapping for about
    about = Column(String, nullable=True)

    

    # STATUTORY
    pf_applicable = Column(Boolean)
    # Define database column schema mapping for esic applicable
    esic_applicable = Column(Boolean)
    # Define database column schema mapping for pt applicable
    pt_applicable = Column(Boolean)
    # Define database column schema mapping for lwf applicable
    lwf_applicable = Column(Boolean)
    # Define database column schema mapping for it applicable
    it_applicable = Column(Boolean)
    # Define database column schema mapping for gratuity applicable
    gratuity_applicable = Column(Boolean)
    # Define database column schema mapping for nps applicable
    nps_applicable = Column(Boolean)
    # Define database column schema mapping for pran number
    pran_number = Column(Boolean)
    # Define database column schema mapping for tax regime
    tax_regime = Column(String)
    # Define database column schema mapping for tax regime updated at
    tax_regime_updated_at = Column(Date)
    # Define database column schema mapping for tax regime updated by
    tax_regime_updated_by = Column(String)
    # Define database column schema mapping for decimal rates allowed
    decimal_rates_allowed = Column(Boolean)
    # Define database column schema mapping for tax no on pan
    tax_no_on_pan = Column(Boolean)

    # Placeholder statement performing no operation
    password_hash = Column(String(255), nullable=False)
    # Define database column schema mapping for must change password
    must_change_password = Column(Boolean, default=True, nullable=False)
    # Define database column schema mapping for profile image
    profile_image = Column(String(255), nullable=True)

    # Set sheets variable to store sheets value
    sheets = relationship("MonthlySheet", back_populates="employee")
    # Set leaves variable to store leaves value
    leaves = relationship("LeaveRequest", back_populates="employee")