# ==============================================================================
# QUICKCHEX HRMS BACKEND - API.PY
# Path: Attendance-portal/backend/app/api/v1/api.py
# Purpose: Backend module.
# ==============================================================================

# Import APIRouter class from FastAPI to group and organize API routes
from fastapi import APIRouter

# Import sub-routers for all modular HRMS endpoints
from app.api.v1.endpoints import (
    auth,  # Authentication endpoints for login, tokens, and password reset
    attendance_api,  # Attendance endpoints for punch in/out and daily logs
    regularization_api,  # Regularization endpoints to request attendance corrections
    admin_api,  # Administrative operations and company-wide management endpoints
    manager_api,  # Manager-specific routes for team approvals and team oversight
    employee_api,  # Employee directory and employee detail lookup endpoints
    profile_api,  # User profile viewing and profile update endpoints
    leave_api,  # Leave request application, leave balance, and leave approval routes
    payroll_api,  # Payroll processing, salary structures, and payslip endpoints
    notification,  # In-app notifications and broadcast messaging endpoints
    tickets_api,  # Helpdesk ticketing and issue resolution endpoints
    policy_api,  # Company policy creation, updates, and download endpoints
    work_location_api,  # Geofenced work location and office site endpoints
    tasks,  # Daily task management, assignment, and status tracking endpoints
    users,  # User account administration, role assignment, and user status routes
    monthly_routes,  # Monthly attendance sheet exports and report generation routes
    add_emp_api,  # Onboarding API to create and register new employee profiles
    document_api,  # Document repository and secure file upload endpoints
    resignation_api,  # Employee resignation request and offboarding workflow routes
    compoff_api,  # Compensatory off calculation and comp-off grant endpoints
    contract_api,  # Employment contracts, letters, and agreement management routes
    chatbot_api,  # AI Cogni chatbot conversation and interactive Q&A endpoints
)

# Instantiate top-level FastAPI router for API version 1
api_router = APIRouter()

# 🔐 Canonical /api/v1 routes
# Mount authentication endpoints under /api/v1/auth
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# Mount attendance logging endpoints under /api/v1
api_router.include_router(attendance_api.router, tags=["Attendance"])
# Mount regularization correction endpoints under /api/v1
api_router.include_router(regularization_api.router, tags=["Regularization"])
# Mount administration endpoints under /api/v1
api_router.include_router(admin_api.router, tags=["Admin"])
# Mount manager dashboard endpoints under /api/v1
api_router.include_router(manager_api.router, tags=["Manager"])
# Mount employee directory endpoints under /api/v1
api_router.include_router(employee_api.router, tags=["Employees"])
# Mount user profile endpoints under /api/v1
api_router.include_router(profile_api.router, tags=["Profile"])
# Mount document storage endpoints under /api/v1/documents
api_router.include_router(document_api.router, prefix="/documents", tags=["Documents"])
# Mount leave management endpoints under /api/v1/leaves
api_router.include_router(leave_api.router, prefix="/leaves", tags=["Leaves"])
# Mount payroll computation and salary endpoints under /api/v1
api_router.include_router(payroll_api.router)
# Mount user notification endpoints under /api/v1
api_router.include_router(notification.router, tags=["Notifications"])
# Mount helpdesk ticketing endpoints under /api/v1
api_router.include_router(tickets_api.router, tags=["Tickets"])
# Mount organization policies endpoints under /api/v1
api_router.include_router(policy_api.router, tags=["Policies"])
# Mount geofence work location endpoints under /api/v1
api_router.include_router(work_location_api.router, tags=["Work Locations"])
# Mount task management endpoints under /api/v1/tasks
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
# Mount user management endpoints under /api/v1/users
api_router.include_router(users.router, prefix="/users", tags=["Users"])
# Mount monthly attendance sheet endpoints under /api/v1
api_router.include_router(monthly_routes.router, tags=["Monthly Sheets"])
# Mount employee onboarding creation endpoints under /api/v1
api_router.include_router(add_emp_api.router, tags=["Add Employee"])
# Mount resignation handling endpoints under /api/v1
api_router.include_router(resignation_api.router, tags=["Resignation"])
# Mount compensatory off endpoints under /api/v1
api_router.include_router(compoff_api.router)
# Mount employee contract endpoints under /api/v1
api_router.include_router(contract_api.router)
# Mount AI chatbot interactive endpoints under /api/v1
api_router.include_router(chatbot_api.router, tags=["AI Chatbot"])
