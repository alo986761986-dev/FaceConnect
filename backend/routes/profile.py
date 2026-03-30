"""
Profile API Routes
Complete profile management with photo upload
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import base64
import os

router = APIRouter(prefix="/profile", tags=["profile"])

# Pydantic Models
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    hometown: Optional[str] = None
    birthday: Optional[str] = None
    relationship: Optional[str] = None
    language: Optional[str] = None
    instagram_handle: Optional[str] = None
    instagram_url: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str]
    bio: Optional[str]
    avatar: Optional[str]
    cover_photo: Optional[str]
    location: Optional[str]
    hometown: Optional[str]
    birthday: Optional[str]
    relationship: Optional[str]
    language: Optional[str]
    instagram_handle: Optional[str]
    instagram_url: Optional[str]
    friends_count: int
    posts_count: int
    verified: bool
    created_at: str

class FriendResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    avatar: Optional[str]
    is_online: bool
    last_active: Optional[str]
    mutual_friends_count: int

class PostResponse(BaseModel):
    id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str]
    content: Optional[str]
    media_url: Optional[str]
    media_type: Optional[str]
    privacy: str
    likes_count: int
    comments_count: int
    shares_count: int
    created_at: str
    tagged_users: List[str]


def get_db():
    from server import db
    return db

async def get_user_by_token(token: str):
    """Get user from session token."""
    db = get_db()
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    return user


# ============== PROFILE ROUTES ==============

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(token: str):
    """Get current user's profile"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Get friends count
    friends = await db.friends.count_documents({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    })
    
    # Get posts count
    posts = await db.posts.count_documents({"author_id": user["id"]})
    
    return ProfileResponse(
        id=user["id"],
        username=user.get("username", ""),
        email=user.get("email", ""),
        display_name=user.get("display_name"),
        bio=user.get("bio"),
        avatar=user.get("avatar"),
        cover_photo=user.get("cover_photo"),
        location=user.get("location"),
        hometown=user.get("hometown"),
        birthday=user.get("birthday"),
        relationship=user.get("relationship"),
        language=user.get("language", "Italiano"),
        instagram_handle=user.get("instagram_handle"),
        instagram_url=user.get("instagram_url"),
        friends_count=friends,
        posts_count=posts,
        verified=user.get("verified", False),
        created_at=user.get("created_at", datetime.now(timezone.utc).isoformat())
    )


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(user_id: str, token: str):
    """Get another user's profile"""
    current_user = await get_user_by_token(token)
    if not current_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends count
    friends = await db.friends.count_documents({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    })
    
    # Get posts count
    posts = await db.posts.count_documents({"author_id": user["id"]})
    
    return ProfileResponse(
        id=user["id"],
        username=user.get("username", ""),
        email=user.get("email", ""),
        display_name=user.get("display_name"),
        bio=user.get("bio"),
        avatar=user.get("avatar"),
        cover_photo=user.get("cover_photo"),
        location=user.get("location"),
        hometown=user.get("hometown"),
        birthday=user.get("birthday"),
        relationship=user.get("relationship"),
        language=user.get("language", "Italiano"),
        instagram_handle=user.get("instagram_handle"),
        instagram_url=user.get("instagram_url"),
        friends_count=friends,
        posts_count=posts,
        verified=user.get("verified", False),
        created_at=user.get("created_at", "")
    )


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(token: str, profile: ProfileUpdate):
    """Update current user's profile"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Build update dict with only provided fields
    update_data = {}
    for field, value in profile.dict().items():
        if value is not None:
            update_data[field] = value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    # Get updated profile
    return await get_my_profile(token)


@router.post("/avatar")
async def upload_avatar(token: str, file: UploadFile = File(...)):
    """Upload profile avatar photo"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Read and encode file
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB")
    
    # Store as base64 data URL
    base64_data = base64.b64encode(contents).decode('utf-8')
    avatar_url = f"data:{file.content_type};base64,{base64_data}"
    
    # Update user
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "avatar": avatar_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Avatar updated", "avatar": avatar_url}


@router.post("/cover")
async def upload_cover_photo(token: str, file: UploadFile = File(...)):
    """Upload cover photo"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP")
    
    # Read and encode file
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit for cover
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB")
    
    # Store as base64 data URL
    base64_data = base64.b64encode(contents).decode('utf-8')
    cover_url = f"data:{file.content_type};base64,{base64_data}"
    
    # Update user
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "cover_photo": cover_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Cover photo updated", "cover_photo": cover_url}


# ============== FRIENDS ROUTES ==============

@router.get("/me/friends", response_model=List[FriendResponse])
async def get_my_friends(token: str, limit: int = 20, skip: int = 0):
    """Get current user's friends list"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Get friend relationships
    friendships = await db.friends.find({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    }).skip(skip).limit(limit).to_list(limit)
    
    # Get friend user IDs
    friend_ids = []
    for f in friendships:
        if f["user_id"] == user["id"]:
            friend_ids.append(f["friend_id"])
        else:
            friend_ids.append(f["user_id"])
    
    # Fetch friend profiles
    friends = await db.users.find(
        {"id": {"$in": friend_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    result = []
    for friend in friends:
        # Get mutual friends count
        mutual = await db.friends.count_documents({
            "$or": [
                {"user_id": friend["id"], "friend_id": {"$in": friend_ids}},
                {"friend_id": friend["id"], "user_id": {"$in": friend_ids}}
            ]
        })
        
        result.append(FriendResponse(
            id=friend["id"],
            username=friend.get("username", ""),
            display_name=friend.get("display_name"),
            avatar=friend.get("avatar"),
            is_online=friend.get("is_online", False),
            last_active=friend.get("last_active"),
            mutual_friends_count=mutual
        ))
    
    return result


@router.get("/{user_id}/friends", response_model=List[FriendResponse])
async def get_user_friends(user_id: str, token: str, limit: int = 20, skip: int = 0):
    """Get another user's friends list"""
    current_user = await get_user_by_token(token)
    if not current_user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Get friend relationships
    friendships = await db.friends.find({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    }).skip(skip).limit(limit).to_list(limit)
    
    # Get friend user IDs
    friend_ids = []
    for f in friendships:
        if f["user_id"] == user_id:
            friend_ids.append(f["friend_id"])
        else:
            friend_ids.append(f["user_id"])
    
    # Fetch friend profiles
    friends = await db.users.find(
        {"id": {"$in": friend_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    result = []
    for friend in friends:
        result.append(FriendResponse(
            id=friend["id"],
            username=friend.get("username", ""),
            display_name=friend.get("display_name"),
            avatar=friend.get("avatar"),
            is_online=friend.get("is_online", False),
            last_active=friend.get("last_active"),
            mutual_friends_count=0
        ))
    
    return result


# ============== POSTS ROUTES ==============

@router.get("/me/posts", response_model=List[PostResponse])
async def get_my_posts(token: str, limit: int = 20, skip: int = 0):
    """Get current user's posts"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    posts = await db.posts.find(
        {"author_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        result.append(PostResponse(
            id=post.get("id", str(post.get("_id", ""))),
            author_id=post["author_id"],
            author_name=user.get("display_name") or user.get("username", ""),
            author_avatar=user.get("avatar"),
            content=post.get("content"),
            media_url=post.get("media_url"),
            media_type=post.get("media_type"),
            privacy=post.get("privacy", "public"),
            likes_count=post.get("likes_count", 0),
            comments_count=post.get("comments_count", 0),
            shares_count=post.get("shares_count", 0),
            created_at=post.get("created_at", ""),
            tagged_users=post.get("tagged_users", [])
        ))
    
    return result


@router.post("/me/posts")
async def create_post(
    token: str,
    content: str = Form(None),
    privacy: str = Form("public"),
    media: UploadFile = File(None)
):
    """Create a new post"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    post_id = str(uuid.uuid4())
    media_url = None
    media_type = None
    
    # Handle media upload
    if media:
        contents = await media.read()
        if len(contents) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="File too large")
        
        base64_data = base64.b64encode(contents).decode('utf-8')
        media_url = f"data:{media.content_type};base64,{base64_data}"
        media_type = "image" if media.content_type.startswith("image") else "video"
    
    post = {
        "id": post_id,
        "author_id": user["id"],
        "content": content,
        "media_url": media_url,
        "media_type": media_type,
        "privacy": privacy,
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "tagged_users": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(post)
    
    return {
        "message": "Post created",
        "post_id": post_id
    }


# ============== MUTUAL FRIENDS ==============

@router.get("/me/mutual-friends", response_model=List[FriendResponse])
async def get_mutual_friends_suggestions(token: str, limit: int = 10):
    """Get friends with things in common"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    
    # Get my friends
    my_friendships = await db.friends.find({
        "$or": [
            {"user_id": user["id"], "status": "accepted"},
            {"friend_id": user["id"], "status": "accepted"}
        ]
    }).to_list(500)
    
    my_friend_ids = []
    for f in my_friendships:
        if f["user_id"] == user["id"]:
            my_friend_ids.append(f["friend_id"])
        else:
            my_friend_ids.append(f["user_id"])
    
    # Get friends of friends
    friends_of_friends = await db.friends.find({
        "$or": [
            {"user_id": {"$in": my_friend_ids}, "status": "accepted"},
            {"friend_id": {"$in": my_friend_ids}, "status": "accepted"}
        ]
    }).to_list(500)
    
    # Count mutual connections
    mutual_counts = {}
    for f in friends_of_friends:
        fof_id = f["friend_id"] if f["user_id"] in my_friend_ids else f["user_id"]
        if fof_id not in my_friend_ids and fof_id != user["id"]:
            mutual_counts[fof_id] = mutual_counts.get(fof_id, 0) + 1
    
    # Sort by mutual count and get top suggestions
    sorted_ids = sorted(mutual_counts.keys(), key=lambda x: mutual_counts[x], reverse=True)[:limit]
    
    # Fetch user profiles
    suggestions = await db.users.find(
        {"id": {"$in": sorted_ids}},
        {"_id": 0}
    ).to_list(limit)
    
    result = []
    for friend in suggestions:
        result.append(FriendResponse(
            id=friend["id"],
            username=friend.get("username", ""),
            display_name=friend.get("display_name"),
            avatar=friend.get("avatar"),
            is_online=friend.get("is_online", False),
            last_active=friend.get("last_active"),
            mutual_friends_count=mutual_counts.get(friend["id"], 0)
        ))
    
    return result
