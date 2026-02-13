import uvicorn
from fastapi import FastAPI
from app.core.config import settings
from app.database import engine, Base
from app.api.v1 import auth, users, chat
from fastapi.middleware.cors import CORSMiddleware
import cloudinary

Base.metadata.create_all(bind=engine)

description = """
Spark Dating API helps people find their matches based on location and interests. 🚀

## Features
* **Authentication**: Secure JWT-based login and registration.
* **Discovery**: Find nearby users using Haversine distance.
* **Matching**: Swipe mechanism with real-time match detection.
* **Chat**: Instant messaging via WebSockets.
* **Profiles**: Cloudinary-powered image management.
"""

app = FastAPI(
    title="Spark - Dating App API",
    description=description,
    version="1.0.0",
    contact={
        "name": "Spark Support",
        "url": "http://spark-app.com/support",
        "email": "support@spark-app.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {"name": "Authentication", "description": "Login, Register, and Password Reset operations."},
        {"name": "Users", "description": "Profile management, Discovery, and Swiping."},
        {"name": "chat", "description": "Real-time messaging and conversation history."},
    ]
)

cloudinary.config( 
cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY,
  api_secret = settings.CLOUDINARY_API_SECRET,
  secure = True
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chat.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health Check"])
def read_root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )