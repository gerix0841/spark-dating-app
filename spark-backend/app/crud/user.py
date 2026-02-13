from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, extract
from app.models.chat import Message
from app.models.user import User, PasswordReset
from app.models.profile import Profile, ProfileImage
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.location import UserLocation
from app.models.block import Block
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.schemas.user import UserCreate, PasswordChange, ProfileUpdate, LocationUpdate, SwipeCreate
import math
from datetime import datetime, timedelta, timezone
import secrets
import string
from sqlalchemy.orm.attributes import flag_modified

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password(password):
    return pwd_context.hash(password)

def create_user(db: Session, user_in: UserCreate):
    # Check for existing email
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exits"
        )

    # Create User
    password_hash = get_password(user_in.password)
    default_interests = "female" if user_in.gender == "male" else "male"

    db_user = User(
        email=user_in.email,
        password=password_hash
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_profile = Profile(
        user_id=db_user.id,
        full_name=user_in.full_name,
        birthdate=user_in.birthdate,
        gender=user_in.gender,
        interests=default_interests,
        age_min=18,
        age_max=100
    )
    db.add(db_profile)
    db.commit()

    return db_user

def login_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    
    if not pwd_context.verify(password, user.password):
        return False
    
    return user

def update_user_password(db: Session, user_id: int, password_data: PasswordChange):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not pwd_context.verify(password_data.old_password, db_user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    db_user.password = pwd_context.hash(password_data.new_password)
    db.commit()
    db.refresh(db_user)

    return True

def update_profile(db: Session, user_id: int, profile_in: ProfileUpdate):
    db_profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if not db_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    update_data = profile_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_profile, field, value)
        if field == "interests_tags":
            flag_modified(db_profile, "interests_tags")
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

def get_profile(db: Session, user_id: int):
    return db.query(Profile)\
        .options(joinedload(Profile.images))\
        .filter(Profile.user_id == user_id)\
        .first()

def get_user_profile_data(db: Session, target_user_id: int, current_user_id: int):
    u = db.query(User).filter(User.id == target_user_id).first()
    if not u or not u.profile:
        return None
    
    me = db.query(User).filter(User.id == current_user_id).first()
    
    dist = 0.0
    if me.location and u.location:
        dist = calculate_distance(
            me.location.latitude, me.location.longitude,
            u.location.latitude, u.location.longitude
        )

    target_interests = u.profile.interests_tags or []
    my_interests = me.profile.interests_tags or []
    common_interests = list(set(target_interests).intersection(set(my_interests)))

    return {
        "id": u.id,
        "full_name": u.profile.full_name,
        "bio": u.profile.bio,
        "age": datetime.now().year - u.profile.birthdate.year,
        "distance": round(dist, 1),
        "images": sorted(u.profile.images, key=lambda x: x.position),
        "interests": target_interests,
        "common_interests": common_interests,
        "common_interests_count": len(common_interests)
    }

def upload_profile_image(db: Session, profile_id: int, image_url: str, public_id: str, position: int):
    existing_image = db.query(ProfileImage).filter(
        ProfileImage.profile_id == profile_id,
        ProfileImage.position == position
    ).first()

    if existing_image:
        db.delete(existing_image)
        db.commit()

    db_image = ProfileImage(
        profile_id=profile_id,
        url=image_url,
        cloudinary_public_id=public_id,
        position=position
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image
    
def delete_profile_image(db: Session, image_id: int, profile_id: int):
    img = db.query(ProfileImage).filter(
        ProfileImage.id == image_id,
        ProfileImage.profile_id == profile_id
    ).first()

    if img:
        db.delete(img)
        db.commit()
        return img
    return None

def update_user_location(db: Session, user_id: int, loc_in: LocationUpdate):
    db_loc = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()

    if db_loc:
        db_loc.latitude = loc_in.latitude
        db_loc.longitude = loc_in.longitude
    else:
        db_loc = UserLocation(
            user_id=user_id,
            latitude=loc_in.latitude,
            longitude=loc_in.longitude
        )
        db.add(db_loc)

    db.commit()
    db.refresh(db_loc)
    return db_loc

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))

def get_discovery_users(db: Session, current_user_id: int):
    me = db.query(User).filter(User.id == current_user_id).first()
    if not me.location or not me.profile:
        return []
    
    my_interests = set(me.profile.interests_tags or [])

    # Exclude liked or passed less than a week ago
    now_utc = datetime.now(timezone.utc)
    one_week_ago = now_utc - timedelta(days=7)

    swiped_ids = db.query(Swipe.liked_id).filter(
        Swipe.liker_id == current_user_id,
        or_(Swipe.is_like == True, and_(Swipe.is_like == False, Swipe.created_at > one_week_ago))
    ).all()
    
    blocked_by_me = db.query(Block.blocked_id).filter(Block.blocker_id == current_user_id).all()
    blocking_me = db.query(Block.blocker_id).filter(Block.blocked_id == current_user_id).all()

    excluded = (
        [s[0] for s in swiped_ids] + 
        [b[0] for b in blocked_by_me] + 
        [b[0] for b in blocking_me] + 
        [current_user_id]
    )

    # Age and Gender filter
    query = db.query(User).join(Profile).filter(User.id.notin_(excluded))
    if me.profile.interests != 'both':
        query = query.filter(Profile.gender == me.profile.interests)

    today = datetime.now()
    query = query.filter((extract('year', today) - extract('year', Profile.birthdate)).between(me.profile.age_min, me.profile.age_max))
    users = query.options(joinedload(User.profile).joinedload(Profile.images), joinedload(User.location)).all()

    # Distance
    results = []
    for u in users:
        if not u.location:
            continue
        
        dist = calculate_distance(me.location.latitude, me.location.longitude, u.location.latitude, u.location.longitude)
        if dist <= 200:
            other_interests = set(u.profile.interests_tags or [])
            common_interests = list(my_interests.intersection(other_interests))

            results.append({
                "id": u.id,
                "full_name": u.profile.full_name,
                "bio": u.profile.bio,
                "age": today.year - u.profile.birthdate.year,
                "distance": round(dist, 1),
                "images": sorted(u.profile.images, key=lambda x: x.position),
                "interests": u.profile.interests_tags or [],
                "common_interests_count": len(common_interests)
            })

    return sorted(results, key=lambda x: (x['distance'] > 30, -x['common_interests_count'], x['distance']))

def create_swipe(db: Session, liker_id: int, swipe_in: SwipeCreate):
    db_swipe = Swipe(liker_id=liker_id, liked_id=swipe_in.liked_id, is_like=swipe_in.is_like)
    db.add(db_swipe)
    db.commit()

    if swipe_in.is_like:
        reverse_like = db.query(Swipe).filter(Swipe.liker_id == swipe_in.liked_id, Swipe.liked_id == liker_id, Swipe.is_like == True).first()

        if reverse_like:
            u1, u2 = min(liker_id, swipe_in.liked_id), max(liker_id, swipe_in.liked_id)

            existing_match = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2).first()
            
            if not existing_match:
                new_match = Match(user1_id=u1, user2_id=u2)
                db.add(new_match)
                db.commit()
                return db_swipe, True
            
    return db_swipe, False

def get_user_matches(db: Session, user_id: int):
    matches = db.query(Match).filter((Match.user1_id == user_id) | (Match.user2_id == user_id)).all()
    results = []
    for m in matches:
        other_id = m.user2_id if m.user1_id == user_id else m.user1_id
        other_user = db.query(User).filter(User.id == other_id).first()

        if other_user and other_user.profile:
            last_msg = db.query(Message).filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == other_id),
                    and_(Message.sender_id == other_id, Message.receiver_id == user_id)
                )
            ).order_by(Message.timestamp.desc()).first()

            main_img = next((img.url for img in sorted(other_user.profile.images, key=lambda x: x.position)), None)

            age = None
            if other_user.profile.birthdate:
                age = datetime.now().year - other_user.profile.birthdate.year

            results.append({
                "match_id": m.id,
                "user_id": other_user.id,
                "full_name": other_user.profile.full_name,
                "age": age,
                "image": main_img,
                "last_message": last_msg.content if last_msg else "No messages yet",
                "created_at": m.created_at
            })
    
    return sorted(results, key=lambda x: x['created_at'], reverse=True)

def block_user_and_cleanup(db: Session, blocker_id: int, blocked_id: int):
    # Delete chat
    db.query(Message).filter(
        or_(
            and_(Message.sender_id == blocker_id, Message.receiver_id == blocked_id),
            and_(Message.sender_id == blocked_id, Message.receiver_id == blocker_id)
        )
    ).delete(synchronize_session=False)

    # Delete Match
    db.query(Match).filter(
        or_(
            and_(Match.user1_id == blocker_id, Match.user2_id == blocked_id),
            and_(Match.user1_id == blocked_id, Match.user2_id == blocker_id)
        )
    ).delete(synchronize_session=False)

    #Delete Swipe
    db.query(Swipe).filter(
        or_(
            and_(Swipe.liker_id == blocker_id, Swipe.liked_id == blocked_id),
            and_(Swipe.liker_id == blocked_id, Swipe.liked_id == blocker_id)
        )
    ).delete(synchronize_session=False)

    new_block = Block(blocker_id=blocker_id, blocked_id=blocked_id)
    db.add(new_block)
    
    db.commit()
    return True

def undo_last_swipe(db: Session, user_id: int):
    last_swipe = db.query(Swipe).filter(
        Swipe.liker_id == user_id
    ).order_by(Swipe.created_at.desc()).first()

    if not last_swipe:
        return None
    
    if last_swipe.is_like:
        liked_id = last_swipe.liked_id
        
        db.query(Match).filter(
            or_(
                and_(Match.user1_id == user_id, Match.user2_id == liked_id),
                and_(Match.user1_id == liked_id, Match.user2_id == user_id)
            )
        ).delete(synchronize_session=False)

        db.query(Message).filter(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == liked_id),
                and_(Message.sender_id == liked_id, Message.receiver_id == user_id)
            )
        ).delete(synchronize_session=False)
        
    db.delete(last_swipe)
    db.commit()
    
    return last_swipe

def create_password_reset_code(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    
    alphabet = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(10))

    db.query(PasswordReset).filter(PasswordReset.email == email).delete()

    reset_entry = PasswordReset(
        email=email, 
        token=token, 
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    db.add(reset_entry)
    db.commit()

    print(f"\n[PASSWORD RESET SYSTEM] Code for {email}: {token}\n")
    return token

def reset_password_with_token(db: Session, token: str, new_password: str):
    reset_req = db.query(PasswordReset).filter(
        PasswordReset.token == token,
        PasswordReset.expires_at > datetime.now(timezone.utc)
    ).first()

    if not reset_req:
        return False

    user = db.query(User).filter(User.email == reset_req.email).first()
    if user:
        user.password = pwd_context.hash(new_password)
        
        db.delete(reset_req)
        db.commit()
        return True
    
    return False



