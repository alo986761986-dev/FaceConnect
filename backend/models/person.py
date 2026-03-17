from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class SocialNetwork(BaseModel):
    platform: str
    username: Optional[str] = None
    profile_url: Optional[str] = None
    has_account: bool = False

class PersonBase(BaseModel):
    name: str
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: List[SocialNetwork] = []
    face_descriptor: Optional[List[float]] = None

class PersonCreate(PersonBase):
    pass

class PersonUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: Optional[List[SocialNetwork]] = None
    face_descriptor: Optional[List[float]] = None

class Person(PersonBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    social_count: int = 0

class PersonResponse(BaseModel):
    id: str
    name: str
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None
    social_networks: List[SocialNetwork]
    created_at: datetime
    updated_at: datetime
    social_count: int
    face_descriptor: Optional[List[float]] = None

class NoteMessageCreate(BaseModel):
    content: str

class NoteMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteMessageResponse(BaseModel):
    id: str
    person_id: str
    content: str
    created_at: datetime

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str
