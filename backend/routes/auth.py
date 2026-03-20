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
async def facebook_oauth_callback(session_id: str = None, code: str = None, redirect_uri: str = None):
    """
    Exchange Facebook OAuth for user data and create local session.
    Supports two flows:
    1. Emergent session_id flow (session_id param)
    2. Direct OAuth code flow (code + redirect_uri params)
    """
    import os
    
    email = None
    name = ""
    picture = None
    
    if code and redirect_uri:
        # Direct Facebook OAuth code flow
        fb_app_id = os.environ.get("FACEBOOK_APP_ID")
        fb_app_secret = os.environ.get("FACEBOOK_APP_SECRET")
        
        if not fb_app_id or not fb_app_secret:
            raise HTTPException(status_code=503, detail="Facebook OAuth not configured")
        
        try:
            async with httpx.AsyncClient() as client:
                # Exchange code for access token
                token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
                token_response = await client.get(token_url, params={
                    "client_id": fb_app_id,
                    "client_secret": fb_app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code
                })
                
                if token_response.status_code != 200:
                    logging.error(f"Facebook token exchange failed: {token_response.text}")
                    raise HTTPException(status_code=401, detail="Failed to exchange code for token")
                
                token_data = token_response.json()
                access_token = token_data.get("access_token")
                
                if not access_token:
                    raise HTTPException(status_code=401, detail="No access token received")
                
                # Fetch user data
                user_url = "https://graph.facebook.com/me"
                user_response = await client.get(user_url, params={
                    "access_token": access_token,
                    "fields": "id,name,email,picture.type(large)"
                })
                
                if user_response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Failed to fetch user data")
                
                user_data = user_response.json()
                email = user_data.get("email")
                name = user_data.get("name", "")
                picture = user_data.get("picture", {}).get("data", {}).get("url")
                
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Facebook OAuth error: {e}")
            raise HTTPException(status_code=401, detail="Facebook authentication failed")
    
    elif session_id:
        # Emergent session flow (fallback)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    EMERGENT_AUTH_URL,
                    headers={"X-Session-ID": session_id}
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Invalid session")
                
                oauth_data = response.json()
                email = oauth_data.get("email")
                name = oauth_data.get("name", "")
                picture = oauth_data.get("picture")
        except Exception as e:
            logging.error(f"Facebook OAuth error: {e}")
            raise HTTPException(status_code=401, detail="OAuth authentication failed")
    else:
        raise HTTPException(status_code=400, detail="Either session_id or code+redirect_uri required")
    
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
async def apple_oauth_callback(session_id: str = None, code: str = None, redirect_uri: str = None, id_token: str = None):
    """
    Exchange Apple OAuth for user data and create local session.
    Supports two flows:
    1. Emergent session_id flow (session_id param)
    2. Direct OAuth code flow (code + redirect_uri or id_token params)
    
    Note: Apple Sign In is more complex as it requires JWT verification.
    For production, you need Apple Developer credentials configured.
    """
    import os
    import jwt
    
    email = None
    name = ""
    
    if id_token:
        # Direct Apple ID token verification (simpler flow for web)
        try:
            # Decode without verification for basic info (in production, verify signature)
            # Apple's public keys: https://appleid.apple.com/auth/keys
            decoded = jwt.decode(id_token, options={"verify_signature": False})
            email = decoded.get("email")
            name = decoded.get("name", "")
        except Exception as e:
            logging.error(f"Apple ID token decode error: {e}")
            raise HTTPException(status_code=401, detail="Invalid Apple ID token")
    
    elif code and redirect_uri:
        # Direct Apple OAuth code flow
        apple_client_id = os.environ.get("APPLE_CLIENT_ID")
        apple_team_id = os.environ.get("APPLE_TEAM_ID")
        apple_key_id = os.environ.get("APPLE_KEY_ID")
        apple_private_key = os.environ.get("APPLE_PRIVATE_KEY")
        
        if not all([apple_client_id, apple_team_id, apple_key_id, apple_private_key]):
            raise HTTPException(status_code=503, detail="Apple Sign In not configured. Contact admin.")
        
        try:
            # Generate client_secret JWT (required by Apple)
            now = datetime.now(timezone.utc)
            client_secret = jwt.encode(
                {
                    "iss": apple_team_id,
                    "iat": int(now.timestamp()),
                    "exp": int((now + timedelta(days=180)).timestamp()),
                    "aud": "https://appleid.apple.com",
                    "sub": apple_client_id,
                },
                apple_private_key,
                algorithm="ES256",
                headers={"kid": apple_key_id}
            )
            
            async with httpx.AsyncClient() as client:
                # Exchange code for tokens
                token_response = await client.post(
                    "https://appleid.apple.com/auth/token",
                    data={
                        "client_id": apple_client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri
                    }
                )
                
                if token_response.status_code != 200:
                    logging.error(f"Apple token exchange failed: {token_response.text}")
                    raise HTTPException(status_code=401, detail="Failed to exchange code for token")
                
                token_data = token_response.json()
                id_token_str = token_data.get("id_token")
                
                if id_token_str:
                    # Decode ID token (verify in production)
                    decoded = jwt.decode(id_token_str, options={"verify_signature": False})
                    email = decoded.get("email")
                    
        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"Apple OAuth error: {e}")
            raise HTTPException(status_code=401, detail="Apple authentication failed")
    
    elif session_id:
        # Emergent session flow (fallback)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    EMERGENT_AUTH_URL,
                    headers={"X-Session-ID": session_id}
                )
                
                if response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Invalid session")
                
                oauth_data = response.json()
                email = oauth_data.get("email")
                name = oauth_data.get("name", "")
        except Exception as e:
            logging.error(f"Apple OAuth error: {e}")
            raise HTTPException(status_code=401, detail="OAuth authentication failed")
    else:
        raise HTTPException(status_code=400, detail="Either session_id, code+redirect_uri, or id_token required")
    
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

# Email sending utility
async def send_reset_email(to_email: str, reset_code: str):
    """Send password reset email using Resend"""
    try:
        import resend
        import asyncio
        
        resend_api_key = os.environ.get("RESEND_API_KEY")
        sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        
        if not resend_api_key:
            print("Warning: RESEND_API_KEY not configured, email not sent")
            return False
        
        resend.api_key = resend_api_key
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
                .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #00a884; }}
                .code-box {{ background: linear-gradient(135deg, #00a884, #008069); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0; }}
                .message {{ color: #666; text-align: center; line-height: 1.6; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">FaceConnect</div>
                </div>
                <h2 style="text-align: center; color: #333;">Password Reset Code</h2>
                <p class="message">You requested a password reset. Use the code below to reset your password:</p>
                <div class="code-box">{reset_code}</div>
                <p class="message">This code will expire in <strong>15 minutes</strong>.</p>
                <p class="message" style="color: #999;">If you didn't request this, please ignore this email.</p>
                <div class="footer">
                    © 2026 FaceConnect. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": sender_email,
            "to": [to_email],
            "subject": "🔐 FaceConnect Password Reset Code",
            "html": html_content
        }
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        print(f"Reset email sent to {to_email}, email_id: {email.get('id')}")
        return True
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        return False

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset - sends reset code via email."""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        # Don't reveal if email exists or not for security
        return {"success": True, "message": "If the email exists, a reset code has been sent"}
    
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
    
    # Send email with reset code
    email_sent = await send_reset_email(request.email, reset_code)
    
    return {
        "success": True, 
        "message": "Reset code sent to your email" if email_sent else "Reset code generated (check your email)",
        "email_sent": email_sent,
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

