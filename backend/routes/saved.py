"""
Saved/Bookmarked posts routes for FaceConnect.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .shared import db, get_current_user, exclude_id

router = APIRouter(prefix="/saved", tags=["saved"])


@router.post("/posts/{post_id}")
async def save_post(post_id: str, token: str):
    """Save/bookmark a post."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if post exists
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already saved
    existing = await db.saved_posts.find_one({
        "user_id": user["id"],
        "post_id": post_id
    })
    
    if existing:
        # Unsave
        await db.saved_posts.delete_one({
            "user_id": user["id"],
            "post_id": post_id
        })
        return {"saved": False, "message": "Post removed from saved"}
    else:
        # Save
        saved_item = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "post_id": post_id,
            "saved_at": datetime.now(timezone.utc).isoformat()
        }
        await db.saved_posts.insert_one(saved_item)
        return {"saved": True, "message": "Post saved"}


@router.get("/posts")
async def get_saved_posts(
    token: str,
    skip: int = 0,
    limit: int = 20
):
    """Get all saved posts for the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get saved post IDs
    saved_items = await db.saved_posts.find(
        {"user_id": user["id"]}
    ).sort("saved_at", -1).skip(skip).limit(limit).to_list(limit)
    
    post_ids = [item["post_id"] for item in saved_items]
    
    # Get actual posts
    posts = await db.posts.find(
        {"id": {"$in": post_ids}}
    ).to_list(limit)
    
    # Create lookup dict
    posts_dict = {p["id"]: exclude_id(p) for p in posts}
    
    # Build response with post details and user info
    result = []
    for item in saved_items:
        post = posts_dict.get(item["post_id"])
        if post:
            # Get post author info
            author = await db.users.find_one({"id": post["user_id"]}, {"_id": 0})
            
            result.append({
                **post,
                "username": author.get("username") if author else None,
                "display_name": author.get("display_name") if author else None,
                "avatar": author.get("avatar") if author else None,
                "saved_at": item["saved_at"],
                "is_saved": True
            })
    
    # Get total count
    total = await db.saved_posts.count_documents({"user_id": user["id"]})
    
    return {
        "posts": result,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/posts/{post_id}/status")
async def check_saved_status(post_id: str, token: str):
    """Check if a post is saved by the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    existing = await db.saved_posts.find_one({
        "user_id": user["id"],
        "post_id": post_id
    })
    
    return {"is_saved": existing is not None}


@router.delete("/posts/{post_id}")
async def unsave_post(post_id: str, token: str):
    """Remove a post from saved."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.saved_posts.delete_one({
        "user_id": user["id"],
        "post_id": post_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not in saved items")
    
    return {"message": "Post removed from saved"}


# Collections feature (organize saved posts into collections)
@router.post("/collections")
async def create_collection(
    token: str,
    name: str,
    description: Optional[str] = None
):
    """Create a new collection for organizing saved posts."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    collection = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": name,
        "description": description,
        "post_ids": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.collections.insert_one(collection)
    
    return {"id": collection["id"], "message": "Collection created"}


@router.get("/collections")
async def get_collections(token: str):
    """Get all collections for the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    collections = await db.collections.find(
        {"user_id": user["id"]}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for col in collections:
        # Get cover images from first 4 posts
        covers = []
        if col.get("post_ids"):
            cover_posts = await db.posts.find(
                {"id": {"$in": col["post_ids"][:4]}}
            ).to_list(4)
            covers = [p.get("media_url") for p in cover_posts if p.get("media_url")]
        
        result.append({
            "id": col["id"],
            "name": col["name"],
            "description": col.get("description"),
            "post_count": len(col.get("post_ids", [])),
            "covers": covers,
            "created_at": col["created_at"],
            "updated_at": col["updated_at"]
        })
    
    return {"collections": result}


@router.post("/collections/{collection_id}/posts/{post_id}")
async def add_post_to_collection(collection_id: str, post_id: str, token: str):
    """Add a post to a collection."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    collection = await db.collections.find_one({
        "id": collection_id,
        "user_id": user["id"]
    })
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Add post to collection
    await db.collections.update_one(
        {"id": collection_id},
        {
            "$addToSet": {"post_ids": post_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Post added to collection"}


@router.delete("/collections/{collection_id}/posts/{post_id}")
async def remove_post_from_collection(collection_id: str, post_id: str, token: str):
    """Remove a post from a collection."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.collections.update_one(
        {"id": collection_id, "user_id": user["id"]},
        {
            "$pull": {"post_ids": post_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Collection or post not found")
    
    return {"message": "Post removed from collection"}


@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, token: str):
    """Delete a collection."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.collections.delete_one({
        "id": collection_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    return {"message": "Collection deleted"}
