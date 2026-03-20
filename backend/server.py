from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, Form, Request
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

# Create the main app without a prefix, disable redirect slashes to avoid 307 redirects
app = FastAPI(redirect_slashes=False)

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
                except Exception:
                    pass
    
    async def broadcast_to_conversation(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0
    
    # Alias for send_personal_message - used by call and streaming endpoints
    async def send_to_user(self, user_id: str, message: dict):
        await self.send_personal_message(message, user_id)

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
    message_type: str = "text"  # text, image, video, audio, file, gif, sticker, location
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # For location and other special types

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
    metadata: Optional[Dict[str, Any]] = None  # For location and special types
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

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return hash_password(plain_password) == hashed_password

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
# ============== AUTH ROUTES (Unique - not in auth module) ==============
# Note: Core auth routes (google, register, login, logout, me, change-password) 
# are now handled by routes/auth.py module

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

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None

@api_router.put("/auth/update-profile")
async def update_user_profile(request: UpdateProfileRequest, token: str):
    """Update user profile details"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    update_data = {}
    if request.display_name is not None:
        update_data["display_name"] = request.display_name
    if request.phone is not None:
        update_data["phone"] = request.phone
    
    if update_data:
        await db.users.update_one({"id": user['id']}, {"$set": update_data})
    
    return {"success": True, "message": "Profile updated successfully"}

# NOTE: User routes now handled by routes/users.py module:
# - GET /users - list users with optional search
# - GET /users/search - search users
# - GET /users/{user_id} - get specific user
# - GET /users/{user_id}/daily-counts - premium limits
# - POST /users/{user_id}/spend-coins - coins transactions
# - GET /users/{user_id}/post-count - post count

# NOTE: Search routes now handled by routes/search.py module:
# - GET /search/universal - universal search

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
    
    # Get conversations, filtering out ones deleted by this user
    conversations = await db.conversations.find(
        {
            "participant_ids": user['id'],
            "deleted_by": {"$ne": user['id']}  # Exclude soft-deleted conversations
        },
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    # Get archived conversation IDs
    archived_convos = await db.archived_conversations.find(
        {"user_id": user["id"]},
        {"conversation_id": 1}
    ).to_list(1000)
    archived_ids = set(a["conversation_id"] for a in archived_convos)
    
    result = []
    for conv in conversations:
        # Skip archived conversations (they're shown in a separate view)
        if conv['id'] in archived_ids:
            continue
            
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
        "metadata": message.metadata,  # For location and special message types
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
        metadata=message.metadata,
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
    
    # Check if user has cleared this chat
    cleared = await db.cleared_chats.find_one({
        "user_id": user["id"],
        "conversation_id": conversation_id
    })
    
    query = {"conversation_id": conversation_id, "is_deleted": False}
    
    # If user cleared the chat, only show messages after that timestamp
    if cleared and cleared.get("cleared_at"):
        if before:
            query["created_at"] = {"$lt": before, "$gt": cleared["cleared_at"]}
        else:
            query["created_at"] = {"$gt": cleared["cleared_at"]}
    elif before:
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
            metadata=msg.get('metadata'),
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

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, token: str):
    """Delete a message (sender only, soft delete)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only sender can delete their message
    if message['sender_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only sender can delete message")
    
    # Soft delete - mark as deleted
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "content": "This message was deleted"
        }}
    )
    
    # Broadcast deletion to conversation participants via WebSocket
    conversation = await db.conversations.find_one({"id": message['conversation_id']})
    if conversation:
        for participant_id in conversation.get('participants', []):
            await manager.send_personal_message({
                "type": "message_deleted",
                "message_id": message_id,
                "conversation_id": message['conversation_id']
            }, participant_id)
    
    return {"success": True, "message_id": message_id}

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, token: str):
    """Delete a conversation (soft delete for user, hides from their list)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if user is participant (handle both field names for compatibility)
    participants = conversation.get('participant_ids', conversation.get('participants', []))
    if user['id'] not in participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Add user to deleted_by list (soft delete per user)
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$addToSet": {"deleted_by": user['id']}}
    )
    
    return {"success": True, "conversation_id": conversation_id}


@api_router.delete("/conversations/{conversation_id}/messages")
async def empty_conversation_messages(conversation_id: str, token: str):
    """Empty all messages in a conversation (soft delete from user's perspective)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if user is participant (handle both field names for compatibility)
    participants = conversation.get('participant_ids', conversation.get('participants', []))
    if user['id'] not in participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Track that this user has cleared the chat from this timestamp
    # Messages before this timestamp won't be shown to this user
    await db.cleared_chats.update_one(
        {"user_id": user["id"], "conversation_id": conversation_id},
        {"$set": {
            "user_id": user["id"],
            "conversation_id": conversation_id,
            "cleared_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Chat emptied"}



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

# ============== APP DOWNLOAD ROUTES ==============
@api_router.get("/app/download/android")
async def download_android_app():
    """Download Android APK file"""
    # Check if APK exists in uploads directory
    apk_path = UPLOAD_DIR / "FaceConnect.apk"
    
    if not apk_path.exists():
        # Return a response indicating APK is not available yet
        raise HTTPException(
            status_code=404, 
            detail="APK not available yet. Please use the PWA install option or check Google Play Store."
        )
    
    return FileResponse(
        path=apk_path,
        filename="FaceConnect-v2.5.0.apk",
        media_type="application/vnd.android.package-archive"
    )

@api_router.get("/app/info")
async def get_app_info():
    """Get app version and download information"""
    return {
        "version": "2.5.0",
        "build": "250",
        "android": {
            "available": (UPLOAD_DIR / "FaceConnect.apk").exists(),
            "min_sdk": 24,
            "target_sdk": 34,
            "download_url": "/api/app/download/android"
        },
        "ios": {
            "available": False,
            "app_store_url": None
        },
        "windows": {
            "available": True,
            "download_url": "https://github.com/faceconnect/releases/latest"
        },
        "play_store_url": "https://play.google.com/store/apps/details?id=com.faceconnect.app",
        "features": [
            "Facial Recognition",
            "Real-time Chat",
            "Live Streaming",
            "Stories & Reels",
            "AI Assistant"
        ]
    }

# NOTE: Push notification routes now handled by routes/push.py module:
# - GET /push/vapid-public-key - get VAPID public key
# - POST /push/subscribe - subscribe to push notifications
# - DELETE /push/unsubscribe - unsubscribe from push notifications

# Import send_push_notification from push module for backwards compatibility
from routes.push import send_push_notification

# ============== REELS ENDPOINTS ==============
# Note: Reels routes are now handled by routes/reels.py module
# The module provides: create, list, get, like, settings, archive, comments, share, delete

# ============== POSTS/STORIES ENDPOINTS ==============

# Post upload limit per user
POST_UPLOAD_LIMIT = 20

# Reaction types for posts
REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry", "fire", "clap"]

@api_router.post("/posts", response_model=PostResponse)
async def create_post(token: str, post: PostCreate):
    """Create a new post or story"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check post limit for regular posts (not stories)
    if post.type == "post":
        user_post_count = await db.posts.count_documents({"user_id": user['id'], "type": "post"})
        if user_post_count >= POST_UPLOAD_LIMIT:
            raise HTTPException(
                status_code=400, 
                detail=f"Post limit reached. You can only have {POST_UPLOAD_LIMIT} posts. Delete some to post more."
            )
    
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
        "reactions": {},  # {"like": [user_ids], "love": [user_ids], ...}
        "comments_count": 0,
        "views": [],
        "is_highlighted": False,
        "highlight_expires_at": None,  # When highlighted status expires
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


@api_router.post("/posts/{post_id}/highlight")
async def toggle_highlight_post(post_id: str, token: str, duration_days: int = 7):
    """Toggle highlight status on a post (owner only) - highlighted for specified duration (default 7 days)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Only post owner can highlight their own post
    if post['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only post owner can highlight")
    
    is_highlighted = not post.get('is_highlighted', False)
    now = datetime.now(timezone.utc)
    
    # Set highlight expiration (7 days by default, can be 1, 7, 14, or 30 days)
    duration_days = min(max(duration_days, 1), 30)  # Clamp between 1-30 days
    highlight_expires_at = (now + timedelta(days=duration_days)).isoformat() if is_highlighted else None
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {
            "is_highlighted": is_highlighted,
            "highlight_expires_at": highlight_expires_at
        }}
    )
    
    return {
        "is_highlighted": is_highlighted, 
        "highlight_expires_at": highlight_expires_at,
        "duration_days": duration_days if is_highlighted else 0
    }

@api_router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, token: str, reaction_type: str = "like"):
    """Add or toggle a reaction on a post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if reaction_type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Allowed: {REACTION_TYPES}")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    reactions = post.get('reactions', {})
    user_current_reaction = None
    
    # Find user's current reaction
    for r_type, user_ids in reactions.items():
        if user['id'] in user_ids:
            user_current_reaction = r_type
            break
    
    # Remove user from current reaction if exists
    if user_current_reaction:
        await db.posts.update_one(
            {"id": post_id},
            {"$pull": {f"reactions.{user_current_reaction}": user['id']}}
        )
    
    # Add new reaction (unless same as current - that removes it)
    added = False
    if user_current_reaction != reaction_type:
        await db.posts.update_one(
            {"id": post_id},
            {"$addToSet": {f"reactions.{reaction_type}": user['id']}}
        )
        added = True
    
    # Get updated reactions
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0, "reactions": 1})
    reactions = updated_post.get('reactions', {})
    
    # Calculate total reactions count
    total_reactions = sum(len(users) for users in reactions.values())
    
    return {
        "reaction_type": reaction_type if added else None,
        "added": added,
        "total_reactions": total_reactions,
        "reactions_breakdown": {k: len(v) for k, v in reactions.items()}
    }

@api_router.get("/posts/{post_id}/reactions")
async def get_post_reactions(post_id: str, token: str):
    """Get all reactions for a post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "reactions": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    reactions = post.get('reactions', {})
    
    # Find user's reaction
    user_reaction = None
    for r_type, user_ids in reactions.items():
        if user['id'] in user_ids:
            user_reaction = r_type
            break
    
    return {
        "user_reaction": user_reaction,
        "total_reactions": sum(len(users) for users in reactions.values()),
        "reactions_breakdown": {k: len(v) for k, v in reactions.items()}
    }

@api_router.get("/users/{user_id}/post-count")
async def get_user_post_count(user_id: str, token: str):
    """Get user's post count and limit status"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post_count = await db.posts.count_documents({"user_id": user_id, "type": "post"})
    
    return {
        "post_count": post_count,
        "post_limit": POST_UPLOAD_LIMIT,
        "remaining": max(0, POST_UPLOAD_LIMIT - post_count),
        "can_post": post_count < POST_UPLOAD_LIMIT
    }


@api_router.post("/posts/{post_id}/archive")
async def toggle_archive_post(post_id: str, token: str):
    """Toggle archive status on a post (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Only post owner can archive their own post
    if post['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only post owner can archive")
    
    is_archived = not post.get('is_archived', False)
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {"is_archived": is_archived}}
    )
    
    return {"is_archived": is_archived}

@api_router.patch("/posts/{post_id}/settings")
async def update_post_settings(post_id: str, token: str, request: Request):
    """Update post visibility/interaction settings (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Only post owner can update settings
    if post['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only post owner can update settings")
    
    data = await request.json()
    allowed_settings = ['hideLikes', 'hideShares', 'disableComments', 'isPinned']
    
    update_data = {}
    for key in allowed_settings:
        if key in data:
            # Convert camelCase to snake_case for DB
            db_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key]).lstrip('_')
            update_data[db_key] = data[key]
    
    if update_data:
        await db.posts.update_one(
            {"id": post_id},
            {"$set": update_data}
        )
    
    return {"success": True, "updated": update_data}


@api_router.put("/posts/{post_id}")
async def edit_post(post_id: str, token: str, content: str = None, media_url: str = None):
    """Edit a post (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Only post owner can edit their own post
    if post['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only post owner can edit")
    
    update_data = {"edited_at": datetime.now(timezone.utc).isoformat()}
    
    if content is not None:
        update_data["content"] = content
    if media_url is not None:
        update_data["media_url"] = media_url
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    # Return updated post
    updated_post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    author = await get_user_by_id(updated_post['user_id'])
    
    return {
        "id": updated_post['id'],
        "user_id": updated_post['user_id'],
        "username": author.get('username') if author else None,
        "display_name": author.get('display_name') if author else None,
        "avatar": author.get('avatar') if author else None,
        "content": updated_post.get('content'),
        "media_url": updated_post.get('media_url'),
        "media_type": updated_post.get('media_type'),
        "likes_count": len(updated_post.get('likes', [])),
        "comments_count": updated_post.get('comments_count', 0),
        "is_highlighted": updated_post.get('is_highlighted', False),
        "edited_at": updated_post.get('edited_at'),
        "created_at": updated_post.get('created_at')
    }

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, token: str):
    """Delete a post (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Only post owner can delete their own post
    if post['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only post owner can delete")
    
    await db.posts.delete_one({"id": post_id})
    
    return {"success": True, "message": "Post deleted"}



# ============== UNIFIED FEED ENDPOINTS ==============
@api_router.get("/feed/home")
async def get_home_feed(token: str, sort_by: str = "recent"):
    """Get unified home feed with live streams, stories, highlighted posts, reels preview, and regular posts"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    now = datetime.now(timezone.utc)
    
    # Get active live streams (priority - shown first)
    live_streams_raw = await db.streams.find(
        {"status": "live"},
        {"_id": 0, "chat_messages": 0}
    ).sort("started_at", -1).limit(10).to_list(10)
    
    live_streams = []
    for stream in live_streams_raw:
        live_streams.append({
            "id": stream['id'],
            "user_id": stream['user_id'],
            "username": stream.get('user', {}).get('username'),
            "display_name": stream.get('user', {}).get('display_name'),
            "avatar": stream.get('user', {}).get('avatar_url'),
            "title": stream.get('title', 'Live Stream'),
            "viewer_count": stream.get('viewer_count', 0),
            "started_at": stream.get('started_at'),
            "thumbnail": stream.get('thumbnail'),
            "status": "live"
        })
    
    # Get stories (non-expired) - sorted by most recent
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
    
    # Get highlighted posts (most liked in last 7 days OR explicitly highlighted)
    week_ago = (now - timedelta(days=7)).isoformat()
    highlighted_posts_raw = await db.posts.find(
        {"type": "post", "$or": [
            {"created_at": {"$gte": week_ago}},
            {"is_highlighted": True}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    # Sort by likes count and take top 5, prioritizing explicitly highlighted
    highlighted_posts_raw.sort(key=lambda x: (x.get('is_highlighted', False), len(x.get('likes', []))), reverse=True)
    highlighted_posts_raw = highlighted_posts_raw[:5]
    
    highlighted_posts = []
    for post in highlighted_posts_raw:
        if len(post.get('likes', [])) >= 1 or post.get('is_highlighted'):
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
    
    # Get reels preview (latest 10, sorted by views then likes)
    reels_raw = await db.reels.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    if sort_by == "popular":
        reels_raw.sort(key=lambda x: (x.get('views_count', 0), x.get('likes_count', 0)), reverse=True)
    reels_raw = reels_raw[:10]
    
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
    posts_raw = await db.posts.find({"type": "post"}, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)
    
    # Sort based on sort_by parameter
    if sort_by == "popular":
        posts_raw.sort(key=lambda x: (len(x.get('likes', [])), x.get('comments_count', 0)), reverse=True)
    # Default is "recent" which is already sorted by created_at
    posts_raw = posts_raw[:20]
    
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
            "is_highlighted": post.get('is_highlighted', False),
            "edited_at": post.get('edited_at'),
            "created_at": created_at.isoformat() if created_at else None
        })
    
    return {
        "live_streams": live_streams,
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

# NOTE: Story deletion is now handled by routes/stories.py which uses db.stories collection
# The old route below was querying db.posts which is incorrect for the new Stories feature
# @api_router.delete("/stories/{story_id}")
# async def delete_story(story_id: str, token: str):
#     """Delete a story (owner only)"""
#     ...

@api_router.delete("/streams/{stream_id}")
async def delete_stream(stream_id: str, token: str):
    """Delete/end a live stream (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only stream owner can delete")
    
    # End the stream and delete
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "Stream ended and deleted"}


# NOTE: Friends routes now handled by routes/friends.py module:
# - GET /friends - get friends list
# - GET /friends/requests - get received friend requests
# - GET /friends/sent - get sent friend requests
# - POST /friends/request - send friend request
# - POST /friends/accept - accept friend request
# - POST /friends/decline - decline friend request
# - DELETE /friends/request/{request_id} - cancel sent request
# - DELETE /friends/{friend_id} - remove friend

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


# ============== AI-POWERED LIVE STREAM EFFECTS ==============
class AIEffectRequest(BaseModel):
    effect_type: str  # beauty, background, filter, sticker
    parameters: Optional[Dict[str, Any]] = None

@api_router.post("/streams/{stream_id}/ai-effect")
async def apply_ai_effect(stream_id: str, request: AIEffectRequest, token: str):
    """Apply AI-powered effects to a live stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Only streamer can apply effects
    if stream['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the streamer can apply effects")
    
    # Define available AI effects
    ai_effects = {
        "beauty": {
            "smooth_skin": {"intensity": 0.5, "description": "Smooths skin texture"},
            "brighten": {"intensity": 0.3, "description": "Brightens face"},
            "slim_face": {"intensity": 0.2, "description": "Slims face shape"},
            "big_eyes": {"intensity": 0.15, "description": "Enlarges eyes slightly"},
            "lipstick": {"color": "#FF6B6B", "description": "Virtual lipstick"},
            "blush": {"color": "#FFB5B5", "description": "Natural blush"}
        },
        "background": {
            "blur": {"intensity": 0.8, "description": "Blur background"},
            "virtual": {"type": "office", "description": "Virtual background"},
            "ai_replace": {"description": "AI background replacement"}
        },
        "filter": {
            "warm": {"temperature": 0.3, "description": "Warm color tone"},
            "cool": {"temperature": -0.3, "description": "Cool color tone"},
            "vintage": {"description": "Vintage look"},
            "noir": {"description": "Black and white cinematic"},
            "vivid": {"saturation": 0.4, "description": "Enhanced colors"}
        },
        "sticker": {
            "bunny_ears": {"position": "head", "description": "Cute bunny ears"},
            "glasses": {"style": "cool", "description": "Virtual glasses"},
            "crown": {"style": "gold", "description": "Golden crown"},
            "hearts": {"animated": True, "description": "Floating hearts"}
        }
    }
    
    effect_type = request.effect_type
    params = request.parameters or {}
    
    if effect_type not in ai_effects:
        raise HTTPException(status_code=400, detail=f"Invalid effect type. Available: {list(ai_effects.keys())}")
    
    # Store active effects for the stream
    effect_config = {
        "type": effect_type,
        "parameters": params,
        "enabled": True,
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update stream with the effect
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {f"active_effects.{effect_type}": effect_config}}
    )
    
    # Notify viewers about effect change (for UI sync)
    for viewer_id in stream.get('viewers', []):
        await manager.send_to_user(viewer_id, {
            "type": "stream_effect_change",
            "stream_id": stream_id,
            "effect": effect_config
        })
    
    return {
        "status": "effect_applied",
        "effect": effect_config,
        "available_options": ai_effects.get(effect_type, {})
    }

@api_router.delete("/streams/{stream_id}/ai-effect/{effect_type}")
async def remove_ai_effect(stream_id: str, effect_type: str, token: str):
    """Remove an AI effect from a live stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the streamer can remove effects")
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$unset": {f"active_effects.{effect_type}": ""}}
    )
    
    # Notify viewers
    for viewer_id in stream.get('viewers', []):
        await manager.send_to_user(viewer_id, {
            "type": "stream_effect_removed",
            "stream_id": stream_id,
            "effect_type": effect_type
        })
    
    return {"status": "effect_removed", "effect_type": effect_type}

@api_router.get("/streams/{stream_id}/ai-effects")
async def get_stream_effects(stream_id: str, token: str):
    """Get current AI effects applied to a stream"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0, "active_effects": 1})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    return {
        "active_effects": stream.get('active_effects', {}),
        "available_effects": ["beauty", "background", "filter", "sticker"]
    }


# NOTE: Calls routes now handled by routes/calls.py module:
# - POST /calls/initiate - initiate a call
# - POST /calls/{call_id}/answer - answer a call
# - POST /calls/{call_id}/reject - reject a call
# - POST /calls/{call_id}/end - end a call
# - POST /calls/{call_id}/signal - send WebRTC signal
# - GET /calls/history - get call history

# NOTE: AI routes now handled by routes/ai.py module:
# - POST /ai/generate-text - generate text content
# - POST /ai/enhance-content - enhance content with AI
# - POST /ai/chat - chat with AI assistant
# - GET /ai/personas - get available AI personas
# - POST /ai/quick-replies - generate quick replies
# - POST /ai/text-suggest - generate text suggestions
# - POST /ai/summarize - summarize a conversation
# - POST /ai/generate-image - generate AI image
# - POST /ai/caption - generate caption
# - POST /ai/search - AI-powered search
# - POST /ai/emotional-support - get emotional support
# - GET /ai/history - get AI interaction history
# - DELETE /ai/history - clear AI history

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


# Import modular routers
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.posts import router as posts_router
from routes.livestream import router as livestream_router
from routes.reels import router as reels_router
from routes.groups import router as groups_router
from routes.export import router as export_router
from routes.face_compare import router as face_compare_router
from routes.stories import router as stories_router
from routes.saved import router as saved_router
from routes.explore import router as explore_router
from routes.backup import router as backup_router
from routes.notifications import router as notifications_router
from routes.close_friends import router as close_friends_router
from routes.push import router as push_router
from routes.users import router as users_router, set_connection_manager as set_users_connection_manager
from routes.friends import router as friends_router
from routes.calls import router as calls_router, set_connection_manager as set_calls_connection_manager
from routes.ai import router as ai_router
from routes.search import router as search_router

# Set connection manager for modules that need WebSocket access
set_users_connection_manager(manager)
set_calls_connection_manager(manager)

# Include modular routers in api_router
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(posts_router)
api_router.include_router(livestream_router)
api_router.include_router(reels_router)
api_router.include_router(groups_router)
api_router.include_router(export_router)
api_router.include_router(face_compare_router)
api_router.include_router(stories_router)
api_router.include_router(saved_router)
api_router.include_router(explore_router)
api_router.include_router(backup_router)
api_router.include_router(notifications_router)
api_router.include_router(close_friends_router)
api_router.include_router(push_router)
api_router.include_router(users_router)
api_router.include_router(friends_router)
api_router.include_router(calls_router)
api_router.include_router(ai_router)
api_router.include_router(search_router)

# Import and include payments router
from routes.payments import router as payments_router
api_router.include_router(payments_router)

# Import and include analytics router
from routes.analytics import router as analytics_router
api_router.include_router(analytics_router)

# Import and include Instagram features router
from routes.instagram_features import router as instagram_router
api_router.include_router(instagram_router)

# Import and include enhanced reels router
from routes.reels_enhanced import router as reels_enhanced_router
api_router.include_router(reels_enhanced_router)

# Import and include speech router (Whisper transcription)
from routes.speech import router as speech_router
api_router.include_router(speech_router)

# Import and include new feature routers
from routes.watch import router as watch_router
from routes.marketplace import router as marketplace_router
from routes.events import router as events_router
from routes.memories import router as memories_router
from routes.gaming import router as gaming_router
from routes.social_groups import router as social_groups_router
from routes.chat_features import router as chat_features_router
from routes.assistant import router as assistant_router

api_router.include_router(watch_router)
api_router.include_router(marketplace_router)
api_router.include_router(events_router)
api_router.include_router(memories_router)
api_router.include_router(gaming_router)
api_router.include_router(social_groups_router)
api_router.include_router(chat_features_router)
api_router.include_router(assistant_router)

# Stripe webhook endpoint (must be outside api_router for correct path)
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
    except ImportError:
        raise HTTPException(status_code=503, detail="Payment service not available")
    
    import os
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on webhook event
        if webhook_response.session_id:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {
                    "$set": {
                        "webhook_event": webhook_response.event_type,
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        return {"status": "success", "event_id": webhook_response.event_id}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

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
