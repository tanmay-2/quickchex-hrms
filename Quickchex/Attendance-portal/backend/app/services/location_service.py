# from sqlalchemy.orm import Session
# from app.models.location import Location
# from app.models.user import User
# from app.repositories.location_repo import get_all_locations, get_last_location_by_user

# #
# def get_all_user_locations(db: Session):
#     results = db.query(Location, User).join(
#         User, Location.user_id == User.id
#     ).all()

#     response = []

#     for loc, user in results:
#         response.append({
#             "id": loc.id,
#             "user_id": user.id,
#             "user_name": user.username,
#             "email": user.email,
#             "latitude": loc.latitude,
#             "longitude": loc.longitude,
#             "type": loc.type,
#             "created_at": loc.created_at
#         })

#     return response


# def get_last_location(db: Session, user_id: int):
#     loc = get_last_location_by_user(db, user_id)

#     if not loc:
#         return None

#     return {
#         "user_id": loc.user_id,
#         "latitude": loc.latitude,
#         "longitude": loc.longitude,
#         "type": loc.type,
#         "created_at": loc.created_at
#     }