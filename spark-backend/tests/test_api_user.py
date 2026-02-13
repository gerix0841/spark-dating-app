import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.core.config import settings
from jose import jwt

def get_auth_token(client: TestClient, email: str):
    client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "User Test",
            "birthdate": "1990-01-01",
            "gender": "male"
        }
    )
    response = client.post("/auth/login", json={"email": email, "password": "password123"})
    return response.json()["access_token"]

class TestUserEndpoints:

    def test_get_my_profile_success(self, client: TestClient):
        token = get_auth_token(client, "me_success@test.com")
        response = client.get("/users/me/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert "full_name" in response.json()

    def test_update_user_profile(self, client: TestClient):
        token = get_auth_token(client, "update_prof@test.com")
        payload = {"bio": "Updated bio", "interests_tags": ["Gaming"]}
        response = client.patch("/users/me/profile", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["profile"]["bio"] == "Updated bio"

    def test_change_password_success(self, client: TestClient):
        token = get_auth_token(client, "change_pwd@test.com")
        payload = {"old_password": "password123", "new_password": "newpassword123"}
        response = client.put("/users/me/change-password", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully!"

    def test_update_location(self, client: TestClient):
        token = get_auth_token(client, "loc_success@test.com")
        payload = {"latitude": 47.49, "longitude": 19.04}
        response = client.post("/users/me/location", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    def test_discovery_flow(self, client: TestClient):
        token = get_auth_token(client, "disco@test.com")
        client.post("/users/me/location", json={"latitude": 47.49, "longitude": 19.04}, headers={"Authorization": f"Bearer {token}"})
        response = client.get("/users/discovery", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_other_user_profile_not_found(self, client: TestClient):
        token = get_auth_token(client, "other_not_found@test.com")
        response = client.get("/users/9999/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    def test_swipe_and_match_logic(self, client: TestClient):
        token = get_auth_token(client, "swiper@test.com")
        client.post("/auth/register", json={
            "email": "target_swipe@test.com", "password": "password123",
            "full_name": "Target", "birthdate": "1995-01-01", "gender": "female"
        })
        response = client.post("/users/swipe", json={"liked_id": 2, "is_like": True}, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    def test_block_user_and_self_block_error(self, client: TestClient):
        token = get_auth_token(client, "block_test@test.com")
        response_self = client.post("/users/1/block", headers={"Authorization": f"Bearer {token}"})
        assert response_self.status_code == 400
        
        client.post("/auth/register", json={
            "email": "to_be_blocked@test.com", "password": "password123",
            "full_name": "Blocked", "birthdate": "1990-01-01", "gender": "female"
        })
        response_ok = client.post("/users/2/block", headers={"Authorization": f"Bearer {token}"})
        assert response_ok.status_code == 200

    def test_undo_swipe_errors(self, client: TestClient):
        token = get_auth_token(client, "undo_err@test.com")
        response = client.post("/users/swipe/undo", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    def test_get_current_user_invalid_token_scenarios(self, client: TestClient):
        res1 = client.get("/users/me/profile", headers={"Authorization": "NotBearer token"})
        assert res1.status_code == 401
        
        res2 = client.get("/users/me/profile", headers={"Authorization": "Bearer invalid"})
        assert res2.status_code == 401
        
        token_no_sub = jwt.encode({"key": "val"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        res3 = client.get("/users/me/profile", headers={"Authorization": f"Bearer {token_no_sub}"})
        assert res3.status_code == 401

    @patch("cloudinary.uploader.upload")
    def test_upload_image_flow_and_error(self, mock_upload, client: TestClient):
        mock_upload.return_value = {"secure_url": "http://test.com/img.jpg", "public_id": "id123"}
        token = get_auth_token(client, "upload_test@test.com")
        file_data = {"file": ("test.jpg", b"content", "image/jpeg")}
        response = client.post("/users/me/images/upload", headers={"Authorization": f"Bearer {token}"}, data={"position": 0}, files=file_data)
        assert response.status_code == 200

        mock_upload.side_effect = Exception("Cloudinary Error")
        response_err = client.post("/users/me/images/upload", headers={"Authorization": f"Bearer {token}"}, data={"position": 1}, files=file_data)
        assert response_err.status_code == 500

    def test_delete_image_not_found(self, client: TestClient):
        token = get_auth_token(client, "del_img_err@test.com")
        response = client.delete("/users/me/images/9999", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    def test_list_matches(self, client: TestClient):
        token = get_auth_token(client, "matches_test@test.com")
        response = client.get("/users/matches", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)