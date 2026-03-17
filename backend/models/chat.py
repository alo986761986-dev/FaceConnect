from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid

from .user import UserResponse

class ConversationCreate(BaseModel):
    participant_ids: List[str]
    name: Optional[str] = None  # For group chats
    is_group: bool = False

class ConversationResponse(BaseModel):
    id: str
    participants: List[UserResponse]
    name: Optional[str] = None
    is_group: bool = False
    last_message: Optional[dict] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"  # text, image, video, audio, file, gif, sticker, location
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    metadata: Optional[dict] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserResponse] = None
    content: Optional[str] = None
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to: Optional[str] = None
    read_by: List[str] = []
    created_at: datetime
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
