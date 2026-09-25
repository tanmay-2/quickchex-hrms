# from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
# from datetime import datetime
# from app.db.base import Base

# class Location(Base):
#     __tablename__ = "locations"

#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"))

#     latitude = Column(Float, nullable=False)
#     longitude = Column(Float, nullable=False)

#     type = Column(String, nullable=False)  # "check-in" / "check-out"

#     created_at = Column(DateTime, default=datetime.utcnow)