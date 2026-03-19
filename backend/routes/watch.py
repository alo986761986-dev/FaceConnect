"""
Watch/Video API Routes
Handles video content, watch parties, and video recommendations
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os

router = APIRouter(prefix="/watch", tags=["Watch"])

# Get MongoDB from main app
def get_db():
    from server import db
    return db

# Pydantic Models
class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = 0  # seconds
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []

class VideoResponse(BaseModel):
    id: str
    title: str
    description: str
    video_url: str
    thumbnail_url: Optional[str]
    duration: int
    category: str
    tags: List[str]
    creator_id: str
    creator_name: str
    creator_avatar: Optional[str]
    views: int
    likes: int
    comments_count: int
    created_at: str
    is_live: bool = False

class WatchPartyCreate(BaseModel):
    video_id: str
    title: Optional[str] = "Watch Party"
    invited_users: Optional[List[str]] = []

# Helper to serialize MongoDB documents
def serialize_video(video: dict, creator: dict = None) -> dict:
    return {
        "id": str(video["_id"]),
        "title": video.get("title", ""),
        "description": video.get("description", ""),
        "video_url": video.get("video_url", ""),
        "thumbnail_url": video.get("thumbnail_url"),
        "duration": video.get("duration", 0),
        "category": video.get("category", "general"),
        "tags": video.get("tags", []),
        "creator_id": str(video.get("creator_id", "")),
        "creator_name": creator.get("display_name", creator.get("username", "Unknown")) if creator else "Unknown",
        "creator_avatar": creator.get("avatar") if creator else None,
        "views": video.get("views", 0),
        "likes": video.get("likes", 0),
        "comments_count": video.get("comments_count", 0),
        "created_at": video.get("created_at", datetime.now(timezone.utc)).isoformat(),
        "is_live": video.get("is_live", False)
    }

# Routes
@router.get("/feed")
async def get_watch_feed(
    token: str,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get personalized video feed"""
    db = get_db()
    
    # Verify token
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Build query
    query = {"is_active": {"$ne": False}}
    if category and category != "all":
        query["category"] = category
    
    # Get videos with pagination
    skip = (page - 1) * limit
    videos = await db.videos.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get creators
    creator_ids = list(set(str(v.get("creator_id")) for v in videos if v.get("creator_id")))
    creators_list = await db.users.find({"_id": {"$in": [ObjectId(cid) for cid in creator_ids if ObjectId.is_valid(cid)]}}).to_list(100)
    creators = {str(c["_id"]): c for c in creators_list}
    
    return {
        "videos": [serialize_video(v, creators.get(str(v.get("creator_id")))) for v in videos],
        "page": page,
        "has_more": len(videos) == limit
    }

@router.get("/categories")
async def get_categories(token: str):
    """Get video categories"""
    return {
        "categories": [
            {"id": "all", "name": "For You", "icon": "sparkles"},
            {"id": "live", "name": "Live", "icon": "radio"},
            {"id": "gaming", "name": "Gaming", "icon": "gamepad-2"},
            {"id": "music", "name": "Music", "icon": "music"},
            {"id": "sports", "name": "Sports", "icon": "trophy"},
            {"id": "news", "name": "News", "icon": "newspaper"},
            {"id": "entertainment", "name": "Entertainment", "icon": "clapperboard"},
            {"id": "education", "name": "Learning", "icon": "graduation-cap"},
        ]
    }

@router.post("/upload")
async def upload_video(video: VideoCreate, token: str):
    """Upload a new video"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    video_doc = {
        "title": video.title,
        "description": video.description,
        "video_url": video.video_url,
        "thumbnail_url": video.thumbnail_url,
        "duration": video.duration,
        "category": video.category,
        "tags": video.tags,
        "creator_id": session["user_id"],
        "views": 0,
        "likes": 0,
        "comments_count": 0,
        "is_active": True,
        "is_live": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.videos.insert_one(video_doc)
    video_doc["_id"] = result.inserted_id
    
    user = await db.users.find_one({"_id": ObjectId(session["user_id"])})
    return serialize_video(video_doc, user)

@router.get("/{video_id}")
async def get_video(video_id: str, token: str):
    """Get video details"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not ObjectId.is_valid(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    
    video = await db.videos.find_one({"_id": ObjectId(video_id)})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Increment views
    await db.videos.update_one({"_id": ObjectId(video_id)}, {"$inc": {"views": 1}})
    video["views"] += 1
    
    creator = await db.users.find_one({"_id": ObjectId(video.get("creator_id"))}) if video.get("creator_id") else None
    return serialize_video(video, creator)

@router.post("/{video_id}/like")
async def like_video(video_id: str, token: str):
    """Like/unlike a video"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Check if already liked
    existing = await db.video_likes.find_one({"video_id": video_id, "user_id": user_id})
    
    if existing:
        await db.video_likes.delete_one({"_id": existing["_id"]})
        await db.videos.update_one({"_id": ObjectId(video_id)}, {"$inc": {"likes": -1}})
        return {"liked": False}
    else:
        await db.video_likes.insert_one({
            "video_id": video_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc)
        })
        await db.videos.update_one({"_id": ObjectId(video_id)}, {"$inc": {"likes": 1}})
        return {"liked": True}

@router.post("/party/create")
async def create_watch_party(party: WatchPartyCreate, token: str):
    """Create a watch party"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    party_doc = {
        "video_id": party.video_id,
        "title": party.title,
        "host_id": session["user_id"],
        "participants": [session["user_id"]],
        "invited_users": party.invited_users,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.watch_parties.insert_one(party_doc)
    
    return {
        "id": str(result.inserted_id),
        "video_id": party.video_id,
        "title": party.title,
        "join_code": str(result.inserted_id)[-6:].upper()
    }

@router.get("/live/streams")
async def get_live_streams(token: str, limit: int = Query(10, ge=1, le=50)):
    """Get active live streams"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    streams = await db.videos.find({"is_live": True, "is_active": True}).limit(limit).to_list(limit)
    
    creator_ids = [str(s.get("creator_id")) for s in streams if s.get("creator_id")]
    creators_list = await db.users.find({"_id": {"$in": [ObjectId(cid) for cid in creator_ids if ObjectId.is_valid(cid)]}}).to_list(100)
    creators = {str(c["_id"]): c for c in creators_list}
    
    return {
        "streams": [serialize_video(s, creators.get(str(s.get("creator_id")))) for s in streams]
    }
