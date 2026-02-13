from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import JSON

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String, nullable=False)
    bio = Column(Text)
    birthdate = Column(Date)
    gender = Column(String)
    interests = Column(String)
    age_min = Column(Integer, default=18)
    age_max = Column(Integer, default=100)
    interests_tags = Column(JSON, default=[])

    user = relationship("User", back_populates="profile")
    images = relationship("ProfileImage", back_populates="profile", cascade="all, delete-orphan")

class ProfileImage(Base):
    __tablename__ = "profile_images"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"))
    url = Column(String, nullable=False)
    cloudinary_public_id = Column(String, nullable=False)
    position = Column(Integer)

    profile = relationship("Profile", back_populates="images")