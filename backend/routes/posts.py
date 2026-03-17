"""
Posts and Feed routes for FaceConnect.
Handles posts, stories, reels, likes, comments, and feed generation.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging

from .shared import db, get_user_by_id, UPLOAD_DIR

router = APIRouter(prefix="/posts", tags=["Posts"])

# ============== MODELS ==============
class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # image, video

class PostResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[UserResponse] = None
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_liked: bool = False
    is_highlighted: bool = False
    highlighted_until: Optional[datetime] = None
    reactions: Dict[str, int] = {}
    created_at: datetime

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    user: Optional[UserResponse] = None
    content: str
    likes_count: int = 0
    created_at: datetime

class ReactionRequest(BaseModel):
    reaction_type: str  # like, love, haha, wow, sad, angry

class HighlightRequest(BaseModel):
    duration_hours: int = 24  # Default 24 hours

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

# Maximum posts per user
MAX_POSTS_PER_USER = 20

# ============== ROUTES ==============
@router.post("", response_model=PostResponse)
async def create_post(post: PostCreate, token: str):
    """Create a new post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check post limit
    post_count = await db.posts.count_documents({"user_id": user['id']})
    if post_count >= MAX_POSTS_PER_USER:
        raise HTTPException(
            status_code=400, 
            detail=f"Post limit reached. Maximum {MAX_POSTS_PER_USER} posts allowed per user."
        )
    
    post_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    post_doc = {
        "id": post_id,
        "user_id": user['id'],
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
        "likes": [],
        "reactions": {},
        "comments_count": 0,
        "shares_count": 0,
        "is_highlighted": False,
        "highlighted_until": None,
        "created_at": now.isoformat()
    }
    
    await db.posts.insert_one(post_doc)
    
    return PostResponse(
        id=post_id,
        user_id=user['id'],
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            display_name=user.get('display_name'),
            avatar=user.get('avatar')
        ),
        content=post.content,
        media_url=post.media_url,
        media_type=post.media_type,
        likes_count=0,
        comments_count=0,
        shares_count=0,
        is_liked=False,
        is_highlighted=False,
        reactions={},
        created_at=now
    )

@router.get("", response_model=List[PostResponse])
async def get_posts(token: str, skip: int = 0, limit: int = 20, user_id: Optional[str] = None):
    """Get posts feed or posts by a specific user."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"user_id": user_id} if user_id else {}
    
    posts = await db.posts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        author = await get_user_by_id(post['user_id'])
        is_liked = user['id'] in post.get('likes', [])
        
        # Check if still highlighted
        is_highlighted = post.get('is_highlighted', False)
        highlighted_until = post.get('highlighted_until')
        if highlighted_until:
            if isinstance(highlighted_until, str):
                highlighted_until = datetime.fromisoformat(highlighted_until)
            if highlighted_until < datetime.now(timezone.utc):
                is_highlighted = False
        
        created_at = post.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(PostResponse(
            id=post['id'],
            user_id=post['user_id'],
            user=UserResponse(
                id=author['id'],
                username=author['username'],
                display_name=author.get('display_name'),
                avatar=author.get('avatar')
            ) if author else None,
            content=post['content'],
            media_url=post.get('media_url'),
            media_type=post.get('media_type'),
            likes_count=len(post.get('likes', [])),
            comments_count=post.get('comments_count', 0),
            shares_count=post.get('shares_count', 0),
            is_liked=is_liked,
            is_highlighted=is_highlighted,
            highlighted_until=highlighted_until,
            reactions=post.get('reactions', {}),
            created_at=created_at
        ))
    
    return result

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, token: str):
    """Get a single post by ID."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    author = await get_user_by_id(post['user_id'])
    is_liked = user['id'] in post.get('likes', [])
    
    created_at = post.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return PostResponse(
        id=post['id'],
        user_id=post['user_id'],
        user=UserResponse(
            id=author['id'],
            username=author['username'],
            display_name=author.get('display_name'),
            avatar=author.get('avatar')
        ) if author else None,
        content=post['content'],
        media_url=post.get('media_url'),
        media_type=post.get('media_type'),
        likes_count=len(post.get('likes', [])),
        comments_count=post.get('comments_count', 0),
        shares_count=post.get('shares_count', 0),
        is_liked=is_liked,
        is_highlighted=post.get('is_highlighted', False),
        reactions=post.get('reactions', {}),
        created_at=created_at
    )

@router.post("/{post_id}/like")
async def toggle_like_post(post_id: str, token: str):
    """Like or unlike a post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get('likes', [])
    is_liked = user['id'] in likes
    
    if is_liked:
        likes.remove(user['id'])
    else:
        likes.append(user['id'])
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {"likes": likes}}
    )
    
    return {"success": True, "is_liked": not is_liked, "likes_count": len(likes)}

@router.post("/{post_id}/react")
async def react_to_post(post_id: str, reaction: ReactionRequest, token: str):
    """Add a reaction to a post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    valid_reactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry']
    if reaction.reaction_type not in valid_reactions:
        raise HTTPException(status_code=400, detail="Invalid reaction type")
    
    reactions = post.get('reactions', {})
    reactions[reaction.reaction_type] = reactions.get(reaction.reaction_type, 0) + 1
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {"reactions": reactions}}
    )
    
    return {"success": True, "reactions": reactions}

@router.post("/{post_id}/highlight")
async def highlight_post(post_id: str, request: HighlightRequest, token: str):
    """Highlight a post for a specified duration."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id, "user_id": user['id']}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
    
    highlighted_until = datetime.now(timezone.utc) + timedelta(hours=request.duration_hours)
    
    await db.posts.update_one(
        {"id": post_id},
        {"$set": {
            "is_highlighted": True,
            "highlighted_until": highlighted_until.isoformat()
        }}
    )
    
    return {
        "success": True,
        "is_highlighted": True,
        "highlighted_until": highlighted_until.isoformat()
    }

@router.delete("/{post_id}")
async def delete_post(post_id: str, token: str):
    """Delete a post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id, "user_id": user['id']})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
    
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    
    return {"success": True}

# ============== COMMENTS ==============
@router.get("/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: str, token: str, skip: int = 0, limit: int = 50):
    """Get comments for a post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    comments = await db.comments.find(
        {"post_id": post_id},
        {"_id": 0}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for comment in comments:
        author = await get_user_by_id(comment['user_id'])
        
        created_at = comment.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(CommentResponse(
            id=comment['id'],
            post_id=comment['post_id'],
            user_id=comment['user_id'],
            user=UserResponse(
                id=author['id'],
                username=author['username'],
                display_name=author.get('display_name'),
                avatar=author.get('avatar')
            ) if author else None,
            content=comment['content'],
            likes_count=len(comment.get('likes', [])),
            created_at=created_at
        ))
    
    return result

@router.post("/{post_id}/comments", response_model=CommentResponse)
async def create_comment(post_id: str, comment: CommentCreate, token: str):
    """Add a comment to a post."""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    comment_doc = {
        "id": comment_id,
        "post_id": post_id,
        "user_id": user['id'],
        "content": comment.content,
        "likes": [],
        "created_at": now.isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Update post's comment count
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return CommentResponse(
        id=comment_id,
        post_id=post_id,
        user_id=user['id'],
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            display_name=user.get('display_name'),
            avatar=user.get('avatar')
        ),
        content=comment.content,
        likes_count=0,
        created_at=now
    )
