import pytest
from fastapi.testclient import TestClient
from datetime import date
import json

def get_token(client: TestClient, email: str):
    client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Chat User",
            "birthdate": "1995-01-01",
            "gender": "male"
        }
    )
    response = client.post(
        "/auth/login", 
        json={"email": email, "password": "password123"}
    )
    
    return response.json()["access_token"]

class TestChatEndpoints:

    def test_get_conversation_history(self, client: TestClient):
        token = get_token(client, "history@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/chat/conversation/999", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_mark_messages_as_read(self, client: TestClient):
        token = get_token(client, "reader@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post("/chat/mark-read/5", headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_websocket_connection_and_messaging(self, client: TestClient):
        token1 = get_token(client, "user1@ws.com")
        token2 = get_token(client, "user2@ws.com")
        
        with client.websocket_connect("/chat/ws/1") as ws1:
            with client.websocket_connect("/chat/ws/2") as ws2:
                message_payload = {
                    "receiver_id": 2,
                    "content": "Hello via WebSocket!"
                }
                ws1.send_text(json.dumps(message_payload))
                
                received_data = ws2.receive_json()
                
                assert received_data["type"] == "new_message"
                assert received_data["sender_id"] == 1
                assert received_data["content"] == "Hello via WebSocket!"

    def test_websocket_disconnect(self, client: TestClient):
        with client.websocket_connect("/chat/ws/10") as ws:
            pass