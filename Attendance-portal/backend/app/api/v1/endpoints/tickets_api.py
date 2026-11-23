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

# --- ENDPOINTS ---

# 1. EMPLOYEE: Create a new ticket
@router.post("", response_model=TicketResponse)
# Define create_ticket function to handle create ticket
def create_ticket(
    # Define ticket schema field with type TicketCreate,
    ticket: TicketCreate, 
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db), 
    # Set current_user variable to store current user value
    current_user = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Set calculated_priority variable to store calculated priority value
    calculated_priority = calculate_priority(ticket.impact, ticket.urgency)

    # Set new_ticket variable to store new ticket value
    new_ticket = Ticket(
        # Set title variable to store title value
        title=ticket.title,
        # Set description variable to store description value
        description=ticket.description,
        # Set created_by variable to store created by value
        created_by=current_user.emp_code, 
        # Set status variable to store status value
        status="Open",
        # Set impact variable to store impact value
        impact=ticket.impact,
        # Set urgency variable to store urgency value
        urgency=ticket.urgency,
        # Set priority variable to store priority value
        priority=calculated_priority
    # Execute statement to process data and maintain state
    )
    
    # Begin guarded execution block to trap exceptions
    try:
        # Stage new entity instance into database session
        db.add(new_ticket)
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(new_ticket)
        # Return computed result or response payload to caller
        return new_ticket
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            # Set detail variable to store detail value
            detail="Failed to create ticket."
        # Execute statement to process data and maintain state
        )

# 2. EMPLOYEE: View their own tickets
@router.get("/my", response_model=list[TicketResponse])
# Define get_my_tickets function to handle get my tickets
def get_my_tickets(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db), 
    # Set current_user variable to store current user value
    current_user = Depends(get_current_user)
# Execute statement to process data and maintain state
):
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        tickets = db.query(Ticket).filter(Ticket.created_by == current_user.emp_code).order_by(Ticket.created_at.desc()).all()
        # Return computed result or response payload to caller
        return tickets
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            # Set detail variable to store detail value
            detail="Failed to fetch tickets."
        # Execute statement to process data and maintain state
        )

# 3. ADMIN: View all tickets
@router.get("/all", response_model=list[TicketResponse])
# Define get_all_tickets function to handle get all tickets
def get_all_tickets(
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db), 
    # Set admin_user variable to store admin user value
    admin_user = Depends(require_roles(["Admin", "Super Admin"]))
# Execute statement to process data and maintain state
):
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
        # Return computed result or response payload to caller
        return tickets
    # Catch and handle specific exception if raised
    except Exception as e:
        # Roll back transaction to revert changes on failure
        db.rollback()
        # Raise HTTP exception with status code and error details
        raise HTTPException(
            # Set status_code variable to store status code value
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            # Set detail variable to store detail value
            detail="Failed to fetch tickets."
        # Execute statement to process data and maintain state
        )

# 4. ADMIN: Update ticket status
@router.put("/{ticket_id}/status", response_model=TicketResponse)
# Define update_ticket_status function to handle update ticket status
def update_ticket_status(
    # Define ticket_id schema field with type int,
    ticket_id: int, 
    # Define status_update schema field with type TicketUpdateStatus,
    status_update: TicketUpdateStatus, 
    # Define db schema field with type Session and default value
    db: Session = Depends(get_db), 
    # Set admin_user variable to store admin user value
    admin_user = Depends(require_roles(["Admin", "Super Admin"])) 
# Execute statement to process data and maintain state
):
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        # Check if target condition is false or object is missing
        if not ticket:
            # Raise HTTP exception with status code and error details
            raise HTTPException(
                # Set status_code variable to store status code value
                status_code=status.HTTP_404_NOT_FOUND, 
                # Set detail variable to store detail value
                detail="Ticket not found"
            # Execute statement to process data and maintain state
            )

        # Execute statement to process data and maintain state
        ticket.status = status_update.status
        # Commit transaction to persist changes in database
        db.commit()
        # Refresh instance state with updated database values
        db.refresh(ticket)
        # Return computed result or response payload to caller
        return ticket
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
