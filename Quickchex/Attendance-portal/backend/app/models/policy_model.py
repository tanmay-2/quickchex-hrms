from sqlalchemy import Column, Integer, String, Date
from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.db.base import Base # Assuming your engine/base is in db/database.py

# ================= DATABASE MODEL =================
class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    department = Column(String)
    description = Column(String)
    created_date = Column(Date, default=date.today)
    file_path = Column(String)

# ================= PYDANTIC SCHEMAS =================
# Used for data coming IN (POST request)
class PolicyCreate(BaseModel):
    name: str
    department: str
    description: Optional[str] = None
    # file_path is usually handled separately during upload

# Used for data going OUT (API Response)
class PolicyResponse(BaseModel):
    id: int
    name: str
    department: str
    description: Optional[str]
    created_date: date
    file_path: Optional[str]

    class Config:
        from_attributes = True