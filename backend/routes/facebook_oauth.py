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
    if error:
        logger.error(f"Facebook OAuth error: {error}")
        return RedirectResponse(url=f"/contacts?error={error}")
    
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
                return RedirectResponse(url="/contacts?error=token_exchange_failed")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            return RedirectResponse(url=f"/contacts?facebook_token={access_token}&state={state or ''}")
            
    except Exception as e:
        logger.error(f"Facebook OAuth callback error: {e}")
        return RedirectResponse(url="/contacts?error=callback_failed")


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
