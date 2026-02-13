from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(Integer, primary_key=True, index=True)
    liker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    liked_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_like = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())