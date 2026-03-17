"""
Reels routes for FaceConnect.
Handles reels CRUD, likes, comments, and sharing.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from .shared import db, get_user_by_id

router = APIRouter(prefix="/reels", tags=["Reels"])

# ============== MODELS ==============
class ReelCreate(BaseModel):
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None

class ReelCommentCreate(BaseModel):
    content: str

class ReelUserResponse(BaseModel):
    id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class ReelResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[ReelUserResponse] = None
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_liked: bool = False
    created_at: datetime

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

# ============== ROUTES ==============
@router.post("", response_model=ReelResponse)
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
        user=ReelUserResponse(
            id=user['id'],
            username=user.get('username'),
            display_name=user.get('display_name'),
            avatar=user.get('avatar')
        ),
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

@router.get("", response_model=List[ReelResponse])
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
        author = await get_user_by_id(reel['user_id'])
        is_liked = user['id'] in reel.get('likes', [])
        
        created_at = reel.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ReelResponse(
            id=reel['id'],
            user_id=reel['user_id'],
            user=ReelUserResponse(
                id=author['id'],
                username=author.get('username'),
                display_name=author.get('display_name'),
                avatar=author.get('avatar')
            ) if author else None,
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

@router.get("/{reel_id}", response_model=ReelResponse)
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
        user=ReelUserResponse(
            id=author['id'],
            username=author.get('username'),
            display_name=author.get('display_name'),
            avatar=author.get('avatar')
        ) if author else None,
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

@router.post("/{reel_id}/like")
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
        await db.reels.update_one(
            {"id": reel_id},
            {"$pull": {"likes": user['id']}}
        )
        return {"liked": False, "likes_count": len(likes) - 1}
    else:
        await db.reels.update_one(
            {"id": reel_id},
            {"$addToSet": {"likes": user['id']}}
        )
        return {"liked": True, "likes_count": len(likes) + 1}

@router.patch("/{reel_id}/settings")
async def update_reel_settings(reel_id: str, token: str, request: Request):
    """Update reel visibility/interaction settings (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    if reel['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only reel owner can update settings")
    
    data = await request.json()
    allowed_settings = ['hideLikes', 'hideShares', 'disableComments']
    
    update_data = {}
    for key in allowed_settings:
        if key in data:
            db_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key]).lstrip('_')
            update_data[db_key] = data[key]
    
    if update_data:
        await db.reels.update_one(
            {"id": reel_id},
            {"$set": update_data}
        )
    
    return {"success": True, "updated": update_data}

@router.post("/{reel_id}/archive")
async def toggle_archive_reel(reel_id: str, token: str):
    """Toggle archive status on a reel (owner only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reel = await db.reels.find_one({"id": reel_id})
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found")
    
    if reel['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only reel owner can archive")
    
    is_archived = not reel.get('is_archived', False)
    
    await db.reels.update_one(
        {"id": reel_id},
        {"$set": {"is_archived": is_archived}}
    )
    
    return {"is_archived": is_archived}

@router.get("/{reel_id}/comments")
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
            "user": {
                "id": author['id'],
                "username": author.get('username'),
                "display_name": author.get('display_name'),
                "avatar": author.get('avatar')
            } if author else None,
            "content": comment['content'],
            "likes_count": len(comment.get('likes', [])),
            "is_liked": user['id'] in comment.get('likes', []),
            "created_at": created_at
        })
    
    return result

@router.post("/{reel_id}/comments")
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
    
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return {
        "id": comment_id,
        "reel_id": reel_id,
        "user_id": user['id'],
        "user": {
            "id": user['id'],
            "username": user.get('username'),
            "display_name": user.get('display_name'),
            "avatar": user.get('avatar')
        },
        "content": comment.content,
        "likes_count": 0,
        "is_liked": False,
        "created_at": now
    }

@router.delete("/{reel_id}/comments/{comment_id}")
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
    
    await db.reels.update_one(
        {"id": reel_id},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}

@router.post("/{reel_id}/comments/{comment_id}/like")
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

@router.post("/{reel_id}/share")
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

@router.delete("/{reel_id}")
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
    
    await db.reels.delete_one({"id": reel_id})
    await db.reel_comments.delete_many({"reel_id": reel_id})
    
    return {"message": "Reel deleted"}
