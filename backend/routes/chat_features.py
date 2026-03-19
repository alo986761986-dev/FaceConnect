"""
Chat Features API Routes
Handles Block, Mute, Nicknames, Archive, and Star functionality for conversations
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/chat", tags=["Chat Features"])

def get_db():
    from server import db
    return db

async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    db = get_db()
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    return user

# ============== MODELS ==============
class BlockUserRequest(BaseModel):
    user_id: str

class MuteConversationRequest(BaseModel):
    conversation_id: str
    duration: Optional[str] = "forever"  # "8h", "1w", "forever"

class NicknameRequest(BaseModel):
    conversation_id: str
    user_id: str
    nickname: str

class ArchiveConversationRequest(BaseModel):
    conversation_id: str

class StarMessageRequest(BaseModel):
    message_id: str

# ============== BLOCK ROUTES ==============
@router.post("/block")
async def block_user(request: BlockUserRequest, token: str):
    """Block a user"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if request.user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if already blocked
    existing = await db.blocked_users.find_one({
        "blocker_id": user["id"],
        "blocked_id": request.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="User already blocked")
    
    await db.blocked_users.insert_one({
        "id": str(uuid.uuid4()),
        "blocker_id": user["id"],
        "blocked_id": request.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "message": "User blocked"}

@router.post("/unblock")
async def unblock_user(request: BlockUserRequest, token: str):
    """Unblock a user"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.blocked_users.delete_one({
        "blocker_id": user["id"],
        "blocked_id": request.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    
    return {"success": True, "message": "User unblocked"}

@router.get("/blocked")
async def get_blocked_users(token: str):
    """Get list of blocked users"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    blocked = await db.blocked_users.find(
        {"blocker_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Get user details for blocked users
    blocked_ids = [b["blocked_id"] for b in blocked]
    users = await db.users.find(
        {"id": {"$in": blocked_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    users_map = {u["id"]: u for u in users}
    
    result = []
    for b in blocked:
        blocked_user = users_map.get(b["blocked_id"])
        if blocked_user:
            result.append({
                "id": b["blocked_id"],
                "username": blocked_user.get("username"),
                "display_name": blocked_user.get("display_name"),
                "avatar": blocked_user.get("avatar"),
                "blocked_at": b["created_at"]
            })
    
    return {"blocked_users": result}

@router.get("/is-blocked/{user_id}")
async def check_if_blocked(user_id: str, token: str):
    """Check if a user is blocked"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    blocked = await db.blocked_users.find_one({
        "blocker_id": user["id"],
        "blocked_id": user_id
    })
    
    return {"is_blocked": blocked is not None}

# ============== MUTE ROUTES ==============
@router.post("/mute")
async def mute_conversation(request: MuteConversationRequest, token: str):
    """Mute a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Calculate mute expiry
    mute_until = None
    if request.duration == "8h":
        mute_until = (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()
    elif request.duration == "1w":
        mute_until = (datetime.now(timezone.utc) + timedelta(weeks=1)).isoformat()
    # "forever" = None (no expiry)
    
    # Upsert mute record
    await db.muted_conversations.update_one(
        {"user_id": user["id"], "conversation_id": request.conversation_id},
        {"$set": {
            "user_id": user["id"],
            "conversation_id": request.conversation_id,
            "mute_until": mute_until,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "mute_until": mute_until}

@router.post("/unmute")
async def unmute_conversation(request: ArchiveConversationRequest, token: str):
    """Unmute a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.muted_conversations.delete_one({
        "user_id": user["id"],
        "conversation_id": request.conversation_id
    })
    
    return {"success": True, "was_muted": result.deleted_count > 0}

@router.get("/muted")
async def get_muted_conversations(token: str):
    """Get list of muted conversations"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    now = datetime.now(timezone.utc)
    
    # Get all muted conversations
    muted = await db.muted_conversations.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Filter out expired mutes and clean them up
    active_mutes = []
    expired_ids = []
    
    for m in muted:
        if m.get("mute_until"):
            mute_until = datetime.fromisoformat(m["mute_until"].replace('Z', '+00:00'))
            if now > mute_until:
                expired_ids.append(m["conversation_id"])
                continue
        active_mutes.append({
            "conversation_id": m["conversation_id"],
            "mute_until": m.get("mute_until")
        })
    
    # Clean up expired mutes
    if expired_ids:
        await db.muted_conversations.delete_many({
            "user_id": user["id"],
            "conversation_id": {"$in": expired_ids}
        })
    
    return {"muted_conversations": active_mutes}

@router.get("/is-muted/{conversation_id}")
async def check_if_muted(conversation_id: str, token: str):
    """Check if a conversation is muted"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    mute = await db.muted_conversations.find_one({
        "user_id": user["id"],
        "conversation_id": conversation_id
    })
    
    if not mute:
        return {"is_muted": False}
    
    # Check if mute has expired
    if mute.get("mute_until"):
        mute_until = datetime.fromisoformat(mute["mute_until"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > mute_until:
            # Clean up expired mute
            await db.muted_conversations.delete_one({"_id": mute["_id"]})
            return {"is_muted": False}
    
    return {"is_muted": True, "mute_until": mute.get("mute_until")}

# ============== NICKNAME ROUTES ==============
@router.post("/nickname")
async def set_nickname(request: NicknameRequest, token: str):
    """Set a nickname for a user in a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of the conversation
    conversation = await db.conversations.find_one({
        "id": request.conversation_id,
        "participant_ids": user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Upsert nickname
    await db.nicknames.update_one(
        {
            "setter_id": user["id"],
            "conversation_id": request.conversation_id,
            "target_user_id": request.user_id
        },
        {"$set": {
            "setter_id": user["id"],
            "conversation_id": request.conversation_id,
            "target_user_id": request.user_id,
            "nickname": request.nickname,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "nickname": request.nickname}

@router.delete("/nickname")
async def remove_nickname(conversation_id: str, user_id: str, token: str):
    """Remove a nickname for a user"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.nicknames.delete_one({
        "setter_id": user["id"],
        "conversation_id": conversation_id,
        "target_user_id": user_id
    })
    
    return {"success": True}

@router.get("/nicknames/{conversation_id}")
async def get_nicknames(conversation_id: str, token: str):
    """Get all nicknames in a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    nicknames = await db.nicknames.find(
        {
            "conversation_id": conversation_id,
            "$or": [
                {"setter_id": user["id"]},
                {"target_user_id": user["id"]}
            ]
        },
        {"_id": 0}
    ).to_list(50)
    
    return {"nicknames": nicknames}

# ============== ARCHIVE ROUTES ==============
@router.post("/archive")
async def archive_conversation(request: ArchiveConversationRequest, token: str):
    """Archive a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of the conversation
    conversation = await db.conversations.find_one({
        "id": request.conversation_id,
        "participant_ids": user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Upsert archive record
    await db.archived_conversations.update_one(
        {"user_id": user["id"], "conversation_id": request.conversation_id},
        {"$set": {
            "user_id": user["id"],
            "conversation_id": request.conversation_id,
            "archived_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "archived": True}

@router.post("/unarchive")
async def unarchive_conversation(request: ArchiveConversationRequest, token: str):
    """Unarchive a conversation"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.archived_conversations.delete_one({
        "user_id": user["id"],
        "conversation_id": request.conversation_id
    })
    
    return {"success": True, "was_archived": result.deleted_count > 0}

@router.get("/archived")
async def get_archived_conversations(token: str, limit: int = Query(50, ge=1, le=100)):
    """Get list of archived conversations with details"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get archived conversation IDs
    archived = await db.archived_conversations.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(limit)
    
    archived_ids = [a["conversation_id"] for a in archived]
    
    if not archived_ids:
        return {"conversations": []}
    
    # Get conversation details
    conversations = await db.conversations.find(
        {"id": {"$in": archived_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    # Format response
    result = []
    for conv in conversations:
        # Get other participant info for DM
        other_user = None
        if not conv.get("is_group"):
            other_id = next((pid for pid in conv.get("participant_ids", []) if pid != user["id"]), None)
            if other_id:
                other_user = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0})
        
        result.append({
            "id": conv["id"],
            "name": conv.get("name") or (other_user.get("display_name") if other_user else "Unknown"),
            "avatar": other_user.get("avatar") if other_user else None,
            "is_group": conv.get("is_group", False),
            "last_message": conv.get("last_message"),
            "archived_at": next((a["archived_at"] for a in archived if a["conversation_id"] == conv["id"]), None)
        })
    
    return {"conversations": result}

# ============== STARRED MESSAGES ROUTES ==============
@router.post("/star")
async def star_message(request: StarMessageRequest, token: str):
    """Star a message"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify message exists
    message = await db.messages.find_one({"id": request.message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if already starred
    existing = await db.starred_messages.find_one({
        "user_id": user["id"],
        "message_id": request.message_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Message already starred")
    
    await db.starred_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "message_id": request.message_id,
        "conversation_id": message.get("conversation_id"),
        "starred_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "starred": True}

@router.post("/unstar")
async def unstar_message(request: StarMessageRequest, token: str):
    """Unstar a message"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.starred_messages.delete_one({
        "user_id": user["id"],
        "message_id": request.message_id
    })
    
    return {"success": True, "was_starred": result.deleted_count > 0}

@router.get("/starred")
async def get_starred_messages(token: str, limit: int = Query(50, ge=1, le=100)):
    """Get list of starred messages with details"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get starred message records
    starred = await db.starred_messages.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("starred_at", -1).to_list(limit)
    
    message_ids = [s["message_id"] for s in starred]
    
    if not message_ids:
        return {"messages": []}
    
    # Get message details
    messages = await db.messages.find(
        {"id": {"$in": message_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    messages_map = {m["id"]: m for m in messages}
    
    # Get sender info
    sender_ids = list(set(m.get("sender_id") for m in messages if m.get("sender_id")))
    senders = await db.users.find(
        {"id": {"$in": sender_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    senders_map = {s["id"]: s for s in senders}
    
    # Format response
    result = []
    for s in starred:
        msg = messages_map.get(s["message_id"])
        if msg:
            sender = senders_map.get(msg.get("sender_id"))
            result.append({
                "id": s["message_id"],
                "text": msg.get("content"),
                "from": sender.get("display_name") or sender.get("username") if sender else "Unknown",
                "sender_avatar": sender.get("avatar") if sender else None,
                "conversation_id": msg.get("conversation_id"),
                "date": msg.get("created_at"),
                "starred_at": s["starred_at"]
            })
    
    return {"messages": result}

@router.get("/is-starred/{message_id}")
async def check_if_starred(message_id: str, token: str):
    """Check if a message is starred"""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    starred = await db.starred_messages.find_one({
        "user_id": user["id"],
        "message_id": message_id
    })
    
    return {"is_starred": starred is not None}
