# app/models/profile_model.py
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Date, Boolean
from app.db.base import Base

class Profile(Base):
    __tablename__ = "profile_master"

    id = Column(Integer, primary_key=True, index=True)

    emp_code = Column(String, unique=True, index=True)

    # PERSONAL
    first_name = Column(String)
    middle_name = Column(String)
    last_name = Column(String)
    email = Column(String)

    mobile_no = Column(String)   # ✅ FIXED

    gender = Column(String)
    dob = Column(Date)
    marital_status = Column(String)

    pan_no = Column(String)      # ✅ FIXED
    aadhar_no = Column(String)   # ✅ FIXED

    father_name=Column(String)
    mother_name=Column(String)
    family_contact=Column(String)

    address1=Column(String)
    address2=Column(String)
    country=Column(String)
    state=Column(String)
    city=Column(String)
    pincode=Column(String)

    # EMPLOYMENT
   

    employment_type=Column(String)
    skill_level=Column(String)
    emp_effective_from=Column(String)
    emp_effective_to=Column(String)
    confirmation_due=Column(String)
    confirmation_date=Column(String)
    employment_status=Column(String)
    job_effective_from=Column(String)
    job_effective_to=Column(String)
    branch_location=Column(String)
    role=Column(String)
    designation = Column(String)
    department = Column(String)
    reporting_supervisor=Column(String)
    
    
    emp_join_date = Column(Date)  # ✅ FIXED

    

    # STATUTORY
    pf_applicable = Column(Boolean)
    esic_applicable = Column(Boolean)
    pt_applicable = Column(Boolean)
    lwf_applicable = Column(Boolean)
    it_applicable = Column(Boolean)
    gratuity_applicable = Column(Boolean)
    nps_applicable = Column(Boolean)
    pran_number = Column(Boolean)
    tax_regime = Column(String)
    tax_regime_updated_at = Column(Date)
    tax_regime_updated_by = Column(String)
    decimal_rates_allowed = Column(Boolean)
    tax_no_on_pan = Column(Boolean)

    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    profile_image = Column(String(255), nullable=True)

    sheets = relationship("MonthlySheet", back_populates="employee")
    leaves = relationship("LeaveRequest", back_populates="employee")