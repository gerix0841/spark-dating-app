from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections keyed by user ID."""

    def __init__(self) -> None:
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and register it for the given user."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int) -> None:
        """Remove a user's WebSocket connection on disconnect."""
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: int) -> None:
        """Send a JSON payload to a specific connected user. No-op if user is offline."""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)


manager = ConnectionManager()
