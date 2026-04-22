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
import json
from app.core.redis import redis_client
from app.core.logger import logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

EARTH_RADIUS_KM = 6371
DISCOVERY_MAX_DISTANCE_KM = 200
CLOSE_DISTANCE_THRESHOLD_KM = 30
DEFAULT_AGE_MIN = 18
DEFAULT_AGE_MAX = 100


def get_password(password: str) -> str:
    return pwd_context.hash(password)


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new user record and their default profile in a single transaction."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )

    password_hash = get_password(user_in.password)
    default_interests = "female" if user_in.gender == "male" else "male"

    db_user = User(email=user_in.email, password=password_hash)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_profile = Profile(
        user_id=db_user.id,
        full_name=user_in.full_name,
        birthdate=user_in.birthdate,
        gender=user_in.gender,
        interests=default_interests,
        age_min=DEFAULT_AGE_MIN,
        age_max=DEFAULT_AGE_MAX,
    )
    db.add(db_profile)
    db.commit()

    return db_user


def login_user(db: Session, email: str, password: str) -> User | bool:
    """Return the User if credentials are valid, otherwise False."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.password):
        return False
    return user


def update_user_password(db: Session, user_id: int, password_data: PasswordChange) -> bool:
    """Verify the old password and replace it with the new one.

    Raises HTTP 404 if the user is not found, HTTP 400 if the old password is wrong.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(password_data.old_password, db_user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    db_user.password = pwd_context.hash(password_data.new_password)
    db.commit()
    db.refresh(db_user)
    return True


def update_profile(db: Session, user_id: int, profile_in: ProfileUpdate) -> Profile:
    """Apply partial updates to a user's profile and persist them."""
    db_profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(db_profile, field, value)
        if field == "interests_tags":
            flag_modified(db_profile, "interests_tags")

    db.commit()
    db.refresh(db_profile)
    return db_profile


def get_profile(db: Session, user_id: int) -> Profile | None:
    return (
        db.query(Profile)
        .options(joinedload(Profile.images))
        .filter(Profile.user_id == user_id)
        .first()
    )


def get_user_profile_data(db: Session, target_user_id: int, current_user_id: int) -> dict | None:
    """Return a target user's public profile enriched with distance and common interests."""
    u = db.query(User).filter(User.id == target_user_id).first()
    if not u or not u.profile:
        return None

    me = db.query(User).filter(User.id == current_user_id).first()

    dist = 0.0
    if me.location and u.location:
        dist = calculate_distance(
            me.location.latitude, me.location.longitude,
            u.location.latitude, u.location.longitude,
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
        "common_interests_count": len(common_interests),
    }


def upload_profile_image(
    db: Session, profile_id: int, image_url: str, public_id: str, position: int
) -> ProfileImage:
    """Insert or replace a profile image at the given position slot."""
    existing = db.query(ProfileImage).filter(
        ProfileImage.profile_id == profile_id,
        ProfileImage.position == position,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    db_image = ProfileImage(
        profile_id=profile_id,
        url=image_url,
        cloudinary_public_id=public_id,
        position=position,
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


def delete_profile_image(db: Session, image_id: int, profile_id: int) -> ProfileImage | None:
    """Delete a profile image row and return it so the caller can remove it from Cloudinary."""
    img = db.query(ProfileImage).filter(
        ProfileImage.id == image_id,
        ProfileImage.profile_id == profile_id,
    ).first()
    if img:
        db.delete(img)
        db.commit()
    return img


def update_user_location(db: Session, user_id: int, loc_in: LocationUpdate) -> UserLocation:
    """Upsert the user's GPS coordinates."""
    db_loc = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
    if db_loc:
        db_loc.latitude = loc_in.latitude
        db_loc.longitude = loc_in.longitude
    else:
        db_loc = UserLocation(user_id=user_id, latitude=loc_in.latitude, longitude=loc_in.longitude)
        db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres using the Haversine formula."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_discovery_users(db: Session, current_user_id: int) -> list[dict]:
    """Return a sorted, filtered discovery feed for the current user.

    Results are cached in Redis for 10 minutes. Sorting prioritises users within
    CLOSE_DISTANCE_THRESHOLD_KM and then ranks by shared interest count.
    """
    cache_key = f"discovery:user:{current_user_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info("Discovery cache hit", extra={"user_id": current_user_id})
            return json.loads(cached)
    except Exception as e:
        logger.error("Redis read error", extra={"user_id": current_user_id, "error": str(e)})

    me = db.query(User).filter(User.id == current_user_id).first()
    if not me or not me.location or not me.profile:
        return []

    my_interests = set(me.profile.interests_tags or [])
    now_utc = datetime.now(timezone.utc)
    one_week_ago = now_utc - timedelta(days=7)

    swiped_ids = db.query(Swipe.liked_id).filter(
        Swipe.liker_id == current_user_id,
        or_(
            Swipe.is_like == True,
            and_(Swipe.is_like == False, Swipe.created_at > one_week_ago),
        ),
    ).all()

    blocked_by_me = db.query(Block.blocked_id).filter(Block.blocker_id == current_user_id).all()
    blocking_me = db.query(Block.blocker_id).filter(Block.blocked_id == current_user_id).all()

    excluded = (
        [s[0] for s in swiped_ids]
        + [b[0] for b in blocked_by_me]
        + [b[0] for b in blocking_me]
        + [current_user_id]
    )

    query = db.query(User).join(Profile).filter(User.id.notin_(excluded))
    if me.profile.interests != "both":
        query = query.filter(Profile.gender == me.profile.interests)

    today = datetime.now()
    query = query.filter(
        (extract("year", today) - extract("year", Profile.birthdate)).between(
            me.profile.age_min, me.profile.age_max
        )
    )
    users = query.options(
        joinedload(User.profile).joinedload(Profile.images),
        joinedload(User.location),
    ).all()

    results = []
    for u in users:
        if not u.location:
            continue
        dist = calculate_distance(
            me.location.latitude, me.location.longitude,
            u.location.latitude, u.location.longitude,
        )
        if dist > DISCOVERY_MAX_DISTANCE_KM:
            continue

        common = list(my_interests.intersection(set(u.profile.interests_tags or [])))
        formatted_images = sorted(
            [{"id": img.id, "url": img.url, "position": img.position} for img in u.profile.images],
            key=lambda x: x["position"],
        )
        results.append({
            "id": u.id,
            "full_name": u.profile.full_name,
            "bio": u.profile.bio,
            "age": today.year - u.profile.birthdate.year,
            "distance": round(dist, 1),
            "images": formatted_images,
            "interests": u.profile.interests_tags or [],
            "common_interests_count": len(common),
        })

    final_results = sorted(
        results,
        key=lambda x: (x["distance"] > CLOSE_DISTANCE_THRESHOLD_KM, -x["common_interests_count"], x["distance"]),
    )

    try:
        redis_client.setex(cache_key, 600, json.dumps(final_results))
        logger.info("Discovery cached", extra={"user_id": current_user_id})
    except Exception as e:
        logger.warning("Cache save failed", extra={"error": str(e)})

    return final_results


def create_swipe(db: Session, liker_id: int, swipe_in: SwipeCreate) -> tuple[Swipe, bool]:
    """Record a swipe and check for a mutual match.

    Returns the Swipe object and a boolean indicating whether a new match was created.
    """
    db_swipe = Swipe(liker_id=liker_id, liked_id=swipe_in.liked_id, is_like=swipe_in.is_like)
    db.add(db_swipe)
    db.commit()
    redis_client.delete(f"discovery:user:{liker_id}")

    if swipe_in.is_like:
        reverse_like = db.query(Swipe).filter(
            Swipe.liker_id == swipe_in.liked_id,
            Swipe.liked_id == liker_id,
            Swipe.is_like == True,
        ).first()

        if reverse_like:
            u1, u2 = min(liker_id, swipe_in.liked_id), max(liker_id, swipe_in.liked_id)
            existing_match = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2).first()
            if not existing_match:
                db.add(Match(user1_id=u1, user2_id=u2))
                db.commit()
                invalidate_match_cache(liker_id)
                invalidate_match_cache(swipe_in.liked_id)
                return db_swipe, True

    return db_swipe, False


def get_user_matches(db: Session, user_id: int) -> list[dict]:
    """Return all matches for a user enriched with the latest message preview (Redis-cached)."""
    cache_key = f"matches:user:{user_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info("Match list cache hit", extra={"user_id": user_id})
            return json.loads(cached)
    except Exception as e:
        logger.error("Redis read error", extra={"user_id": user_id, "error": str(e)})

    matches = db.query(Match).filter(
        (Match.user1_id == user_id) | (Match.user2_id == user_id)
    ).all()

    results = []
    for m in matches:
        other_id = m.user2_id if m.user1_id == user_id else m.user1_id
        other_user = db.query(User).filter(User.id == other_id).first()
        if not other_user or not other_user.profile:
            continue

        last_msg = (
            db.query(Message)
            .filter(
                or_(
                    and_(Message.sender_id == user_id, Message.receiver_id == other_id),
                    and_(Message.sender_id == other_id, Message.receiver_id == user_id),
                )
            )
            .order_by(Message.timestamp.desc())
            .first()
        )

        main_img = next(
            (img.url for img in sorted(other_user.profile.images, key=lambda x: x.position)),
            None,
        )
        age = (
            datetime.now().year - other_user.profile.birthdate.year
            if other_user.profile.birthdate
            else None
        )

        results.append({
            "match_id": m.id,
            "user_id": other_user.id,
            "full_name": other_user.profile.full_name,
            "age": age,
            "image": main_img,
            "last_message": last_msg.content if last_msg else "No messages yet",
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    sorted_results = sorted(results, key=lambda x: x["created_at"] or "", reverse=True)

    try:
        redis_client.setex(cache_key, 300, json.dumps(sorted_results))
        logger.info("Match list cached", extra={"user_id": user_id})
    except Exception as e:
        logger.warning("Failed to cache matches", extra={"error": str(e)})

    return sorted_results


def block_user_and_cleanup(db: Session, blocker_id: int, blocked_id: int) -> bool:
    """Block a user and cascade-delete all shared messages, matches, and swipes."""
    db.query(Message).filter(
        or_(
            and_(Message.sender_id == blocker_id, Message.receiver_id == blocked_id),
            and_(Message.sender_id == blocked_id, Message.receiver_id == blocker_id),
        )
    ).delete(synchronize_session=False)

    db.query(Match).filter(
        or_(
            and_(Match.user1_id == blocker_id, Match.user2_id == blocked_id),
            and_(Match.user1_id == blocked_id, Match.user2_id == blocker_id),
        )
    ).delete(synchronize_session=False)

    db.query(Swipe).filter(
        or_(
            and_(Swipe.liker_id == blocker_id, Swipe.liked_id == blocked_id),
            and_(Swipe.liker_id == blocked_id, Swipe.liked_id == blocker_id),
        )
    ).delete(synchronize_session=False)

    db.add(Block(blocker_id=blocker_id, blocked_id=blocked_id))
    db.commit()

    invalidate_match_cache(blocker_id)
    invalidate_match_cache(blocked_id)
    redis_client.delete(f"discovery:user:{blocker_id}")
    redis_client.delete(f"discovery:user:{blocked_id}")
    return True


def undo_last_swipe(db: Session, user_id: int) -> Swipe | None:
    """Undo the most recent swipe, removing any resulting match and messages."""
    last_swipe = (
        db.query(Swipe)
        .filter(Swipe.liker_id == user_id)
        .order_by(Swipe.created_at.desc())
        .first()
    )
    if not last_swipe:
        return None

    if last_swipe.is_like:
        liked_id = last_swipe.liked_id
        db.query(Match).filter(
            or_(
                and_(Match.user1_id == user_id, Match.user2_id == liked_id),
                and_(Match.user1_id == liked_id, Match.user2_id == user_id),
            )
        ).delete(synchronize_session=False)
        db.query(Message).filter(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == liked_id),
                and_(Message.sender_id == liked_id, Message.receiver_id == user_id),
            )
        ).delete(synchronize_session=False)

    db.delete(last_swipe)
    db.commit()
    return last_swipe


def create_password_reset_code(db: Session, email: str) -> str | None:
    """Generate a 10-character reset token valid for 15 minutes.

    Returns the token (for delivery via email/log) or None if the email is not found.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None

    token = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
    db.query(PasswordReset).filter(PasswordReset.email == email).delete()
    db.add(PasswordReset(
        email=email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    ))
    db.commit()

    logger.info("Password reset code generated", extra={"email": email})
    return token


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
    """Validate a reset token and update the associated user's password.

    Returns True on success, False if the token is invalid or expired.
    """
    reset_req = db.query(PasswordReset).filter(
        PasswordReset.token == token,
        PasswordReset.expires_at > datetime.now(timezone.utc),
    ).first()
    if not reset_req:
        return False

    user = db.query(User).filter(User.email == reset_req.email).first()
    if not user:
        return False

    user.password = pwd_context.hash(new_password)
    db.delete(reset_req)
    db.commit()
    return True


def invalidate_profile_cache(user_id: int) -> None:
    try:
        redis_client.delete(f"profile:user:{user_id}")
    except Exception as e:
        logger.warning("Failed to invalidate profile cache", extra={"user_id": user_id, "error": str(e)})


def invalidate_match_cache(user_id: int) -> None:
    try:
        redis_client.delete(f"matches:user:{user_id}")
    except Exception as e:
        logger.warning("Failed to invalidate match cache", extra={"user_id": user_id, "error": str(e)})
