"""
Authentication routes for FaceConnect.
Handles user registration, login, OAuth, and session management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
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

@router.post("/facebook", response_model=dict)
async def facebook_oauth_callback(session_id: str):
    """Exchange Facebook OAuth session_id for user data and create local session"""
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
        logging.error(f"Facebook OAuth error: {e}")
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
                "oauth_provider": "facebook"
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
            "oauth_provider": "facebook",
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

@router.post("/apple", response_model=dict)
async def apple_oauth_callback(session_id: str):
    """Exchange Apple OAuth session_id for user data and create local session"""
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
        logging.error(f"Apple OAuth error: {e}")
        raise HTTPException(status_code=401, detail="OAuth authentication failed")
    
    email = oauth_data.get("email")
    name = oauth_data.get("name", "")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth")
    
    # Check if user exists by email
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "display_name": name or existing_user.get("display_name"),
                "oauth_provider": "apple"
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
            "avatar": None,
            "status": "Hey, I'm using FaceConnect!",
            "oauth_provider": "apple",
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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset - sends reset token."""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        # Don't reveal if email exists or not for security
        return {"success": True, "message": "If the email exists, a reset code has been generated"}
    
    if user.get("oauth_provider"):
        return {"success": False, "message": "This account uses social login. Please sign in with your social account."}
    
    # Generate reset token (6-digit code for simplicity)
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store reset token with expiry (15 minutes)
    await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "email": request.email,
        "code": reset_code,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    })
    
    # In production, this would send an email. For now, return the code for testing
    # TODO: Integrate with email service (SendGrid, etc.)
    return {
        "success": True, 
        "message": "Reset code generated",
        "reset_code": reset_code,  # Remove this in production!
        "expires_in_minutes": 15
    }

@router.post("/verify-reset-code")
async def verify_reset_code(email: str, code: str):
    """Verify the reset code is valid."""
    reset_record = await db.password_resets.find_one({"email": email, "code": code}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"email": email, "code": code})
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    # Generate a reset token for the password change step
    reset_token = generate_token()
    await db.password_resets.update_one(
        {"email": email, "code": code},
        {"$set": {"reset_token": reset_token}}
    )
    
    return {"success": True, "reset_token": reset_token}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using reset token."""
    reset_record = await db.password_resets.find_one({"reset_token": request.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"reset_token": request.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password_hash": hash_password(request.new_password)}}
    )
    
    # Delete reset record
    await db.password_resets.delete_one({"reset_token": request.token})
    
    # Invalidate all existing sessions for security
    await db.sessions.delete_many({"user_id": reset_record["user_id"]})
    
    return {"success": True, "message": "Password reset successfully. Please login with your new password."}

