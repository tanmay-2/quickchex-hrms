from app.models.ticket_model import * 
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.services.tickets_service import calculate_priority
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# ONE SINGLE ROUTER INSTANCE
router = APIRouter(prefix="/tickets", tags=["Tickets"])

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
        return new_ticket
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
        return tickets
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tickets."
        )

# 3. ADMIN: View all tickets
@router.get("/all", response_model=list[TicketResponse])
def get_all_tickets(
    db: Session = Depends(get_db), 
    admin_user = Depends(require_roles(["Admin", "Super Admin"]))
):
    try:
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        return tickets
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tickets."
        )

# 4. ADMIN: Update ticket status
@router.put("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: int, 
    status_update: TicketUpdateStatus, 
    db: Session = Depends(get_db), 
    admin_user = Depends(require_roles(["Admin", "Super Admin"])) 
):
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Ticket not found"
            )

        ticket.status = status_update.status
        db.commit()
        db.refresh(ticket)
        return ticket
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update ticket status."
        )