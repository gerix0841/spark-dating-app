import pytest
from fastapi.testclient import TestClient

class TestAuthEndpoints:

    def test_register_user_success(self, client: TestClient):
        payload = {
            "email": "register@example.com",
            "password": "password123",
            "full_name": "John Doe",
            "birthdate": "1990-01-01",
            "gender": "male"
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 201
        assert response.json()["message"] == "Successful register!"
        assert "user_id" in response.json()

    def test_register_user_duplicate_email(self, client: TestClient):
        payload = {
            "email": "dup@example.com",
            "password": "password123",
            "full_name": "First User",
            "birthdate": "1990-01-01",
            "gender": "male"
        }
        client.post("/auth/register", json=payload)
        
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 400

    def test_login_success(self, client: TestClient):
        client.post("/auth/register", json={
            "email": "login@example.com",
            "password": "password123",
            "full_name": "Login User",
            "birthdate": "1990-01-01",
            "gender": "female"
        })

        response = client.post("/auth/login", json={
            "email": "login@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client: TestClient):
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_get_me_authenticated(self, client: TestClient):
        email = "me@example.com"
        client.post("/auth/register", json={
            "email": email,
            "password": "password123",
            "full_name": "Me User",
            "birthdate": "1990-01-01",
            "gender": "male"
        })
        
        login_res = client.post("/auth/login", json={
            "email": email,
            "password": "password123"
        })
        token = login_res.json()["access_token"]
        
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["email"] == email

    def test_forgot_and_reset_password_flow(self, client: TestClient, db):
        email = "recovery@example.com"
        client.post("/auth/register", json={
            "email": email,
            "password": "oldpassword123",
            "full_name": "Recovery User",
            "birthdate": "1990-01-01",
            "gender": "female"
        })

        client.post("/auth/forgot-password", json={"email": email})

        from app.models.user import PasswordReset
        reset_entry = db.query(PasswordReset).filter(PasswordReset.email == email).first()
        assert reset_entry is not None
        token = reset_entry.token

        reset_payload = {
            "token": token,
            "new_password": "newpassword789"
        }
        response = client.post("/auth/reset-password", json=reset_payload)
        assert response.status_code == 200
        assert response.json()["message"] == "Password successfully reset!"

    def test_reset_password_invalid_token(self, client: TestClient):
        invalid_payload = {
            "token": "INVALID123",
            "new_password": "somepassword123"
        }
        response = client.post("/auth/reset-password", json=invalid_payload)
        
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid or expired code."