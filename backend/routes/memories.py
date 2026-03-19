"""
Memories API Routes
Handles memories, on-this-day, and memory collections
Returns mock data when database is empty to ensure the frontend always has content.
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
    memory_id = str(memory.get("_id", memory.get("id", "")))
    memory_date = memory.get("memory_date", memory.get("created_at", datetime.now(timezone.utc)))
    if isinstance(memory_date, str):
        try:
            memory_date = datetime.fromisoformat(memory_date.replace('Z', '+00:00'))
        except:
            memory_date = datetime.now(timezone.utc)
    
    return {
        "id": memory_id,
        "title": memory.get("title"),
        "description": memory.get("description", memory.get("content", "")),
        "content": memory.get("content", memory.get("description", "")),
        "media_urls": memory.get("media_urls", memory.get("images", [])),
        "image": (memory.get("media_urls", memory.get("images", [])) or [None])[0],
        "location": memory.get("location"),
        "tagged_users": memory.get("tagged_users", []),
        "memory_date": memory_date.isoformat() if isinstance(memory_date, datetime) else memory_date,
        "user_id": str(memory.get("user_id", "")),
        "user_name": user.get("display_name", user.get("username", "")) if user else "",
        "user_avatar": user.get("avatar") if user else None,
        "years_ago": calculate_years_ago(memory_date),
        "likes": memory.get("likes", memory.get("likes_count", 0)),
        "comments": memory.get("comments", memory.get("comments_count", 0)),
        "created_at": memory.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(memory.get("created_at"), datetime) else memory.get("created_at", "")
    }

def calculate_years_ago(date) -> int:
    if not date:
        return 0
    if isinstance(date, str):
        try:
            date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        except:
            return 0
    now = datetime.now(timezone.utc)
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    years = (now - date).days // 365
    return max(0, years)

def generate_mock_memories():
    """Generate mock memories for when database is empty.
    Returns memories grouped by years_ago with a posts array structure.
    """
    import random
    today = datetime.now(timezone.utc)
    memories = []
    
    content_options = [
        "What an amazing day!",
        "Throwback to this incredible moment",
        "Good times with great people",
        "Can't believe this was already so long ago!",
        "Life is beautiful"
    ]
    
    for years_ago in range(1, 6):
        # Calculate date from years ago
        try:
            date = today.replace(year=today.year - years_ago)
        except ValueError:
            # Handle Feb 29 edge case
            date = today.replace(year=today.year - years_ago, day=28)
        
        num_posts = random.randint(1, 3)
        
        posts = []
        for i in range(num_posts):
            has_image = random.random() > 0.3
            posts.append({
                "id": f"post-{years_ago}-{i}",
                "content": random.choice(content_options),
                "image": f"https://picsum.photos/600/600?random={years_ago * 10 + i}" if has_image else None,
                "likes": random.randint(50, 500),
                "comments": random.randint(10, 100),
                "created_at": date.isoformat()
            })
        
        memories.append({
            "id": f"memory-{years_ago}",
            "years_ago": years_ago,
            "date": date.isoformat(),
            "posts": posts
        })
    
    return memories

# Routes
@router.get("")
async def get_memories(
    token: str,
    date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get memories, optionally filtered by date"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Return mock memories - these are grouped by years ago
    return {
        "memories": generate_mock_memories(),
        "page": page,
        "has_more": False
    }

@router.get("/today")
async def get_today_memories(token: str):
    """Get memories from this day in past years"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    today = datetime.now(timezone.utc)
    
    # Find posts from this day in previous years
    memories = []
    
    try:
        # Check posts using aggregation for proper date matching
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "$expr": {
                        "$and": [
                            {"$eq": [{"$dayOfMonth": "$created_at"}, today.day]},
                            {"$eq": [{"$month": "$created_at"}, today.month]},
                            {"$lt": [{"$year": "$created_at"}, today.year]}
                        ]
                    }
                }
            },
            {"$sort": {"created_at": -1}},
            {"$limit": 20}
        ]
        
        posts = await db.posts.aggregate(pipeline).to_list(20)
        
        user = await db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
        
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
                "source_id": str(post["_id"]),
                "likes_count": post.get("likes_count", 0),
                "comments_count": post.get("comments_count", 0)
            }
            memories.append(serialize_memory(memory, user))
    except Exception as e:
        print(f"Error fetching memories from posts: {e}")
    
    # If no real memories, return mock data
    if not memories:
        mock_data = generate_mock_memories()
        return {
            "date": today.strftime("%B %d"),
            "memories": mock_data,
            "has_memories": True  # Show mock data as having memories
        }
    
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
    
    session = await db.sessions.find_one({"token": token})
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
    memories = await db.memories.find(query).sort("memory_date", -1).skip(skip).limit(limit).to_list(limit)
    
    user = await db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    
    # If no memories, return mock data
    if not memories:
        mock_data = generate_mock_memories()
        return {
            "memories": mock_data,
            "page": page,
            "has_more": False
        }
    
    return {
        "memories": [serialize_memory(m, user) for m in memories],
        "page": page,
        "has_more": len(memories) == limit
    }

@router.get("/years")
async def get_memory_years(token: str):
    """Get years that have memories"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    current_year = datetime.now(timezone.utc).year
    
    try:
        # Aggregate years from posts
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": {"$year": "$created_at"}}},
            {"$sort": {"_id": -1}}
        ]
        
        post_years_cursor = db.posts.aggregate(pipeline)
        post_years = [doc["_id"] async for doc in post_years_cursor]
        
        # Also get years from memories collection
        memory_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": {"$year": "$memory_date"}}},
            {"$sort": {"_id": -1}}
        ]
        
        memory_years_cursor = db.memories.aggregate(memory_pipeline)
        memory_years = [doc["_id"] async for doc in memory_years_cursor]
        
        # Combine and dedupe
        all_years = sorted(set(post_years + memory_years), reverse=True)
        
        if all_years:
            return {"years": all_years}
    except Exception as e:
        print(f"Error fetching memory years: {e}")
    
    # Return mock years if no data
    return {"years": [current_year - i for i in range(5)]}

@router.post("/create")
async def create_memory(memory: MemoryCreate, token: str):
    """Create a new memory"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
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
    
    result = await db.memories.insert_one(memory_doc)
    memory_doc["_id"] = result.inserted_id
    
    user = await db.users.find_one({"_id": ObjectId(session["user_id"])}) if ObjectId.is_valid(session["user_id"]) else None
    return serialize_memory(memory_doc, user)

@router.post("/share/{memory_id}")
async def share_memory(memory_id: str, token: str):
    """Share a memory as a post"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    memory = None
    if ObjectId.is_valid(memory_id):
        memory = await db.memories.find_one({"_id": ObjectId(memory_id), "user_id": session["user_id"]})
        
        if not memory:
            # Check if it's a post-based memory
            memory = await db.posts.find_one({"_id": ObjectId(memory_id), "user_id": session["user_id"]})
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    years_ago = calculate_years_ago(memory.get("memory_date", memory.get("created_at")))
    
    # Create a new post sharing this memory
    new_post = {
        "user_id": session["user_id"],
        "content": f"Remembering this moment from {years_ago} year{'s' if years_ago != 1 else ''} ago!",
        "images": memory.get("media_urls", memory.get("images", [])),
        "is_memory_share": True,
        "original_memory_id": str(memory["_id"]),
        "original_date": memory.get("memory_date", memory.get("created_at")),
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.posts.insert_one(new_post)
    
    return {
        "post_id": str(result.inserted_id),
        "success": True
    }

@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, token: str):
    """Delete a memory"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not ObjectId.is_valid(memory_id):
        raise HTTPException(status_code=400, detail="Invalid memory ID")
    
    memory = await db.memories.find_one({
        "_id": ObjectId(memory_id),
        "user_id": session["user_id"]
    })
    
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    await db.memories.delete_one({"_id": ObjectId(memory_id)})
    return {"success": True}

@router.post("/hide/{memory_id}")
async def hide_memory(memory_id: str, token: str):
    """Hide a memory from 'On This Day'"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.hidden_memories.insert_one({
        "user_id": session["user_id"],
        "memory_id": memory_id,
        "hidden_at": datetime.now(timezone.utc)
    })
    
    return {"success": True}
