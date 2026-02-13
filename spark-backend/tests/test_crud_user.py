import pytest
from datetime import date, datetime, timedelta, timezone
from fastapi import HTTPException
from app.crud import user as user_crud
from app.schemas.user import UserCreate, ProfileUpdate, LocationUpdate, SwipeCreate, PasswordChange
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.profile import ProfileImage

def create_mock_user(db, email, full_name="Test User", gender="male"):
    user_in = UserCreate(
        email=email,
        password="password12345",
        full_name=full_name,
        birthdate=date(1995, 1, 1),
        gender=gender
    )
    return user_crud.create_user(db, user_in)

class TestUserCRUD:

    def test_create_user_and_login_logic(self, db):
        user = create_mock_user(db, "logic@test.com", gender="female")
        assert user.profile.interests == "male"
        assert user_crud.login_user(db, "nonexistent@test.com", "any") is False
        assert user_crud.login_user(db, "logic@test.com", "wrong_pass") is False
        
        with pytest.raises(HTTPException) as exc:
            create_mock_user(db, "logic@test.com")
        assert exc.value.status_code == 400

    def test_password_and_profile_errors(self, db):
        user = create_mock_user(db, "err@test.com")
        
        with pytest.raises(HTTPException) as e1:
            user_crud.update_user_password(db, 9999, PasswordChange(old_password="any", new_password="new12345"))
        assert e1.value.status_code == 404
        
        with pytest.raises(HTTPException) as e2:
            user_crud.update_user_password(db, user.id, PasswordChange(old_password="wrong", new_password="new12345"))
        assert e2.value.status_code == 400

        with pytest.raises(HTTPException) as e3:
            user_crud.update_profile(db, 9999, ProfileUpdate(bio="test"))
        assert e3.value.status_code == 404

    def test_get_user_profile_data_branches(self, db):
        u1 = create_mock_user(db, "p1@test.com")
        u2 = create_mock_user(db, "p2@test.com")
        
        assert user_crud.get_user_profile_data(db, 9999, u1.id) is None
        
        res_no_loc = user_crud.get_user_profile_data(db, u2.id, u1.id)
        assert res_no_loc["distance"] == 0.0
        
        user_crud.update_user_location(db, u1.id, LocationUpdate(latitude=47.0, longitude=19.0))
        user_crud.update_user_location(db, u2.id, LocationUpdate(latitude=47.1, longitude=19.1))
        res_loc = user_crud.get_user_profile_data(db, u2.id, u1.id)
        assert res_loc["distance"] > 0

    def test_image_and_location_branches(self, db):
        user = create_mock_user(db, "img@test.com")
        
        user_crud.upload_profile_image(db, user.profile.id, "url1", "p1", 1)
        user_crud.upload_profile_image(db, user.profile.id, "url2", "p2", 1)
        assert db.query(ProfileImage).filter_by(profile_id=user.profile.id).count() == 1
        
        assert user_crud.delete_profile_image(db, 9999, user.profile.id) is None
        img = db.query(ProfileImage).first()
        assert user_crud.delete_profile_image(db, img.id, user.profile.id) is not None
        
        user_crud.update_user_location(db, user.id, LocationUpdate(latitude=1.0, longitude=1.0))
        user_crud.update_user_location(db, user.id, LocationUpdate(latitude=2.0, longitude=2.0))

    def test_discovery_logic_branches(self, db):
        me = create_mock_user(db, "me_disco@test.com")
        assert user_crud.get_discovery_users(db, me.id) == []
        
        user_crud.update_user_location(db, me.id, LocationUpdate(latitude=47.0, longitude=19.0))
        
        other = create_mock_user(db, "other_disco@test.com", gender="female")
        user_crud.update_user_location(db, other.id, LocationUpdate(latitude=47.0, longitude=19.0))
        
        db_swipe = Swipe(liker_id=me.id, liked_id=other.id, is_like=False, created_at=datetime.now(timezone.utc))
        db.add(db_swipe)
        db.commit()
        
        assert len(user_crud.get_discovery_users(db, me.id)) == 0

    def test_swipe_and_match_logic_branches(self, db):
        u1 = create_mock_user(db, "s1@test.com")
        u2 = create_mock_user(db, "s2@test.com")
        
        user_crud.create_swipe(db, u1.id, SwipeCreate(liked_id=u2.id, is_like=False))
        user_crud.create_swipe(db, u1.id, SwipeCreate(liked_id=u2.id, is_like=True))
        user_crud.create_swipe(db, u2.id, SwipeCreate(liked_id=u1.id, is_like=True))
        user_crud.create_swipe(db, u2.id, SwipeCreate(liked_id=u1.id, is_like=True))
        
        matches = user_crud.get_user_matches(db, u1.id)
        assert len(matches) == 1
        assert matches[0]["last_message"] == "No messages yet"

    def test_undo_swipe_branches(self, db):
        u1 = create_mock_user(db, "u1_undo@test.com")
        u2 = create_mock_user(db, "u2_undo@test.com")
        
        assert user_crud.undo_last_swipe(db, u1.id) is None
        
        user_crud.create_swipe(db, u1.id, SwipeCreate(liked_id=u2.id, is_like=True))
        user_crud.create_swipe(db, u2.id, SwipeCreate(liked_id=u1.id, is_like=True))
        
        user_crud.undo_last_swipe(db, u2.id)
        assert db.query(Match).count() == 0

    def test_password_reset_branches(self, db):
        assert user_crud.create_password_reset_code(db, "nobody@test.com") is None
        
        email = "reset_me@test.com"
        create_mock_user(db, email)
        token = user_crud.create_password_reset_code(db, email)
        
        assert user_crud.reset_password_with_token(db, "WRONG", "newpass12345") is False
        assert user_crud.reset_password_with_token(db, token, "newpass12345") is True