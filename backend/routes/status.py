"""
WhatsApp-style Status/Stories API endpoints
- Users can post up to 20 photo/video items per status
- Statuses expire after 24 hours
- Contacts can view status previews and full stories
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
import uuid
import os
import aiofiles

router = APIRouter(prefix="/status", tags=["status"])

# Import db from server.py
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ============== MODELS ==============
class StatusItemCreate(BaseModel):
    media_url: str
    media_type: str  # 'image' or 'video'
    caption: Optional[str] = None
    duration: Optional[int] = 5  # seconds for images, actual duration for videos

class StatusCreate(BaseModel):
    items: List[StatusItemCreate]  # Max 20 items

class StatusItemResponse(BaseModel):
    id: str
    media_url: str
    media_type: str
    caption: Optional[str] = None
    duration: int = 5
    views: List[str] = []
    created_at: datetime

class StatusResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[dict] = None
    items: List[dict] = []
    total_views: int = 0
    created_at: datetime
    expires_at: datetime
    is_viewed: bool = False

# Get database and helper functions
def get_db():
    from server import db
    return db

async def get_user_by_token(token: str):
    db = get_db()
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    return user

def serialize_user(user: dict) -> dict:
    """Convert user document to response format."""
    if not user:
        return None
    return {
        "id": user.get("id", str(user.get("_id", ""))),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "display_name": user.get("display_name"),
        "avatar": user.get("avatar"),
        "status": user.get("status", "Hey, I'm using FaceConnect!"),
        "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at"),
        "is_online": False,
        "last_seen": user.get("last_seen").isoformat() if isinstance(user.get("last_seen"), datetime) else user.get("last_seen")
    }

# ============== STATUS ENDPOINTS ==============

@router.post("")
async def create_status(status_data: StatusCreate, token: str):
    """Create a new status with up to 20 media items."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate max 20 items
    if len(status_data.items) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 items per status")
    
    if len(status_data.items) == 0:
        raise HTTPException(status_code=400, detail="At least one item required")
    
    user_id = user.get("id", str(user.get("_id", "")))
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=24)
    
    # Check if user already has an active status
    existing_status = await db.statuses.find_one({
        "user_id": user_id,
        "expires_at": {"$gt": now}
    })
    
    status_items = []
    for item in status_data.items:
        status_items.append({
            "id": str(uuid.uuid4()),
            "media_url": item.media_url,
            "media_type": item.media_type,
            "caption": item.caption,
            "duration": item.duration or 5,
            "views": [],
            "created_at": now.isoformat()
        })
    
    if existing_status:
        # Add items to existing status (if under limit)
        current_count = len(existing_status.get("items", []))
        if current_count + len(status_items) > 20:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot add {len(status_items)} items. Current status has {current_count} items (max 20)"
            )
        
        await db.statuses.update_one(
            {"_id": existing_status["_id"]},
            {"$push": {"items": {"$each": status_items}}}
        )
        
        updated_status = await db.statuses.find_one({"_id": existing_status["_id"]})
        return {
            "id": str(updated_status["_id"]),
            "user_id": user_id,
            "user": serialize_user(user),
            "items": updated_status.get("items", []),
            "total_views": updated_status.get("total_views", 0),
            "created_at": updated_status["created_at"].isoformat() if isinstance(updated_status["created_at"], datetime) else updated_status["created_at"],
            "expires_at": updated_status["expires_at"].isoformat() if isinstance(updated_status["expires_at"], datetime) else updated_status["expires_at"],
            "is_viewed": False
        }
    else:
        # Create new status
        status_id = str(uuid.uuid4())
        status_doc = {
            "_id": status_id,
            "user_id": user_id,
            "items": status_items,
            "total_views": 0,
            "created_at": now,
            "expires_at": expires_at
        }
        
        await db.statuses.insert_one(status_doc)
        
        return {
            "id": status_id,
            "user_id": user_id,
            "user": serialize_user(user),
            "items": status_items,
            "total_views": 0,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_viewed": False
        }

@router.get("/my")
async def get_my_status(token: str):
    """Get the current user's active status."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    now = datetime.now(timezone.utc)
    
    status = await db.statuses.find_one({
        "user_id": user_id,
        "expires_at": {"$gt": now}
    })
    
    if not status:
        return None
    
    return {
        "id": str(status["_id"]),
        "user_id": user_id,
        "user": serialize_user(user),
        "items": status.get("items", []),
        "total_views": status.get("total_views", 0),
        "created_at": status["created_at"].isoformat() if isinstance(status["created_at"], datetime) else status["created_at"],
        "expires_at": status["expires_at"].isoformat() if isinstance(status["expires_at"], datetime) else status["expires_at"],
        "is_viewed": True
    }

@router.get("/contacts")
async def get_contacts_statuses(token: str):
    """Get all contacts' active statuses with previews."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    now = datetime.now(timezone.utc)
    
    # Get user's contacts/friends
    friends = user.get("friends", [])
    
    # Also get people from conversations
    conversations = await db.conversations.find({
        "participants": user_id
    }).to_list(100)
    
    contact_ids = set(friends)
    for conv in conversations:
        for p in conv.get("participants", []):
            if p != user_id:
                contact_ids.add(p)
    
    # Get all active statuses from contacts
    statuses = await db.statuses.find({
        "user_id": {"$in": list(contact_ids)},
        "expires_at": {"$gt": now}
    }).sort("created_at", -1).to_list(100)
    
    result = []
    for status in statuses:
        status_user = await db.users.find_one({"id": status["user_id"]}, {"_id": 0})
        
        # Check if current user has viewed all items
        items = status.get("items", [])
        viewed_all = all(user_id in item.get("views", []) for item in items)
        
        result.append({
            "id": str(status["_id"]),
            "user_id": status["user_id"],
            "user": serialize_user(status_user),
            "items": items,
            "items_count": len(items),
            "preview_url": items[0]["media_url"] if items else None,
            "preview_type": items[0]["media_type"] if items else None,
            "total_views": status.get("total_views", 0),
            "created_at": status["created_at"].isoformat() if isinstance(status["created_at"], datetime) else status["created_at"],
            "expires_at": status["expires_at"].isoformat() if isinstance(status["expires_at"], datetime) else status["expires_at"],
            "is_viewed": viewed_all
        })
    
    return result

@router.get("/{status_id}")
async def get_status(status_id: str, token: str):
    """Get a specific status by ID."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    status = await db.statuses.find_one({"_id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    user_id = user.get("id", str(user.get("_id", "")))
    status_user = await db.users.find_one({"id": status["user_id"]}, {"_id": 0})
    
    items = status.get("items", [])
    viewed_all = all(user_id in item.get("views", []) for item in items)
    
    return {
        "id": str(status["_id"]),
        "user_id": status["user_id"],
        "user": serialize_user(status_user),
        "items": items,
        "total_views": status.get("total_views", 0),
        "created_at": status["created_at"].isoformat() if isinstance(status["created_at"], datetime) else status["created_at"],
        "expires_at": status["expires_at"].isoformat() if isinstance(status["expires_at"], datetime) else status["expires_at"],
        "is_viewed": viewed_all
    }

@router.post("/{status_id}/view/{item_id}")
async def mark_item_viewed(status_id: str, item_id: str, token: str):
    """Mark a status item as viewed by the current user."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    
    status = await db.statuses.find_one({"_id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    # Don't track views on own status
    if status["user_id"] == user_id:
        return {"success": True, "message": "Own status"}
    
    # Update the specific item's views
    await db.statuses.update_one(
        {"_id": status_id, "items.id": item_id},
        {
            "$addToSet": {"items.$.views": user_id},
            "$inc": {"total_views": 1}
        }
    )
    
    return {"success": True}

@router.get("/{status_id}/viewers")
async def get_status_viewers(status_id: str, token: str):
    """Get list of users who viewed the status (only for status owner)."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    
    status = await db.statuses.find_one({"_id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    if status["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this information")
    
    # Collect all unique viewers across all items
    all_viewers = set()
    for item in status.get("items", []):
        for viewer_id in item.get("views", []):
            all_viewers.add(viewer_id)
    
    # Fetch viewer details
    viewers = []
    for viewer_id in all_viewers:
        viewer = await db.users.find_one({"id": viewer_id}, {"_id": 0})
        if viewer:
            viewers.append(serialize_user(viewer))
    
    return {
        "total": len(viewers),
        "viewers": viewers
    }

@router.delete("/{status_id}")
async def delete_status(status_id: str, token: str):
    """Delete entire status."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    
    status = await db.statuses.find_one({"_id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    if status["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this status")
    
    await db.statuses.delete_one({"_id": status_id})
    return {"success": True}

@router.delete("/{status_id}/item/{item_id}")
async def delete_status_item(status_id: str, item_id: str, token: str):
    """Delete a single item from a status."""
    db = get_db()
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = user.get("id", str(user.get("_id", "")))
    
    status = await db.statuses.find_one({"_id": status_id})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    if status["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    # Remove the item
    await db.statuses.update_one(
        {"_id": status_id},
        {"$pull": {"items": {"id": item_id}}}
    )
    
    # Check if status is now empty
    updated_status = await db.statuses.find_one({"_id": status_id})
    if not updated_status.get("items"):
        await db.statuses.delete_one({"_id": status_id})
        return {"success": True, "status_deleted": True}
    
    return {"success": True, "status_deleted": False}

@router.post("/upload")
async def upload_status_media(
    file: UploadFile = File(...),
    token: str = Form(...)
):
    """Upload media file for status."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate file type
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="Only images and videos are allowed")
    
    # Check file size (max 50MB)
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    # Determine media type
    media_type = "image" if content_type.startswith("image/") else "video"
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    user_id = user.get("id", str(user.get("_id", "")))
    filename = f"status_{user_id}_{uuid.uuid4()}.{ext}"
    
    # Save file
    from server import UPLOAD_DIR
    file_path = UPLOAD_DIR / filename
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)
    
    # Get the base URL for uploads
    file_url = f"/api/uploads/{filename}"
    
    return {
        "media_url": file_url,
        "media_type": media_type,
        "filename": filename
    }
