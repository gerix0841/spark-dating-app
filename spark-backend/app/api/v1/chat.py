from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db_websocket
from app.crud import chat as chat_crud
from app.api.v1.websocket_manager import manager
from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
import json

router = APIRouter(prefix="/chat", tags=["chat"])

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db_websocket)):
    await manager.connect(user_id, websocket)
    current_user = db.query(User).filter(User.id == user_id).first()
    sender_name = current_user.profile.full_name if current_user and current_user.profile else "Somebody"

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            new_msg = chat_crud.create_message(
                db,
                sender_id=user_id,
                receiver_id=message_data['receiver_id'],
                content=message_data['content']
            )

            payload = {
                "sender_id": user_id,
                "sender_name": sender_name,
                "content": message_data['content'],
                "timestamp": new_msg.timestamp.isoformat(),
                "type": "new_message"
            }
            await manager.send_personal_message(payload, message_data['receiver_id'])
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@router.get("/conversation/{other_user_id}")
def get_history(other_user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return chat_crud.get_conversation(db, current_user.id, other_user_id)

@router.post("/mark-read/{sender_id}")
async def mark_read(sender_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    chat_crud.mark_messages_as_read(db, receiver_id=current_user.id, sender_id=sender_id)
    await manager.send_personal_message({"type": "messages_read", "reader_id": current_user.id}, sender_id)
    return {"status": "ok"}


