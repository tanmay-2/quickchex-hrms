# ==============================================================================
# QUICKCHEX HRMS BACKEND - TASK_SERVICE.PY
# Path: Attendance-portal/backend/app/services/task_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'task_service'.
# Classes / Data Models:
#   • stream
# Primary Functions:
#   • create_or_update_task()
#   • get_tasks_by_sheet()
#   • get_monthly_tasks()
#   • export_monthly_tasks()
# ==============================================================================

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import date, datetime from datetime for module operations
from datetime import date, datetime
# Import HTTPException from fastapi for module operations
from fastapi import HTTPException
# Import DailyTask from app.models.task_model for module operations
from app.models.task_model import DailyTask
# Import module calendar for system functionality
import calendar
# Import BytesIO from io for module operations
from io import BytesIO
# Import Workbook from openpyxl for module operations
from openpyxl import Workbook
# Import Optional, Iterable from typing for module operations
from typing import Optional, Iterable


# Concrete implementation of a simple in-memory "stream" class
# that provides the common file-like methods backed by BytesIO.
class stream:
    # Define __init__ function to handle   init  
    def __init__(self, initial: Optional[bytes] = None):
        # Execute statement to process data and maintain state
        self._buf = BytesIO(initial) if initial is not None else BytesIO()

    # Define read function to handle read
    def read(self, size: int = -1) -> bytes:
        # Return computed result or response payload to caller
        return self._buf.read(size)

    # Define write function to handle write
    def write(self, data: bytes) -> int:
        # Return computed result or response payload to caller
        return self._buf.write(data)

    # Define seek function to handle seek
    def seek(self, offset: int, whence: int = 0) -> int:
        # Return computed result or response payload to caller
        return self._buf.seek(offset, whence)

    # Define tell function to handle tell
    def tell(self) -> int:
        # Return computed result or response payload to caller
        return self._buf.tell()

    # Define close function to handle close
    def close(self) -> None:
        # Invoke self._buf.close to perform operational action
        self._buf.close()

    # Define getvalue function to handle getvalue
    def getvalue(self) -> bytes:
        # Return computed result or response payload to caller
        return self._buf.getvalue()

    # Define readinto function to handle readinto
    def readinto(self, b) -> int:
        # Return computed result or response payload to caller
        return self._buf.readinto(b)

    # Define readline function to handle readline
    def readline(self) -> bytes:
        # Return computed result or response payload to caller
        return self._buf.readline()

    # Define readlines function to handle readlines
    def readlines(self) -> list:
        # Return computed result or response payload to caller
        return self._buf.readlines()

    # Define writelines function to handle writelines
    def writelines(self, lines: Iterable[bytes]) -> None:
        # Invoke self._buf.writelines to perform operational action
        self._buf.writelines(lines)

    # Define flush function to handle flush
    def flush(self) -> None:
        # Return computed result or response payload to caller
        return self._buf.flush()

    # Define seekable function to handle seekable
    def seekable(self) -> bool:
        # Return computed result or response payload to caller
        return self._buf.seekable()

    # Define __enter__ function to handle   enter  
    def __enter__(self):
        # Return computed result or response payload to caller
        return self

    # Define __exit__ function to handle   exit  
    def __exit__(self, exc_type, exc, tb):
        # Invoke self.close to perform operational action
        self.close()
        # Return computed result or response payload to caller
        return False
 
 
# ✅ CREATE / UPDATE TASK (ONLY TODAY)
def create_or_update_task(db: Session, data, user):
    # Set today variable to store today value
    today = date.today()
 
    # 🚫 Only EMPLOYEE restricted to today
    if user.role.lower() == "employee" and data.task_date != today:
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=400,
            # Set detail variable to store detail value
            detail="You can only create/update today's task"
        # Execute statement to process data and maintain state
        )
 
    # Initiate database query on specified model
    existing = db.query(DailyTask).filter(
        # Specify parameter value for DailyTask.monthly_sheet_id
        DailyTask.monthly_sheet_id == data.monthly_sheet_id,
        # Execute statement to process data and maintain state
        DailyTask.task_date == data.task_date
    # Execute statement to process data and maintain state
    ).first()
 
    # Evaluate condition to control execution branch
    if existing:
        # Execute statement to process data and maintain state
        existing.task_title = data.task_title
        # Execute statement to process data and maintain state
        existing.description = data.description
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(existing)
        # Return computed result or response payload to caller
        return existing
 
    # Set new_task variable to store new task value
    new_task = DailyTask(
        # Set monthly_sheet_id variable to store monthly sheet id value
        monthly_sheet_id=data.monthly_sheet_id,
        # Set task_date variable to store task date value
        task_date=data.task_date,
        # Set task_title variable to store task title value
        task_title=data.task_title,
        # Set description variable to store description value
        description=data.description
    # Execute statement to process data and maintain state
    )
 
    # Stage new entity instance into database session
    db.add(new_task)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(new_task)
    # Return computed result or response payload to caller
    return new_task
 
 
# ✅ GET TASKS BY SHEET
def get_tasks_by_sheet(db: Session, sheet_id: int):
    # Initiate database query on specified model
    return db.query(DailyTask).filter(
        # Execute statement to process data and maintain state
        DailyTask.monthly_sheet_id == sheet_id
    # Execute statement to process data and maintain state
    ).all()
 
 
# ✅ MONTHLY TASK VIEW (TL + ADMIN)
# def get_monthly_tasks(db: Session, sheet_id: int, month: str):
#     """
#     month format: YYYY-MM
#     """
 
#     year, month_num = map(int, month.split("-"))
#     total_days = calendar.monthrange(year, month_num)[1]
 
#     # 🔥 FILTER ONLY MONTH DATA (IMPORTANT FIX)
#     start_date = date(year, month_num, 1)
#     end_date = date(year, month_num, total_days)
 
#     tasks = db.query(DailyTask).filter(
#         DailyTask.monthly_sheet_id == sheet_id,
#         DailyTask.task_date.between(start_date, end_date)
#     ).all()
 
#     task_map = {
#         task.task_date: f"{task.task_title} - {task.description or ''}"
#         for task in tasks
#     }
 
#     result = []
 
#     for day in range(1, total_days + 1):
#         current_date = date(year, month_num, day)
 
#         if current_date.weekday() == 6:
#             task_value = "SUNDAY"
#         elif current_date in task_map:
#             task_value = task_map[current_date]
#         else:
#             task_value = "No Task"
 
#         result.append({
#             "date": current_date,
#             "task": task_value
#         })
 
#     return result
 
 
# ✅ EXPORT TO EXCEL
# ✅ MONTHLY TASK VIEW (ROLE BASED)
def get_monthly_tasks(db: Session, user, sheet_id: int, month: str):
    """
    month format: YYYY-MM
    """
 
    # Execute statement to process data and maintain state
    year, month_num = map(int, month.split("-"))
    # Set total_days variable to store total days value
    total_days = calendar.monthrange(year, month_num)[1]
 
    # Set start_date variable to store start date value
    start_date = date(year, month_num, 1)
    # Set end_date variable to store end date value
    end_date = date(year, month_num, total_days)
 
    # Set role variable to store role value
    role = user.role.lower()
 
    # Evaluate condition to control execution branch
    if role == "employee":
        # Initiate database query on specified model
        tasks = db.query(DailyTask).filter(
            # Specify parameter value for DailyTask.monthly_sheet_id
            DailyTask.monthly_sheet_id == sheet_id,
            # Invoke DailyTask.task_date.between to perform operational action
            DailyTask.task_date.between(start_date, end_date)
        # Execute statement to process data and maintain state
        ).all()
 
    # Evaluate alternate branch condition
    elif role == "team lead":
        # Initiate database query on specified model
        tasks = db.query(DailyTask).filter(
            # Invoke DailyTask.task_date.between to perform operational action
            DailyTask.task_date.between(start_date, end_date)
        # Execute statement to process data and maintain state
        ).all()
 
    # Evaluate alternate branch condition
    elif role == "admin":
        # Initiate database query on specified model
        tasks = db.query(DailyTask).filter(
            # Invoke DailyTask.task_date.between to perform operational action
            DailyTask.task_date.between(start_date, end_date)
        # Execute statement to process data and maintain state
        ).all()
 
    # Execute fallback branch when conditions are not met
    else:
        # Set tasks variable to store tasks value
        tasks = []
 
    # Set task_map variable to store task map value
    task_map = {}
    # Iterate through items in sequence loop
    for task in tasks:
        # Execute statement to process data and maintain state
        task_map.setdefault(task.task_date, []).append({
            # Execute statement to process data and maintain state
            "task": f"{task.task_title} - {task.description or ''}",
            # Execute statement to process data and maintain state
            "employee_name": getattr(task, "employee_name", "N/A")
        # Execute statement to process data and maintain state
        })
 
    # Set result variable to store result value
    result = []
    # Iterate through items in sequence loop
    for day in range(1, total_days + 1):
        # Set current_date variable to store current date value
        current_date = date(year, month_num, day)
 
        # Evaluate condition to control execution branch
        if current_date.weekday() == 6:
            # Execute statement to process data and maintain state
            result.append({
                # Execute statement to process data and maintain state
                "date": current_date,
                # Execute statement to process data and maintain state
                "tasks": [{"task": "SUNDAY", "employee_name": ""}]
            # Execute statement to process data and maintain state
            })
            # Skip to next iteration of active loop
            continue
 
        # Evaluate condition to control execution branch
        if current_date in task_map:
            # Execute statement to process data and maintain state
            result.append({
                # Execute statement to process data and maintain state
                "date": current_date,
                # Execute statement to process data and maintain state
                "tasks": task_map[current_date]
            # Execute statement to process data and maintain state
            })
        # Execute fallback branch when conditions are not met
        else:
            # Execute statement to process data and maintain state
            result.append({
                # Execute statement to process data and maintain state
                "date": current_date,
                # Execute statement to process data and maintain state
                "tasks": [{"task": "No Task", "employee_name": ""}]
            # Execute statement to process data and maintain state
            })
 
    # Return computed result or response payload to caller
    return result
 

# Define export_monthly_tasks function to handle export monthly tasks
def export_monthly_tasks(data):
    """
    Builds an .xlsx file from the list returned by get_monthly_tasks().
    """
    wb = Workbook()
    # Set ws variable to store ws value
    ws = wb.active
    # Execute statement to process data and maintain state
    ws.title = "Monthly Tasks"

    # Invoke ws.append to perform operational action
    ws.append(["Date", "Day", "Employee", "Task"])

    # Iterate through items in sequence loop
    for row in data:
        # Set current variable to store current value
        current = row.get("date")
        # Set day_name variable to store day name value
        day_name = current.strftime("%A") if current else ""
        # Set date_str variable to store date str value
        date_str = current.strftime("%d-%m-%Y") if current else ""

        # Iterate through items in sequence loop
        for item in row.get("tasks", []):
            # Execute statement to process data and maintain state
            ws.append([
                # Execute statement to process data and maintain state
                date_str,
                # Execute statement to process data and maintain state
                day_name,
                # Invoke item.get to perform operational action
                item.get("employee_name", ""),
                # Invoke item.get to perform operational action
                item.get("task", ""),
            # Execute statement to process data and maintain state
            ])

    # Iterate through items in sequence loop
    for column in ws.columns:
        # Set width variable to store width value
        width = max((len(str(c.value)) for c in column if c.value), default=0)
        # Execute statement to process data and maintain state
        ws.column_dimensions[column[0].column_letter].width = min(width + 2, 60)

    # Set stream variable to store stream value
    stream = BytesIO()
    # Invoke wb.save to perform operational action
    wb.save(stream)
    # Invoke stream.seek to perform operational action
    stream.seek(0)
    # Return computed result or response payload to caller
    return stream