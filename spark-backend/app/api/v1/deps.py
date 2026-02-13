from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db 
from app.core.config import settings
from app.models.user import User

api_key_header = APIKeyHeader(name="Authorization", description="Use: Bearer <token>")

def get_current_user(
    db: Session = Depends(get_db), 
    token_header: str = Depends(api_key_header)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token_header:
        raise credentials_exception

    if token_header.startswith("Bearer "):
        token = token_header.split(" ")[1]
    else:
        token = token_header

    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if user is None:
        raise credentials_exception
        
    return user

def get_db_websocket() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

