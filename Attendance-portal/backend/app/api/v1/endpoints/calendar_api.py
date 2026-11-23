# ==============================================================================
# QUICKCHEX HRMS BACKEND - CALENDAR_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/calendar_api.py
# Purpose: FastAPI route controller handling 'calendar_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.get('', response_model=List[CalendarEntryOut]) -> list_calendar()
#   • router.get('/', response_model=List[CalendarEntryOut]) -> list_calendar()
#   • router.get('/{date_str}', response_model=Optional[CalendarEntryOut]) -> get_calendar_entry()
#   • router.post('', status_code=201) -> create_calendar_entry()
#   • router.post('/', status_code=201) -> create_calendar_entry()
#   • router.put('/{date_str}') -> update_calendar_entry()
#   • router.delete('/{date_str}') -> delete_calendar_entry()
# Classes / Data Models:
#   • CalendarEntryIn
#   • CalendarEntryOut
# ==============================================================================

"""
Organization Calendar API
=========================
Centralized calendar for HOLIDAY and WEEKLY_OFF.

Access:
  GET  /api/v1/calendar              — All roles (Employee, Manager, Admin)
  GET  /api/v1/calendar/{date}       — All roles
  POST /api/v1/calendar              — Admin only (create/upsert single record)
  PUT  /api/v1/calendar/{date}       — Admin only (update)
  DELETE /api/v1/calendar/{date}     — Admin only
"""
from typing import List, Optional, Any
# Import date as date_cls, datetime from datetime for module operations
from datetime import date as date_cls, datetime
# Import APIRouter, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import require_role from app.core.role_checker for module operations
from app.core.role_checker import require_role

# Set router variable to store router value
router = APIRouter(prefix="/calendar", tags=["Calendar"])


# ─── helpers ──────────────────────────────────────────────────────────────────

# Set VALID_STATUSES variable to store VALID STATUSES value
VALID_STATUSES = {"HOLIDAY", "WEEKLY_OFF", "WORKING_DAY"}


# Define _normalize_status function to handle  normalize status
def _normalize_status(raw: str) -> str:
    """Normalize any status spelling to canonical form."""
    if not raw:
        # Return computed result or response payload to caller
        return ""
    # Set s variable to store s value
    s = str(raw).strip().upper().replace(" ", "_").replace("-", "_")
    
    # Weekly Off variations
    if "WEEK" in s or s in ("OFF", "WO", "SUNDAY"):
        # Return computed result or response payload to caller
        return "WEEKLY_OFF"
        
    # Working Day variations
    if s in (
        # Execute statement to process data and maintain state
        "WORKING_DAY", "WORKING", "WORKDAY", "WORK_DAY", "WORK", "W",
        # Execute statement to process data and maintain state
        "PRESENT", "PRESENT_DAY", "NORMAL"
    # Execute statement to process data and maintain state
    ) or s.startswith("WORK"):
        # Return computed result or response payload to caller
        return "WORKING_DAY"
        
    # Any other non-empty status (Dussehra, Gandhi Jayanti, Diwali, Holiday, etc.) is a HOLIDAY
    return "HOLIDAY"


# Define _parse_date function to handle  parse date
def _parse_date(val: Any) -> Optional[date_cls]:
    """Parse calendar dates from strings, ints, floats, and Excel date/date-time cells."""
    if val is None:
        # Return computed result or response payload to caller
        return None
    # Evaluate condition to control execution branch
    if isinstance(val, datetime):
        # Return computed result or response payload to caller
        return val.date()
    # Evaluate condition to control execution branch
    if isinstance(val, date_cls):
        # Return computed result or response payload to caller
        return val

    # Excel serial float/int check (e.g. 46266)
    if isinstance(val, (int, float)):
        # Begin guarded execution block to trap exceptions
        try:
            # Import timedelta from datetime for module operations
            from datetime import timedelta
            # Return computed result or response payload to caller
            return (datetime(1899, 12, 30) + timedelta(days=float(val))).date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Set raw variable to store raw value
    raw = str(val or "").strip()
    # Check if target condition is false or object is missing
    if not raw:
        # Return computed result or response payload to caller
        return None

    # Check if string is purely numeric (Excel serial as string)
    try:
        # Set fval variable to store fval value
        fval = float(raw)
        # Evaluate condition to control execution branch
        if 20000 <= fval <= 80000:
            # Import timedelta from datetime for module operations
            from datetime import timedelta
            # Return computed result or response payload to caller
            return (datetime(1899, 12, 30) + timedelta(days=fval)).date()
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # Excel date cells are converted to strings like 2026-09-01 00:00:00.
    # ISO parsing accepts both that form and timezone-aware ISO timestamps.
    try:
        # Return computed result or response payload to caller
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    # Catch and handle specific exception if raised
    except ValueError:
        # Placeholder statement performing no operation
        pass

    # Iterate through items in sequence loop
    for fmt in (
        # Execute statement to process data and maintain state
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        # Execute statement to process data and maintain state
        "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y", "%d-%B-%Y", "%d %B %Y"
    # Execute statement to process data and maintain state
    ):
        # Begin guarded execution block to trap exceptions
        try:
            # Return computed result or response payload to caller
            return datetime.strptime(raw, fmt).date()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass
    # Return computed result or response payload to caller
    return None


# Define _upsert_calendar_record function to handle  upsert calendar record
def _upsert_calendar_record(db: Session, rec_date: date_cls, status: str,
                             # Define holiday_name schema field with type Optional[str], description: Optional[str]):
                             holiday_name: Optional[str], description: Optional[str]):
    """Insert or update a single calendar record. Returns ('inserted'|'updated')."""
    is_sqlite = str(db.bind.url).startswith("sqlite") if db.bind else False

    # Set existing variable to store existing value
    existing = db.execute(
        # Invoke text to perform operational action
        text("SELECT id FROM organization_calendar WHERE date = :d"),
        # Execute statement to process data and maintain state
        {"d": rec_date}
    # Execute statement to process data and maintain state
    ).mappings().first()

    # Set now variable to store now value
    now = datetime.utcnow()

    # Evaluate condition to control execution branch
    if existing:
        # Execute statement to process data and maintain state
        db.execute(text("""
            UPDATE organization_calendar
               SET status = :status,
                   holiday_name = :name,
                   description = :desc,
                   updated_at = :now
             WHERE date = :d
        """), {"status": status, "name": holiday_name, "desc": description,
               # Execute statement to process data and maintain state
               "now": now, "d": rec_date})
        # Return computed result or response payload to caller
        return "updated"
    # Execute fallback branch when conditions are not met
    else:
        # Execute statement to process data and maintain state
        db.execute(text("""
            INSERT INTO organization_calendar (date, status, holiday_name, description, created_at, updated_at)
            VALUES (:d, :status, :name, :desc, :now, :now)
        """), {"d": rec_date, "status": status, "name": holiday_name,
               # Execute statement to process data and maintain state
               "desc": description, "now": now})
        # Return computed result or response payload to caller
        return "inserted"


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

# Define class CalendarEntryIn inheriting from BaseModel
class CalendarEntryIn(BaseModel):
    date: str                          # YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    status: str                        # HOLIDAY | WEEKLY_OFF | WORKING_DAY
    # Define holiday_name schema field with type Optional[str] and default value
    holiday_name: Optional[str] = None
    # Define description schema field with type Optional[str] and default value
    description: Optional[str] = None


# Define class CalendarEntryOut inheriting from BaseModel
class CalendarEntryOut(BaseModel):
    # Define id schema field with type int
    id: int
    # Define date schema field with type str
    date: str
    # Define status schema field with type str
    status: str
    # Define holiday_name schema field with type Optional[str]
    holiday_name: Optional[str]
    # Define description schema field with type Optional[str]
    description: Optional[str]


# ─── Endpoints ────────────────────────────────────────────────────────────────

# Define HTTP GET route endpoint handler
@router.get("", response_model=List[CalendarEntryOut])
# Define HTTP GET route endpoint handler
@router.get("/", response_model=List[CalendarEntryOut])
# Define list_calendar function to handle list calendar
def list_calendar(
    # Define year schema field with type Optional[int] and default value
    year: Optional[int] = None,
    # Define month schema field with type Optional[int] and default value
    month: Optional[int] = None,
    # Define status_filter schema field with type Optional[str] and default value
    status_filter: Optional[str] = None,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
# Execute statement to process data and maintain state
):
    """
    Return all organization calendar entries.
    Optionally filter by year, month, or status (HOLIDAY | WEEKLY_OFF).
    Accessible by ALL roles (Employee, Manager, Admin).
    """
    try:
        # Set query variable to store query value
        query = "SELECT id, date, status, holiday_name, description FROM organization_calendar WHERE 1=1"
        # Define params schema field with type dict and default value
        params: dict = {}

        # Evaluate condition to control execution branch
        if year:
            # Execute statement to process data and maintain state
            query += " AND EXTRACT(YEAR FROM date) = :year"
            # Execute statement to process data and maintain state
            params["year"] = year
        # Evaluate condition to control execution branch
        if month:
            # Execute statement to process data and maintain state
            query += " AND EXTRACT(MONTH FROM date) = :month"
            # Execute statement to process data and maintain state
            params["month"] = month
        # Evaluate condition to control execution branch
        if status_filter:
            # Execute statement to process data and maintain state
            query += " AND status = :status"
            # Execute statement to process data and maintain state
            params["status"] = _normalize_status(status_filter)

        # Execute statement to process data and maintain state
        query += " ORDER BY date ASC"
        # Set rows variable to store rows value
        rows = db.execute(text(query), params).mappings().all()

        # Return computed result or response payload to caller
        return [
            # Execute statement to process data and maintain state
            CalendarEntryOut(
                # Set id variable to store id value
                id=r["id"],
                # Set date variable to store date value
                date=r["date"].isoformat() if hasattr(r["date"], "isoformat") else str(r["date"]),
                # Set status variable to store status value
                status=r["status"],
                # Set holiday_name variable to store holiday name value
                holiday_name=r["holiday_name"],
                # Set description variable to store description value
                description=r["description"],
            # Execute statement to process data and maintain state
            )
            # Iterate through items in sequence loop
            for r in rows
        # Execute statement to process data and maintain state
        ]
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=f"Could not fetch calendar: {str(e)}")


# Define HTTP GET route endpoint handler
@router.get("/{date_str}", response_model=Optional[CalendarEntryOut])
# Define get_calendar_entry function to handle get calendar entry
def get_calendar_entry(date_str: str, db: Session = Depends(get_db)):
    """Return a single calendar entry for the given date. Returns null if not found."""
    rec_date = _parse_date(date_str)
    # Check if target condition is false or object is missing
    if not rec_date:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")
    # Begin guarded execution block to trap exceptions
    try:
        # Set row variable to store row value
        row = db.execute(
            # Invoke text to perform operational action
            text("SELECT id, date, status, holiday_name, description FROM organization_calendar WHERE date = :d"),
            # Execute statement to process data and maintain state
            {"d": rec_date}
        # Execute statement to process data and maintain state
        ).mappings().first()

        # Check if target condition is false or object is missing
        if not row:
            # Return computed result or response payload to caller
            return None
        # Return computed result or response payload to caller
        return CalendarEntryOut(
            # Set id variable to store id value
            id=row["id"],
            # Set date variable to store date value
            date=row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
            # Set status variable to store status value
            status=row["status"],
            # Set holiday_name variable to store holiday name value
            holiday_name=row["holiday_name"],
            # Set description variable to store description value
            description=row["description"],
        # Execute statement to process data and maintain state
        )
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=500, detail=str(e))


# Define HTTP POST route endpoint handler
@router.post("", status_code=201)
# Define HTTP POST route endpoint handler
@router.post("/", status_code=201)
# Define create_calendar_entry function to handle create calendar entry
def create_calendar_entry(
    # Define entry schema field with type CalendarEntryIn,
    entry: CalendarEntryIn,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin"])),
# Execute statement to process data and maintain state
):
    """Admin: create or update a single calendar entry (UPSERT)."""
    rec_date = _parse_date(entry.date)
    # Check if target condition is false or object is missing
    if not rec_date:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Invalid date: {entry.date}")

    # Set norm_status variable to store norm status value
    norm_status = _normalize_status(entry.status)
    # Check if target condition is false or object is missing
    if norm_status not in VALID_STATUSES:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Invalid status '{entry.status}'. Use HOLIDAY, WEEKLY_OFF, or WORKING_DAY.")

    # Set action variable to store action value
    action = _upsert_calendar_record(db, rec_date, norm_status, entry.holiday_name, entry.description)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"status": "success", "action": action, "date": rec_date.isoformat()}


# Define HTTP PUT route endpoint handler
@router.put("/{date_str}")
# Define update_calendar_entry function to handle update calendar entry
def update_calendar_entry(
    # Define date_str schema field with type str,
    date_str: str,
    # Define entry schema field with type CalendarEntryIn,
    entry: CalendarEntryIn,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin"])),
# Execute statement to process data and maintain state
):
    """Admin: update an existing calendar entry."""
    rec_date = _parse_date(date_str)
    # Check if target condition is false or object is missing
    if not rec_date:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Invalid date: {date_str}")

    # Set norm_status variable to store norm status value
    norm_status = _normalize_status(entry.status)
    # Set action variable to store action value
    action = _upsert_calendar_record(db, rec_date, norm_status, entry.holiday_name, entry.description)
    # Commit transaction to persist changes in database
    db.commit()
    # Return computed result or response payload to caller
    return {"status": "success", "action": action, "date": rec_date.isoformat()}


# Define HTTP DELETE route endpoint handler
@router.delete("/{date_str}")
# Define delete_calendar_entry function to handle delete calendar entry
def delete_calendar_entry(
    # Define date_str schema field with type str,
    date_str: str,
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db),
    # Set _admin variable to store  admin value
    _admin=Depends(require_role(["admin"])),
# Execute statement to process data and maintain state
):
    """Admin: delete a calendar entry."""
    rec_date = _parse_date(date_str)
    # Check if target condition is false or object is missing
    if not rec_date:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail=f"Invalid date: {date_str}")

    # Set result variable to store result value
    result = db.execute(
        # Invoke text to perform operational action
        text("DELETE FROM organization_calendar WHERE date = :d"),
        # Execute statement to process data and maintain state
        {"d": rec_date}
    # Execute statement to process data and maintain state
    )
    # Commit transaction to persist changes in database
    db.commit()
    # Evaluate condition to control execution branch
    if result.rowcount == 0:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=404, detail=f"No calendar entry for {date_str}")
    # Return computed result or response payload to caller
    return {"status": "success", "deleted": date_str}
