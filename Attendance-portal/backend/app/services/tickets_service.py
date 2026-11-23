# ==============================================================================
# QUICKCHEX HRMS BACKEND - TICKETS_SERVICE.PY
# Path: Attendance-portal/backend/app/services/tickets_service.py
# Purpose: Core business logic service orchestrating database transactions and workflow rules for 'tickets_service'.
# Primary Functions:
#   • create_ticket()
#   • get_all_tickets()
#   • get_user_tickets()
#   • update_ticket_status()
#   • create_ticket_service()
#   • calculate_priority()
# ==============================================================================

# Import get_profile_by_email from app.repositories.profile_repository for module operations
from app.repositories.profile_repository import get_profile_by_email

# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import Ticket from app.models.ticket_model for module operations
from app.models.ticket_model import Ticket

# Define create_ticket function to handle create ticket
def create_ticket(db, data):
    # Set ticket variable to store ticket value
    ticket = Ticket(**data)
    # Stage new entity instance into database session
    db.add(ticket)
    # Commit transaction to persist changes in database
    db.commit()
    # Refresh instance state with updated database values
    db.refresh(ticket)
    # Return computed result or response payload to caller
    return ticket

# Define get_all_tickets function to handle get all tickets
def get_all_tickets(db):
    # Initiate database query on specified model
    return db.query(Ticket).all()

# Define get_user_tickets function to handle get user tickets
def get_user_tickets(db, email):
    # Initiate database query on specified model
    return db.query(Ticket).filter(Ticket.created_by == email).all()

# Define update_ticket_status function to handle update ticket status
def update_ticket_status(db, ticket_id, status):
    # Initiate database query on specified model
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    # Evaluate condition to control execution branch
    if ticket:
        # Execute statement to process data and maintain state
        ticket.status = status
        # Commit transaction to persist changes in database
        db.commit()
    # Return computed result or response payload to caller
    return ticket

# Define create_ticket_service function to handle create ticket service
def create_ticket_service(db, user, data):
    # Set ticket_data variable to store ticket data value
    ticket_data = {
        # Execute statement to process data and maintain state
        "title": data.title,
        # Execute statement to process data and maintain state
        "description": data.description,
        # Execute statement to process data and maintain state
        "created_by": user.email,
    # Execute statement to process data and maintain state
    }
    # Return computed result or response payload to caller
    return create_ticket(db, ticket_data)

# Define calculate_priority function to handle calculate priority
def calculate_priority(impact: str, urgency: str) -> str:
    # Set matrix variable to store matrix value
    matrix = {
        # Execute statement to process data and maintain state
        "High": {"High": "Critical", "Medium": "High", "Low": "Medium"},
        # Execute statement to process data and maintain state
        "Medium": {"High": "High", "Medium": "Medium", "Low": "Low"},
        # Execute statement to process data and maintain state
        "Low": {"High": "Medium", "Medium": "Low", "Low": "Low"}
    # Execute statement to process data and maintain state
    }
    
    # Safely get the priority, defaulting to "Low" if something goes wrong
    return matrix.get(impact, {}).get(urgency, "Low")