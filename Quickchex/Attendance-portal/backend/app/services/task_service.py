from sqlalchemy.orm import Session
from datetime import date, datetime
from fastapi import HTTPException
from app.models.task_model import DailyTask
import calendar
from io import BytesIO
from openpyxl import Workbook
from typing import Optional, Iterable


# Concrete implementation of a simple in-memory "stream" class
# that provides the common file-like methods backed by BytesIO.
class stream:
    def __init__(self, initial: Optional[bytes] = None):
        self._buf = BytesIO(initial) if initial is not None else BytesIO()

    def read(self, size: int = -1) -> bytes:
        return self._buf.read(size)

    def write(self, data: bytes) -> int:
        return self._buf.write(data)

    def seek(self, offset: int, whence: int = 0) -> int:
        return self._buf.seek(offset, whence)

    def tell(self) -> int:
        return self._buf.tell()

    def close(self) -> None:
        self._buf.close()

    def getvalue(self) -> bytes:
        return self._buf.getvalue()

    def readinto(self, b) -> int:
        return self._buf.readinto(b)

    def readline(self) -> bytes:
        return self._buf.readline()

    def readlines(self) -> list:
        return self._buf.readlines()

    def writelines(self, lines: Iterable[bytes]) -> None:
        self._buf.writelines(lines)

    def flush(self) -> None:
        return self._buf.flush()

    def seekable(self) -> bool:
        return self._buf.seekable()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False
 
 
# ✅ CREATE / UPDATE TASK (ONLY TODAY)
def create_or_update_task(db: Session, data, user):
    today = date.today()
 
    # 🚫 Only EMPLOYEE restricted to today
    if user.role.lower() == "employee" and data.task_date != today:
        raise HTTPException(
            status_code=400,
            detail="You can only create/update today's task"
        )
 
    existing = db.query(DailyTask).filter(
        DailyTask.monthly_sheet_id == data.monthly_sheet_id,
        DailyTask.task_date == data.task_date
    ).first()
 
    if existing:
        existing.task_title = data.task_title
        existing.description = data.description
        db.commit()
        db.refresh(existing)
        return existing
 
    new_task = DailyTask(
        monthly_sheet_id=data.monthly_sheet_id,
        task_date=data.task_date,
        task_title=data.task_title,
        description=data.description
    )
 
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task
 
 
# ✅ GET TASKS BY SHEET
def get_tasks_by_sheet(db: Session, sheet_id: int):
    return db.query(DailyTask).filter(
        DailyTask.monthly_sheet_id == sheet_id
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
 
    year, month_num = map(int, month.split("-"))
    total_days = calendar.monthrange(year, month_num)[1]
 
    start_date = date(year, month_num, 1)
    end_date = date(year, month_num, total_days)
 
    role = user.role.lower()
 
    if role == "employee":
        tasks = db.query(DailyTask).filter(
            DailyTask.monthly_sheet_id == sheet_id,
            DailyTask.task_date.between(start_date, end_date)
        ).all()
 
    elif role == "team lead":
        tasks = db.query(DailyTask).filter(
            DailyTask.task_date.between(start_date, end_date)
        ).all()
 
    elif role == "admin":
        tasks = db.query(DailyTask).filter(
            DailyTask.task_date.between(start_date, end_date)
        ).all()
 
    else:
        tasks = []
 
    task_map = {}
    for task in tasks:
        task_map.setdefault(task.task_date, []).append({
            "task": f"{task.task_title} - {task.description or ''}",
            "employee_name": getattr(task, "employee_name", "N/A")
        })
 
    result = []
    for day in range(1, total_days + 1):
        current_date = date(year, month_num, day)
 
        if current_date.weekday() == 6:
            result.append({
                "date": current_date,
                "tasks": [{"task": "SUNDAY", "employee_name": ""}]
            })
            continue
 
        if current_date in task_map:
            result.append({
                "date": current_date,
                "tasks": task_map[current_date]
            })
        else:
            result.append({
                "date": current_date,
                "tasks": [{"task": "No Task", "employee_name": ""}]
            })
 
    return result
 

def export_monthly_tasks(data):
    """
    Builds an .xlsx file from the list returned by get_monthly_tasks().
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Monthly Tasks"

    ws.append(["Date", "Day", "Employee", "Task"])

    for row in data:
        current = row.get("date")
        day_name = current.strftime("%A") if current else ""
        date_str = current.strftime("%d-%m-%Y") if current else ""

        for item in row.get("tasks", []):
            ws.append([
                date_str,
                day_name,
                item.get("employee_name", ""),
                item.get("task", ""),
            ])

    for column in ws.columns:
        width = max((len(str(c.value)) for c in column if c.value), default=0)
        ws.column_dimensions[column[0].column_letter].width = min(width + 2, 60)

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream