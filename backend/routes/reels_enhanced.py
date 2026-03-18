"""
Enhanced Reels features for FaceConnect.
Includes: Full-screen vertical feed, Duet/Remix, Audio library.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from .shared import db

router = APIRouter(prefix="/reels-enhanced", tags=["Reels Enhanced"])
logger = logging.getLogger(__name__)

# ============== AUDIO LIBRARY ==============

# Mock audio library (would integrate with music API in production)
AUDIO_LIBRARY = [
    {
        "id": "audio_1",
        "title": "Trending Beat",
        "artist": "Various Artists",
        "duration": 30,
        "preview_url": "/audio/trending_beat.mp3",
        "cover_url": "/images/audio_cover_1.jpg",
        "uses_count": 15420,
        "is_trending": True
    },
    {
        "id": "audio_2",
        "title": "Chill Vibes",
        "artist": "Lo-Fi Producer",
        "duration": 45,
        "preview_url": "/audio/chill_vibes.mp3",
        "cover_url": "/images/audio_cover_2.jpg",
        "uses_count": 8930,
        "is_trending": True
    },
    {
        "id": "audio_3",
        "title": "Epic Moment",
        "artist": "Cinematic Sounds",
        "duration": 20,
        "preview_url": "/audio/epic_moment.mp3",
        "cover_url": "/images/audio_cover_3.jpg",
        "uses_count": 5210,
        "is_trending": False
    },
    {
        "id": "audio_4",
        "title": "Dance Pop",
        "artist": "EDM Masters",
        "duration": 35,
        "preview_url": "/audio/dance_pop.mp3",
        "cover_url": "/images/audio_cover_4.jpg",
        "uses_count": 22100,
        "is_trending": True
    },
    {
        "id": "audio_5",
        "title": "Acoustic Morning",
        "artist": "Guitar Dreams",
        "duration": 40,
        "preview_url": "/audio/acoustic_morning.mp3",
        "cover_url": "/images/audio_cover_5.jpg",
        "uses_count": 3450,
        "is_trending": False
    }
]

@router.get("/audio/trending")
async def get_trending_audio():
    """Get trending audio tracks."""
    trending = [a for a in AUDIO_LIBRARY if a.get("is_trending")]
    return sorted(trending, key=lambda x: x["uses_count"], reverse=True)

@router.get("/audio/search")
async def search_audio(q: str):
    """Search audio library."""
    results = [
        a for a in AUDIO_LIBRARY 
        if q.lower() in a["title"].lower() or q.lower() in a["artist"].lower()
    ]
    return results

@router.get("/audio/{audio_id}")
async def get_audio_details(audio_id: str):
    """Get audio track details."""
    audio = next((a for a in AUDIO_LIBRARY if a["id"] == audio_id), None)
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    return audio

@router.get("/audio/{audio_id}/reels")
async def get_reels_using_audio(audio_id: str, skip: int = 0, limit: int = 20):
    """Get reels that use a specific audio track."""
    reels = await db.reels.find(
        {"audio_id": audio_id, "is_archived": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return reels

# ============== VERTICAL FEED ==============

@router.get("/feed")
async def get_reels_feed(user_id: str, skip: int = 0, limit: int = 10):
    """Get personalized reels feed for vertical scrolling."""
    user = await db.users.find_one({"id": user_id})
    following = user.get("following", []) if user else []
    
    # Get reels from following + trending
    pipeline = [
        {
            "$match": {
                "is_archived": {"$ne": True},
                "$or": [
                    {"user_id": {"$in": following}},
                    {"likes_count": {"$gte": 10}}  # Include popular reels
                ]
            }
        },
        {
            "$addFields": {
                "is_following": {"$in": ["$user_id", following]},
                "engagement_score": {
                    "$add": [
                        "$likes_count",
                        {"$multiply": ["$comments_count", 2]},
                        {"$multiply": ["$shares_count", 3]}
                    ]
                }
            }
        },
        {"$sort": {"is_following": -1, "engagement_score": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]
    
    reels = await db.reels.aggregate(pipeline).to_list(limit)
    
    # Enrich with user data
    for reel in reels:
        reel_user = await db.users.find_one(
            {"id": reel["user_id"]},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1, "is_premium": 1}
        )
        reel["user"] = reel_user
    
    return reels

# ============== DUET/REMIX ==============

@router.post("/reels/{reel_id}/duet")
async def create_duet(
    reel_id: str,
    user_id: str,
    video_url: str,
    layout: str = "side_by_side",  # side_by_side, top_bottom, green_screen
    caption: str = ""
):
    """Create a duet with another reel."""
    original_reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not original_reel:
        raise HTTPException(status_code=404, detail="Original reel not found")
    
    duet = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "duet",
        "video_url": video_url,
        "original_reel_id": reel_id,
        "original_reel": {
            "id": original_reel["id"],
            "user_id": original_reel["user_id"],
            "video_url": original_reel.get("video_url"),
            "thumbnail_url": original_reel.get("thumbnail_url")
        },
        "layout": layout,
        "caption": caption,
        "audio_id": original_reel.get("audio_id"),
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "views_count": 0,
        "liked_by": [],
        "created_at": datetime.now(timezone.utc),
        "is_archived": False
    }
    
    await db.reels.insert_one(duet)
    
    # Notify original creator
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": original_reel["user_id"],
        "type": "duet",
        "actor_id": user_id,
        "reel_id": duet["id"],
        "original_reel_id": reel_id,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    duet.pop("_id", None)
    return duet

@router.post("/reels/{reel_id}/remix")
async def create_remix(
    reel_id: str,
    user_id: str,
    video_url: str,
    caption: str = "",
    use_original_audio: bool = True
):
    """Create a remix of another reel."""
    original_reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not original_reel:
        raise HTTPException(status_code=404, detail="Original reel not found")
    
    remix = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "remix",
        "video_url": video_url,
        "original_reel_id": reel_id,
        "original_reel": {
            "id": original_reel["id"],
            "user_id": original_reel["user_id"]
        },
        "caption": caption,
        "audio_id": original_reel.get("audio_id") if use_original_audio else None,
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "views_count": 0,
        "liked_by": [],
        "created_at": datetime.now(timezone.utc),
        "is_archived": False
    }
    
    await db.reels.insert_one(remix)
    
    # Notify original creator
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": original_reel["user_id"],
        "type": "remix",
        "actor_id": user_id,
        "reel_id": remix["id"],
        "original_reel_id": reel_id,
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    remix.pop("_id", None)
    return remix

@router.get("/reels/{reel_id}/duets")
async def get_reel_duets(reel_id: str, skip: int = 0, limit: int = 20):
    """Get all duets of a reel."""
    duets = await db.reels.find(
        {"original_reel_id": reel_id, "type": "duet", "is_archived": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return duets

@router.get("/reels/{reel_id}/remixes")
async def get_reel_remixes(reel_id: str, skip: int = 0, limit: int = 20):
    """Get all remixes of a reel."""
    remixes = await db.reels.find(
        {"original_reel_id": reel_id, "type": "remix", "is_archived": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return remixes

# ============== REEL INTERACTIONS ==============

@router.post("/reels/{reel_id}/view")
async def record_reel_view(reel_id: str, user_id: str, watch_time: float):
    """Record a reel view with watch time."""
    await db.reels.update_one(
        {"id": reel_id},
        {
            "$inc": {"views_count": 1},
            "$addToSet": {"viewers": {"user_id": user_id, "watch_time": watch_time}}
        }
    )
    return {"success": True}

@router.post("/reels/{reel_id}/share")
async def share_reel(reel_id: str, user_id: str, share_type: str = "dm"):
    """Share a reel (dm, story, external)."""
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"shares_count": 1}}
    )
    
    # Log share for analytics
    await db.reel_shares.insert_one({
        "id": str(uuid.uuid4()),
        "reel_id": reel_id,
        "user_id": user_id,
        "share_type": share_type,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"success": True}

# ============== CREATOR TOOLS ==============

@router.get("/reels/{reel_id}/insights")
async def get_reel_insights(reel_id: str, user_id: str):
    """Get insights for a reel (creator only)."""
    reel = await db.reels.find_one({"id": reel_id}, {"_id": 0})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    if reel["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate insights
    total_views = reel.get("views_count", 0)
    total_likes = reel.get("likes_count", 0)
    total_comments = reel.get("comments_count", 0)
    total_shares = reel.get("shares_count", 0)
    
    engagement_rate = 0
    if total_views > 0:
        engagement_rate = ((total_likes + total_comments + total_shares) / total_views) * 100
    
    # Get viewer demographics (simplified)
    viewers = reel.get("viewers", [])
    avg_watch_time = 0
    if viewers:
        watch_times = [v.get("watch_time", 0) for v in viewers if isinstance(v, dict)]
        if watch_times:
            avg_watch_time = sum(watch_times) / len(watch_times)
    
    return {
        "reel_id": reel_id,
        "views": total_views,
        "likes": total_likes,
        "comments": total_comments,
        "shares": total_shares,
        "engagement_rate": round(engagement_rate, 2),
        "avg_watch_time": round(avg_watch_time, 1),
        "reach": total_views,  # Simplified
        "saves": len(reel.get("saved_by", []))
    }
