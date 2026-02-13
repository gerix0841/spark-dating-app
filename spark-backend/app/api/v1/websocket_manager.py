from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.activate_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.activate_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.activate_connections:
            del self.activate_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.activate_connections:
            await self.activate_connections[user_id].send_json(message)

manager = ConnectionManager()