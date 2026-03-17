from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = "Hey, I'm using FaceConnect!"
    created_at: datetime
    is_online: bool = False
    last_seen: Optional[datetime] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None

class FriendRequestCreate(BaseModel):
    user_id: str

class FriendRequestResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    from_user: Optional[dict] = None
    to_user: Optional[dict] = None
    status: str  # 'pending', 'accepted', 'declined'
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
