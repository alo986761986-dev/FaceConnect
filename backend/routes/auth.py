"""
Authentication routes for FaceConnect.
Handles user registration, login, OAuth, and session management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid
import httpx
import logging

from .shared import (
    db, hash_password, verify_password, generate_token,
    get_user_by_id, get_user_by_email, get_user_by_username
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Emergent OAuth session data URL
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ============== MODELS ==============
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ============== ROUTES ==============
@router.post("/google", response_model=dict)
async def google_oauth_callback(session_id: str):
    """Exchange Google OAuth session_id for user data and create local session"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            oauth_data = response.json()
    except Exception as e:
        logging.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=401, detail="OAuth authentication failed")
    
    email = oauth_data.get("email")
    name = oauth_data.get("name", "")
    picture = oauth_data.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth")
    
    # Check if user exists by email
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "display_name": name or existing_user.get("display_name"),
                "avatar": picture or existing_user.get("avatar"),
                "oauth_provider": "google"
            }}
        )
        user_id = existing_user["id"]
        username = existing_user["username"]
    else:
        user_id = str(uuid.uuid4())
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        counter = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{counter}"
            counter += 1
        
        user_doc = {
            "id": user_id,
            "username": username,
            "email": email,
            "password_hash": None,
            "display_name": name or username,
            "avatar": picture,
            "status": "Hey, I'm using FaceConnect!",
            "oauth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await get_user_by_id(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "email": email,
            "display_name": user.get("display_name"),
            "avatar": user.get("avatar"),
            "status": user.get("status")
        }
    }

@router.post("/register", response_model=dict)
async def register_user(user: UserCreate):
    """Register a new user account."""
    existing = await db.users.find_one({"$or": [{"email": user.email}, {"username": user.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "password_hash": hash_password(user.password),
        "display_name": user.display_name or user.username,
        "avatar": user.avatar,
        "status": "Hey, I'm using FaceConnect!",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "username": user.username,
            "email": user.email,
            "display_name": user_doc["display_name"],
            "avatar": user_doc["avatar"],
            "status": user_doc["status"]
        }
    }

@router.post("/login", response_model=dict)
async def login_user(credentials: UserLogin):
    """Login with email and password."""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = generate_token()
    await db.sessions.insert_one({
        "token": token,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "display_name": user.get("display_name"),
            "avatar": user.get("avatar"),
            "status": user.get("status")
        }
    }

@router.post("/logout")
async def logout_user(token: str):
    """Logout and invalidate the session token."""
    await db.sessions.delete_one({"token": token})
    return {"success": True}

@router.get("/me")
async def get_current_user_info(token: str):
    """Get current user info from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "display_name": user.get("display_name"),
        "avatar": user.get("avatar"),
        "status": user.get("status")
    }

@router.post("/change-password")
async def change_password(token: str, request: PasswordChangeRequest):
    """Change user password."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("oauth_provider"):
        raise HTTPException(status_code=400, detail="Cannot change password for OAuth users")
    
    if not verify_password(request.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    return {"success": True, "message": "Password changed successfully"}
