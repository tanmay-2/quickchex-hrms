# ==============================================================================
# QUICKCHEX HRMS BACKEND - TICKET_MODEL.PY
# Path: Attendance-portal/backend/app/models/ticket_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'ticket_model'.
# Classes / Data Models:
#   • Ticket
#   • TicketCreate
#   • TicketUpdateStatus
#   • TicketResponse
# ==============================================================================

# Import Column, Integer, String, Text, DateTime from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Text, DateTime
# Import func from sqlalchemy.sql for module operations
from sqlalchemy.sql import func
# Import Base from app.db.base for module operations
from app.db.base import Base 
# Import BaseModel, Field from pydantic for module operations
from pydantic import BaseModel, Field
# Import datetime from datetime for module operations
from datetime import datetime
# Import Optional from typing for module operations
from typing import Optional

# Define class Ticket inheriting from Base
class Ticket(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "tickets"

    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
    # Define database column schema mapping for created by
    created_by = Column(String) 
    # Define database column schema mapping for title
    title = Column(String, nullable=False)
    # Define database column schema mapping for description
    description = Column(Text, nullable=True)
    # Define database column schema mapping for status
    status = Column(String, default="Open")
    impact = Column(String, nullable=True)     # ✅ Added
    urgency = Column(String, nullable=True)    # ✅ Added
    # Define database column schema mapping for priority
    priority = Column(String, nullable=True)
    
    # 🔥 FIX: Add 'default=func.now()' so Python handles it immediately
    created_at = Column(DateTime(timezone=True), default=func.now(), server_default=func.now())
    # Define database column schema mapping for updated at
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())



# Define class TicketCreate inheriting from BaseModel
class TicketCreate(BaseModel):
    # Define title schema field with type str
    title: str
    # Define description schema field with type str
    description: str
    impact: str    # ✅ Must be added!
    urgency: str   # ✅ Must be added!

# 🔥 THIS WAS MISSING:
class TicketUpdateStatus(BaseModel):
    # Define status schema field with type str
    status: str

# Look for your TicketResponse class and add the 3 new fields:
class TicketResponse(BaseModel):
    # Define id schema field with type int
    id: int
    # Define title schema field with type str
    title: str
    # Define description schema field with type str
    description: str
    # Define status schema field with type str
    status: str
    # Define created_by schema field with type str
    created_by: str
    # Define created_at schema field with type datetime | None and default value
    created_at: datetime | None = None
    
    # ✅ ADD THESE THREE LINES:
    impact: str | None = None
    # Define urgency schema field with type str | None and default value
    urgency: str | None = None
    priority: str | None = None  # <-- This is the one React needs!

    # Define class Config to encapsulate data and behavior
    class Config:
        # Set from_attributes variable to store from attributes value
        from_attributes = True
