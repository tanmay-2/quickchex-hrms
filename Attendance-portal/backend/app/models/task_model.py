from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from app.db.base import Base
 
 
class DailyTask(Base):
    __tablename__ = "daily_tasks"
 
    id = Column(Integer, primary_key=True, index=True)
 
    # 🔗 Foreign Key
    monthly_sheet_id = Column(
        Integer,
        ForeignKey("monthly_sheets.id", ondelete="CASCADE"),
        nullable=False
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
        "MonthlySheet",
        back_populates="tasks"
    )
 