"""
Users routes for FaceConnect.
Handles user management, search, profile updates, and premium features.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

from .shared import db, get_current_user, get_user_by_id

router = APIRouter(prefix="/users", tags=["Users"])


# ============== MODELS ==============
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


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None


# Placeholder for WebSocket manager - will be injected from main app
_connection_manager = None


def set_connection_manager(manager):
    """Set the WebSocket connection manager from server.py."""
    global _connection_manager
    _connection_manager = manager


def is_user_online(user_id: str) -> bool:
    """Check if user is online via WebSocket."""
    if _connection_manager:
        return _connection_manager.is_online(user_id)
    return False


# ============== ROUTES ==============
@router.get("", response_model=List[UserResponse])
async def get_users(token: str, search: Optional[str] = None):
    """Get list of users, optionally filtered by search term."""
    user = await get_current_user(token)
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
        u['is_online'] = is_user_online(u['id'])
        result.append(UserResponse(**u))
    
    return result


@router.get("/search")
async def search_users(token: str, q: str):
    """Search for users by username or display name.
    
    Note: This route must be defined before /{user_id} to avoid route conflict.
    """
    user = await get_current_user(token)
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
        u['is_online'] = is_user_online(u['id'])
        result.append(u)
    
    return result


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, token: str):
    """Get a specific user by ID."""
    current_user = await get_current_user(token)
    if not current_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user['is_online'] = is_user_online(user_id)
    return UserResponse(**user)


@router.get("/{user_id}/daily-counts")
async def get_user_daily_counts(user_id: str, token: str):
    """Get user's daily post and story counts for premium limit checking."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get today's start
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count posts today
    posts_today = await db.posts.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    })
    
    # Count stories today
    stories_today = await db.stories.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    })
    
    return {
        "posts_today": posts_today,
        "stories_today": stories_today,
        "date": today_start.isoformat()
    }


@router.post("/{user_id}/spend-coins")
async def spend_user_coins(user_id: str, token: str, amount: int, description: str = ""):
    """Spend coins from user's balance."""
    user = await get_current_user(token)
    if not user or user['id'] != user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    current_coins = user.get("coins", 0)
    if current_coins < amount:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Deduct coins
    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"coins": -amount},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Record transaction
    await db.coin_transactions.insert_one({
        "user_id": user_id,
        "amount": -amount,
        "type": "spend",
        "description": description,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"success": True, "new_balance": current_coins - amount}


@router.get("/{user_id}/post-count")
async def get_user_post_count(user_id: str, token: str):
    """Get the number of posts for a user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post_count = await db.posts.count_documents({"user_id": user_id})
    return {"user_id": user_id, "post_count": post_count}


# Export for other modules
__all__ = ["router", "set_connection_manager", "is_user_online", "UserResponse"]
