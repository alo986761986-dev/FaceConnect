"""
Search routes for FaceConnect.
Handles universal search across all content types.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
import re
import logging

from .shared import db, get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


# ============== ROUTES ==============
@router.get("/universal")
async def universal_search(token: str, q: str, category: str = "all"):
    """Universal search for all content types."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if len(q) < 2:
        return {"users": [], "posts": [], "reels": [], "stories": [], "live": [], "hashtags": []}
    
    results = {
        "users": [],
        "posts": [],
        "reels": [],
        "stories": [],
        "live": [],
        "hashtags": []
    }
    
    # Search users
    if category in ["all", "users"]:
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"display_name": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0, "password_hash": 0}).limit(10).to_list(10)
        results["users"] = users
    
    # Search posts
    if category in ["all", "posts"]:
        posts = await db.posts.find({
            "$and": [
                {"is_archived": {"$ne": True}},
                {"$or": [
                    {"content": {"$regex": q, "$options": "i"}},
                    {"hashtags": {"$regex": q, "$options": "i"}}
                ]}
            ]
        }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
        results["posts"] = posts
    
    # Search reels
    if category in ["all", "reels"]:
        reels = await db.reels.find({
            "$and": [
                {"is_archived": {"$ne": True}},
                {"$or": [
                    {"caption": {"$regex": q, "$options": "i"}},
                    {"hashtags": {"$regex": q, "$options": "i"}}
                ]}
            ]
        }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
        results["reels"] = reels
    
    # Search stories
    if category in ["all", "stories"]:
        stories = await db.posts.find({
            "$and": [
                {"type": "story"},
                {"content": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
        results["stories"] = stories
    
    # Search live streams
    if category in ["all", "live"]:
        live_streams = await db.streams.find({
            "$and": [
                {"status": "live"},
                {"$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"username": {"$regex": q, "$options": "i"}}
                ]}
            ]
        }, {"_id": 0}).limit(10).to_list(10)
        results["live"] = live_streams
    
    # Search hashtags (aggregate from posts and reels)
    if category in ["all", "hashtags"]:
        # Simple hashtag search from content
        hashtag_pattern = f"#{q}"
        post_tags = await db.posts.find({
            "content": {"$regex": hashtag_pattern, "$options": "i"}
        }).limit(5).to_list(5)
        
        unique_tags = set()
        for post in post_tags:
            # Extract hashtags
            tags = re.findall(r'#(\w+)', post.get('content', ''))
            for tag in tags:
                if q.lower() in tag.lower():
                    unique_tags.add(tag.lower())
        
        results["hashtags"] = [{"tag": tag, "count": 0} for tag in list(unique_tags)[:10]]
    
    return results


# Export for other modules
__all__ = ["router"]
