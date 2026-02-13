from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from app.schemas.user import PasswordChange, ProfileUpdate, LocationUpdate, DiscoveryUserResponse, SwipeCreate
from app.crud import user as user_crud
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
import cloudinary.uploader
from typing import List
from app.api.v1.websocket_manager import manager

router = APIRouter(prefix="/users", tags=["Users"])

@router.put("/me/change-password")
def change_password(password_in: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = user_crud.update_user_password(db, user_id=current_user.id, password_data=password_in)

    if success:
        return {"message": "Password updated successfully!"}
    
@router.patch("/me/profile")
def update_user_profile(profile_in: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated_profile = user_crud.update_profile(db, user_id=current_user.id, profile_in=profile_in)
    return {"message": "Profile updated successfully", "profile": updated_profile}

@router.get("/me/profile")
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = user_crud.get_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.get("/{user_id}/profile", response_model=DiscoveryUserResponse)
def get_other_user_profile(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_data = user_crud.get_user_profile_data(db, user_id, current_user.id)
    
    if not profile_data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    return profile_data

@router.post("/me/images/upload")
async def upload_image(position: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = user_crud.get_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    try:
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder=f"spark/user_{current_user.id}"
        )
    except Exception as e:
        print(f"Cloudinary error: {e}")
        raise HTTPException(status_code=500, detail="Cloudinary upload error")
    
    return user_crud.upload_profile_image(
        db,
        profile_id=profile.id,
        image_url=upload_result['secure_url'],
        public_id=upload_result['public_id'],
        position=position
    )

@router.delete("/me/images/{image_id}")
async def delete_image(image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = user_crud.get_profile(db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    deleted_img = user_crud.delete_profile_image(db, image_id=image_id, profile_id=profile.id)
    if not deleted_img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    cloudinary.uploader.destroy(deleted_img.cloudinary_public_id)
    
    return {"message": "Successfully removed"}

@router.post("/me/location")
def update_location(loc_in: LocationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_crud.update_user_location(db, user_id=current_user.id, loc_in=loc_in)
    return {"message": "Location updated successfully"}

@router.get("/discovery", response_model=List[DiscoveryUserResponse])
def discovery(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return user_crud.get_discovery_users(db, current_user.id)

@router.post("/swipe")
def swipe(swipe_in: SwipeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    swipe_obj, is_match = user_crud.create_swipe(db, current_user.id, swipe_in)
    return {"status": "ok", "is_match": is_match}

@router.get("/matches", response_model=List[dict])
def list_matches(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return user_crud.get_user_matches(db, current_user.id)

@router.post("/{user_id}/block")
async def block_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself.")
    
    success = user_crud.block_user_and_cleanup(db, blocker_id=current_user.id, blocked_id=user_id)
    
    if success:
        payload = {
            "type": "user_blocked",
            "blocked_by": current_user.id
        }
        await manager.send_personal_message(payload, user_id)
    
    return {"message": "User blocked."}

@router.post("/swipe/undo", response_model=None)
def undo_swipe(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    undone_action = user_crud.undo_last_swipe(db, user_id=current_user.id)

    if not undone_action:
        raise HTTPException(status_code=404, detail="No swipe history found to undo")
    
    return {
        "status": "success", 
        "message": "Last swipe has been undone",
        "undone_user_id": undone_action.liked_id
    }


