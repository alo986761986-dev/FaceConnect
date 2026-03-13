from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Social Networks List
SOCIAL_NETWORKS = [
    "facebook", "instagram", "tiktok", "snapchat", "x", 
    "linkedin", "discord", "reddit", "pinterest", 
    "youtube", "whatsapp", "telegram"
]

# Define Models
class SocialNetwork(BaseModel):
    platform: str
    username: Optional[str] = None
    profile_url: Optional[str] = None
    has_account: bool = False

class PersonBase(BaseModel):
    name: str
    photo_url: Optional[str] = None
    photo_data: Optional[str] = None  # Base64 encoded image
    social_networks: List[SocialNetwork] = []
    face_descriptor: Optional[List[float]] = None  # Face embedding for recognition

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

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Message/Note Models for Private Chat
class MessageCreate(BaseModel):
    content: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageResponse(BaseModel):
    id: str
    person_id: str
    content: str
    created_at: datetime

# Helper function to count active social networks
def count_social_networks(social_networks: List[dict]) -> int:
    return sum(1 for sn in social_networks if sn.get('has_account', False))

# Routes
@api_router.get("/")
async def root():
    return {"message": "Facial Recognition Social Tracker API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Person CRUD Operations
@api_router.post("/persons", response_model=PersonResponse)
async def create_person(person: PersonCreate):
    person_dict = person.model_dump()
    person_obj = Person(**person_dict)
    person_obj.social_count = count_social_networks(person_dict.get('social_networks', []))
    
    doc = person_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.persons.insert_one(doc)
    
    return PersonResponse(**person_obj.model_dump())

@api_router.get("/persons", response_model=List[PersonResponse])
async def get_persons():
    persons = await db.persons.find({}, {"_id": 0}).to_list(1000)
    
    result = []
    for person in persons:
        if isinstance(person.get('created_at'), str):
            person['created_at'] = datetime.fromisoformat(person['created_at'])
        if isinstance(person.get('updated_at'), str):
            person['updated_at'] = datetime.fromisoformat(person['updated_at'])
        person['social_count'] = count_social_networks(person.get('social_networks', []))
        result.append(PersonResponse(**person))
    
    return result

@api_router.get("/persons/{person_id}", response_model=PersonResponse)
async def get_person(person_id: str):
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    if isinstance(person.get('created_at'), str):
        person['created_at'] = datetime.fromisoformat(person['created_at'])
    if isinstance(person.get('updated_at'), str):
        person['updated_at'] = datetime.fromisoformat(person['updated_at'])
    person['social_count'] = count_social_networks(person.get('social_networks', []))
    
    return PersonResponse(**person)

@api_router.put("/persons/{person_id}", response_model=PersonResponse)
async def update_person(person_id: str, person_update: PersonUpdate):
    existing = await db.persons.find_one({"id": person_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Person not found")
    
    update_data = person_update.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if 'social_networks' in update_data:
        update_data['social_count'] = count_social_networks(update_data['social_networks'])
    
    await db.persons.update_one({"id": person_id}, {"$set": update_data})
    
    updated = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    updated['social_count'] = count_social_networks(updated.get('social_networks', []))
    
    return PersonResponse(**updated)

@api_router.delete("/persons/{person_id}")
async def delete_person(person_id: str):
    result = await db.persons.delete_one({"id": person_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Also delete all messages for this person
    await db.messages.delete_many({"person_id": person_id})
    
    return {"message": "Person deleted successfully"}

# Message/Notes CRUD Operations
@api_router.post("/persons/{person_id}/messages", response_model=MessageResponse)
async def create_message(person_id: str, message: MessageCreate):
    # Verify person exists
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    message_obj = Message(person_id=person_id, content=message.content)
    
    doc = message_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.messages.insert_one(doc)
    
    return MessageResponse(**message_obj.model_dump())

@api_router.get("/persons/{person_id}/messages", response_model=List[MessageResponse])
async def get_messages(person_id: str):
    # Verify person exists
    person = await db.persons.find_one({"id": person_id}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    messages = await db.messages.find(
        {"person_id": person_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    result = []
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        result.append(MessageResponse(**msg))
    
    return result

@api_router.delete("/persons/{person_id}/messages/{message_id}")
async def delete_message(person_id: str, message_id: str):
    result = await db.messages.delete_one({"id": message_id, "person_id": person_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Message deleted successfully"}

# Face matching endpoint
class FaceMatchRequest(BaseModel):
    face_descriptor: List[float]
    threshold: float = 0.6  # Distance threshold for matching

class FaceMatchResult(BaseModel):
    person_id: str
    name: str
    photo_data: Optional[str]
    distance: float
    confidence: float

@api_router.post("/face-match", response_model=List[FaceMatchResult])
async def match_face(request: FaceMatchRequest):
    """Find persons matching the given face descriptor"""
    import math
    
    # Get all persons with face descriptors
    persons = await db.persons.find(
        {"face_descriptor": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "photo_data": 1, "face_descriptor": 1}
    ).to_list(1000)
    
    matches = []
    
    for person in persons:
        stored_descriptor = person.get('face_descriptor')
        if not stored_descriptor:
            continue
        
        # Calculate Euclidean distance
        distance = math.sqrt(sum(
            (a - b) ** 2 
            for a, b in zip(request.face_descriptor, stored_descriptor)
        ))
        
        # Convert distance to confidence (0-1 scale, lower distance = higher confidence)
        confidence = max(0, 1 - (distance / 1.5))
        
        if distance <= request.threshold:
            matches.append(FaceMatchResult(
                person_id=person['id'],
                name=person['name'],
                photo_data=person.get('photo_data'),
                distance=round(distance, 4),
                confidence=round(confidence * 100, 1)
            ))
    
    # Sort by distance (best matches first)
    matches.sort(key=lambda x: x.distance)
    
    return matches[:10]  # Return top 10 matches

# Stats endpoint
@api_router.get("/stats")
async def get_stats():
    total_persons = await db.persons.count_documents({})
    
    pipeline = [
        {"$unwind": "$social_networks"},
        {"$match": {"social_networks.has_account": True}},
        {"$group": {"_id": "$social_networks.platform", "count": {"$sum": 1}}}
    ]
    
    platform_stats = await db.persons.aggregate(pipeline).to_list(100)
    
    platforms = {stat['_id']: stat['count'] for stat in platform_stats}
    
    total_connections = sum(platforms.values())
    
    return {
        "total_persons": total_persons,
        "total_connections": total_connections,
        "platforms": platforms
    }

# Status check endpoints (from original)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
