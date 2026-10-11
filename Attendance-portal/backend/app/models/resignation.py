from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class ResignationRequest(Base):
    __tablename__ = "resignation_requests"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), nullable=False, index=True)
    primary_reason = Column(String(255), nullable=False)
    proposed_last_working_day = Column(String(50), nullable=True)
    comment = Column(Text, nullable=True)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
