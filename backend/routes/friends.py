"""
Friends routes for FaceConnect.
Handles friend requests, friendships, and friend management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from .shared import db, get_current_user, get_user_by_id

router = APIRouter(prefix="/friends", tags=["Friends"])


# ============== MODELS ==============
class FriendRequestCreate(BaseModel):
    user_id: str


class AcceptRequest(BaseModel):
    request_id: str


class DeclineRequest(BaseModel):
    request_id: str


# ============== ROUTES ==============
@router.get("")
async def get_friends(token: str):
    """Get user's friends list."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get accepted friend relationships
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": user['id'], "status": "accepted"},
            {"user2_id": user['id'], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friends = []
    for f in friendships:
        friend_id = f['user2_id'] if f['user1_id'] == user['id'] else f['user1_id']
        friend = await get_user_by_id(friend_id)
        if friend:
            friends.append(friend)
    
    return friends


@router.get("/requests")
async def get_friend_requests(token: str):
    """Get pending friend requests received."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    requests = await db.friend_requests.find({
        "to_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for req in requests:
        from_user = await get_user_by_id(req['from_user_id'])
        result.append({
            "id": req['id'],
            "from_user_id": req['from_user_id'],
            "to_user_id": req['to_user_id'],
            "from_user": from_user,
            "status": req['status'],
            "created_at": req['created_at']
        })
    
    return result


@router.get("/sent")
async def get_sent_requests(token: str):
    """Get friend requests sent by user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    requests = await db.friend_requests.find({
        "from_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for req in requests:
        to_user = await get_user_by_id(req['to_user_id'])
        result.append({
            "id": req['id'],
            "from_user_id": req['from_user_id'],
            "to_user_id": req['to_user_id'],
            "to_user": to_user,
            "status": req['status'],
            "created_at": req['created_at']
        })
    
    return result


@router.post("/request")
async def send_friend_request(token: str, request: FriendRequestCreate):
    """Send a friend request."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if request.user_id == user['id']:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    target_user = await get_user_by_id(request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    existing = await db.friendships.find_one({
        "$or": [
            {"user1_id": user['id'], "user2_id": request.user_id},
            {"user1_id": request.user_id, "user2_id": user['id']}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "from_user_id": user['id'],
        "to_user_id": request.user_id,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already sent")
    
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    await db.friend_requests.insert_one({
        "id": request_id,
        "from_user_id": user['id'],
        "to_user_id": request.user_id,
        "status": "pending",
        "created_at": now.isoformat()
    })
    
    return {"id": request_id, "message": "Friend request sent"}


@router.post("/accept")
async def accept_friend_request(token: str, data: AcceptRequest):
    """Accept a friend request."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    request = await db.friend_requests.find_one({
        "id": data.request_id,
        "to_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Update request status
    await db.friend_requests.update_one(
        {"id": data.request_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Create friendship
    friendship_id = str(uuid.uuid4())
    await db.friendships.insert_one({
        "id": friendship_id,
        "user1_id": request['from_user_id'],
        "user2_id": user['id'],
        "status": "accepted",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Friend request accepted"}


@router.post("/decline")
async def decline_friend_request(token: str, data: DeclineRequest):
    """Decline a friend request."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friend_requests.update_one(
        {"id": data.request_id, "to_user_id": user['id'], "status": "pending"},
        {"$set": {"status": "declined"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Friend request declined"}


@router.delete("/request/{request_id}")
async def cancel_friend_request(request_id: str, token: str):
    """Cancel a sent friend request."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friend_requests.delete_one({
        "id": request_id,
        "from_user_id": user['id'],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request cancelled"}


@router.delete("/{friend_id}")
async def remove_friend(friend_id: str, token: str):
    """Remove a friend."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.friendships.delete_one({
        "$or": [
            {"user1_id": user['id'], "user2_id": friend_id},
            {"user1_id": friend_id, "user2_id": user['id']}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    return {"message": "Friend removed"}


# Export for other modules
__all__ = ["router"]
