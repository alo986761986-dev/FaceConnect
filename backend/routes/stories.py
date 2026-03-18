"""
Stories routes for FaceConnect - 24-hour disappearing content.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import aiofiles
from .shared import db, get_current_user, UPLOAD_DIR, exclude_id

router = APIRouter(prefix="/stories", tags=["stories"])

# Story expires after 24 hours
STORY_EXPIRY_HOURS = 24


class StoryCreate(BaseModel):
    content: Optional[str] = None
    background_color: Optional[str] = "#000000"


class StoryResponse(BaseModel):
    id: str
    user_id: str
    username: str
    display_name: Optional[str]
    avatar: Optional[str]
    content: Optional[str]
    media_url: Optional[str]
    media_type: Optional[str]
    background_color: str
    created_at: str
    expires_at: str
    view_count: int
    is_viewed: bool


@router.post("")
async def create_story(
    token: str,
    content: Optional[str] = Form(None),
    background_color: Optional[str] = Form("#000000"),
    media: Optional[UploadFile] = File(None)
):
    """Create a new story (text or media)."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=STORY_EXPIRY_HOURS)
    
    media_url = None
    media_type = None
    
    # Handle media upload
    if media and media.filename:
        ext = media.filename.split(".")[-1].lower()
        if ext in ["jpg", "jpeg", "png", "gif", "webp"]:
            media_type = "image"
        elif ext in ["mp4", "mov", "webm"]:
            media_type = "video"
        else:
            raise HTTPException(status_code=400, detail="Unsupported media type")
        
        filename = f"story_{story_id}.{ext}"
        filepath = UPLOAD_DIR / filename
        
        async with aiofiles.open(filepath, "wb") as f:
            file_content = await media.read()
            await f.write(file_content)
        
        media_url = f"/api/files/{filename}"
    
    # Must have either content or media
    if not content and not media_url:
        raise HTTPException(status_code=400, detail="Story must have content or media")
    
    story = {
        "id": story_id,
        "user_id": user["id"],
        "content": content,
        "media_url": media_url,
        "media_type": media_type,
        "background_color": background_color or "#000000",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "views": [],  # List of user_ids who viewed
        "view_count": 0
    }
    
    await db.stories.insert_one(story)
    
    return {
        "id": story_id,
        "message": "Story created successfully",
        "expires_at": expires_at.isoformat()
    }


@router.get("/feed")
async def get_stories_feed(token: str):
    """Get stories from followed users and own stories."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    now = datetime.now(timezone.utc)
    
    # Get user's friends/following list
    friends = await db.friends.find({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    }).to_list(1000)
    
    friend_ids = set()
    for f in friends:
        if f["user_id"] == user["id"]:
            friend_ids.add(f["friend_id"])
        else:
            friend_ids.add(f["user_id"])
    
    # Include own stories
    friend_ids.add(user["id"])
    
    # Get non-expired stories from friends
    stories = await db.stories.find({
        "user_id": {"$in": list(friend_ids)},
        "expires_at": {"$gt": now.isoformat()}
    }).sort("created_at", -1).to_list(100)
    
    # Group stories by user
    user_stories = {}
    for story in stories:
        uid = story["user_id"]
        if uid not in user_stories:
            user_stories[uid] = []
        user_stories[uid].append(story)
    
    # Build response with user info
    result = []
    for uid, stories_list in user_stories.items():
        story_user = await db.users.find_one({"id": uid}, {"_id": 0})
        if story_user:
            # Check if any story is unviewed
            has_unviewed = any(user["id"] not in s.get("views", []) for s in stories_list)
            
            result.append({
                "user_id": uid,
                "username": story_user.get("username"),
                "display_name": story_user.get("display_name"),
                "avatar": story_user.get("avatar"),
                "has_unviewed": has_unviewed,
                "story_count": len(stories_list),
                "latest_story": stories_list[0]["created_at"],
                "stories": [
                    {
                        "id": s["id"],
                        "content": s.get("content"),
                        "media_url": s.get("media_url"),
                        "media_type": s.get("media_type"),
                        "background_color": s.get("background_color", "#000000"),
                        "created_at": s["created_at"],
                        "expires_at": s["expires_at"],
                        "view_count": s.get("view_count", 0),
                        "is_viewed": user["id"] in s.get("views", [])
                    }
                    for s in stories_list
                ]
            })
    
    # Sort: own stories first, then by has_unviewed, then by latest
    result.sort(key=lambda x: (
        x["user_id"] != user["id"],  # Own stories first
        not x["has_unviewed"],  # Unviewed first
        x["latest_story"]
    ), reverse=False)
    
    return {"stories": result}


@router.get("/{story_id}")
async def get_story(story_id: str, token: str):
    """Get a single story by ID."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story = await db.stories.find_one({"id": story_id}, {"_id": 0})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check if expired
    now = datetime.now(timezone.utc)
    if story["expires_at"] < now.isoformat():
        raise HTTPException(status_code=404, detail="Story has expired")
    
    story_user = await db.users.find_one({"id": story["user_id"]}, {"_id": 0})
    
    return {
        **story,
        "username": story_user.get("username") if story_user else None,
        "display_name": story_user.get("display_name") if story_user else None,
        "avatar": story_user.get("avatar") if story_user else None,
        "is_viewed": user["id"] in story.get("views", [])
    }


@router.post("/{story_id}/view")
async def mark_story_viewed(story_id: str, token: str):
    """Mark a story as viewed by the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Add user to views if not already viewed
    if user["id"] not in story.get("views", []):
        await db.stories.update_one(
            {"id": story_id},
            {
                "$addToSet": {"views": user["id"]},
                "$inc": {"view_count": 1}
            }
        )
    
    return {"message": "Story marked as viewed"}


@router.get("/{story_id}/viewers")
async def get_story_viewers(story_id: str, token: str):
    """Get list of users who viewed a story (only for story owner)."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Only owner can see viewers
    if story["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only story owner can view this")
    
    viewer_ids = story.get("views", [])
    viewers = []
    
    for vid in viewer_ids:
        viewer = await db.users.find_one({"id": vid}, {"_id": 0, "password": 0})
        if viewer:
            viewers.append({
                "id": viewer["id"],
                "username": viewer.get("username"),
                "display_name": viewer.get("display_name"),
                "avatar": viewer.get("avatar")
            })
    
    return {"viewers": viewers, "count": len(viewers)}


@router.delete("/{story_id}")
async def delete_story(story_id: str, token: str):
    """Delete a story (only by owner)."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this story")
    
    await db.stories.delete_one({"id": story_id})
    
    return {"message": "Story deleted successfully"}


# Cleanup task - can be called periodically
@router.post("/cleanup")
async def cleanup_expired_stories():
    """Remove expired stories (admin/cron task)."""
    now = datetime.now(timezone.utc)
    result = await db.stories.delete_many({
        "expires_at": {"$lt": now.isoformat()}
    })
    return {"deleted_count": result.deleted_count}
