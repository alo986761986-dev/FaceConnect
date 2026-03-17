"""
Shared utilities and database configuration for FaceConnect backend.
"""
from fastapi import HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hashlib
import secrets
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, List
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Social Networks List
SOCIAL_NETWORKS = [
    "facebook", "instagram", "tiktok", "snapchat", "x", 
    "linkedin", "discord", "reddit", "pinterest", 
    "youtube", "whatsapp", "telegram"
]

def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == hashed

def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)

async def get_current_user(token: str) -> Optional[dict]:
    """Get the current user from a session token."""
    if not token:
        return None
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    return user

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get a user by their ID."""
    return await db.users.find_one({"id": user_id}, {"_id": 0})

async def get_user_by_username(username: str) -> Optional[dict]:
    """Get a user by their username."""
    return await db.users.find_one({"username": username}, {"_id": 0})

async def get_user_by_email(email: str) -> Optional[dict]:
    """Get a user by their email."""
    return await db.users.find_one({"email": email}, {"_id": 0})

def serialize_datetime(dt: datetime) -> str:
    """Serialize a datetime object to ISO format string."""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def exclude_id(doc: dict) -> dict:
    """Remove MongoDB _id field from a document."""
    if doc and "_id" in doc:
        doc = dict(doc)
        del doc["_id"]
    return doc
