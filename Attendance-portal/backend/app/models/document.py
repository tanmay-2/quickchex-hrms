from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String, ForeignKey("profile_master.emp_code"), nullable=False)
    file_name = Column(String, nullable=False)
    file_location = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())