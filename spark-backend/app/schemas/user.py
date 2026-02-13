from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import date

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    birthdate: date
    gender: str

    @field_validator("birthdate")
    @classmethod
    def validate_age(cls, v: date):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError("You must be at least 18 years old to join Spark.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    birthdate: Optional[date] = None
    gender: Optional[str] = None
    interests: Optional[str] = None
    age_min: Optional[int] = Field(None, ge=18)
    age_max: Optional[int] = Field(None, le=100)
    interests_tags: Optional[List[str]] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class SwipeCreate(BaseModel):
    liked_id: int
    is_like: bool

class DiscoveryImageResponse(BaseModel):
    url: str
    position: int

class DiscoveryUserResponse(BaseModel):
    id: int
    full_name: str
    bio: Optional[str]
    age: int
    distance: float
    images: List[DiscoveryImageResponse]
    interests: List[str] = []
    common_interests: List[str] = []
    common_interests_count: int

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=10, description="The 10-digit recovery code")
    new_password: str = Field(..., min_length=6, description="Minimum 6 characters")

