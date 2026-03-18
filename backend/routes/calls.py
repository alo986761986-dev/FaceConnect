"""
Calls routes for FaceConnect.
Handles video/voice call initiation, answering, rejection, and WebRTC signaling.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from .shared import db, get_current_user, get_user_by_id

router = APIRouter(prefix="/calls", tags=["Calls"])


# Placeholder for WebSocket manager - will be injected from main app
_connection_manager = None


def set_connection_manager(manager):
    """Set the WebSocket connection manager from server.py."""
    global _connection_manager
    _connection_manager = manager


async def send_to_user(user_id: str, message: dict):
    """Send message to user via WebSocket."""
    if _connection_manager:
        await _connection_manager.send_to_user(user_id, message)


# ============== MODELS ==============
class CallRequest(BaseModel):
    recipient_id: str
    call_type: str  # "video" or "audio"


class CallSignal(BaseModel):
    call_id: str
    signal_type: str  # offer, answer, ice-candidate, hangup, reject, busy
    data: Optional[dict] = None


# ============== ROUTES ==============
@router.post("/initiate")
async def initiate_call(request: CallRequest, token: str):
    """Initiate a video or audio call."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    recipient = await get_user_by_id(request.recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create call record
    call_id = str(uuid.uuid4())
    call = {
        "id": call_id,
        "caller_id": user['id'],
        "caller_name": user.get('display_name', user.get('username')),
        "caller_avatar": user.get('avatar'),
        "recipient_id": request.recipient_id,
        "recipient_name": recipient.get('display_name', recipient.get('username')),
        "recipient_avatar": recipient.get('avatar'),
        "call_type": request.call_type,
        "status": "ringing",  # ringing, connected, ended, rejected, missed
        "started_at": datetime.now(timezone.utc).isoformat(),
        "connected_at": None,
        "ended_at": None
    }
    
    await db.calls.insert_one(call)
    
    # Send incoming call notification to recipient via WebSocket
    await send_to_user(request.recipient_id, {
        "type": "incoming_call",
        "call_id": call_id,
        "caller_id": user['id'],
        "caller_name": user.get('display_name', user.get('username')),
        "caller_avatar": user.get('avatar'),
        "call_type": request.call_type
    })
    
    return {
        "call_id": call_id,
        "status": "ringing",
        "recipient": {
            "id": recipient['id'],
            "username": recipient.get('username'),
            "display_name": recipient.get('display_name'),
            "avatar": recipient.get('avatar')
        }
    }


@router.post("/{call_id}/answer")
async def answer_call(call_id: str, token: str):
    """Answer an incoming call."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call['recipient_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to answer this call")
    
    if call['status'] != 'ringing':
        raise HTTPException(status_code=400, detail=f"Call is {call['status']}")
    
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"status": "connected", "connected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify caller that call was answered
    await send_to_user(call['caller_id'], {
        "type": "call_answered",
        "call_id": call_id
    })
    
    return {"status": "connected", "call_id": call_id}


@router.post("/{call_id}/reject")
async def reject_call(call_id: str, token: str):
    """Reject an incoming call."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call['recipient_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"status": "rejected", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify caller
    await send_to_user(call['caller_id'], {
        "type": "call_rejected",
        "call_id": call_id
    })
    
    return {"status": "rejected"}


@router.post("/{call_id}/end")
async def end_call(call_id: str, token: str):
    """End an ongoing call."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call['caller_id'] != user['id'] and call['recipient_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify the other party
    other_user_id = call['recipient_id'] if call['caller_id'] == user['id'] else call['caller_id']
    await send_to_user(other_user_id, {
        "type": "call_ended",
        "call_id": call_id
    })
    
    return {"status": "ended"}


@router.post("/{call_id}/signal")
async def send_call_signal(call_id: str, signal: CallSignal, token: str):
    """Send WebRTC signaling data for calls."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call['caller_id'] != user['id'] and call['recipient_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Determine the other party
    other_user_id = call['recipient_id'] if call['caller_id'] == user['id'] else call['caller_id']
    
    # Send signal to the other party
    await send_to_user(other_user_id, {
        "type": "call_signal",
        "call_id": call_id,
        "signal_type": signal.signal_type,
        "from_user_id": user['id'],
        "data": signal.data
    })
    
    return {"status": "signal_sent"}


@router.get("/history")
async def get_call_history(token: str, limit: int = 20):
    """Get user's call history."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    calls = await db.calls.find(
        {"$or": [{"caller_id": user['id']}, {"recipient_id": user['id']}]},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    
    return {"calls": calls}


# Export for other modules
__all__ = ["router", "set_connection_manager"]
