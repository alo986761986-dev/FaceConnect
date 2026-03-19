"""
Social Groups API Routes
Handles social group discovery, membership, and group feeds
Returns mock data when database is empty to ensure the frontend always has content.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import random

router = APIRouter(prefix="/social-groups", tags=["Social Groups"])

def get_db():
    from server import db
    return db

# Pydantic Models
class SocialGroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str = "General"
    is_private: bool = False
    cover: Optional[str] = None

class SocialGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_private: Optional[bool] = None
    cover: Optional[str] = None

# Helper functions
def serialize_group(group: dict, user_id: str = None) -> dict:
    group_id = str(group.get("_id", group.get("id", "")))
    members = group.get("member_ids", [])
    
    return {
        "id": group_id,
        "name": group.get("name", ""),
        "description": group.get("description", ""),
        "members": group.get("members_count", len(members)),
        "category": group.get("category", "General"),
        "is_private": group.get("is_private", False),
        "cover": group.get("cover"),
        "is_member": user_id in members if user_id else False,
        "posts_today": group.get("posts_today", random.randint(0, 50)),
        "last_active": group.get("last_active", datetime.now(timezone.utc).isoformat()),
        "created_at": group.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(group.get("created_at"), datetime) else group.get("created_at", "")
    }

def generate_mock_groups():
    """Generate mock social groups for when database is empty"""
    groups_data = [
        {"name": "React Developers", "description": "A community for React enthusiasts", "category": "Technology", "members": 15420},
        {"name": "Photography Lovers", "description": "Share your best shots", "category": "Photography", "members": 8900},
        {"name": "Fitness Warriors", "description": "Get fit together", "category": "Fitness", "members": 23100},
        {"name": "Indie Game Devs", "description": "For indie game developers", "category": "Gaming", "members": 5600, "is_private": True},
        {"name": "Travel Stories", "description": "Share your adventures", "category": "Travel", "members": 45000},
        {"name": "Startup Founders", "description": "Connect with entrepreneurs", "category": "Business", "members": 12300, "is_private": True},
        {"name": "Music Production", "description": "Learn and share music production tips", "category": "Music", "members": 7800},
        {"name": "Foodies United", "description": "For people who love food", "category": "Food", "members": 34500},
    ]
    
    groups = []
    for i, data in enumerate(groups_data):
        is_member = i < 3  # First 3 groups user is a member of
        groups.append({
            "id": f"group-{i}",
            "name": data["name"],
            "description": data["description"],
            "members": data["members"],
            "category": data["category"],
            "is_private": data.get("is_private", False),
            "cover": f"https://picsum.photos/800/300?random={i + 100}",
            "is_member": is_member,
            "posts_today": random.randint(0, 50),
            "last_active": datetime.now(timezone.utc).isoformat()
        })
    
    return groups

# Routes
@router.get("")
async def get_groups(
    token: str,
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get social groups"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    query = {}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category
    
    skip = (page - 1) * limit
    groups = await db.social_groups.find(query).sort("members_count", -1).skip(skip).limit(limit).to_list(limit)
    
    # If no groups in database, return mock data
    if not groups:
        mock_groups = generate_mock_groups()
        if search:
            mock_groups = [g for g in mock_groups if search.lower() in g.get("name", "").lower()]
        if category:
            mock_groups = [g for g in mock_groups if g.get("category", "").lower() == category.lower()]
        return {
            "groups": mock_groups[skip:skip+limit],
            "page": page,
            "has_more": len(mock_groups) > skip + limit
        }
    
    return {
        "groups": [serialize_group(g, user_id) for g in groups],
        "page": page,
        "has_more": len(groups) == limit
    }

@router.get("/my-groups")
async def get_my_groups(
    token: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get groups user is a member of"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    skip = (page - 1) * limit
    groups = await db.social_groups.find({"member_ids": user_id}).sort("last_active", -1).skip(skip).limit(limit).to_list(limit)
    
    # If no groups, return first 3 mock groups as "member" groups
    if not groups:
        mock_groups = [g for g in generate_mock_groups() if g.get("is_member")]
        return {
            "groups": mock_groups[skip:skip+limit],
            "page": page,
            "has_more": len(mock_groups) > skip + limit
        }
    
    return {
        "groups": [serialize_group(g, user_id) for g in groups],
        "page": page,
        "has_more": len(groups) == limit
    }

@router.get("/categories")
async def get_categories(token: str):
    """Get group categories"""
    return {
        "categories": [
            "Technology", "Gaming", "Sports", "Music", "Art", "Food",
            "Travel", "Fitness", "Photography", "Business", "Education", "Entertainment"
        ]
    }

@router.get("/{group_id}")
async def get_group(group_id: str, token: str):
    """Get group details"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Check for mock group
    if group_id.startswith("group-"):
        mock_groups = generate_mock_groups()
        for g in mock_groups:
            if g["id"] == group_id:
                return g
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.social_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return serialize_group(group, user_id)

@router.post("")
async def create_group(group: SocialGroupCreate, token: str):
    """Create a new social group"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    group_doc = {
        "name": group.name,
        "description": group.description,
        "category": group.category,
        "is_private": group.is_private,
        "cover": group.cover,
        "member_ids": [user_id],
        "admin_ids": [user_id],
        "members_count": 1,
        "posts_today": 0,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc),
        "last_active": datetime.now(timezone.utc)
    }
    
    result = await db.social_groups.insert_one(group_doc)
    group_doc["_id"] = result.inserted_id
    
    return serialize_group(group_doc, user_id)

@router.post("/{group_id}/join")
async def join_group(group_id: str, token: str):
    """Join a social group"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Handle mock groups
    if group_id.startswith("group-"):
        return {"success": True, "message": "Joined group (mock)"}
    
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.social_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user_id in group.get("member_ids", []):
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.social_groups.update_one(
        {"_id": ObjectId(group_id)},
        {
            "$push": {"member_ids": user_id},
            "$inc": {"members_count": 1},
            "$set": {"last_active": datetime.now(timezone.utc)}
        }
    )
    
    return {"success": True}

@router.post("/{group_id}/leave")
async def leave_group(group_id: str, token: str):
    """Leave a social group"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Handle mock groups
    if group_id.startswith("group-"):
        return {"success": True, "message": "Left group (mock)"}
    
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.social_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user_id not in group.get("member_ids", []):
        raise HTTPException(status_code=400, detail="Not a member")
    
    # Prevent creator from leaving
    if user_id == group.get("created_by"):
        raise HTTPException(status_code=400, detail="Group creator cannot leave. Delete the group instead.")
    
    await db.social_groups.update_one(
        {"_id": ObjectId(group_id)},
        {
            "$pull": {"member_ids": user_id, "admin_ids": user_id},
            "$inc": {"members_count": -1},
            "$set": {"last_active": datetime.now(timezone.utc)}
        }
    )
    
    return {"success": True}

@router.delete("/{group_id}")
async def delete_group(group_id: str, token: str):
    """Delete a social group (admin only)"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    # Handle mock groups
    if group_id.startswith("group-"):
        return {"success": True, "message": "Deleted group (mock)"}
    
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.social_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user_id != group.get("created_by"):
        raise HTTPException(status_code=403, detail="Only the creator can delete the group")
    
    await db.social_groups.delete_one({"_id": ObjectId(group_id)})
    
    return {"success": True}

@router.get("/{group_id}/feed")
async def get_group_feed(
    group_id: str,
    token: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get posts from a group"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For mock groups, return mock feed
    if group_id.startswith("group-"):
        mock_posts = []
        for i in range(3):
            mock_posts.append({
                "id": f"post-{group_id}-{i}",
                "content": f"This is a sample post #{i+1} in the group",
                "image": f"https://picsum.photos/600/400?random={int(group_id.split('-')[1]) * 10 + i}" if random.random() > 0.5 else None,
                "user": {
                    "username": f"user{i}",
                    "display_name": f"User {i+1}",
                    "avatar": None
                },
                "likes": random.randint(10, 200),
                "comments": random.randint(5, 50),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        return {"posts": mock_posts, "page": page, "has_more": False}
    
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    skip = (page - 1) * limit
    posts = await db.group_posts.find({"group_id": group_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "posts": posts,
        "page": page,
        "has_more": len(posts) == limit
    }
