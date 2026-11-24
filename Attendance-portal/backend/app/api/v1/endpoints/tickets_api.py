# ==============================================================================
# QUICKCHEX HRMS BACKEND - TICKETS_API.PY
# Path: Attendance-portal/backend/app/api/v1/endpoints/tickets_api.py
# Purpose: FastAPI route controller handling 'tickets_api' HTTP endpoints, authorization, and data processing.
# API Routes / Endpoints:
#   • router.post('', response_model=TicketResponse) -> create_ticket()
#   • router.get('/my', response_model=list[TicketResponse]) -> get_my_tickets()
#   • router.get('/all', response_model=list[TicketResponse]) -> get_all_tickets()
#   • router.put('/{ticket_id}/status', response_model=TicketResponse) -> update_ticket_status()
# ==============================================================================

# Import * from app.models.ticket_model for module operations
from app.models.ticket_model import * 
from app.models.profile_model import Profile
# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import get_current_user, require_roles from app.core.dependencies for module operations
from app.core.dependencies import get_current_user, require_roles
# Import calculate_priority from app.services.tickets_service for module operations
from app.services.tickets_service import calculate_priority
# Import APIRouter, Depends, HTTPException, status from fastapi for module operations
from fastapi import APIRouter, Depends, HTTPException, status
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session

# ONE SINGLE ROUTER INSTANCE
router = APIRouter(prefix="/tickets", tags=["Tickets"])

def _get_profiles_map(db: Session, emp_codes: set) -> dict[str, str]:
    if not emp_codes:
        return {}
    try:
        rows = db.query(Profile.emp_code, Profile.first_name, Profile.last_name).filter(Profile.emp_code.in_(emp_codes)).all()
        return {
            r.emp_code: f"{r.first_name or ''} {r.last_name or ''}".strip()
            for r in rows
            if f"{r.first_name or ''} {r.last_name or ''}".strip()
        }
    except Exception:
        return {}

def _format_ticket_response(ticket: Ticket, profiles_map: dict[str, str]) -> TicketResponse:
    emp_name = profiles_map.get(ticket.created_by) or ticket.created_by or "Employee"
    return TicketResponse(
        id=ticket.id,
        title=ticket.title,
        description=ticket.description or "",
        status=ticket.status,
        created_by=ticket.created_by,
        employee_name=emp_name,
        created_at=ticket.created_at,
        impact=ticket.impact,
        urgency=ticket.urgency,
        priority=ticket.priority
    )

# --- ENDPOINTS ---

# 1. EMPLOYEE: Create a new ticket
@router.post("", response_model=TicketResponse)
def create_ticket(
    ticket: TicketCreate, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    calculated_priority = calculate_priority(ticket.impact, ticket.urgency)

    new_ticket = Ticket(
        title=ticket.title,
        description=ticket.description,
        created_by=current_user.emp_code, 
        status="Open",
        impact=ticket.impact,
        urgency=ticket.urgency,
        priority=calculated_priority
    )
    
    try:
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        profiles_map = _get_profiles_map(db, {new_ticket.created_by})
        return _format_ticket_response(new_ticket, profiles_map)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create ticket."
        )

# 2. EMPLOYEE: View their own tickets
@router.get("/my", response_model=list[TicketResponse])
def get_my_tickets(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    try:
        tickets = db.query(Ticket).filter(Ticket.created_by == current_user.emp_code).order_by(Ticket.created_at.desc()).all()
        emp_codes = {t.created_by for t in tickets if t.created_by}
        profiles_map = _get_profiles_map(db, emp_codes)
        return [_format_ticket_response(t, profiles_map) for t in tickets]
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tickets."
        )

# 3. ADMIN & EMPLOYEE: View tickets (Admin sees all, Employee sees their own)
@router.get("/all", response_model=list[TicketResponse])
def get_all_tickets(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    try:
        user_role = (getattr(current_user, "role", "") or "").lower().replace(" ", "").replace("_", "")
        is_admin = user_role in ["admin", "superadmin", "hr", "manager"]
        emp_code = getattr(current_user, "emp_code", "")

        if is_admin:
            # Admin sees all tickets across the company
            tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        else:
            # Employee only sees tickets created by their emp_code
            tickets = db.query(Ticket).filter(Ticket.created_by == emp_code).order_by(Ticket.created_at.desc()).all()
        
        emp_codes = {t.created_by for t in tickets if t.created_by}
        profiles_map = _get_profiles_map(db, emp_codes)
        return [_format_ticket_response(t, profiles_map) for t in tickets]
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tickets."
        )

# 4. ADMIN & EMPLOYEE: Update ticket status
@router.put("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: int, 
    status_update: TicketUpdateStatus, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user) 
):
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Ticket not found"
            )

        user_role = (getattr(current_user, "role", "") or "").lower().replace(" ", "").replace("_", "")
        is_admin = user_role in ["admin", "superadmin", "hr", "manager"]
        emp_code = getattr(current_user, "emp_code", "")

        # If not admin, only allow user to update their own ticket (e.g. cancel/close)
        if not is_admin and ticket.created_by != emp_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this ticket"
            )

        ticket.status = status_update.status
        db.commit()
        db.refresh(ticket)
        profiles_map = _get_profiles_map(db, {ticket.created_by})
        return _format_ticket_response(ticket, profiles_map)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update ticket status."
        )
    # Catch and handle specific exception if raised
    except HTTPException:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise exception to abort current operation with error
        raise
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            # Set detail variable to store detail value
            detail="Failed to update ticket status."
        # Execute statement to process data and maintain state
        )
