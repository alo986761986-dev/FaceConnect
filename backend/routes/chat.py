"""
Chat/Messaging routes for FaceConnect.
Handles conversations, messages, and real-time chat features.

NOTE: These routes are currently DISABLED to avoid conflicts with server.py routes.
The server.py implementation has more complete features (WebSocket broadcasting, 
push notifications). This module should be enhanced and server.py routes removed
in a future refactor.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from .shared import db, get_user_by_id

# DISABLED: Using prefix to avoid route conflicts with server.py
# The server.py conversation routes have push notifications and WebSocket broadcasting
# that this module doesn't have yet.
router = APIRouter(prefix="/chat-v2", tags=["Chat-v2-Disabled"])

# ============== MODELS ==============
class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None
    reply_to: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserResponse] = None
    content: str
    message_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None
    reply_to: Optional[str] = None
    read_by: List[str] = []
    created_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool = False

class ConversationCreate(BaseModel):
    participant_ids: List[str]
    name: Optional[str] = None
    is_group: bool = False

class ConversationResponse(BaseModel):
    id: str
    participants: List[UserResponse]
    name: Optional[str] = None
    is_group: bool = False
    last_message: Optional[Dict[str, Any]] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

# ============== ROUTES ==============
@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(data: ConversationCreate, token: str):
    """Create a new conversation (direct or group)."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Add current user to participants if not included
    participant_ids = list(set(data.participant_ids + [user['id']]))
    
    if len(participant_ids) < 2:
        raise HTTPException(status_code=400, detail="Conversation needs at least 2 participants")
    
    # For direct messages, check if conversation already exists
    if not data.is_group and len(participant_ids) == 2:
        existing = await db.conversations.find_one({
            "participant_ids": {"$all": participant_ids, "$size": 2},
            "is_group": False
        }, {"_id": 0})
        
        if existing:
            # Return existing conversation
            participants = []
            for pid in participant_ids:
                p = await get_user_by_id(pid)
                if p:
                    if isinstance(p.get('created_at'), str):
                        p['created_at'] = datetime.fromisoformat(p['created_at'])
                    participants.append(UserResponse(**p))
            
            if isinstance(existing.get('created_at'), str):
                existing['created_at'] = datetime.fromisoformat(existing['created_at'])
            if isinstance(existing.get('updated_at'), str):
                existing['updated_at'] = datetime.fromisoformat(existing['updated_at'])
            
            return ConversationResponse(
                id=existing['id'],
                participants=participants,
                name=existing.get('name'),
                is_group=existing.get('is_group', False),
                last_message=existing.get('last_message'),
                unread_count=0,
                created_at=existing['created_at'],
                updated_at=existing['updated_at']
            )
    
    conversation_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    conversation_doc = {
        "id": conversation_id,
        "participant_ids": participant_ids,
        "name": data.name,
        "is_group": data.is_group,
        "last_message": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.conversations.insert_one(conversation_doc)
    
    # Get participant details
    participants = []
    for pid in participant_ids:
        p = await get_user_by_id(pid)
        if p:
            if isinstance(p.get('created_at'), str):
                p['created_at'] = datetime.fromisoformat(p['created_at'])
            participants.append(UserResponse(**p))
    
    return ConversationResponse(
        id=conversation_id,
        participants=participants,
        name=data.name,
        is_group=data.is_group,
        last_message=None,
        unread_count=0,
        created_at=now,
        updated_at=now
    )

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(token: str):
    """Get all conversations for the current user."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get deleted conversation IDs for this user
    deleted_convos = await db.deleted_conversations.find(
        {"user_id": user["id"]},
        {"conversation_id": 1}
    ).to_list(1000)
    deleted_ids = [d["conversation_id"] for d in deleted_convos]
    
    # Get archived conversation IDs for this user
    archived_convos = await db.archived_conversations.find(
        {"user_id": user["id"]},
        {"conversation_id": 1}
    ).to_list(1000)
    archived_ids = [a["conversation_id"] for a in archived_convos]
    
    # Build query - exclude deleted conversations
    query = {"participant_ids": user['id']}
    if deleted_ids:
        query["id"] = {"$nin": deleted_ids}
    
    conversations = await db.conversations.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        # Skip archived conversations (they're fetched separately)
        if conv["id"] in archived_ids:
            continue
            
        participants = []
        for pid in conv['participant_ids']:
            p = await get_user_by_id(pid)
            if p:
                if isinstance(p.get('created_at'), str):
                    p['created_at'] = datetime.fromisoformat(p['created_at'])
                participants.append(UserResponse(**p))
        
        # Count unread messages
        unread = await db.messages.count_documents({
            "conversation_id": conv['id'],
            "sender_id": {"$ne": user['id']},
            "read_by": {"$ne": user['id']}
        })
        
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('updated_at'), str):
            conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
        
        result.append(ConversationResponse(
            id=conv['id'],
            participants=participants,
            name=conv.get('name'),
            is_group=conv.get('is_group', False),
            last_message=conv.get('last_message'),
            unread_count=unread,
            created_at=conv['created_at'],
            updated_at=conv['updated_at']
        ))
    
    return result

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(conversation_id: str, token: str, skip: int = 0, limit: int = 50):
    """Get messages in a conversation."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participant_ids": user['id']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if user has cleared this chat
    cleared = await db.cleared_chats.find_one({
        "user_id": user["id"],
        "conversation_id": conversation_id
    })
    
    # Build message query
    query = {"conversation_id": conversation_id}
    if cleared:
        # Only show messages after the cleared timestamp
        query["created_at"] = {"$gt": cleared["cleared_at"]}
    
    messages = await db.messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for msg in reversed(messages):
        sender = await get_user_by_id(msg['sender_id'])
        
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        if isinstance(msg.get('edited_at'), str):
            msg['edited_at'] = datetime.fromisoformat(msg['edited_at'])
        
        sender_response = None
        if sender:
            if isinstance(sender.get('created_at'), str):
                sender['created_at'] = datetime.fromisoformat(sender['created_at'])
            sender_response = UserResponse(**sender)
        
        result.append(MessageResponse(
            id=msg['id'],
            conversation_id=msg['conversation_id'],
            sender_id=msg['sender_id'],
            sender=sender_response,
            content=msg['content'],
            message_type=msg.get('message_type', 'text'),
            metadata=msg.get('metadata'),
            reply_to=msg.get('reply_to'),
            read_by=msg.get('read_by', []),
            created_at=msg['created_at'],
            edited_at=msg.get('edited_at'),
            is_deleted=msg.get('is_deleted', False)
        ))
    
    return result

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(conversation_id: str, message: MessageCreate, token: str):
    """Send a message in a conversation."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participant_ids": user['id']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    message_doc = {
        "id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user['id'],
        "content": message.content,
        "message_type": message.message_type,
        "metadata": message.metadata,
        "reply_to": message.reply_to,
        "read_by": [user['id']],
        "created_at": now.isoformat(),
        "is_deleted": False
    }
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation's last_message and updated_at
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {
            "last_message": {
                "content": message.content[:100],
                "sender_id": user['id'],
                "created_at": now.isoformat()
            },
            "updated_at": now.isoformat()
        }}
    )
    
    sender_response = UserResponse(
        id=user['id'],
        username=user['username'],
        display_name=user.get('display_name'),
        avatar=user.get('avatar'),
        status=user.get('status')
    )
    
    return MessageResponse(
        id=message_id,
        conversation_id=conversation_id,
        sender_id=user['id'],
        sender=sender_response,
        content=message.content,
        message_type=message.message_type,
        metadata=message.metadata,
        reply_to=message.reply_to,
        read_by=[user['id']],
        created_at=now,
        is_deleted=False
    )

@router.post("/conversations/{conversation_id}/read")
async def mark_messages_read(conversation_id: str, token: str):
    """Mark all messages in a conversation as read."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participant_ids": user['id']
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark all messages as read by this user
    result = await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": user['id']},
            "read_by": {"$ne": user['id']}
        },
        {"$push": {"read_by": user['id']}}
    )
    
    return {"success": True, "messages_read": result.modified_count}

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, token: str):
    """Delete (soft delete) a message."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    message = await db.messages.find_one({"id": message_id, "sender_id": user['id']})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"is_deleted": True, "content": "This message was deleted"}}
    )
    
    return {"success": True}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, token: str):
    """Delete a conversation and all its messages for the current user."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of the conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participant_ids": user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # For DMs, mark as deleted for this user only (soft delete)
    # For groups, remove user from participants
    if conversation.get("is_group"):
        # Remove user from group
        new_participants = [p for p in conversation.get("participant_ids", []) if p != user["id"]]
        if len(new_participants) == 0:
            # Last person left - delete conversation entirely
            await db.conversations.delete_one({"id": conversation_id})
            await db.messages.delete_many({"conversation_id": conversation_id})
        else:
            await db.conversations.update_one(
                {"id": conversation_id},
                {"$set": {"participant_ids": new_participants}}
            )
    else:
        # For DM - track deleted conversations per user
        await db.deleted_conversations.update_one(
            {"user_id": user["id"], "conversation_id": conversation_id},
            {"$set": {
                "user_id": user["id"],
                "conversation_id": conversation_id,
                "deleted_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    # Also remove from archived if present
    await db.archived_conversations.delete_one({
        "user_id": user["id"],
        "conversation_id": conversation_id
    })
    
    return {"success": True, "message": "Conversation deleted"}


@router.delete("/conversations/{conversation_id}/messages")
async def empty_conversation(conversation_id: str, token: str):
    """Empty all messages in a conversation (soft delete for this user)."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is part of the conversation
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "participant_ids": user["id"]
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Track that this user has cleared the chat from this point
    # Messages before this timestamp won't be shown to this user
    await db.cleared_chats.update_one(
        {"user_id": user["id"], "conversation_id": conversation_id},
        {"$set": {
            "user_id": user["id"],
            "conversation_id": conversation_id,
            "cleared_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Update conversation to clear last_message for this user's view
    # Note: Other participants still see their messages
    
    return {"success": True, "message": "Chat emptied"}
