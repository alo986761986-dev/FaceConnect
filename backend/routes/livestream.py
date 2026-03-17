"""
Live Streaming routes for FaceConnect.
Handles live stream creation, viewing, chat, and interactions.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from .shared import db, get_user_by_id

router = APIRouter(prefix="/livestream", tags=["Live Streaming"])

# ============== MODELS ==============
class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class StreamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_private: bool = False

class StreamResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[UserResponse] = None
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_live: bool = True
    viewer_count: int = 0
    peak_viewers: int = 0
    is_private: bool = False
    created_at: datetime
    ended_at: Optional[datetime] = None

class StreamChatMessage(BaseModel):
    content: str

class StreamChatResponse(BaseModel):
    id: str
    stream_id: str
    user_id: str
    user: Optional[UserResponse] = None
    content: str
    created_at: datetime

class AIEffectRequest(BaseModel):
    effect_type: str  # background_blur, beauty, filters, etc.
    intensity: float = 0.5  # 0.0 to 1.0

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

# ============== ROUTES ==============
@router.post("/start", response_model=StreamResponse)
async def start_stream(stream: StreamCreate, token: str):
    """Start a new live stream."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check if user already has an active stream
    existing = await db.streams.find_one({
        "user_id": user['id'],
        "is_live": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active stream")
    
    stream_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    stream_doc = {
        "id": stream_id,
        "user_id": user['id'],
        "title": stream.title,
        "description": stream.description,
        "thumbnail_url": stream.thumbnail_url,
        "is_live": True,
        "viewer_count": 0,
        "peak_viewers": 0,
        "viewers": [],
        "is_private": stream.is_private,
        "created_at": now.isoformat(),
        "ended_at": None
    }
    
    await db.streams.insert_one(stream_doc)
    
    return StreamResponse(
        id=stream_id,
        user_id=user['id'],
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            display_name=user.get('display_name'),
            avatar=user.get('avatar')
        ),
        title=stream.title,
        description=stream.description,
        thumbnail_url=stream.thumbnail_url,
        is_live=True,
        viewer_count=0,
        peak_viewers=0,
        is_private=stream.is_private,
        created_at=now
    )

@router.post("/{stream_id}/end")
async def end_stream(stream_id: str, token: str):
    """End a live stream."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({
        "id": stream_id,
        "user_id": user['id'],
        "is_live": True
    })
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or already ended")
    
    now = datetime.now(timezone.utc)
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {
            "is_live": False,
            "ended_at": now.isoformat(),
            "viewer_count": 0,
            "viewers": []
        }}
    )
    
    return {"success": True, "ended_at": now.isoformat()}

@router.get("/active", response_model=List[StreamResponse])
async def get_active_streams(token: str, skip: int = 0, limit: int = 20):
    """Get all active live streams."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    streams = await db.streams.find(
        {"is_live": True, "is_private": False},
        {"_id": 0}
    ).sort("viewer_count", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for stream in streams:
        streamer = await get_user_by_id(stream['user_id'])
        
        created_at = stream.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(StreamResponse(
            id=stream['id'],
            user_id=stream['user_id'],
            user=UserResponse(
                id=streamer['id'],
                username=streamer['username'],
                display_name=streamer.get('display_name'),
                avatar=streamer.get('avatar')
            ) if streamer else None,
            title=stream['title'],
            description=stream.get('description'),
            thumbnail_url=stream.get('thumbnail_url'),
            is_live=stream['is_live'],
            viewer_count=stream.get('viewer_count', 0),
            peak_viewers=stream.get('peak_viewers', 0),
            is_private=stream.get('is_private', False),
            created_at=created_at
        ))
    
    return result

@router.get("/{stream_id}", response_model=StreamResponse)
async def get_stream(stream_id: str, token: str):
    """Get a specific stream by ID."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    streamer = await get_user_by_id(stream['user_id'])
    
    created_at = stream.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    ended_at = stream.get('ended_at')
    if ended_at and isinstance(ended_at, str):
        ended_at = datetime.fromisoformat(ended_at)
    
    return StreamResponse(
        id=stream['id'],
        user_id=stream['user_id'],
        user=UserResponse(
            id=streamer['id'],
            username=streamer['username'],
            display_name=streamer.get('display_name'),
            avatar=streamer.get('avatar')
        ) if streamer else None,
        title=stream['title'],
        description=stream.get('description'),
        thumbnail_url=stream.get('thumbnail_url'),
        is_live=stream['is_live'],
        viewer_count=stream.get('viewer_count', 0),
        peak_viewers=stream.get('peak_viewers', 0),
        is_private=stream.get('is_private', False),
        created_at=created_at,
        ended_at=ended_at
    )

@router.post("/{stream_id}/join")
async def join_stream(stream_id: str, token: str):
    """Join a live stream as a viewer."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id, "is_live": True})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    viewers = stream.get('viewers', [])
    if user['id'] not in viewers:
        viewers.append(user['id'])
    
    new_count = len(viewers)
    peak = max(stream.get('peak_viewers', 0), new_count)
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {
            "viewers": viewers,
            "viewer_count": new_count,
            "peak_viewers": peak
        }}
    )
    
    return {"success": True, "viewer_count": new_count}

@router.post("/{stream_id}/leave")
async def leave_stream(stream_id: str, token: str):
    """Leave a live stream."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    viewers = stream.get('viewers', [])
    if user['id'] in viewers:
        viewers.remove(user['id'])
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {
            "viewers": viewers,
            "viewer_count": len(viewers)
        }}
    )
    
    return {"success": True, "viewer_count": len(viewers)}

# ============== STREAM CHAT ==============
@router.get("/{stream_id}/chat", response_model=List[StreamChatResponse])
async def get_stream_chat(stream_id: str, token: str, limit: int = 100):
    """Get recent chat messages for a stream."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    messages = await db.stream_chat.find(
        {"stream_id": stream_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for msg in reversed(messages):
        sender = await get_user_by_id(msg['user_id'])
        
        created_at = msg.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(StreamChatResponse(
            id=msg['id'],
            stream_id=msg['stream_id'],
            user_id=msg['user_id'],
            user=UserResponse(
                id=sender['id'],
                username=sender['username'],
                display_name=sender.get('display_name'),
                avatar=sender.get('avatar')
            ) if sender else None,
            content=msg['content'],
            created_at=created_at
        ))
    
    return result

@router.post("/{stream_id}/chat", response_model=StreamChatResponse)
async def send_stream_chat(stream_id: str, message: StreamChatMessage, token: str):
    """Send a chat message in a live stream."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    stream = await db.streams.find_one({"id": stream_id, "is_live": True})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not live")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    chat_doc = {
        "id": message_id,
        "stream_id": stream_id,
        "user_id": user['id'],
        "content": message.content,
        "created_at": now.isoformat()
    }
    
    await db.stream_chat.insert_one(chat_doc)
    
    return StreamChatResponse(
        id=message_id,
        stream_id=stream_id,
        user_id=user['id'],
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            display_name=user.get('display_name'),
            avatar=user.get('avatar')
        ),
        content=message.content,
        created_at=now
    )

# ============== AI EFFECTS ==============
@router.post("/effects")
async def apply_ai_effect(effect: AIEffectRequest, token: str):
    """Apply an AI effect to the stream (placeholder for client-side processing)."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    valid_effects = [
        'background_blur', 'background_replace', 'beauty',
        'filters', 'face_tracking', 'gesture_recognition'
    ]
    
    if effect.effect_type not in valid_effects:
        raise HTTPException(status_code=400, detail="Invalid effect type")
    
    # Return configuration for client-side processing
    return {
        "success": True,
        "effect": effect.effect_type,
        "intensity": effect.intensity,
        "config": {
            "background_blur": {"radius": int(effect.intensity * 20)},
            "beauty": {"smoothness": effect.intensity, "brightness": effect.intensity * 0.2},
            "filters": {"name": "vivid", "strength": effect.intensity}
        }.get(effect.effect_type, {})
    }
