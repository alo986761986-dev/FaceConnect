"""
Memories API Routes
Handles memories, on-this-day, and memory collections
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId

router = APIRouter(prefix="/memories", tags=["Memories"])

def get_db():
    from server import db
    return db

# Pydantic Models
class MemoryCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_urls: List[str] = []
    location: Optional[str] = None
    tagged_users: Optional[List[str]] = []
    memory_date: Optional[datetime] = None

# Helper functions
def serialize_memory(memory: dict, user: dict = None) -> dict:
    return {
        "id": str(memory["_id"]),
        "title": memory.get("title"),
        "description": memory.get("description"),
        "media_urls": memory.get("media_urls", []),
        "location": memory.get("location"),
        "tagged_users": memory.get("tagged_users", []),
        "memory_date": memory.get("memory_date", memory.get("created_at", datetime.now(timezone.utc))).isoformat(),
        "user_id": str(memory.get("user_id", "")),
        "user_name": user.get("display_name", user.get("username", "")) if user else "",
        "user_avatar": user.get("avatar") if user else None,
        "years_ago": calculate_years_ago(memory.get("memory_date", memory.get("created_at"))),
        "created_at": memory.get("created_at", datetime.now(timezone.utc)).isoformat()
    }

def calculate_years_ago(date: datetime) -> int:
    if not date:
        return 0
    now = datetime.now(timezone.utc)
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return (now - date).days // 365

# Routes
@router.get("/today")
async def get_today_memories(token: str):
    """Get memories from this day in past years"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    today = datetime.now(timezone.utc)
    
    # Find posts from this day in previous years
    memories = []
    
    # Check posts
    posts = list(db.posts.find({
        "user_id": user_id,
        "$expr": {
            "$and": [
                {"$eq": [{"$dayOfMonth": "$created_at"}, today.day]},
                {"$eq": [{"$month": "$created_at"}, today.month]},
                {"$lt": [{"$year": "$created_at"}, today.year]}
            ]
        }
    }).sort("created_at", -1).limit(20))
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    for post in posts:
        memory = {
            "_id": post["_id"],
            "title": "Memory",
            "description": post.get("content", ""),
            "media_urls": post.get("images", []),
            "location": post.get("location"),
            "tagged_users": [],
            "memory_date": post.get("created_at"),
            "user_id": user_id,
            "created_at": post.get("created_at"),
            "source": "post",
            "source_id": str(post["_id"])
        }
        memories.append(serialize_memory(memory, user))
    
    # Also check dedicated memories collection
    saved_memories = list(db.memories.find({
        "user_id": user_id,
        "$expr": {
            "$and": [
                {"$eq": [{"$dayOfMonth": "$memory_date"}, today.day]},
                {"$eq": [{"$month": "$memory_date"}, today.month]}
            ]
        }
    }))
    
    for mem in saved_memories:
        memories.append(serialize_memory(mem, user))
    
    return {
        "date": today.strftime("%B %d"),
        "memories": memories,
        "has_memories": len(memories) > 0
    }

@router.get("/all")
async def get_all_memories(
    token: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get all memories with optional filters"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    query = {"user_id": user_id}
    
    # Add date filters
    if year:
        start = datetime(year, 1, 1, tzinfo=timezone.utc)
        end = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        query["memory_date"] = {"$gte": start, "$lte": end}
    if month and year:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
        query["memory_date"] = {"$gte": start, "$lte": end}
    
    skip = (page - 1) * limit
    memories = list(db.memories.find(query).sort("memory_date", -1).skip(skip).limit(limit))
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    return {
        "memories": [serialize_memory(m, user) for m in memories],
        "page": page,
        "has_more": len(memories) == limit
    }

@router.get("/years")
async def get_memory_years(token: str):
    """Get years that have memories"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Aggregate years from posts
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": {"$year": "$created_at"}}},
        {"$sort": {"_id": -1}}
    ]
    
    post_years = [doc["_id"] for doc in db.posts.aggregate(pipeline)]
    
    # Also get years from memories collection
    memory_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": {"$year": "$memory_date"}}},
        {"$sort": {"_id": -1}}
    ]
    
    memory_years = [doc["_id"] for doc in db.memories.aggregate(memory_pipeline)]
    
    # Combine and dedupe
    all_years = sorted(set(post_years + memory_years), reverse=True)
    
    return {"years": all_years}

@router.post("/create")
async def create_memory(memory: MemoryCreate, token: str):
    """Create a new memory"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    memory_doc = {
        "user_id": session["user_id"],
        "title": memory.title,
        "description": memory.description,
        "media_urls": memory.media_urls,
        "location": memory.location,
        "tagged_users": memory.tagged_users,
        "memory_date": memory.memory_date or datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.memories.insert_one(memory_doc)
    memory_doc["_id"] = result.inserted_id
    
    user = db.users.find_one({"_id": ObjectId(session["user_id"])})
    return serialize_memory(memory_doc, user)

@router.post("/share/{memory_id}")
async def share_memory(memory_id: str, token: str):
    """Share a memory as a post"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    memory = db.memories.find_one({"_id": ObjectId(memory_id), "user_id": session["user_id"]})
    if not memory:
        # Check if it's a post-based memory
        post = db.posts.find_one({"_id": ObjectId(memory_id), "user_id": session["user_id"]})
        if not post:
            raise HTTPException(status_code=404, detail="Memory not found")
        memory = post
    
    years_ago = calculate_years_ago(memory.get("memory_date", memory.get("created_at")))
    
    # Create a new post sharing this memory
    new_post = {
        "user_id": session["user_id"],
        "content": f"Remembering this moment from {years_ago} year{'s' if years_ago != 1 else ''} ago! 📸",
        "images": memory.get("media_urls", memory.get("images", [])),
        "is_memory_share": True,
        "original_memory_id": str(memory["_id"]),
        "original_date": memory.get("memory_date", memory.get("created_at")),
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.posts.insert_one(new_post)
    
    return {
        "post_id": str(result.inserted_id),
        "success": True
    }

@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, token: str):
    """Delete a memory"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    memory = db.memories.find_one({
        "_id": ObjectId(memory_id),
        "user_id": session["user_id"]
    })
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    db.memories.delete_one({"_id": ObjectId(memory_id)})
    return {"success": True}

@router.post("/hide/{memory_id}")
async def hide_memory(memory_id: str, token: str):
    """Hide a memory from 'On This Day'"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db.hidden_memories.insert_one({
        "user_id": session["user_id"],
        "memory_id": memory_id,
        "hidden_at": datetime.now(timezone.utc)
    })
    
    return {"success": True}
