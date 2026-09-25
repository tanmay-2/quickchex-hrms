from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.location import LocationWithUserResponse
from app.services.location_service import get_all_user_locations, get_last_location
from app.core.dependencies import require_roles, get_current_user
from app.core.constants import ADMIN
from app.models.user import User

router = APIRouter(prefix="/locations", tags=["Location"])


# 🔒 Admin → All locations
@router.get("/", response_model=List[LocationWithUserResponse])
def get_all_locations_api(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([ADMIN]))
):
    return get_all_user_locations(db)


# 👤 User → Last location
@router.get("/me")
def get_my_last_location(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return get_last_location(db, user.id)