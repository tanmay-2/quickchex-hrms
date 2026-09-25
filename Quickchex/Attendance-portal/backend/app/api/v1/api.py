from fastapi import APIRouter

from app.api.v1.endpoints import auth, attendance_api, regularization_api, users
# from app.api.v1.endpoints import  tasks, hierarchy
from app.api.v1.endpoints import tasks
# from app.api.v1.endpoints import location
from app.api.v1.endpoints import profile_api


api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(attendance_api.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(regularization_api.router, tags=["Regularization"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
# api_router.include_router(location.router, prefix="/locations", tags=["Location"])
api_router.include_router(profile_api.router, prefix="/profile", tags=["Profile"])
# api_router.include_router(hierarchy.router, prefix="/hierarchy", tags=["Hierarchy"])