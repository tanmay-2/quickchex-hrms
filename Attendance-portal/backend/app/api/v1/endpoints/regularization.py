# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from typing import List

# from app.db.session import get_db
# from app.schemas.regularization import RegularizationCreate, RegularizationResponse
# from app.services.regularization_service import (
#     create_request,
#     get_my_requests,
#     get_all_requests,
# )

# router = APIRouter(prefix="/regularization", tags=["Regularization"])


# # 🔓 OPEN ENDPOINT (NO AUTH)
# @router.post("/", response_model=RegularizationResponse)
# def apply_regularization(
#     data: RegularizationCreate,
#     db: Session = Depends(get_db),
# ):
#     user_id = 1  # TEMP user
#     return create_request(db, user_id, data)


# # 🔓 OPEN ENDPOINT
# @router.get("/me", response_model=List[RegularizationResponse])
# def my_requests(db: Session = Depends(get_db)):
#     user_id = 1  # TEMP user
#     return get_my_requests(db, user_id)


# # 🔓 OPEN ENDPOINT
# @router.get("/all", response_model=List[RegularizationResponse])
# def all_requests(db: Session = Depends(get_db)):
#     return get_all_requests(db)