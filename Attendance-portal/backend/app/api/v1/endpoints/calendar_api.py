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
from datetime import date as date_cls, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.core.role_checker import require_role

router = APIRouter(prefix="/calendar", tags=["Calendar"])


# ─── helpers ──────────────────────────────────────────────────────────────────

VALID_STATUSES = {"HOLIDAY", "WEEKLY_OFF", "WORKING_DAY"}


def _normalize_status(raw: str) -> str:
    """Normalize any status spelling to canonical form."""
    if not raw:
        return ""
    s = str(raw).strip().upper().replace(" ", "_").replace("-", "_")
    
    # Weekly Off variations
    if "WEEK" in s or s in ("OFF", "WO", "SUNDAY"):
        return "WEEKLY_OFF"
        
    # Working Day variations
    if s in (
        "WORKING_DAY", "WORKING", "WORKDAY", "WORK_DAY", "WORK", "W",
        "PRESENT", "PRESENT_DAY", "NORMAL"
    ) or s.startswith("WORK"):
        return "WORKING_DAY"
        
    # Any other non-empty status (Dussehra, Gandhi Jayanti, Diwali, Holiday, etc.) is a HOLIDAY
    return "HOLIDAY"


def _parse_date(val: Any) -> Optional[date_cls]:
    """Parse calendar dates from strings, ints, floats, and Excel date/date-time cells."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date_cls):
        return val

    # Excel serial float/int check (e.g. 46266)
    if isinstance(val, (int, float)):
        try:
            from datetime import timedelta
            return (datetime(1899, 12, 30) + timedelta(days=float(val))).date()
        except Exception:
            pass

    raw = str(val or "").strip()
    if not raw:
        return None

    # Check if string is purely numeric (Excel serial as string)
    try:
        fval = float(raw)
        if 20000 <= fval <= 80000:
            from datetime import timedelta
            return (datetime(1899, 12, 30) + timedelta(days=fval)).date()
    except Exception:
        pass

    # Excel date cells are converted to strings like 2026-09-01 00:00:00.
    # ISO parsing accepts both that form and timezone-aware ISO timestamps.
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    for fmt in (
        "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y",
        "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y", "%d-%B-%Y", "%d %B %Y"
    ):
        try:
            return datetime.strptime(raw, fmt).date()
        except Exception:
            pass
    return None


def _upsert_calendar_record(db: Session, rec_date: date_cls, status: str,
                             holiday_name: Optional[str], description: Optional[str]):
    """Insert or update a single calendar record. Returns ('inserted'|'updated')."""
    is_sqlite = str(db.bind.url).startswith("sqlite") if db.bind else False

    existing = db.execute(
        text("SELECT id FROM organization_calendar WHERE date = :d"),
        {"d": rec_date}
    ).mappings().first()

    now = datetime.utcnow()

    if existing:
        db.execute(text("""
            UPDATE organization_calendar
               SET status = :status,
                   holiday_name = :name,
                   description = :desc,
                   updated_at = :now
             WHERE date = :d
        """), {"status": status, "name": holiday_name, "desc": description,
               "now": now, "d": rec_date})
        return "updated"
    else:
        db.execute(text("""
            INSERT INTO organization_calendar (date, status, holiday_name, description, created_at, updated_at)
            VALUES (:d, :status, :name, :desc, :now, :now)
        """), {"d": rec_date, "status": status, "name": holiday_name,
               "desc": description, "now": now})
        return "inserted"


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class CalendarEntryIn(BaseModel):
    date: str                          # YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    status: str                        # HOLIDAY | WEEKLY_OFF | WORKING_DAY
    holiday_name: Optional[str] = None
    description: Optional[str] = None


class CalendarEntryOut(BaseModel):
    id: int
    date: str
    status: str
    holiday_name: Optional[str]
    description: Optional[str]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CalendarEntryOut])
@router.get("/", response_model=List[CalendarEntryOut])
def list_calendar(
    year: Optional[int] = None,
    month: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Return all organization calendar entries.
    Optionally filter by year, month, or status (HOLIDAY | WEEKLY_OFF).
    Accessible by ALL roles (Employee, Manager, Admin).
    """
    try:
        query = "SELECT id, date, status, holiday_name, description FROM organization_calendar WHERE 1=1"
        params: dict = {}

        if year:
            query += " AND EXTRACT(YEAR FROM date) = :year"
            params["year"] = year
        if month:
            query += " AND EXTRACT(MONTH FROM date) = :month"
            params["month"] = month
        if status_filter:
            query += " AND status = :status"
            params["status"] = _normalize_status(status_filter)

        query += " ORDER BY date ASC"
        rows = db.execute(text(query), params).mappings().all()

        return [
            CalendarEntryOut(
                id=r["id"],
                date=r["date"].isoformat() if hasattr(r["date"], "isoformat") else str(r["date"]),
                status=r["status"],
                holiday_name=r["holiday_name"],
                description=r["description"],
            )
            for r in rows
        ]
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not fetch calendar: {str(e)}")


@router.get("/{date_str}", response_model=Optional[CalendarEntryOut])
def get_calendar_entry(date_str: str, db: Session = Depends(get_db)):
    """Return a single calendar entry for the given date. Returns null if not found."""
    rec_date = _parse_date(date_str)
    if not rec_date:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")
    try:
        row = db.execute(
            text("SELECT id, date, status, holiday_name, description FROM organization_calendar WHERE date = :d"),
            {"d": rec_date}
        ).mappings().first()

        if not row:
            return None
        return CalendarEntryOut(
            id=row["id"],
            date=row["date"].isoformat() if hasattr(row["date"], "isoformat") else str(row["date"]),
            status=row["status"],
            holiday_name=row["holiday_name"],
            description=row["description"],
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_calendar_entry(
    entry: CalendarEntryIn,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Admin: create or update a single calendar entry (UPSERT)."""
    rec_date = _parse_date(entry.date)
    if not rec_date:
        raise HTTPException(status_code=400, detail=f"Invalid date: {entry.date}")

    norm_status = _normalize_status(entry.status)
    if norm_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status '{entry.status}'. Use HOLIDAY, WEEKLY_OFF, or WORKING_DAY.")

    action = _upsert_calendar_record(db, rec_date, norm_status, entry.holiday_name, entry.description)
    db.commit()
    return {"status": "success", "action": action, "date": rec_date.isoformat()}


@router.put("/{date_str}")
def update_calendar_entry(
    date_str: str,
    entry: CalendarEntryIn,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Admin: update an existing calendar entry."""
    rec_date = _parse_date(date_str)
    if not rec_date:
        raise HTTPException(status_code=400, detail=f"Invalid date: {date_str}")

    norm_status = _normalize_status(entry.status)
    action = _upsert_calendar_record(db, rec_date, norm_status, entry.holiday_name, entry.description)
    db.commit()
    return {"status": "success", "action": action, "date": rec_date.isoformat()}


@router.delete("/{date_str}")
def delete_calendar_entry(
    date_str: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Admin: delete a calendar entry."""
    rec_date = _parse_date(date_str)
    if not rec_date:
        raise HTTPException(status_code=400, detail=f"Invalid date: {date_str}")

    result = db.execute(
        text("DELETE FROM organization_calendar WHERE date = :d"),
        {"d": rec_date}
    )
    db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No calendar entry for {date_str}")
    return {"status": "success", "deleted": date_str}
