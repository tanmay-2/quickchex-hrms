# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASK_MODEL.PY
# Path: Attendance-portal/backend/app/models/task_model.py
# Purpose: SQLAlchemy ORM database model defining table schema and relationships for 'task_model'.
# Classes / Data Models:
#   • DailyTask
# ==============================================================================

# Import Column, Integer, String, Date, ForeignKey from sqlalchemy for module operations
from sqlalchemy import Column, Integer, String, Date, ForeignKey
# Import relationship from sqlalchemy.orm for module operations
from sqlalchemy.orm import relationship
# Import date from datetime for module operations
from datetime import date
# Import Base from app.db.base for module operations
from app.db.base import Base
 
 
# Define class DailyTask inheriting from Base
class DailyTask(Base):
    # Set __tablename__ variable to store   tablename   value
    __tablename__ = "daily_tasks"
 
    # Define database column schema mapping for id
    id = Column(Integer, primary_key=True, index=True)
 
    # 🔗 Foreign Key
    monthly_sheet_id = Column(
        # Execute statement to process data and maintain state
        Integer,
        # Invoke ForeignKey to perform operational action
        ForeignKey("monthly_sheets.id", ondelete="CASCADE"),
        # Set nullable variable to store nullable value
        nullable=False
    # Execute statement to process data and maintain state
    )
 
    # 📅 Task Date (default = today)
    task_date = Column(Date, nullable=False, default=date.today)
 
    # 🧑 Employee Name (or Title)
    task_title = Column(String(255), nullable=False)
 
    # 📝 Task Description
    description = Column(String(1000), nullable=True)
 
    # ❗ Keep for DB but DO NOT use in UI
    status = Column(String(50), default="COMPLETED", nullable=True)
 
    # 👤 Optional extra field
    designation = Column(String(100), nullable=True)
 
    # 🔗 Relationship
    monthly_sheet = relationship(
        # Execute statement to process data and maintain state
        "MonthlySheet",
        # Set back_populates variable to store back populates value
        back_populates="tasks"
    # Execute statement to process data and maintain state
    )
 