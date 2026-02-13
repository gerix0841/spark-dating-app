from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.schemas.user import UserCreate, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from app.crud import user as user_crud
from app.core import security
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    new_user = user_crud.create_user(db, user_in=user_in)
    return {"message": "Successful register!", "user_id": new_user.id}

@router.post("/login")
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = user_crud.login_user(
        db,
        email=user_in.email, 
        password=user_in.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = security.create_access_token(data={"sub": str(user.id)})

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.profile.full_name if current_user.profile else "User"
    }

@router.post("/forgot-password")
def forgot_password(email_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user_crud.create_password_reset_code(db, email=email_data.email)
    
    return {"message": "If the email exists, a recovery code has been generated."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = user_crud.reset_password_with_token(
        db, 
        token=data.token, 
        new_password=data.new_password
    )

    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    return {"message": "Password successfully reset!"}

