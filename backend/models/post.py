from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

class ReelCreate(BaseModel):
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None

class ReelComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reel_id: str
    user_id: str
    user: Optional[dict] = None
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    likes: List[str] = []  # user_ids who liked this comment

class ReelCommentCreate(BaseModel):
    content: str

class ReelResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[dict] = None
    caption: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_liked: bool = False
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PostCreate(BaseModel):
    type: str  # 'post' or 'story'
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' or 'video'

class PostResponse(BaseModel):
    id: str
    user_id: str
    user: Optional[dict] = None
    type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    created_at: datetime
    expires_at: Optional[datetime] = None  # For stories
    
    model_config = ConfigDict(from_attributes=True)

class PostSettingsUpdate(BaseModel):
    is_archived: Optional[bool] = None
    hide_likes: Optional[bool] = None
    hide_shares: Optional[bool] = None
    comments_disabled: Optional[bool] = None
