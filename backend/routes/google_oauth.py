"""
Google OAuth routes for FaceConnect.
Handles Google Contacts import via OAuth 2.0.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
import logging
from urllib.parse import urlencode

router = APIRouter(prefix="/google", tags=["Google OAuth"])
logger = logging.getLogger(__name__)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'https://faceconnect.com/api/google/callback')

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_PEOPLE_API = "https://people.googleapis.com/v1/people/me/connections"

# Scopes for Google Contacts
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]


class GoogleTokenRequest(BaseModel):
    """Request to exchange authorization code for tokens"""
    code: str
    redirect_uri: Optional[str] = None


class GoogleContactsResponse(BaseModel):
    """Response with Google contacts"""
    contacts: List[dict]
    total: int


@router.get("/auth-url")
async def get_google_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """Get the Google OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Use provided redirect_uri or default
    callback_uri = redirect_uri or GOOGLE_REDIRECT_URI
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    
    if state:
        params["state"] = state
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    return {
        "auth_url": auth_url,
        "client_id": GOOGLE_CLIENT_ID,
        "scopes": GOOGLE_SCOPES
    }


@router.get("/callback")
async def google_oauth_callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """Handle Google OAuth callback."""
    if error:
        logger.error(f"Google OAuth error: {error}")
        # Redirect to frontend with error
        return RedirectResponse(url=f"/contacts?error={error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return RedirectResponse(url="/contacts?error=token_exchange_failed")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Redirect to frontend with access token
            # In production, you'd store this token securely
            return RedirectResponse(url=f"/contacts?google_token={access_token}&state={state or ''}")
            
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url="/contacts?error=callback_failed")


@router.post("/exchange-token")
async def exchange_google_token(request: GoogleTokenRequest):
    """Exchange authorization code for access token."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": request.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": request.redirect_uri or GOOGLE_REDIRECT_URI,
                }
            )
            
            if token_response.status_code != 200:
                error_data = token_response.json()
                logger.error(f"Token exchange failed: {error_data}")
                raise HTTPException(
                    status_code=400, 
                    detail=error_data.get("error_description", "Token exchange failed")
                )
            
            tokens = token_response.json()
            return {
                "access_token": tokens.get("access_token"),
                "refresh_token": tokens.get("refresh_token"),
                "expires_in": tokens.get("expires_in"),
                "token_type": tokens.get("token_type")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token exchange error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contacts")
async def get_google_contacts(access_token: str, page_size: int = 100):
    """Fetch contacts from Google People API."""
    if not access_token:
        raise HTTPException(status_code=400, detail="Access token required")
    
    try:
        async with httpx.AsyncClient() as client:
            # Fetch contacts from Google People API
            response = await client.get(
                GOOGLE_PEOPLE_API,
                params={
                    "personFields": "names,emailAddresses,phoneNumbers,photos",
                    "pageSize": min(page_size, 1000),
                    "sortOrder": "FIRST_NAME_ASCENDING"
                },
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid or expired access token")
            
            if response.status_code != 200:
                logger.error(f"Google People API error: {response.text}")
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch contacts")
            
            data = response.json()
            connections = data.get("connections", [])
            
            # Transform contacts to our format
            contacts = []
            for person in connections:
                names = person.get("names", [])
                emails = person.get("emailAddresses", [])
                phones = person.get("phoneNumbers", [])
                photos = person.get("photos", [])
                
                contact = {
                    "name": names[0].get("displayName", "Unknown") if names else "Unknown",
                    "email": emails[0].get("value", "") if emails else "",
                    "phone": phones[0].get("value", "") if phones else "",
                    "avatar": photos[0].get("url", "") if photos else "",
                    "source": "google"
                }
                
                # Only add if has name and (email or phone)
                if contact["name"] != "Unknown" and (contact["email"] or contact["phone"]):
                    contacts.append(contact)
            
            return {
                "contacts": contacts,
                "total": len(contacts),
                "next_page_token": data.get("nextPageToken")
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Google contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def google_oauth_status():
    """Check if Google OAuth is configured."""
    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
        "client_secret_set": bool(GOOGLE_CLIENT_SECRET)
    }


# Export for other modules
__all__ = ["router"]
