from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, Form
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64
import json
import hashlib
import secrets
import aiofiles
from pywebpush import webpush, WebPushException
from py_vapid import Vapid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# VAPID configuration for push notifications
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY_FILE = ROOT_DIR / os.environ.get('VAPID_PRIVATE_KEY_FILE', 'vapid_private.pem')
VAPID_CONTACT = os.environ.get('VAPID_CONTACT', 'mailto:admin@faceconnect.app')

# Load VAPID keys
vapid_instance = None
if VAPID_PRIVATE_KEY_FILE.exists():
    try:
        vapid_instance = Vapid.from_file(str(VAPID_PRIVATE_KEY_FILE))
        logging.info("VAPID keys loaded successfully")
    except Exception as e:
        logging.error(f"Failed to load VAPID keys: {e}")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}  # user_id -> [websockets]
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast_to_conversation(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

manager = ConnectionManager()

# Social Networks List
SOCIAL_NETWORKS = [
    "facebook", "instagram", "tiktok", "snapchat", "x", 
    "linkedin", "discord", "reddit", "pinterest", 
    "youtube", "whatsapp", "telegram"
]

# ============== USER MODELS ==============
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = "Hey, I'm using FaceConnect!"
    created_at: datetime
    is_online: bool = False
    last_seen: Optional[datetime] = None

# ============== CHAT MODELS ==============
class ConversationCreate(BaseModel):
    participant_ids: List[str]
    name: Optional[str] = None  # For group chats
    is_group: bool = False

class ConversationResponse(BaseModel):
    id: str
    participants: List[UserResponse]
    name: Optional[str] = None
    is_group: bool = False
    last_message: Optional[dict] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"  # text, image, video, audio, file
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserResponse] = None
    content: Optional[str] = None
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    read_by: List[str] = []
    created_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool = False

# ============== REELS MODELS ==============
class ReelCreate(BaseModel):
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None

class ReelComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reel_id: str
    user_id: str
    user: Optional[dict] = None
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    likes: List[str] = []  # user_ids who liked this comment

class ReelCommentCreate(BaseModel):
    content: str

class ReelResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[dict] = None
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_liked: bool = False
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============== POST/STORY MODELS ==============
class PostCreate(BaseModel):
    type: str  # 'post' or 'story'
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' or 'video'

class PostResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[dict] = None
    type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    created_at: datetime
    expires_at: Optional[datetime] = None  # For stories
    
    model_config = ConfigDict(from_attributes=True)

# ============== FRIEND REQUEST MODELS ==============
class FriendRequestCreate(BaseModel):
    user_id: str

class FriendRequestResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    from_user: Optional[dict] = None
    to_user: Optional[dict] = None
    status: str  # 'pending', 'accepted', 'declined'
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ============== PERSON MODELS (existing) ==============
class SocialNetwork(BaseModel):
    platform: str
    username: Optional[str] = None
    profile_url: Optional[str] = None
    has_account: bool = False

class PersonBase(BaseModel):
    name: str
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: List[SocialNetwork] = []
    face_descriptor: Optional[List[float]] = None

class PersonCreate(PersonBase):
    pass

class PersonUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: Optional[List[SocialNetwork]] = None
    face_descriptor: Optional[List[float]] = None

class Person(PersonBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    social_count: int = 0

class PersonResponse(BaseModel):
    id: str
    name: str
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: List[SocialNetwork]
    created_at: datetime
    updated_at: datetime
    social_count: int
    face_descriptor: Optional[List[float]] = None

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class NoteMessageCreate(BaseModel):
    content: str

class NoteMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteMessageResponse(BaseModel):
    id: str
    person_id: str
    content: str
    created_at: datetime

# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def count_social_networks(social_networks: List[dict]) -> int:
    return sum(1 for sn in social_networks if sn.get('has_account', False))

async def get_user_by_id(user_id: str) -> Optional[dict]:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if user:
        user['is_online'] = manager.is_online(user_id)
        if not user['is_online'] and 'last_seen' not in user:
            user['last_seen'] = user.get('created_at')
    return user

async def get_user_by_token(token: str) -> Optional[dict]:
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if session:
        return await get_user_by_id(session['user_id'])
    return None

# ============== AUTH ROUTES ==============

# Emergent OAuth session data URL
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

@api_router.post("/auth/google", response_model=dict)
async def google_oauth_callback(session_id: str):
    """Exchange Google OAuth session_id for user data and create local session"""
    try:
        # Call Emergent Auth to get session data
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            oauth_data = response.json()
    except Exception as e:
        logging.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=401, detail="OAuth authentication failed")
    
    email = oauth_data.get("email")
    name = oauth_data.get("name", "")
    picture = oauth_data.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth")
    
    # Check if user exists by email
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        # Update existing user with latest OAuth data
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "display_name": name or existing_user.get("display_name"),
                "avatar": picture or existing_user.get("avatar"),
                "oauth_provider": "google"
            }}
        )
        user_id = existing_user["id"]
        username = existing_user["username"]
    else:
        # Create new user from OAuth data
        user_id = str(uuid.uuid4())
        # Generate unique username from email
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1
        
        user_doc = {
            "id": user_id,
            "username": username,
            "email": email,
            "password_hash": None,  # No password for OAuth users
            "display_name": name or username,
            "avatar": picture,
            "status": "Hey, I'm using FaceConnect!",
            "oauth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session token
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get updated user data
    user = await get_user_by_id(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "email": email,
            "display_name": user.get("display_name"),
            "avatar": user.get("avatar"),
            "status": user.get("status")
        }
    }

@api_router.post("/auth/register", response_model=dict)
async def register_user(user: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"$or": [{"email": user.email}, {"username": user.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password_hash": hash_password(user.password),
        "display_name": user.display_name or user.username,
        "avatar": user.avatar,
        "status": "Hey, I'm using FaceConnect!",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session token
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": user.username,
            "email": user.email,
            "display_name": user_doc["display_name"],
            "avatar": user.avatar,
            "status": user_doc["status"]
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login_user(credentials: UserLogin):
    user = await db.users.find_one({
        "email": credentials.email,
        "password_hash": hash_password(credentials.password)
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session token
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "display_name": user.get('display_name'),
            "avatar": user.get('avatar'),
            "status": user.get('status')
        }
    }

@api_router.post("/auth/logout")
async def logout_user(token: str = Form(...)):
    await db.sessions.delete_one({"token": token})
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user(token: str):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return UserResponse(**user)

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(token: str, update: UserUpdate):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    update_data = update.model_dump(exclude_unset=True)
    if update_data:
        await db.users.update_one({"id": user['id']}, {"$set": update_data})
    
    updated_user = await get_user_by_id(user['id'])
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    
    return UserResponse(**updated_user)

# ============== USERS ROUTES ==============
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(token: str, search: Optional[str] = None):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"id": {"$ne": user['id']}}  # Exclude current user
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"display_name": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    
    result = []
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
        u['is_online'] = manager.is_online(u['id'])
        result.append(UserResponse(**u))
    
    return result

@api_router.get("/users/search")
async def search_users(token: str, q: str):
    """Search for users - must be defined before /users/{user_id} to avoid route conflict"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if len(q) < 2:
        return []
    
    # Search by username or display_name
    users = await db.users.find({
        "$and": [
            {"id": {"$ne": user['id']}},  # Exclude self
            {"$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"display_name": {"$regex": q, "$options": "i"}}
            ]}
        ]
    }, {"_id": 0, "password_hash": 0}).limit(20).to_list(20)
    
    result = []
    for u in users:
        # Check if already friends
        friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": u['id'], "status": "accepted"},
                {"user1_id": u['id'], "user2_id": user['id'], "status": "accepted"}
            ]
        })
        
        # Check if request already sent
        request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": u['id'],
            "status": "pending"
        })
        
        u['is_friend'] = friendship is not None
        u['request_sent'] = request is not None
        u['is_online'] = manager.is_online(u['id'])
        result.append(u)
    
    return result

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, token: str):
    current_user = await get_user_by_token(token)
    if not current_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return UserResponse(**user)

# ============== CONVERSATION ROUTES ==============
@api_router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(token: str, data: ConversationCreate):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Include current user in participants
    participant_ids = list(set([user['id']] + data.participant_ids))
    
    # Check if 1-on-1 conversation already exists
    if not data.is_group and len(participant_ids) == 2:
        existing = await db.conversations.find_one({
            "is_group": False,
            "participant_ids": {"$all": participant_ids, "$size": 2}
        }, {"_id": 0})
        
        if existing:
            # Return existing conversation
            participants = []
            for pid in existing['participant_ids']:
                p = await get_user_by_id(pid)
                if p:
                    if isinstance(p.get('created_at'), str):
                        p['created_at'] = datetime.fromisoformat(p['created_at'])
                    participants.append(UserResponse(**p))
            
            if isinstance(existing.get('created_at'), str):
                existing['created_at'] = datetime.fromisoformat(existing['created_at'])
            if isinstance(existing.get('updated_at'), str):
                existing['updated_at'] = datetime.fromisoformat(existing['updated_at'])
            
            return ConversationResponse(
                id=existing['id'],
                participants=participants,
                name=existing.get('name'),
                is_group=existing.get('is_group', False),
                last_message=existing.get('last_message'),
                unread_count=0,
                created_at=existing['created_at'],
                updated_at=existing['updated_at']
            )
    
    conversation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    conversation_doc = {
        "id": conversation_id,
        "participant_ids": participant_ids,
        "name": data.name,
        "is_group": data.is_group,
        "last_message": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.conversations.insert_one(conversation_doc)
    
    # Get participant details
    participants = []
    for pid in participant_ids:
        p = await get_user_by_id(pid)
        if p:
            if isinstance(p.get('created_at'), str):
                p['created_at'] = datetime.fromisoformat(p['created_at'])
            participants.append(UserResponse(**p))
    
    return ConversationResponse(
        id=conversation_id,
        participants=participants,
        name=data.name,
        is_group=data.is_group,
        last_message=None,
        unread_count=0,
        created_at=now,
        updated_at=now
    )

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(token: str):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conversations = await db.conversations.find(
        {"participant_ids": user['id']},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        participants = []
        for pid in conv['participant_ids']:
            p = await get_user_by_id(pid)
            if p:
                if isinstance(p.get('created_at'), str):
                    p['created_at'] = datetime.fromisoformat(p['created_at'])
                participants.append(UserResponse(**p))
        
        # Count unread messages
        unread = await db.messages.count_documents({
            "conversation_id": conv['id'],
            "sender_id": {"$ne": user['id']},
            "read_by": {"$ne": user['id']}
        })
        
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('updated_at'), str):
            conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
        
        result.append(ConversationResponse(
            id=conv['id'],
            participants=participants,
            name=conv.get('name'),
            is_group=conv.get('is_group', False),
            last_message=conv.get('last_message'),
            unread_count=unread,
            created_at=conv['created_at'],
            updated_at=conv['updated_at']
        ))
    
    return result

@api_router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, token: str):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conv = await db.conversations.find_one(
        {"id": conversation_id, "participant_ids": user['id']},
        {"_id": 0}
    )
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    participants = []
    for pid in conv['participant_ids']:
        p = await get_user_by_id(pid)
        if p:
            if isinstance(p.get('created_at'), str):
                p['created_at'] = datetime.fromisoformat(p['created_at'])
            participants.append(UserResponse(**p))
    
    if isinstance(conv.get('created_at'), str):
        conv['created_at'] = datetime.fromisoformat(conv['created_at'])
    if isinstance(conv.get('updated_at'), str):
        conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
    
    return ConversationResponse(
        id=conv['id'],
        participants=participants,
        name=conv.get('name'),
        is_group=conv.get('is_group', False),
        last_message=conv.get('last_message'),
        unread_count=0,
        created_at=conv['created_at'],
        updated_at=conv['updated_at']
    )

# ============== MESSAGE ROUTES ==============
@api_router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(conversation_id: str, token: str, message: MessageCreate):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of conversation
    conv = await db.conversations.find_one(
        {"id": conversation_id, "participant_ids": user['id']},
        {"_id": 0}
    )
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    message_doc = {
        "id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user['id'],
        "content": message.content,
        "message_type": message.message_type,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "file_size": message.file_size,
        "reply_to": message.reply_to,
        "read_by": [user['id']],
        "created_at": now.isoformat(),
        "edited_at": None,
        "is_deleted": False
    }
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation last message
    last_message = {
        "id": message_id,
        "content": message.content,
        "message_type": message.message_type,
        "sender_id": user['id'],
        "created_at": now.isoformat()
    }
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message": last_message, "updated_at": now.isoformat()}}
    )
    
    # Get sender info
    sender = await get_user_by_id(user['id'])
    if isinstance(sender.get('created_at'), str):
        sender['created_at'] = datetime.fromisoformat(sender['created_at'])
    
    response = MessageResponse(
        id=message_id,
        conversation_id=conversation_id,
        sender_id=user['id'],
        sender=UserResponse(**sender) if sender else None,
        content=message.content,
        message_type=message.message_type,
        file_url=message.file_url,
        file_name=message.file_name,
        file_size=message.file_size,
        reply_to=message.reply_to,
        read_by=[user['id']],
        created_at=now
    )
    
    # Send via WebSocket to all participants
    ws_message = {
        "type": "new_message",
        "conversation_id": conversation_id,
        "message": response.model_dump(mode='json')
    }
    
    await manager.broadcast_to_conversation(ws_message, conv['participant_ids'])
    
    # Send push notifications to offline participants
    sender_name = user.get('display_name') or user.get('username', 'Someone')
    for participant_id in conv['participant_ids']:
        if participant_id != user['id'] and not manager.is_online(participant_id):
            # User is offline, send push notification
            notification_body = message.content if message.message_type == "text" else f"Sent a {message.message_type}"
            await send_push_notification(
                user_id=participant_id,
                title=f"New message from {sender_name}",
                body=notification_body[:100],  # Truncate long messages
                data={
                    "type": "chat_message",
                    "conversation_id": conversation_id,
                    "message_id": message_id
                }
            )
    
    return response

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(conversation_id: str, token: str, limit: int = 50, before: Optional[str] = None):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of conversation
    conv = await db.conversations.find_one(
        {"id": conversation_id, "participant_ids": user['id']},
        {"_id": 0}
    )
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    query = {"conversation_id": conversation_id, "is_deleted": False}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Return in chronological order
    
    result = []
    for msg in messages:
        sender = await get_user_by_id(msg['sender_id'])
        if sender and isinstance(sender.get('created_at'), str):
            sender['created_at'] = datetime.fromisoformat(sender['created_at'])
        
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        if isinstance(msg.get('edited_at'), str):
            msg['edited_at'] = datetime.fromisoformat(msg['edited_at'])
        
        result.append(MessageResponse(
            id=msg['id'],
            conversation_id=msg['conversation_id'],
            sender_id=msg['sender_id'],
            sender=UserResponse(**sender) if sender else None,
            content=msg.get('content'),
            message_type=msg.get('message_type', 'text'),
            file_url=msg.get('file_url'),
            file_name=msg.get('file_name'),
            file_size=msg.get('file_size'),
            reply_to=msg.get('reply_to'),
            read_by=msg.get('read_by', []),
            created_at=msg['created_at'],
            edited_at=msg.get('edited_at'),
            is_deleted=msg.get('is_deleted', False)
        ))
    
    # Mark messages as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user['id']},
            "read_by": {"$ne": user['id']}
        },
        {"$addToSet": {"read_by": user['id']}}
    )
    
    return result

@api_router.post("/conversations/{conversation_id}/read")
async def mark_as_read(conversation_id: str, token: str):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user['id']},
            "read_by": {"$ne": user['id']}
        },
        {"$addToSet": {"read_by": user['id']}}
    )
    
    return {"message": "Messages marked as read"}

# ============== FILE UPLOAD ROUTES ==============
@api_router.post("/upload")
async def upload_file(token: str = Form(...), file: UploadFile = File(...)):
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate file size (50MB max)
    MAX_SIZE = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix if file.filename else ''
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    
    # Save file
    file_path = UPLOAD_DIR / filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Determine file type
    content_type = file.content_type or 'application/octet-stream'
    if content_type.startswith('image/'):
        file_type = 'image'
    elif content_type.startswith('video/'):
        file_type = 'video'
    elif content_type.startswith('audio/'):
        file_type = 'audio'
    else:
        file_type = 'file'
    
    return {
        "file_url": f"/api/files/{filename}",
        "file_name": file.filename,
        "file_size": len(content),
        "file_type": file_type,
        "content_type": content_type
    }

@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# ============== PUSH NOTIFICATION ROUTES ==============
class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

class PushSubscriptionCreate(BaseModel):
    subscription: PushSubscription

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for push notification subscription"""
    return {"publicKey": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def subscribe_push(token: str, data: PushSubscriptionCreate):
    """Subscribe to push notifications"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    subscription_info = {
        "endpoint": data.subscription.endpoint,
        "keys": data.subscription.keys
    }
    
    # Store subscription in database (upsert)
    await db.push_subscriptions.update_one(
        {"user_id": user['id'], "endpoint": data.subscription.endpoint},
        {
            "$set": {
                "user_id": user['id'],
                "subscription": subscription_info,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Subscribed to push notifications"}

@api_router.delete("/push/unsubscribe")
async def unsubscribe_push(token: str, endpoint: str):
    """Unsubscribe from push notifications"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.push_subscriptions.delete_one({
        "user_id": user['id'],
        "endpoint": endpoint
    })
    
    return {"message": "Unsubscribed from push notifications"}

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to a user's subscribed devices"""
    if not vapid_instance:
        logging.warning("VAPID not configured, skipping push notification")
        return
    
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    for sub in subscriptions:
        try:
            subscription_info = sub['subscription']
            payload = json.dumps({
                "title": title,
                "body": body,
                "icon": "/icons/icon-192x192.png",
                "badge": "/icons/icon-72x72.png",
                "data": data or {}
            })
            
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=str(VAPID_PRIVATE_KEY_FILE),
                vapid_claims={
                    "sub": VAPID_CONTACT
                }
            )
            logging.info(f"Push notification sent to user {user_id}")
        except WebPushException as e:
            logging.error(f"Push notification failed: {e}")
            # If subscription is invalid, remove it
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({
                    "user_id": user_id,
                    "endpoint": subscription_info['endpoint']
                })
        except Exception as e:
            logging.error(f"Push notification error: {e}")

# ============== REELS ENDPOINTS ==============
@api_router.post("/reels", response_model=ReelResponse)
async def create_reel(token: str, reel: ReelCreate):
    """Create a new reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    reel_doc = {
        "id": reel_id,
        "user_id": user['id'],
        "caption": reel.caption,
        "video_url": reel.video_url,
        "thumbnail_url": reel.thumbnail_url,
        "duration": reel.duration,
        "likes": [],
        "comments_count": 0,
        "shares_count": 0,
        "created_at": now.isoformat()
    }
    
    await db.reels.insert_one(reel_doc)
    
    return ReelResponse(
        id=reel_id,
        user_id=user['id'],
        user={"id": user['id'], "username": user.get('username'), "display_name": user.get('display_name'), "avatar": user.get('avatar')},
        caption=reel.caption,
        video_url=reel.video_url,
        thumbnail_url=reel.thumbnail_url,
        duration=reel.duration,
        likes_count=0,
        comments_count=0,
        shares_count=0,
        is_liked=False,
        created_at=now
    )

@api_router.get("/reels", response_model=List[ReelResponse])
async def get_reels(token: str, skip: int = 0, limit: int = 20):
    """Get reels feed"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reels = await db.reels.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for reel in reels:
        # Get reel author info
        author = await get_user_by_id(reel['user_id'])
        
        # Check if current user liked this reel
        is_liked = user['id'] in reel.get('likes', [])
        
        # Parse created_at
        created_at = reel.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ReelResponse(
            id=reel['id'],
            user_id=reel['user_id'],
            user={"id": author['id'], "username": author.get('username'), "display_name": author.get('display_name'), "avatar": author.get('avatar')} if author else None,
            caption=reel.get('caption'),
            video_url=reel['video_url'],
            thumbnail_url=reel.get('thumbnail_url'),
            duration=reel.get('duration'),
            likes_count=len(reel.get('likes', [])),
            comments_count=reel.get('comments_count', 0),
            shares_count=reel.get('shares_count', 0),
            is_liked=is_liked,
            created_at=created_at
        ))
    
    return result

@api_router.get("/reels/{reel_id}", response_model=ReelResponse)
async def get_reel(reel_id: str, token: str):
    """Get a single reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    author = await get_user_by_id(reel['user_id'])
    is_liked = user['id'] in reel.get('likes', [])
    
    created_at = reel.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return ReelResponse(
        id=reel['id'],
        user_id=reel['user_id'],
        user={"id": author['id'], "username": author.get('username'), "display_name": author.get('display_name'), "avatar": author.get('avatar')} if author else None,
        caption=reel.get('caption'),
        video_url=reel['video_url'],
        thumbnail_url=reel.get('thumbnail_url'),
        duration=reel.get('duration'),
        likes_count=len(reel.get('likes', [])),
        comments_count=reel.get('comments_count', 0),
        shares_count=reel.get('shares_count', 0),
        is_liked=is_liked,
        created_at=created_at
    )

@api_router.post("/reels/{reel_id}/like")
async def toggle_like_reel(reel_id: str, token: str):
    """Like or unlike a reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    likes = reel.get('likes', [])
    is_liked = user['id'] in likes
    
    if is_liked:
        # Unlike
        await db.reels.update_one(
            {"id": reel_id},
            {"$pull": {"likes": user['id']}}
        )
        return {"liked": False, "likes_count": len(likes) - 1}
    else:
        # Like
        await db.reels.update_one(
            {"id": reel_id},
            {"$addToSet": {"likes": user['id']}}
        )
        return {"liked": True, "likes_count": len(likes) + 1}

@api_router.get("/reels/{reel_id}/comments")
async def get_reel_comments(reel_id: str, token: str, skip: int = 0, limit: int = 50):
    """Get comments for a reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    comments = await db.reel_comments.find(
        {"reel_id": reel_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for comment in comments:
        author = await get_user_by_id(comment['user_id'])
        
        created_at = comment.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append({
            "id": comment['id'],
            "reel_id": comment['reel_id'],
            "user_id": comment['user_id'],
            "user": {"id": author['id'], "username": author.get('username'), "display_name": author.get('display_name'), "avatar": author.get('avatar')} if author else None,
            "content": comment['content'],
            "likes_count": len(comment.get('likes', [])),
            "is_liked": user['id'] in comment.get('likes', []),
            "created_at": created_at
        })
    
    return result

@api_router.post("/reels/{reel_id}/comments")
async def add_reel_comment(reel_id: str, token: str, comment: ReelCommentCreate):
    """Add a comment to a reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    comment_doc = {
        "id": comment_id,
        "reel_id": reel_id,
        "user_id": user['id'],
        "content": comment.content,
        "likes": [],
        "created_at": now.isoformat()
    }
    
    await db.reel_comments.insert_one(comment_doc)
    
    # Update comments count on reel
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return {
        "id": comment_id,
        "reel_id": reel_id,
        "user_id": user['id'],
        "user": {"id": user['id'], "username": user.get('username'), "display_name": user.get('display_name'), "avatar": user.get('avatar')},
        "content": comment.content,
        "likes_count": 0,
        "is_liked": False,
        "created_at": now
    }

@api_router.delete("/reels/{reel_id}/comments/{comment_id}")
async def delete_reel_comment(reel_id: str, comment_id: str, token: str):
    """Delete a comment"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    comment = await db.reel_comments.find_one({"id": comment_id, "reel_id": reel_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.reel_comments.delete_one({"id": comment_id})
    
    # Update comments count
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}

@api_router.post("/reels/{reel_id}/comments/{comment_id}/like")
async def toggle_like_comment(reel_id: str, comment_id: str, token: str):
    """Like or unlike a comment"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    comment = await db.reel_comments.find_one({"id": comment_id, "reel_id": reel_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    likes = comment.get('likes', [])
    is_liked = user['id'] in likes
    
    if is_liked:
        await db.reel_comments.update_one(
            {"id": comment_id},
            {"$pull": {"likes": user['id']}}
        )
        return {"liked": False, "likes_count": len(likes) - 1}
    else:
        await db.reel_comments.update_one(
            {"id": comment_id},
            {"$addToSet": {"likes": user['id']}}
        )
        return {"liked": True, "likes_count": len(likes) + 1}

@api_router.post("/reels/{reel_id}/share")
async def share_reel(reel_id: str, token: str):
    """Increment share count for a reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"shares_count": 1}}
    )
    
    return {"shares_count": reel.get('shares_count', 0) + 1}

@api_router.delete("/reels/{reel_id}")
async def delete_reel(reel_id: str, token: str):
    """Delete a reel"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    if reel['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this reel")
    
    # Delete reel and its comments
    await db.reels.delete_one({"id": reel_id})
    await db.reel_comments.delete_many({"reel_id": reel_id})
    
    return {"message": "Reel deleted"}

# ============== POSTS/STORIES ENDPOINTS ==============
@api_router.post("/posts", response_model=PostResponse)
async def create_post(token: str, post: PostCreate):
    """Create a new post or story"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Stories expire after 24 hours
    expires_at = None
    if post.type == "story":
        expires_at = (now + timedelta(hours=24)).isoformat()
    
    post_doc = {
        "id": post_id,
        "user_id": user['id'],
        "type": post.type,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "likes": [],
        "comments_count": 0,
        "views": [],
        "created_at": now.isoformat(),
        "expires_at": expires_at
    }
    
    await db.posts.insert_one(post_doc)
    
    # Broadcast new post via WebSocket to all connected users
    broadcast_msg = {
        "type": "new_post",
        "post": {
            "id": post_id,
            "user_id": user['id'],
            "username": user.get('username'),
            "display_name": user.get('display_name'),
            "avatar": user.get('avatar'),
            "type": post.type,
            "content": post.content,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "likes_count": 0,
            "comments_count": 0,
            "created_at": now.isoformat()
        }
    }
    # Broadcast to all online users
    for user_id in list(manager.active_connections.keys()):
        await manager.send_personal_message(broadcast_msg, user_id)
    
    return PostResponse(
        id=post_id,
        user_id=user['id'],
        user={"id": user['id'], "username": user.get('username'), "display_name": user.get('display_name'), "avatar": user.get('avatar')},
        type=post.type,
        content=post.content,
        media_url=post.media_url,
        media_type=post.media_type,
        likes_count=0,
        comments_count=0,
        is_liked=False,
        created_at=now,
        expires_at=datetime.fromisoformat(expires_at) if expires_at else None
    )

@api_router.get("/posts")
async def get_posts(token: str, type: str = None, skip: int = 0, limit: int = 20):
    """Get posts feed"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {}
    if type:
        query["type"] = type
    
    # For stories, only show non-expired ones
    if type == "story":
        query["$or"] = [
            {"expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}},
            {"expires_at": None}
        ]
    
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        author = await get_user_by_id(post['user_id'])
        is_liked = user['id'] in post.get('likes', [])
        
        created_at = post.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        expires_at = post.get('expires_at')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        
        result.append({
            "id": post['id'],
            "user_id": post['user_id'],
            "user": {"id": author['id'], "username": author.get('username'), "display_name": author.get('display_name'), "avatar": author.get('avatar')} if author else None,
            "type": post['type'],
            "content": post.get('content'),
            "media_url": post.get('media_url'),
            "media_type": post.get('media_type'),
            "likes_count": len(post.get('likes', [])),
            "comments_count": post.get('comments_count', 0),
            "is_liked": is_liked,
            "created_at": created_at,
            "expires_at": expires_at
        })
    
    return result

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, token: str):
    """Like or unlike a post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get('likes', [])
    liked = user['id'] not in likes
    new_count = len(likes) + 1 if liked else len(likes) - 1
    
    if user['id'] in likes:
        # Unlike
        await db.posts.update_one(
            {"id": post_id},
            {"$pull": {"likes": user['id']}}
        )
    else:
        # Like
        await db.posts.update_one(
            {"id": post_id},
            {"$addToSet": {"likes": user['id']}}
        )
    
    # Broadcast like update via WebSocket
    broadcast_msg = {
        "type": "post_liked",
        "post_id": post_id,
        "liked_by": user['id'],
        "liked": liked,
        "likes_count": new_count
    }
    for uid in list(manager.active_connections.keys()):
        await manager.send_personal_message(broadcast_msg, uid)
    
    return {"liked": liked, "likes_count": new_count}

@api_router.post("/posts/{post_id}/comment")
async def comment_on_post(post_id: str, token: str, content: str = None):
    """Add a comment to a post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get content from body if not in query
    if content is None:
        raise HTTPException(status_code=400, detail="Comment content required")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "username": user.get('display_name', user.get('username')),
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.update_one(
        {"id": post_id},
        {
            "$push": {"comments": comment},
            "$inc": {"comments_count": 1}
        }
    )
    
    return comment

@api_router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, token: str):
    """Get comments for a post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "comments": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return post.get('comments', [])


# ============== UNIFIED FEED ENDPOINTS ==============
@api_router.get("/feed/home")
async def get_home_feed(token: str):
    """Get unified home feed with stories, highlighted posts, reels preview, and regular posts"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    now = datetime.now(timezone.utc)
    
    # Get stories (non-expired)
    stories_query = {
        "type": "story",
        "$or": [
            {"expires_at": {"$gt": now.isoformat()}},
            {"expires_at": None}
        ]
    }
    stories_raw = await db.posts.find(stories_query, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    stories = []
    for story in stories_raw:
        author = await get_user_by_id(story['user_id'])
        created_at = story.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        stories.append({
            "id": story['id'],
            "user_id": story['user_id'],
            "username": author.get('username') if author else None,
            "display_name": author.get('display_name') if author else None,
            "avatar": author.get('avatar') if author else None,
            "media_url": story.get('media_url'),
            "media_type": story.get('media_type'),
            "content": story.get('content'),
            "created_at": created_at.isoformat() if created_at else None,
            "viewed": user['id'] in story.get('views', [])
        })
    
    # Get highlighted posts (most liked in last 7 days)
    week_ago = (now - timedelta(days=7)).isoformat()
    highlighted_posts_raw = await db.posts.find(
        {"type": "post", "created_at": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    # Sort by likes count and take top 5
    highlighted_posts_raw.sort(key=lambda x: len(x.get('likes', [])), reverse=True)
    highlighted_posts_raw = highlighted_posts_raw[:5]
    
    highlighted_posts = []
    for post in highlighted_posts_raw:
        if len(post.get('likes', [])) >= 1:  # At least 1 like to be highlighted
            author = await get_user_by_id(post['user_id'])
            created_at = post.get('created_at')
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            highlighted_posts.append({
                "id": post['id'],
                "user_id": post['user_id'],
                "username": author.get('username') if author else None,
                "display_name": author.get('display_name') if author else None,
                "avatar": author.get('avatar') if author else None,
                "content": post.get('content'),
                "media_url": post.get('media_url'),
                "media_type": post.get('media_type'),
                "likes_count": len(post.get('likes', [])),
                "comments_count": post.get('comments_count', 0),
                "is_liked": user['id'] in post.get('likes', []),
                "created_at": created_at.isoformat() if created_at else None,
                "is_highlighted": True
            })
    
    # Get reels preview (latest 10)
    reels_raw = await db.reels.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    reels_preview = []
    for reel in reels_raw:
        author = await get_user_by_id(reel['user_id'])
        created_at = reel.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        reels_preview.append({
            "id": reel['id'],
            "user_id": reel['user_id'],
            "username": author.get('username') if author else None,
            "display_name": author.get('display_name') if author else None,
            "thumbnail_url": reel.get('thumbnail_url'),
            "video_url": reel.get('video_url'),
            "caption": reel.get('caption'),
            "likes_count": reel.get('likes_count', 0),
            "views_count": reel.get('views_count', 0),
            "created_at": created_at.isoformat() if created_at else None
        })
    
    # Get regular posts (latest 20)
    posts_raw = await db.posts.find({"type": "post"}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    posts = []
    for post in posts_raw:
        author = await get_user_by_id(post['user_id'])
        created_at = post.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        posts.append({
            "id": post['id'],
            "user_id": post['user_id'],
            "username": author.get('username') if author else None,
            "display_name": author.get('display_name') if author else None,
            "avatar": author.get('avatar') if author else None,
            "content": post.get('content'),
            "media_url": post.get('media_url'),
            "media_type": post.get('media_type'),
            "likes_count": len(post.get('likes', [])),
            "comments_count": post.get('comments_count', 0),
            "comments": post.get('comments', [])[-3:],  # Last 3 comments
            "is_liked": user['id'] in post.get('likes', []),
            "created_at": created_at.isoformat() if created_at else None
        })
    
    return {
        "stories": stories,
        "highlighted_posts": highlighted_posts,
        "reels_preview": reels_preview,
        "posts": posts
    }

@api_router.post("/posts/{post_id}/view")
async def view_post(post_id: str, token: str):
    """Mark a post/story as viewed"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.posts.update_one(
        {"id": post_id},
        {"$addToSet": {"views": user['id']}}
    )
    return {"success": True}



# ============== FRIENDS ENDPOINTS ==============
@api_router.get("/friends")
async def get_friends(token: str):
    """Get user's friends list"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get accepted friend relationships
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": user['id'], "status": "accepted"},
            {"user2_id": user['id'], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friends = []
    for f in friendships:
        friend_id = f['user2_id'] if f['user1_id'] == user['id'] else f['user1_id']
        friend = await get_user_by_id(friend_id)
        if friend:
            friends.append(friend)
    
    return friends

@api_router.get("/friends/requests")
async def get_friend_requests(token: str):
    """Get pending friend requests received"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    requests = await db.friend_requests.find({
        "to_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for req in requests:
        from_user = await get_user_by_id(req['from_user_id'])
        result.append({
            "id": req['id'],
            "from_user_id": req['from_user_id'],
            "to_user_id": req['to_user_id'],
            "from_user": from_user,
            "status": req['status'],
            "created_at": req['created_at']
        })
    
    return result

@api_router.get("/friends/sent")
async def get_sent_requests(token: str):
    """Get friend requests sent by user"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    requests = await db.friend_requests.find({
        "from_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for req in requests:
        to_user = await get_user_by_id(req['to_user_id'])
        result.append({
            "id": req['id'],
            "from_user_id": req['from_user_id'],
            "to_user_id": req['to_user_id'],
            "to_user": to_user,
            "status": req['status'],
            "created_at": req['created_at']
        })
    
    return result

@api_router.post("/friends/request")
async def send_friend_request(token: str, request: FriendRequestCreate):
    """Send a friend request"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if request.user_id == user['id']:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    target_user = await get_user_by_id(request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    existing = await db.friendships.find_one({
        "$or": [
            {"user1_id": user['id'], "user2_id": request.user_id},
            {"user1_id": request.user_id, "user2_id": user['id']}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "from_user_id": user['id'],
        "to_user_id": request.user_id,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already sent")
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    await db.friend_requests.insert_one({
        "id": request_id,
        "from_user_id": user['id'],
        "to_user_id": request.user_id,
        "status": "pending",
        "created_at": now.isoformat()
    })
    
    return {"id": request_id, "message": "Friend request sent"}

class AcceptRequest(BaseModel):
    request_id: str

@api_router.post("/friends/accept")
async def accept_friend_request(token: str, data: AcceptRequest):
    """Accept a friend request"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    request = await db.friend_requests.find_one({
        "id": data.request_id,
        "to_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Update request status
    await db.friend_requests.update_one(
        {"id": data.request_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Create friendship
    friendship_id = str(uuid.uuid4())
    await db.friendships.insert_one({
        "id": friendship_id,
        "user1_id": request['from_user_id'],
        "user2_id": user['id'],
        "status": "accepted",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Friend request accepted"}

class DeclineRequest(BaseModel):
    request_id: str

@api_router.post("/friends/decline")
async def decline_friend_request(token: str, data: DeclineRequest):
    """Decline a friend request"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friend_requests.update_one(
        {"id": data.request_id, "to_user_id": user['id'], "status": "pending"},
        {"$set": {"status": "declined"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Friend request declined"}

@api_router.delete("/friends/request/{request_id}")
async def cancel_friend_request(request_id: str, token: str):
    """Cancel a sent friend request"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friend_requests.delete_one({
        "id": request_id,
        "from_user_id": user['id'],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request cancelled"}

@api_router.delete("/friends/{friend_id}")
async def remove_friend(friend_id: str, token: str):
    """Remove a friend"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friendships.delete_one({
        "$or": [
            {"user1_id": user['id'], "user2_id": friend_id},
            {"user1_id": friend_id, "user2_id": user['id']}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    return {"message": "Friend removed"}

# ============== WEBSOCKET ENDPOINT ==============
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_user_by_token(token)
    if not user:
        await websocket.close(code=4001)
        return
    
    user_id = user['id']
    await manager.connect(websocket, user_id)
    
    # Notify others that user is online
    conversations = await db.conversations.find(
        {"participant_ids": user_id},
        {"_id": 0, "participant_ids": 1}
    ).to_list(100)
    
    all_contacts = set()
    for conv in conversations:
        all_contacts.update(conv['participant_ids'])
    all_contacts.discard(user_id)
    
    for contact_id in all_contacts:
        await manager.send_personal_message(
            {"type": "user_online", "user_id": user_id},
            contact_id
        )
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle typing indicator
            if data.get('type') == 'typing':
                conv = await db.conversations.find_one(
                    {"id": data.get('conversation_id'), "participant_ids": user_id},
                    {"_id": 0, "participant_ids": 1}
                )
                if conv:
                    for pid in conv['participant_ids']:
                        if pid != user_id:
                            await manager.send_personal_message(
                                {
                                    "type": "typing",
                                    "conversation_id": data.get('conversation_id'),
                                    "user_id": user_id,
                                    "is_typing": data.get('is_typing', False)
                                },
                                pid
                            )
            
            # Handle read receipt
            elif data.get('type') == 'read':
                conv = await db.conversations.find_one(
                    {"id": data.get('conversation_id'), "participant_ids": user_id},
                    {"_id": 0, "participant_ids": 1}
                )
                if conv:
                    for pid in conv['participant_ids']:
                        if pid != user_id:
                            await manager.send_personal_message(
                                {
                                    "type": "read",
                                    "conversation_id": data.get('conversation_id'),
                                    "user_id": user_id
                                },
                                pid
                            )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        
        # Save last_seen timestamp
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Notify others that user is offline
        for contact_id in all_contacts:
            await manager.send_personal_message(
                {"type": "user_offline", "user_id": user_id, "last_seen": datetime.now(timezone.utc).isoformat()},
                contact_id
            )

# ============== EXISTING PERSON ROUTES ==============
@api_router.get("/")
async def root():
    return {"message": "Facial Recognition Social Tracker API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

@api_router.post("/persons", response_model=PersonResponse)
async def create_person(person: PersonCreate):
    person_dict = person.model_dump()
    person_obj = Person(**person_dict)
    person_obj.social_count = count_social_networks(person_dict.get('social_networks', []))
    
    doc = person_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.persons.insert_one(doc)
    
    return PersonResponse(**person_obj.model_dump())

@api_router.get("/persons", response_model=List[PersonResponse])
async def get_persons():
    persons = await db.persons.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for person in persons:
        if isinstance(person.get('created_at'), str):
            person['created_at'] = datetime.fromisoformat(person['created_at'])
        if isinstance(person.get('updated_at'), str):
            person['updated_at'] = datetime.fromisoformat(person['updated_at'])
        person['social_count'] = count_social_networks(person.get('social_networks', []))
        result.append(PersonResponse(**person))
    
    return result

@api_router.get("/persons/{person_id}", response_model=PersonResponse)
async def get_person(person_id: str):
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    if isinstance(person.get('created_at'), str):
        person['created_at'] = datetime.fromisoformat(person['created_at'])
    if isinstance(person.get('updated_at'), str):
        person['updated_at'] = datetime.fromisoformat(person['updated_at'])
    person['social_count'] = count_social_networks(person.get('social_networks', []))
    
    return PersonResponse(**person)

@api_router.put("/persons/{person_id}", response_model=PersonResponse)
async def update_person(person_id: str, person_update: PersonUpdate):
    existing = await db.persons.find_one({"id": person_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Person not found")
    
    update_data = person_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if 'social_networks' in update_data:
        update_data['social_count'] = count_social_networks(update_data['social_networks'])
    
    await db.persons.update_one({"id": person_id}, {"$set": update_data})
    
    updated = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    updated['social_count'] = count_social_networks(updated.get('social_networks', []))
    
    return PersonResponse(**updated)

@api_router.delete("/persons/{person_id}")
async def delete_person(person_id: str):
    result = await db.persons.delete_one({"id": person_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    
    await db.person_notes.delete_many({"person_id": person_id})
    
    return {"message": "Person deleted successfully"}

# Person notes routes
@api_router.post("/persons/{person_id}/messages", response_model=NoteMessageResponse)
async def create_person_note(person_id: str, message: NoteMessageCreate):
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    message_obj = NoteMessage(person_id=person_id, content=message.content)
    
    doc = message_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.person_notes.insert_one(doc)
    
    return NoteMessageResponse(**message_obj.model_dump())

@api_router.get("/persons/{person_id}/messages", response_model=List[NoteMessageResponse])
async def get_person_notes(person_id: str):
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    messages = await db.person_notes.find(
        {"person_id": person_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    result = []
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        result.append(NoteMessageResponse(**msg))
    
    return result

@api_router.delete("/persons/{person_id}/messages/{message_id}")
async def delete_person_note(person_id: str, message_id: str):
    result = await db.person_notes.delete_one({"id": message_id, "person_id": person_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted successfully"}

# Face matching
class FaceMatchRequest(BaseModel):
    face_descriptor: List[float]
    threshold: float = 0.6

class FaceMatchResult(BaseModel):
    person_id: str
    name: str
    photo_data: Optional[str]
    distance: float
    confidence: float

@api_router.post("/face-match", response_model=List[FaceMatchResult])
async def match_face(request: FaceMatchRequest):
    import math
    
    persons = await db.persons.find(
        {"face_descriptor": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "photo_data": 1, "face_descriptor": 1}
    ).to_list(1000)
    
    matches = []
    
    for person in persons:
        stored_descriptor = person.get('face_descriptor')
        if not stored_descriptor:
            continue
        
        distance = math.sqrt(sum(
            (a - b) ** 2 
            for a, b in zip(request.face_descriptor, stored_descriptor)
        ))
        
        confidence = max(0, 1 - (distance / 1.5))
        
        if distance <= request.threshold:
            matches.append(FaceMatchResult(
                person_id=person['id'],
                name=person['name'],
                photo_data=person.get('photo_data'),
                distance=round(distance, 4),
                confidence=round(confidence * 100, 1)
            ))
    
    matches.sort(key=lambda x: x.distance)
    
    return matches[:10]

# ============== LIVE STREAMING ROUTES ==============
class CreateStreamRequest(BaseModel):
    title: str
    description: Optional[str] = None

class StreamGiftRequest(BaseModel):
    gift_type: str  # heart, star, diamond, fire, rocket
    quantity: int = 1

class StreamReactionRequest(BaseModel):
    reaction_type: str  # heart, fire, clap, laugh, wow

class StreamChatRequest(BaseModel):
    message: str

@api_router.post("/streams")
async def create_stream(request: CreateStreamRequest, token: str):
    """Create a new live stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream_id = str(uuid.uuid4())
    stream = {
        "id": stream_id,
        "user_id": user['id'],
        "username": user['username'],
        "display_name": user.get('display_name', user['username']),
        "avatar_url": user.get('avatar_url'),
        "title": request.title,
        "description": request.description,
        "status": "live",  # live, ended
        "viewer_count": 0,
        "viewers": [],
        "total_views": 0,
        "reactions": {"heart": 0, "fire": 0, "clap": 0, "laugh": 0, "wow": 0},
        "gifts": [],
        "total_gifts": 0,
        "chat_messages": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "is_screen_sharing": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.streams.insert_one(stream)
    
    # Notify friends about the live stream
    friends = await db.friendships.find({
        "$or": [
            {"user1_id": user['id'], "status": "accepted"},
            {"user2_id": user['id'], "status": "accepted"}
        ]
    }).to_list(100)
    
    for friendship in friends:
        friend_id = friendship['user2_id'] if friendship['user1_id'] == user['id'] else friendship['user1_id']
        await manager.send_to_user(friend_id, {
            "type": "live_started",
            "stream_id": stream_id,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "display_name": user.get('display_name'),
                "avatar_url": user.get('avatar_url')
            },
            "title": request.title
        })
    
    return {"id": stream_id, "status": "live", "message": "Stream started successfully"}

@api_router.get("/streams")
async def get_live_streams(token: str):
    """Get all active live streams"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    streams = await db.streams.find(
        {"status": "live"},
        {"_id": 0, "chat_messages": 0}
    ).sort("started_at", -1).to_list(50)
    
    return streams

@api_router.get("/streams/{stream_id}")
async def get_stream(stream_id: str, token: str):
    """Get stream details"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Only return last 50 chat messages
    if 'chat_messages' in stream:
        stream['chat_messages'] = stream['chat_messages'][-50:]
    
    return stream

@api_router.post("/streams/{stream_id}/join")
async def join_stream(stream_id: str, token: str):
    """Join a live stream as a viewer"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream['status'] != 'live':
        raise HTTPException(status_code=400, detail="Stream has ended")
    
    # Add viewer if not already viewing
    if user['id'] not in stream.get('viewers', []):
        await db.streams.update_one(
            {"id": stream_id},
            {
                "$addToSet": {"viewers": user['id']},
                "$inc": {"viewer_count": 1, "total_views": 1}
            }
        )
    
    # Notify streamer
    await manager.send_to_user(stream['user_id'], {
        "type": "viewer_joined",
        "stream_id": stream_id,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "display_name": user.get('display_name'),
            "avatar_url": user.get('avatar_url')
        }
    })
    
    return {"status": "joined", "viewer_count": stream['viewer_count'] + 1}

@api_router.post("/streams/{stream_id}/leave")
async def leave_stream(stream_id: str, token: str):
    """Leave a live stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.streams.update_one(
        {"id": stream_id, "viewers": user['id']},
        {
            "$pull": {"viewers": user['id']},
            "$inc": {"viewer_count": -1}
        }
    )
    
    return {"status": "left"}

@api_router.post("/streams/{stream_id}/end")
async def end_stream(stream_id: str, token: str):
    """End a live stream (streamer only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the streamer can end the stream")
    
    await db.streams.update_one(
        {"id": stream_id},
        {
            "$set": {
                "status": "ended",
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "viewer_count": 0,
                "viewers": []
            }
        }
    )
    
    # Notify all viewers that stream ended
    for viewer_id in stream.get('viewers', []):
        await manager.send_to_user(viewer_id, {
            "type": "stream_ended",
            "stream_id": stream_id
        })
    
    return {"status": "ended", "total_views": stream['total_views'], "total_gifts": stream['total_gifts']}

@api_router.post("/streams/{stream_id}/react")
async def react_to_stream(stream_id: str, request: StreamReactionRequest, token: str):
    """Add a reaction to a stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    valid_reactions = ["heart", "fire", "clap", "laugh", "wow"]
    if request.reaction_type not in valid_reactions:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream or stream['status'] != 'live':
        raise HTTPException(status_code=404, detail="Stream not found or ended")
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$inc": {f"reactions.{request.reaction_type}": 1}}
    )
    
    # Broadcast reaction to all viewers
    await manager.send_to_user(stream['user_id'], {
        "type": "stream_reaction",
        "stream_id": stream_id,
        "reaction": request.reaction_type,
        "from_user": user.get('display_name', user['username'])
    })
    
    return {"status": "reaction_sent"}

@api_router.post("/streams/{stream_id}/gift")
async def send_gift(stream_id: str, request: StreamGiftRequest, token: str):
    """Send a virtual gift to a streamer"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    gift_values = {"heart": 1, "star": 5, "diamond": 20, "fire": 10, "rocket": 50}
    if request.gift_type not in gift_values:
        raise HTTPException(status_code=400, detail="Invalid gift type")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream or stream['status'] != 'live':
        raise HTTPException(status_code=404, detail="Stream not found or ended")
    
    gift = {
        "id": str(uuid.uuid4()),
        "from_user_id": user['id'],
        "from_username": user.get('display_name', user['username']),
        "gift_type": request.gift_type,
        "quantity": request.quantity,
        "value": gift_values[request.gift_type] * request.quantity,
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.streams.update_one(
        {"id": stream_id},
        {
            "$push": {"gifts": gift},
            "$inc": {"total_gifts": gift['value']}
        }
    )
    
    # Notify streamer about the gift
    await manager.send_to_user(stream['user_id'], {
        "type": "stream_gift",
        "stream_id": stream_id,
        "gift": gift
    })
    
    return {"status": "gift_sent", "gift": gift}

@api_router.post("/streams/{stream_id}/chat")
async def send_stream_chat(stream_id: str, request: StreamChatRequest, token: str):
    """Send a chat message in a live stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream or stream['status'] != 'live':
        raise HTTPException(status_code=404, detail="Stream not found or ended")
    
    chat_message = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "username": user.get('display_name', user['username']),
        "avatar_url": user.get('avatar_url'),
        "message": request.message[:500],  # Limit message length
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$push": {"chat_messages": chat_message}}
    )
    
    # Broadcast chat message to streamer and all viewers
    await manager.send_to_user(stream['user_id'], {
        "type": "stream_chat",
        "stream_id": stream_id,
        "message": chat_message
    })
    
    for viewer_id in stream.get('viewers', []):
        if viewer_id != user['id']:
            await manager.send_to_user(viewer_id, {
                "type": "stream_chat",
                "stream_id": stream_id,
                "message": chat_message
            })
    
    return {"status": "sent", "message": chat_message}

@api_router.post("/streams/{stream_id}/screen-share")
async def toggle_screen_share(stream_id: str, token: str, enabled: bool = True):
    """Toggle screen sharing for a stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the streamer can toggle screen sharing")
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"is_screen_sharing": enabled}}
    )
    
    # Notify viewers
    for viewer_id in stream.get('viewers', []):
        await manager.send_to_user(viewer_id, {
            "type": "screen_share_toggle",
            "stream_id": stream_id,
            "enabled": enabled
        })
    
    return {"status": "updated", "is_screen_sharing": enabled}

# WebRTC Signaling for Live Streaming
class WebRTCSignal(BaseModel):
    stream_id: str
    signal_type: str  # offer, answer, ice-candidate
    data: dict
    target_user_id: Optional[str] = None

@api_router.post("/streams/{stream_id}/signal")
async def send_webrtc_signal(stream_id: str, signal: WebRTCSignal, token: str):
    """Send WebRTC signaling data for live streaming"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    is_streamer = stream['user_id'] == user['id']
    
    if signal.signal_type == "offer":
        # Streamer sends offer to all viewers or specific viewer
        if not is_streamer:
            raise HTTPException(status_code=403, detail="Only streamer can send offers")
        
        if signal.target_user_id:
            # Send to specific viewer
            await manager.send_to_user(signal.target_user_id, {
                "type": "webrtc_signal",
                "signal_type": "offer",
                "stream_id": stream_id,
                "from_user_id": user['id'],
                "data": signal.data
            })
        else:
            # Broadcast to all viewers
            for viewer_id in stream.get('viewers', []):
                await manager.send_to_user(viewer_id, {
                    "type": "webrtc_signal",
                    "signal_type": "offer",
                    "stream_id": stream_id,
                    "from_user_id": user['id'],
                    "data": signal.data
                })
    
    elif signal.signal_type == "answer":
        # Viewer sends answer to streamer
        if is_streamer:
            raise HTTPException(status_code=403, detail="Streamer cannot send answers")
        
        await manager.send_to_user(stream['user_id'], {
            "type": "webrtc_signal",
            "signal_type": "answer",
            "stream_id": stream_id,
            "from_user_id": user['id'],
            "data": signal.data
        })
    
    elif signal.signal_type == "ice-candidate":
        # Either party can send ICE candidates
        if is_streamer:
            if signal.target_user_id:
                await manager.send_to_user(signal.target_user_id, {
                    "type": "webrtc_signal",
                    "signal_type": "ice-candidate",
                    "stream_id": stream_id,
                    "from_user_id": user['id'],
                    "data": signal.data
                })
            else:
                for viewer_id in stream.get('viewers', []):
                    await manager.send_to_user(viewer_id, {
                        "type": "webrtc_signal",
                        "signal_type": "ice-candidate",
                        "stream_id": stream_id,
                        "from_user_id": user['id'],
                        "data": signal.data
                    })
        else:
            await manager.send_to_user(stream['user_id'], {
                "type": "webrtc_signal",
                "signal_type": "ice-candidate",
                "stream_id": stream_id,
                "from_user_id": user['id'],
                "data": signal.data
            })
    
    return {"status": "signal_sent"}

# ============== AI CONTENT GENERATION ROUTES ==============
class AITextGenerateRequest(BaseModel):
    prompt_type: str  # caption, story_idea, bio, hashtags, comment_reply
    context: Optional[str] = None
    tone: Optional[str] = "friendly"  # friendly, professional, funny, inspiring

class AIImageGenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "realistic"  # realistic, artistic, cartoon, abstract

@api_router.post("/ai/generate-text")
async def generate_ai_text(request: AITextGenerateRequest, token: str):
    """Generate AI text content"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Build prompt based on type
        prompts = {
            "caption": f"Generate a creative and engaging social media caption. Context: {request.context or 'general post'}. Tone: {request.tone}. Keep it under 280 characters. Don't use hashtags in the caption.",
            "story_idea": f"Suggest 3 creative story ideas for social media. Context: {request.context or 'daily life'}. Each idea should be one sentence.",
            "bio": f"Generate a catchy social media bio. Context: {request.context or 'personal profile'}. Tone: {request.tone}. Keep it under 150 characters.",
            "hashtags": f"Generate 5-10 relevant hashtags for: {request.context or 'social media post'}. Return only hashtags separated by spaces.",
            "comment_reply": f"Generate a friendly reply to this comment: {request.context}. Tone: {request.tone}. Keep it natural and under 100 characters."
        }
        
        if request.prompt_type not in prompts:
            raise HTTPException(status_code=400, detail="Invalid prompt type")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-gen-{user['id']}-{uuid.uuid4()}",
            system_message="You are a creative social media content assistant. Generate engaging, original content. Be concise and impactful."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompts[request.prompt_type])
        response = await chat.send_message(user_message)
        
        return {
            "type": request.prompt_type,
            "content": response,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logging.error(f"AI text generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate content: {str(e)}")

@api_router.post("/ai/generate-image")
async def generate_ai_image(request: AIImageGenerateRequest, token: str):
    """Generate AI image content"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Enhance prompt based on style
        style_prefixes = {
            "realistic": "A photorealistic image of",
            "artistic": "An artistic, painterly style image of",
            "cartoon": "A colorful cartoon illustration of",
            "abstract": "An abstract, modern art representation of"
        }
        
        enhanced_prompt = f"{style_prefixes.get(request.style, '')} {request.prompt}. High quality, detailed."
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            # Save image to uploads
            image_id = str(uuid.uuid4())
            image_filename = f"ai_generated_{image_id}.png"
            image_path = UPLOAD_DIR / image_filename
            
            with open(image_path, "wb") as f:
                f.write(images[0])
            
            # Also return base64 for immediate display
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            
            return {
                "image_url": f"/api/files/{image_filename}",
                "image_base64": f"data:image/png;base64,{image_base64}",
                "prompt": request.prompt,
                "style": request.style,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="No image was generated")
            
    except ImportError:
        raise HTTPException(status_code=500, detail="AI image service not available")
    except Exception as e:
        logging.error(f"AI image generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

@api_router.post("/ai/enhance-content")
async def enhance_content(token: str, content: str, enhancement_type: str = "improve"):
    """Enhance existing content with AI"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        enhancement_prompts = {
            "improve": f"Improve this social media content while keeping the same meaning. Make it more engaging: {content}",
            "shorten": f"Make this content shorter and more impactful while keeping the key message: {content}",
            "expand": f"Expand this content with more details and make it more descriptive: {content}",
            "professional": f"Rewrite this content in a more professional tone: {content}",
            "casual": f"Rewrite this content in a more casual, friendly tone: {content}"
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-enhance-{user['id']}-{uuid.uuid4()}",
            system_message="You are a content editor. Enhance and improve content while preserving the original intent."
        ).with_model("openai", "gpt-5.2")
        
        prompt = enhancement_prompts.get(enhancement_type, enhancement_prompts["improve"])
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "original": content,
            "enhanced": response,
            "enhancement_type": enhancement_type,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"AI enhancement error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enhance content: {str(e)}")

# Stats
@api_router.get("/stats")
async def get_stats():
    total_persons = await db.persons.count_documents({})
    
    pipeline = [
        {"$unwind": "$social_networks"},
        {"$match": {"social_networks.has_account": True}},
        {"$group": {"_id": "$social_networks.platform", "count": {"$sum": 1}}}
    ]
    
    platform_stats = await db.persons.aggregate(pipeline).to_list(100)
    
    platforms = {stat['_id']: stat['count'] for stat in platform_stats}
    
    total_connections = sum(platforms.values())
    
    return {
        "total_persons": total_persons,
        "total_connections": total_connections,
        "platforms": platforms
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
