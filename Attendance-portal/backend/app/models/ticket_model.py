from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base import Base 
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(String) 
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="Open")
    impact = Column(String, nullable=True)     # ✅ Added
    urgency = Column(String, nullable=True)    # ✅ Added
    priority = Column(String, nullable=True)
    
    # 🔥 FIX: Add 'default=func.now()' so Python handles it immediately
    created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())



class TicketCreate(BaseModel):
    title: str
    description: str
    impact: str    # ✅ Must be added!
    urgency: str   # ✅ Must be added!

# 🔥 THIS WAS MISSING:
class TicketUpdateStatus(BaseModel):
    status: str

# Look for your TicketResponse class and add the 3 new fields:
class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_by: str
    created_at: datetime | None = None
    
    # ✅ ADD THESE THREE LINES:
    impact: str | None = None
    urgency: str | None = None
    priority: str | None = None  # <-- This is the one React needs!

    class Config:
        from_attributes = True
