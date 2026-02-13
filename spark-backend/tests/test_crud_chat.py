import pytest
from app.crud import chat as chat_crud
from app.crud import user as user_crud
from app.schemas.user import UserCreate
from datetime import date

def create_test_user(db, email):
    user_in = UserCreate(
        email=email,
        password="password123",
        full_name="Chat User",
        birthdate=date(1990, 1, 1),
        gender="male"
    )
    return user_crud.create_user(db, user_in)

class TestChatCRUD:

    def test_create_and_get_message(self, db):
        u1 = create_test_user(db, "sender@example.com")
        u2 = create_test_user(db, "receiver@example.com")

        content = "Hello! How are you?"
        msg = chat_crud.create_message(db, sender_id=u1.id, receiver_id=u2.id, content=content)

        assert msg.id is not None
        assert msg.content == content
        assert msg.sender_id == u1.id
        assert msg.is_read is False

    def test_get_conversation_ordering(self, db):
        u1 = create_test_user(db, "u1_chat@example.com")
        u2 = create_test_user(db, "u2_chat@example.com")

        chat_crud.create_message(db, u1.id, u2.id, "First message")
        chat_crud.create_message(db, u2.id, u1.id, "Second reply")
        chat_crud.create_message(db, u1.id, u2.id, "Third reaction")

        conversation = chat_crud.get_conversation(db, u1.id, u2.id)

        assert len(conversation) == 3
        assert conversation[0].content == "First message"
        assert conversation[1].content == "Second reply"
        assert conversation[2].content == "Third reaction"

    def test_mark_as_read(self, db):
        u1 = create_test_user(db, "u1_read@example.com")
        u2 = create_test_user(db, "u2_read@example.com")

        chat_crud.create_message(db, u1.id, u2.id, "Unread message")
        
        chat_crud.mark_messages_as_read(db, receiver_id=u2.id, sender_id=u1.id)
        
        conversation = chat_crud.get_conversation(db, u1.id, u2.id)
        assert conversation[0].is_read is True

    def test_get_conversation_limit(self, db):
        u1 = create_test_user(db, "u1_limit@example.com")
        u2 = create_test_user(db, "u2_limit@example.com")

        for i in range(5):
            chat_crud.create_message(db, u1.id, u2.id, f"Message {i}")

        limited_conv = chat_crud.get_conversation(db, u1.id, u2.id, limit=2)
        assert len(limited_conv) == 2