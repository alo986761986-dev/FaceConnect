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
from datetime import datetime, timezone
import base64
import json
import hashlib
import secrets
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    return user

async def get_user_by_token(token: str) -> Optional[dict]:
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if session:
        return await get_user_by_id(session['user_id'])
    return None

# ============== AUTH ROUTES ==============
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
        
        # Notify others that user is offline
        for contact_id in all_contacts:
            await manager.send_personal_message(
                {"type": "user_offline", "user_id": user_id},
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
