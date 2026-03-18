"""
Explore/Discover routes for FaceConnect.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from .shared import db, get_current_user, exclude_id

router = APIRouter(prefix="/explore", tags=["explore"])


@router.get("")
async def get_explore_feed(
    token: str,
    category: Optional[str] = None,  # all, photos, videos, reels
    skip: int = 0,
    limit: int = 30
):
    """Get explore/discover feed with trending and popular content."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Build query based on category
    query = {"type": {"$ne": "story"}}  # Exclude stories
    
    if category == "photos":
        query["media_type"] = "image"
    elif category == "videos":
        query["media_type"] = "video"
        query["type"] = {"$ne": "reel"}  # Regular videos, not reels
    elif category == "reels":
        query["type"] = "reel"
    
    # Get posts sorted by engagement (likes + comments)
    # Using aggregation for better sorting
    pipeline = [
        {"$match": query},
        {
            "$addFields": {
                "engagement_score": {
                    "$add": [
                        {"$ifNull": ["$likes_count", 0]},
                        {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 2]},
                        {"$multiply": [{"$ifNull": ["$shares_count", 0]}, 3]}
                    ]
                }
            }
        },
        {"$sort": {"engagement_score": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]
    
    posts = await db.posts.aggregate(pipeline).to_list(limit)
    
    # Enrich with user info and save status
    result = []
    for post in posts:
        author = await db.users.find_one({"id": post["user_id"]}, {"_id": 0})
        
        # Check if saved by current user
        saved = await db.saved_posts.find_one({
            "user_id": user["id"],
            "post_id": post["id"]
        })
        
        # Check if liked by current user
        is_liked = user["id"] in post.get("liked_by", [])
        
        result.append({
            **post,
            "username": author.get("username") if author else None,
            "display_name": author.get("display_name") if author else None,
            "avatar": author.get("avatar") if author else None,
            "is_saved": saved is not None,
            "is_liked": is_liked
        })
    
    return {
        "posts": result,
        "skip": skip,
        "limit": limit,
        "category": category or "all"
    }


@router.get("/trending")
async def get_trending(token: str, limit: int = 10):
    """Get trending hashtags and topics."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get posts from last 7 days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    # Aggregate hashtags from recent posts
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$unwind": {"path": "$hashtags", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    hashtags = await db.posts.aggregate(pipeline).to_list(limit)
    
    trending_tags = [{"tag": h["_id"], "count": h["count"]} for h in hashtags]
    
    return {"trending_hashtags": trending_tags}


@router.get("/search")
async def search_explore(
    token: str,
    q: str,
    type: Optional[str] = None,  # users, posts, hashtags
    skip: int = 0,
    limit: int = 20
):
    """Search for users, posts, or hashtags."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Search query too short")
    
    results = {
        "users": [],
        "posts": [],
        "hashtags": []
    }
    
    # Search users
    if not type or type == "users":
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": q, "$options": "i"}},
                {"display_name": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
        
        results["users"] = [
            {
                "id": u["id"],
                "username": u.get("username"),
                "display_name": u.get("display_name"),
                "avatar": u.get("avatar"),
                "bio": u.get("bio")
            }
            for u in users
        ]
    
    # Search posts
    if not type or type == "posts":
        posts = await db.posts.find({
            "$or": [
                {"content": {"$regex": q, "$options": "i"}},
                {"hashtags": {"$regex": q, "$options": "i"}}
            ],
            "type": {"$ne": "story"}
        }, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        for post in posts:
            author = await db.users.find_one({"id": post["user_id"]}, {"_id": 0})
            results["posts"].append({
                **post,
                "username": author.get("username") if author else None,
                "avatar": author.get("avatar") if author else None
            })
    
    # Search hashtags
    if not type or type == "hashtags":
        if q.startswith("#"):
            q = q[1:]
        
        pipeline = [
            {"$unwind": {"path": "$hashtags", "preserveNullAndEmptyArrays": False}},
            {"$match": {"hashtags": {"$regex": f"^{q}", "$options": "i"}}},
            {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        hashtags = await db.posts.aggregate(pipeline).to_list(limit)
        results["hashtags"] = [{"tag": h["_id"], "post_count": h["count"]} for h in hashtags]
    
    return results


@router.get("/suggested-users")
async def get_suggested_users(token: str, limit: int = 10):
    """Get suggested users to follow."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get current friends
    friends = await db.friends.find({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    }).to_list(1000)
    
    friend_ids = set()
    for f in friends:
        friend_ids.add(f["user_id"])
        friend_ids.add(f["friend_id"])
    friend_ids.add(user["id"])  # Exclude self
    
    # Find users with most followers who aren't already friends
    pipeline = [
        {"$match": {"id": {"$nin": list(friend_ids)}}},
        {
            "$lookup": {
                "from": "friends",
                "let": {"user_id": "$id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$friend_id", "$$user_id"]},
                                    {"$eq": ["$status", "accepted"]}
                                ]
                            }
                        }
                    }
                ],
                "as": "followers"
            }
        },
        {"$addFields": {"follower_count": {"$size": "$followers"}}},
        {"$sort": {"follower_count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "password": 0, "followers": 0}}
    ]
    
    suggested = await db.users.aggregate(pipeline).to_list(limit)
    
    result = [
        {
            "id": u["id"],
            "username": u.get("username"),
            "display_name": u.get("display_name"),
            "avatar": u.get("avatar"),
            "bio": u.get("bio"),
            "follower_count": u.get("follower_count", 0)
        }
        for u in suggested
    ]
    
    return {"users": result}


@router.get("/for-you")
async def get_for_you_feed(
    token: str,
    skip: int = 0,
    limit: int = 20
):
    """Get personalized 'For You' feed based on user interests."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get posts the user has liked to determine interests
    liked_posts = await db.posts.find(
        {"liked_by": user["id"]}
    ).limit(50).to_list(50)
    
    # Extract hashtags from liked posts
    liked_hashtags = set()
    liked_authors = set()
    for post in liked_posts:
        for tag in post.get("hashtags", []):
            liked_hashtags.add(tag)
        liked_authors.add(post.get("user_id"))
    
    # Build query for similar content
    query = {"type": {"$ne": "story"}, "user_id": {"$ne": user["id"]}}
    
    if liked_hashtags or liked_authors:
        query["$or"] = []
        if liked_hashtags:
            query["$or"].append({"hashtags": {"$in": list(liked_hashtags)}})
        if liked_authors:
            query["$or"].append({"user_id": {"$in": list(liked_authors)}})
    
    # Get personalized posts
    posts = await db.posts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user info
    result = []
    for post in posts:
        author = await db.users.find_one({"id": post["user_id"]}, {"_id": 0})
        
        saved = await db.saved_posts.find_one({
            "user_id": user["id"],
            "post_id": post["id"]
        })
        
        is_liked = user["id"] in post.get("liked_by", [])
        
        result.append({
            **post,
            "username": author.get("username") if author else None,
            "display_name": author.get("display_name") if author else None,
            "avatar": author.get("avatar") if author else None,
            "is_saved": saved is not None,
            "is_liked": is_liked
        })
    
    return {
        "posts": result,
        "skip": skip,
        "limit": limit
    }
