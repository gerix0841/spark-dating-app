from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.chat import Message

def create_message(db: Session, sender_id: int, receiver_id: int, content: str):
    db_msg = Message(sender_id=sender_id, receiver_id=receiver_id, content=content)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def get_conversation(db: Session, user1_id: int, user2_id: int, limit: int = 50):
    return db.query(Message).filter(
        or_(
            and_(Message.sender_id == user1_id, Message.receiver_id == user2_id),
            and_(Message.sender_id == user2_id, Message.receiver_id == user1_id)
        )
    ).order_by(Message.timestamp.asc()).limit(limit).all()

def mark_messages_as_read(db: Session, receiver_id: int, sender_id: int):
    db.query(Message).filter(
        Message.receiver_id == receiver_id,
        Message.sender_id == sender_id,
        Message.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()

    
