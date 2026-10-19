from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    attendance_api,
    regularization_api,
    admin_api,
    manager_api,
    employee_api,
    profile_api,
    leave_api,
    payroll_api,
    notification,
    tickets_api,
    policy_api,
    work_location_api,
    tasks,
    users,
    monthly_routes,
    add_emp_api,
    document_api,
    resignation_api,
    compoff_api,
    contract_api,
)

api_router = APIRouter()

# 🔐 Canonical /api/v1 routes
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(attendance_api.router, tags=["Attendance"])
api_router.include_router(regularization_api.router, tags=["Regularization"])
api_router.include_router(admin_api.router, tags=["Admin"])
api_router.include_router(manager_api.router, tags=["Manager"])
api_router.include_router(employee_api.router, tags=["Employees"])
api_router.include_router(profile_api.router, tags=["Profile"])
api_router.include_router(document_api.router, prefix="/documents", tags=["Documents"])
api_router.include_router(leave_api.router, prefix="/leaves", tags=["Leaves"])
api_router.include_router(payroll_api.router)
api_router.include_router(notification.router, tags=["Notifications"])
api_router.include_router(tickets_api.router, tags=["Tickets"])
api_router.include_router(policy_api.router, tags=["Policies"])
api_router.include_router(work_location_api.router, tags=["Work Locations"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(monthly_routes.router, tags=["Monthly Sheets"])
api_router.include_router(add_emp_api.router, tags=["Add Employee"])
api_router.include_router(resignation_api.router, tags=["Resignation"])
api_router.include_router(compoff_api.router)
api_router.include_router(contract_api.router)
