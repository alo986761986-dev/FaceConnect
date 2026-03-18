"""
Close Friends feature for FaceConnect.
Allows users to share stories with a select group.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .shared import db, get_current_user, exclude_id

router = APIRouter(prefix="/close-friends", tags=["close-friends"])


class CloseFriendAdd(BaseModel):
    user_id: str


class CloseFriendResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    avatar: Optional[str]
    added_at: str


@router.get("")
async def get_close_friends(token: str):
    """Get the user's close friends list."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get close friends from user document or separate collection
    close_friend_ids = user.get("close_friends", [])
    
    if not close_friend_ids:
        return {"close_friends": [], "count": 0}
    
    # Get friend details
    friends = []
    for cf in close_friend_ids:
        friend_id = cf if isinstance(cf, str) else cf.get("user_id")
        added_at = cf.get("added_at") if isinstance(cf, dict) else None
        
        friend = await db.users.find_one({"id": friend_id}, {"_id": 0, "password": 0})
        if friend:
            friends.append({
                "id": friend["id"],
                "username": friend.get("username"),
                "display_name": friend.get("display_name"),
                "avatar": friend.get("avatar"),
                "added_at": added_at or datetime.now(timezone.utc).isoformat()
            })
    
    return {"close_friends": friends, "count": len(friends)}


@router.post("")
async def add_close_friend(data: CloseFriendAdd, token: str):
    """Add a user to close friends list."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if data.user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    
    # Check if user exists
    friend = await db.users.find_one({"id": data.user_id})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already in close friends
    current_friends = user.get("close_friends", [])
    friend_ids = [cf if isinstance(cf, str) else cf.get("user_id") for cf in current_friends]
    
    if data.user_id in friend_ids:
        raise HTTPException(status_code=400, detail="Already in close friends")
    
    # Add to close friends
    close_friend_entry = {
        "user_id": data.user_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$push": {"close_friends": close_friend_entry}}
    )
    
    return {
        "success": True,
        "message": f"Added {friend.get('username')} to close friends",
        "friend": {
            "id": friend["id"],
            "username": friend.get("username"),
            "display_name": friend.get("display_name"),
            "avatar": friend.get("avatar")
        }
    }


@router.delete("/{friend_id}")
async def remove_close_friend(friend_id: str, token: str):
    """Remove a user from close friends list."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove from close friends (handle both string and object formats)
    result = await db.users.update_one(
        {"id": user["id"]},
        {
            "$pull": {
                "close_friends": {
                    "$or": [
                        {"user_id": friend_id},
                        friend_id  # For string format
                    ]
                }
            }
        }
    )
    
    # Also try pulling string directly
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"close_friends": friend_id}}
    )
    
    return {"success": True, "message": "Removed from close friends"}


@router.get("/check/{user_id}")
async def check_close_friend(user_id: str, token: str):
    """Check if a user is in close friends list."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    close_friends = user.get("close_friends", [])
    friend_ids = [cf if isinstance(cf, str) else cf.get("user_id") for cf in close_friends]
    
    return {"is_close_friend": user_id in friend_ids}


@router.get("/suggestions")
async def get_close_friend_suggestions(token: str, limit: int = 10):
    """Get suggestions for close friends based on interactions."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get current close friends to exclude
    current_friends = user.get("close_friends", [])
    exclude_ids = [cf if isinstance(cf, str) else cf.get("user_id") for cf in current_friends]
    exclude_ids.append(user["id"])
    
    # Get users you interact with most (liked posts, messaged, etc.)
    # For now, get mutual friends
    friends = await db.friends.find({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    }).to_list(100)
    
    friend_ids = set()
    for f in friends:
        if f["user_id"] == user["id"]:
            friend_ids.add(f["friend_id"])
        else:
            friend_ids.add(f["user_id"])
    
    # Remove already close friends
    friend_ids = friend_ids - set(exclude_ids)
    
    # Get friend details
    suggestions = []
    for fid in list(friend_ids)[:limit]:
        friend = await db.users.find_one({"id": fid}, {"_id": 0, "password": 0})
        if friend:
            suggestions.append({
                "id": friend["id"],
                "username": friend.get("username"),
                "display_name": friend.get("display_name"),
                "avatar": friend.get("avatar")
            })
    
    return {"suggestions": suggestions}


# Update stories to support close friends visibility
@router.get("/stories")
async def get_close_friends_stories(token: str):
    """Get stories from close friends only."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    close_friends = user.get("close_friends", [])
    friend_ids = [cf if isinstance(cf, str) else cf.get("user_id") for cf in close_friends]
    
    if not friend_ids:
        return {"stories": []}
    
    now = datetime.now(timezone.utc)
    
    # Get stories from close friends
    stories = await db.stories.find({
        "user_id": {"$in": friend_ids},
        "expires_at": {"$gt": now.isoformat()}
    }).sort("created_at", -1).to_list(100)
    
    # Group by user
    user_stories = {}
    for story in stories:
        uid = story["user_id"]
        if uid not in user_stories:
            user_stories[uid] = []
        user_stories[uid].append(exclude_id(story))
    
    # Build response
    result = []
    for uid, stories_list in user_stories.items():
        story_user = await db.users.find_one({"id": uid}, {"_id": 0})
        if story_user:
            has_unviewed = any(user["id"] not in s.get("views", []) for s in stories_list)
            
            result.append({
                "user_id": uid,
                "username": story_user.get("username"),
                "display_name": story_user.get("display_name"),
                "avatar": story_user.get("avatar"),
                "is_close_friend": True,
                "has_unviewed": has_unviewed,
                "story_count": len(stories_list),
                "stories": stories_list
            })
    
    return {"stories": result}
