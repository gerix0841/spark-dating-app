from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import anthropic
from app.core.config import settings
from app.api.v1.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/support", tags=["Support Bot"])

_MODEL = "claude-haiku-4-5-20251001"
_MAX_TOKENS = 512
_MAX_MESSAGE_LENGTH = 1000
_HISTORY_LIMIT = 10

_SYSTEM_PROMPT = """You are Spark Assistant, the official support bot for the Spark dating app.
You ONLY answer questions related to the Spark app. If the user asks about anything unrelated to Spark, politely decline and redirect them to Spark-related topics.

Here is what you know about Spark:

**About Spark:**
Spark is a location-based dating app that connects people based on proximity and shared interests.

**Key Features:**
- **Discovery**: Browse nearby users with card-based swiping. Swipe right (like) or left (skip). The discovery feed is cached and refreshes periodically.
- **Matching**: When two users both like each other, a match is created. You get a notification when this happens.
- **Chat**: Real-time messaging with your matches via WebSockets. You can see unread message indicators and read receipts.
- **Profile**: Set up your profile with photos (up to several images), bio, interests/tags, and age preferences. Photos are stored securely via Cloudinary.
- **Location**: The app uses your device's GPS to find nearby users. You can update your location at any time.

**Account & Authentication:**
- Register with email and password. Passwords are securely hashed.
- Login returns a JWT token valid for 24 hours (1440 minutes).
- You can change your password from the Profile tab.
- Forgot password flow is available via email reset link.

**Common Issues & Tips:**
- If Discovery shows no users: make sure location access is granted and your profile is complete.
- If chat messages aren't arriving: check your internet connection (the app uses WebSockets for real-time messaging).
- To delete a profile photo: go to Profile tab and click the trash icon on the image.
- Profile changes (bio, interests, age range) are saved immediately on submit.
- Matches can be found in the Matches tab. Click the chat icon on a match to start a conversation.

**Privacy:**
- You can block users from their profile view.
- Blocked users will no longer appear in your discovery feed and cannot message you.

Always be friendly, concise, and helpful. Always respond in English by default. If the user writes in a different language, switch to that language for your reply."""


class Message(BaseModel):
    role: str
    content: str


class SupportRequest(BaseModel):
    message: str
    history: List[Message] = []


class SupportResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=SupportResponse)
async def support_chat(
    request: SupportRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message to the AI support bot and receive a context-aware reply.

    The last HISTORY_LIMIT turns are forwarded to the model to maintain conversation context.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(request.message) > _MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message too long (max {_MAX_MESSAGE_LENGTH} characters)")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    messages = [{"role": m.role, "content": m.content} for m in request.history[-_HISTORY_LIMIT:]]
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            messages=messages,
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return SupportResponse(reply=response.content[0].text)
