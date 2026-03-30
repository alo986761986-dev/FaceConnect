"""
Facebook OAuth routes for FaceConnect.
Handles Facebook Friends import via OAuth 2.0.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
import logging
from urllib.parse import urlencode

router = APIRouter(prefix="/facebook", tags=["Facebook OAuth"])
logger = logging.getLogger(__name__)

# Facebook OAuth Configuration
FACEBOOK_APP_ID = os.environ.get('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.environ.get('FACEBOOK_APP_SECRET', '')
FACEBOOK_REDIRECT_URI = os.environ.get('FACEBOOK_REDIRECT_URI', 'https://faceconnect.com/api/facebook/callback')

# Facebook OAuth URLs
FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
FACEBOOK_GRAPH_API = "https://graph.facebook.com/v18.0"

# Scopes for Facebook
FACEBOOK_SCOPES = [
    "email",
    "public_profile",
    "user_friends"
]


class FacebookTokenRequest(BaseModel):
    """Request to exchange authorization code for tokens"""
    code: str
    redirect_uri: Optional[str] = None


@router.get("/auth-url")
async def get_facebook_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """Get the Facebook OAuth authorization URL."""
    if not FACEBOOK_APP_ID:
        raise HTTPException(status_code=500, detail="Facebook OAuth not configured")
    
    callback_uri = redirect_uri or FACEBOOK_REDIRECT_URI
    
    params = {
        "client_id": FACEBOOK_APP_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": ",".join(FACEBOOK_SCOPES),
    }
    
    if state:
        params["state"] = state
    
    auth_url = f"{FACEBOOK_AUTH_URL}?{urlencode(params)}"
    
    return {
        "auth_url": auth_url,
        "app_id": FACEBOOK_APP_ID,
        "scopes": FACEBOOK_SCOPES
    }


@router.get("/callback")
async def facebook_oauth_callback(code: str = None, state: Optional[str] = None, error: Optional[str] = None):
    """Handle Facebook OAuth callback."""
    from fastapi.responses import HTMLResponse
    from database import get_database
    import jwt
    import datetime
    
    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "faceconnect-secret-key-change-in-production")
    
    if error:
        logger.error(f"Facebook OAuth error: {error}")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>FaceConnect - Facebook Login</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       background: #111b21; color: white; display: flex; justify-content: center; 
                       align-items: center; height: 100vh; margin: 0; text-align: center; }}
                .error {{ color: #ff6b6b; font-size: 18px; margin-bottom: 10px; }}
            </style>
        </head>
        <body>
            <div>
                <div class="error">Facebook Login Failed</div>
                <p style="color:#8696a0">Error: {error}</p>
                <p style="color:#8696a0;margin-top:20px">You can close this window.</p>
            </div>
        </body>
        </html>
        """)
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                FACEBOOK_TOKEN_URL,
                params={
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "code": code,
                    "redirect_uri": FACEBOOK_REDIRECT_URI,
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return HTMLResponse(content="""
                <!DOCTYPE html>
                <html>
                <head><title>FaceConnect</title>
                <style>body{font-family:sans-serif;background:#111b21;color:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}</style>
                </head>
                <body><div style="text-align:center"><div style="color:#ff6b6b;font-size:18px">Token Exchange Failed</div><p style="color:#8696a0">Please try again. You can close this window.</p></div></body>
                </html>
                """)
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Get Facebook user profile
            profile_response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me",
                params={
                    "fields": "id,name,email,picture.type(large)",
                    "access_token": access_token
                }
            )
            
            if profile_response.status_code != 200:
                raise Exception("Failed to get Facebook profile")
            
            profile = profile_response.json()
            facebook_id = profile.get("id")
            email = profile.get("email") or f"fb_{facebook_id}@facebook.com"
            name = profile.get("name", "Facebook User")
            avatar = profile.get("picture", {}).get("data", {}).get("url", "")
            
            # Get database
            db = await get_database()
            
            # Check if user exists by Facebook ID or email
            user = await db.users.find_one({
                "$or": [
                    {"facebook_id": facebook_id},
                    {"email": email}
                ]
            })
            
            if user:
                # Update existing user with Facebook info
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "facebook_id": facebook_id,
                        "facebook_token": access_token,
                        "avatar": avatar if avatar else user.get("avatar"),
                        "last_login": datetime.datetime.utcnow()
                    }}
                )
                user_id = str(user["_id"])
                display_name = user.get("display_name") or name
            else:
                # Create new user
                new_user = {
                    "email": email,
                    "display_name": name,
                    "username": f"fb_{facebook_id}",
                    "avatar": avatar,
                    "facebook_id": facebook_id,
                    "facebook_token": access_token,
                    "oauth_provider": "facebook",
                    "created_at": datetime.datetime.utcnow(),
                    "last_login": datetime.datetime.utcnow(),
                    "is_active": True,
                    "is_verified": True
                }
                result = await db.users.insert_one(new_user)
                user_id = str(result.inserted_id)
                display_name = name
            
            # Generate JWT token
            token_payload = {
                "user_id": user_id,
                "email": email,
                "oauth_provider": "facebook",
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
            }
            token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
            
            # Return success page that passes token to opener
            return HTMLResponse(content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>FaceConnect - Login Successful</title>
                <style>
                    body {{ 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        background: linear-gradient(135deg, #111b21 0%, #0d1f2d 100%);
                        color: white; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0; 
                        text-align: center; 
                    }}
                    .container {{ padding: 40px; }}
                    .success {{ color: #00E676; font-size: 24px; margin-bottom: 16px; }}
                    .avatar {{ width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; border: 3px solid #00E676; }}
                    .name {{ font-size: 20px; margin-bottom: 8px; }}
                    .email {{ color: #8696a0; font-size: 14px; margin-bottom: 20px; }}
                    .message {{ color: #8696a0; margin-top: 20px; }}
                </style>
                <script>
                    // Pass authentication data to opener window
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'facebook_auth_success',
                            token: '{token}',
                            user: {{
                                id: '{user_id}',
                                email: '{email}',
                                display_name: '{display_name}',
                                avatar: '{avatar}'
                            }}
                        }}, '*');
                        
                        // Also store in localStorage as backup
                        try {{
                            localStorage.setItem('faceconnect_token', '{token}');
                            localStorage.setItem('faceconnect_user', JSON.stringify({{
                                id: '{user_id}',
                                email: '{email}',
                                display_name: '{display_name}',
                                avatar: '{avatar}'
                            }}));
                        }} catch(e) {{}}
                        
                        setTimeout(() => window.close(), 2000);
                    }} else {{
                        // No opener - redirect to app
                        localStorage.setItem('token', '{token}');
                        localStorage.setItem('user', JSON.stringify({{
                            id: '{user_id}',
                            email: '{email}',
                            display_name: '{display_name}',
                            avatar: '{avatar}'
                        }}));
                        setTimeout(() => window.location.href = '/', 1500);
                    }}
                </script>
            </head>
            <body>
                <div class="container">
                    <img src="{avatar}" class="avatar" onerror="this.style.display='none'" />
                    <div class="success">Welcome to FaceConnect!</div>
                    <div class="name">{display_name}</div>
                    <div class="email">{email}</div>
                    <div class="message">Login successful. This window will close automatically...</div>
                </div>
            </body>
            </html>
            """)
            
    except Exception as e:
        logger.error(f"Facebook OAuth callback error: {e}")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head><title>FaceConnect</title>
        <style>body{{font-family:sans-serif;background:#111b21;color:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}}</style>
        </head>
        <body><div style="text-align:center"><div style="color:#ff6b6b;font-size:18px">Login Failed</div><p style="color:#8696a0">{str(e)}</p><p style="color:#8696a0;margin-top:20px">Please try again. You can close this window.</p></div></body>
        </html>
        """)


@router.post("/exchange-token")
async def exchange_facebook_token(request: FacebookTokenRequest):
    """Exchange authorization code for access token."""
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(status_code=500, detail="Facebook OAuth not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                FACEBOOK_TOKEN_URL,
                params={
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "code": request.code,
                    "redirect_uri": request.redirect_uri or FACEBOOK_REDIRECT_URI,
                }
            )
            
            if token_response.status_code != 200:
                error_data = token_response.json()
                logger.error(f"Token exchange failed: {error_data}")
                raise HTTPException(
                    status_code=400, 
                    detail=error_data.get("error", {}).get("message", "Token exchange failed")
                )
            
            tokens = token_response.json()
            return {
                "access_token": tokens.get("access_token"),
                "token_type": tokens.get("token_type", "bearer"),
                "expires_in": tokens.get("expires_in")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token exchange error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/friends")
async def get_facebook_friends(access_token: str):
    """Fetch friends from Facebook Graph API."""
    if not access_token:
        raise HTTPException(status_code=400, detail="Access token required")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get user's friends who also use the app
            response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me/friends",
                params={
                    "fields": "id,name,picture.type(large)",
                    "access_token": access_token
                }
            )
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid or expired access token")
            
            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Facebook Graph API error: {error_data}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=error_data.get("error", {}).get("message", "Failed to fetch friends")
                )
            
            data = response.json()
            friends_data = data.get("data", [])
            
            # Transform to our format
            friends = []
            for friend in friends_data:
                friends.append({
                    "name": friend.get("name", "Unknown"),
                    "facebook_id": friend.get("id"),
                    "avatar": friend.get("picture", {}).get("data", {}).get("url", ""),
                    "source": "facebook"
                })
            
            # Also get user's own profile
            profile_response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me",
                params={
                    "fields": "id,name,email,picture.type(large)",
                    "access_token": access_token
                }
            )
            
            user_profile = None
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                user_profile = {
                    "name": profile_data.get("name"),
                    "email": profile_data.get("email"),
                    "facebook_id": profile_data.get("id"),
                    "avatar": profile_data.get("picture", {}).get("data", {}).get("url", "")
                }
            
            return {
                "friends": friends,
                "total": len(friends),
                "user_profile": user_profile,
                "summary": data.get("summary", {})
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Facebook friends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def get_facebook_profile(access_token: str):
    """Get current user's Facebook profile."""
    if not access_token:
        raise HTTPException(status_code=400, detail="Access token required")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FACEBOOK_GRAPH_API}/me",
                params={
                    "fields": "id,name,email,picture.type(large),friends",
                    "access_token": access_token
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to fetch profile")
                )
            
            return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Facebook profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def facebook_oauth_status():
    """Check if Facebook OAuth is configured."""
    return {
        "configured": bool(FACEBOOK_APP_ID and FACEBOOK_APP_SECRET),
        "app_id_set": bool(FACEBOOK_APP_ID),
        "app_secret_set": bool(FACEBOOK_APP_SECRET)
    }


# Export for other modules
__all__ = ["router"]
