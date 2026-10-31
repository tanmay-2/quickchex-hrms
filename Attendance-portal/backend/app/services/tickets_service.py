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

from app.repositories.profile_repository import get_profile_by_email

from sqlalchemy.orm import Session
from app.models.ticket_model import Ticket

def create_ticket(db, data):
    ticket = Ticket(**data)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

def get_all_tickets(db):
    return db.query(Ticket).all()

def get_user_tickets(db, email):
    return db.query(Ticket).filter(Ticket.created_by == email).all()

def update_ticket_status(db, ticket_id, status):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket:
        ticket.status = status
        db.commit()
    return ticket

def create_ticket_service(db, user, data):
    ticket_data = {
        "title": data.title,
        "description": data.description,
        "created_by": user.email,
    }
    return create_ticket(db, ticket_data)

def calculate_priority(impact: str, urgency: str) -> str:
    matrix = {
        "High": {"High": "Critical", "Medium": "High", "Low": "Medium"},
        "Medium": {"High": "High", "Medium": "Medium", "Low": "Low"},
        "Low": {"High": "Medium", "Medium": "Low", "Low": "Low"}
    }
    
    # Safely get the priority, defaulting to "Low" if something goes wrong
    return matrix.get(impact, {}).get(urgency, "Low")