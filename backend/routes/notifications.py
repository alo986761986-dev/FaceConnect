"""
Activity/Notifications routes for FaceConnect.
Tracks likes, comments, follows, mentions, story views.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid
from .shared import db, get_current_user, exclude_id

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreate(BaseModel):
    type: Literal["like", "comment", "follow", "mention", "story_view", "follow_request", "tag", "live"]
    actor_id: str  # User who performed the action
    target_id: Optional[str] = None  # Post, story, comment ID
    content: Optional[str] = None  # Preview text


class NotificationResponse(BaseModel):
    id: str
    type: str
    actor_id: str
    actor_username: Optional[str]
    actor_avatar: Optional[str]
    target_id: Optional[str]
    target_type: Optional[str]
    target_preview: Optional[str]
    content: Optional[str]
    is_read: bool
    created_at: str


# ============== INTERNAL HELPER ==============

async def create_notification(
    user_id: str,
    notification_type: str,
    actor_id: str,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    content: Optional[str] = None
):
    """Internal function to create a notification."""
    # Don't notify yourself
    if user_id == actor_id:
        return None
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,  # Recipient
        "type": notification_type,
        "actor_id": actor_id,
        "target_id": target_id,
        "target_type": target_type,
        "content": content,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    # Update unread count
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"unread_notifications": 1}}
    )
    
    return notification


# ============== API ROUTES ==============

@router.get("")
async def get_notifications(
    token: str,
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False
):
    """Get notifications for the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"user_id": user["id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with actor info
    result = []
    for notif in notifications:
        actor = await db.users.find_one({"id": notif["actor_id"]}, {"_id": 0})
        
        # Get target preview if applicable
        target_preview = None
        if notif.get("target_id"):
            if notif.get("target_type") == "post":
                post = await db.posts.find_one({"id": notif["target_id"]})
                if post:
                    target_preview = post.get("media_url") or post.get("content", "")[:50]
            elif notif.get("target_type") == "story":
                story = await db.stories.find_one({"id": notif["target_id"]})
                if story:
                    target_preview = story.get("media_url") or story.get("content", "")[:50]
            elif notif.get("target_type") == "comment":
                comment = await db.comments.find_one({"id": notif["target_id"]})
                if comment:
                    target_preview = comment.get("content", "")[:50]
        
        result.append({
            "id": notif["id"],
            "type": notif["type"],
            "actor_id": notif["actor_id"],
            "actor_username": actor.get("username") if actor else None,
            "actor_display_name": actor.get("display_name") if actor else None,
            "actor_avatar": actor.get("avatar") if actor else None,
            "target_id": notif.get("target_id"),
            "target_type": notif.get("target_type"),
            "target_preview": target_preview,
            "content": notif.get("content"),
            "is_read": notif.get("is_read", False),
            "created_at": notif["created_at"]
        })
    
    # Get unread count
    unread_count = await db.notifications.count_documents({
        "user_id": user["id"],
        "is_read": False
    })
    
    return {
        "notifications": result,
        "unread_count": unread_count,
        "skip": skip,
        "limit": limit
    }


@router.get("/unread-count")
async def get_unread_count(token: str):
    """Get unread notification count."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "is_read": False
    })
    
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: str):
    """Mark a single notification as read."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    if result.modified_count > 0:
        await db.users.update_one(
            {"id": user["id"], "unread_notifications": {"$gt": 0}},
            {"$inc": {"unread_notifications": -1}}
        )
    
    return {"success": True}


@router.post("/read-all")
async def mark_all_notifications_read(token: str):
    """Mark all notifications as read."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"unread_notifications": 0}}
    )
    
    return {"success": True, "marked_read": result.modified_count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, token: str):
    """Delete a notification."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notif = await db.notifications.find_one({
        "id": notification_id,
        "user_id": user["id"]
    })
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.notifications.delete_one({"id": notification_id})
    
    # Decrement unread count if was unread
    if not notif.get("is_read", False):
        await db.users.update_one(
            {"id": user["id"], "unread_notifications": {"$gt": 0}},
            {"$inc": {"unread_notifications": -1}}
        )
    
    return {"success": True}


@router.delete("/clear-all")
async def clear_all_notifications(token: str):
    """Delete all notifications for the user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.notifications.delete_many({"user_id": user["id"]})
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"unread_notifications": 0}}
    )
    
    return {"success": True, "deleted_count": result.deleted_count}


# ============== NOTIFICATION TRIGGERS ==============
# These are called from other parts of the application

@router.post("/trigger/like")
async def trigger_like_notification(
    token: str,
    post_id: str
):
    """Create notification when someone likes a post."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        return {"success": False, "message": "Post not found"}
    
    await create_notification(
        user_id=post["user_id"],
        notification_type="like",
        actor_id=user["id"],
        target_id=post_id,
        target_type="post"
    )
    
    return {"success": True}


@router.post("/trigger/comment")
async def trigger_comment_notification(
    token: str,
    post_id: str,
    comment_preview: str
):
    """Create notification when someone comments on a post."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        return {"success": False, "message": "Post not found"}
    
    await create_notification(
        user_id=post["user_id"],
        notification_type="comment",
        actor_id=user["id"],
        target_id=post_id,
        target_type="post",
        content=comment_preview[:100]
    )
    
    return {"success": True}


@router.post("/trigger/follow")
async def trigger_follow_notification(
    token: str,
    followed_user_id: str
):
    """Create notification when someone follows a user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await create_notification(
        user_id=followed_user_id,
        notification_type="follow",
        actor_id=user["id"]
    )
    
    return {"success": True}


@router.post("/trigger/mention")
async def trigger_mention_notification(
    token: str,
    mentioned_user_id: str,
    post_id: str,
    content_preview: str
):
    """Create notification when someone mentions a user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await create_notification(
        user_id=mentioned_user_id,
        notification_type="mention",
        actor_id=user["id"],
        target_id=post_id,
        target_type="post",
        content=content_preview[:100]
    )
    
    return {"success": True}


@router.post("/trigger/story-view")
async def trigger_story_view_notification(
    token: str,
    story_id: str
):
    """Create notification when someone views a story."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        return {"success": False, "message": "Story not found"}
    
    # Only notify once per viewer per story
    existing = await db.notifications.find_one({
        "user_id": story["user_id"],
        "type": "story_view",
        "actor_id": user["id"],
        "target_id": story_id
    })
    
    if not existing:
        await create_notification(
            user_id=story["user_id"],
            notification_type="story_view",
            actor_id=user["id"],
            target_id=story_id,
            target_type="story"
        )
    
    return {"success": True}


# Export helper for other modules
__all__ = ["router", "create_notification"]
