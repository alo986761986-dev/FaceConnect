"""
Google OAuth routes for FaceConnect.
Handles Google Contacts import via OAuth 2.0.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
import logging
from urllib.parse import urlencode
from datetime import datetime, timedelta
import json
import base64

# Import db from motor
from motor.motor_asyncio import AsyncIOMotorClient

# Get MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "faceconnect")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# Helper function to get current user
async def get_current_user(token: str) -> Optional[dict]:
    """Get current user from token."""
    if not token:
        return None
    user = await db.users.find_one({"token": token}, {"_id": 0, "password": 0})
    return user

router = APIRouter(prefix="/google", tags=["Google OAuth"])
logger = logging.getLogger(__name__)

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'https://faceconnect.com/api/google/callback')

# Multiple redirect URIs for different environments (web, desktop, mobile)
# All these must be registered in Google Cloud Console
ALLOWED_REDIRECT_URIS = [
    GOOGLE_REDIRECT_URI,
    "http://localhost:3000/api/google/callback",  # Electron dev
    "http://localhost:8001/api/google/callback",  # Direct backend dev
    "http://127.0.0.1:3000/api/google/callback",
    "http://127.0.0.1:8001/api/google/callback",
]

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_PEOPLE_API = "https://people.googleapis.com/v1/people/me/connections"

# Scopes for Google Contacts (read and write)
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts",  # Write access
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

# Google People API for creating contacts
GOOGLE_PEOPLE_CREATE_API = "https://people.googleapis.com/v1/people:createContact"
GOOGLE_BATCH_CREATE_API = "https://people.googleapis.com/v1/people:batchCreateContacts"

# Temporary token storage with redirect_uri info (in production, use Redis or database)
pending_tokens = {}
pending_redirect_uris = {}  # Store redirect_uri used for each state


class GoogleTokenRequest(BaseModel):
    """Request to exchange authorization code for tokens"""
    code: str
    redirect_uri: Optional[str] = None


class GoogleContactsResponse(BaseModel):
    """Response with Google contacts"""
    contacts: List[dict]
    total: int


class GoogleExportContactRequest(BaseModel):
    """Single contact to export to Google"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class GoogleExportContactsRequest(BaseModel):
    """Request to export contacts to Google"""
    access_token: str
    contacts: List[GoogleExportContactRequest]


@router.get("/auth-url")
async def get_google_auth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None):
    """Get the Google OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Use provided redirect_uri or default
    callback_uri = redirect_uri or GOOGLE_REDIRECT_URI
    
    # Generate state if not provided (for tracking the OAuth flow)
    import uuid
    oauth_state = state or str(uuid.uuid4())
    
    # Store the redirect_uri for this state so callback knows which one was used
    pending_redirect_uris[oauth_state] = callback_uri
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": oauth_state,
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    return {
        "auth_url": auth_url,
        "client_id": GOOGLE_CLIENT_ID,
        "scopes": GOOGLE_SCOPES,
        "state": oauth_state,
        "redirect_uri": callback_uri
    }


@router.get("/callback")
async def google_oauth_callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """Handle Google OAuth callback."""
    if error:
        logger.error(f"Google OAuth error: {error}")
        # Return HTML page showing error
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>FaceConnect - Google Sign In</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       background: #111b21; color: white; display: flex; justify-content: center; 
                       align-items: center; height: 100vh; margin: 0; }}
                .container {{ text-align: center; padding: 40px; }}
                .error {{ color: #ff6b6b; font-size: 18px; margin-bottom: 20px; }}
                .message {{ color: #8696a0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error">Authentication Failed</div>
                <div class="message">Error: {error}</div>
                <div class="message" style="margin-top: 20px;">You can close this window.</div>
            </div>
        </body>
        </html>
        """)
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code provided")
    
    try:
        # Get the redirect URI that was used for this OAuth flow
        # Look it up from stored state, or fall back to default
        callback_uri = pending_redirect_uris.pop(state, GOOGLE_REDIRECT_URI) if state else GOOGLE_REDIRECT_URI
        logger.info(f"OAuth callback - state: {state}, using redirect_uri: {callback_uri}")
        
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": callback_uri,
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                return HTMLResponse(content="""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>FaceConnect - Google Sign In</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                               background: #111b21; color: white; display: flex; justify-content: center; 
                               align-items: center; height: 100vh; margin: 0; }
                        .container { text-align: center; padding: 40px; }
                        .error { color: #ff6b6b; font-size: 18px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error">Token exchange failed</div>
                        <div style="color: #8696a0;">Please try again. You can close this window.</div>
                    </div>
                </body>
                </html>
                """)
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Store token with state for Electron to retrieve
            if state:
                pending_tokens[state] = {
                    "access_token": access_token,
                    "refresh_token": tokens.get("refresh_token"),
                    "expires_in": tokens.get("expires_in")
                }
            
            # Return success HTML page
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>FaceConnect - Google Sign In</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           background: #111b21; color: white; display: flex; justify-content: center; 
                           align-items: center; height: 100vh; margin: 0; }
                    .container { text-align: center; padding: 40px; }
                    .success { color: #00a884; font-size: 48px; margin-bottom: 20px; }
                    .title { font-size: 24px; margin-bottom: 10px; }
                    .message { color: #8696a0; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✓</div>
                    <div class="title">Google Sign In Successful!</div>
                    <div class="message">You can now close this window and return to FaceConnect.</div>
                    <div class="message" style="margin-top: 20px; font-size: 14px;">Your contacts are being imported...</div>
                </div>
                <script>
                    // Try to close the window after a short delay
                    setTimeout(function() {
                        window.close();
                    }, 3000);
                </script>
            </body>
            </html>
            """)
            
    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>FaceConnect - Google Sign In</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                       background: #111b21; color: white; display: flex; justify-content: center; 
                       align-items: center; height: 100vh; margin: 0; }
                .container { text-align: center; padding: 40px; }
                .error { color: #ff6b6b; font-size: 18px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error">An error occurred</div>
                <div style="color: #8696a0;">Please try again. You can close this window.</div>
            </div>
        </body>
        </html>
        """)


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


@router.get("/check-token")
async def check_pending_token(state: str):
    """Check if a token is ready for the given state (used by Electron apps)."""
    if not state:
        raise HTTPException(status_code=400, detail="State parameter required")
    
    if state in pending_tokens:
        token_data = pending_tokens.pop(state)  # Remove after retrieval
        return token_data
    
    return {"access_token": None, "status": "pending"}


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


@router.post("/export-contacts")
async def export_contacts_to_google(request: GoogleExportContactsRequest):
    """Export contacts to Google Contacts."""
    if not request.contacts:
        return {"exported": 0, "failed": 0, "message": "No contacts to export"}
    
    exported = 0
    failed = 0
    errors = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for contact in request.contacts:
                try:
                    # Build the contact payload for Google People API
                    contact_data = {
                        "names": [{"givenName": contact.name.split()[0] if contact.name else "Unknown"}]
                    }
                    
                    # Add family name if available
                    name_parts = contact.name.split() if contact.name else []
                    if len(name_parts) > 1:
                        contact_data["names"][0]["familyName"] = " ".join(name_parts[1:])
                    
                    # Add email if provided
                    if contact.email:
                        contact_data["emailAddresses"] = [{"value": contact.email, "type": "home"}]
                    
                    # Add phone if provided
                    if contact.phone:
                        contact_data["phoneNumbers"] = [{"value": contact.phone, "type": "mobile"}]
                    
                    # Create contact via Google People API
                    response = await client.post(
                        GOOGLE_PEOPLE_CREATE_API,
                        headers={
                            "Authorization": f"Bearer {request.access_token}",
                            "Content-Type": "application/json"
                        },
                        json=contact_data
                    )
                    
                    if response.status_code == 200 or response.status_code == 201:
                        exported += 1
                    else:
                        failed += 1
                        error_msg = response.json().get("error", {}).get("message", "Unknown error")
                        errors.append(f"{contact.name}: {error_msg}")
                        logger.warning(f"Failed to export contact {contact.name}: {response.text}")
                        
                except Exception as e:
                    failed += 1
                    errors.append(f"{contact.name}: {str(e)}")
                    logger.error(f"Error exporting contact {contact.name}: {e}")
            
            return {
                "exported": exported,
                "failed": failed,
                "total": len(request.contacts),
                "message": f"Exported {exported} contacts to Google" if exported > 0 else "Failed to export contacts",
                "errors": errors[:5] if errors else []  # Return first 5 errors
            }
            
    except Exception as e:
        logger.error(f"Error exporting to Google: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-export-contacts")
async def batch_export_contacts_to_google(request: GoogleExportContactsRequest):
    """Batch export contacts to Google Contacts (faster for large lists)."""
    if not request.contacts:
        return {"exported": 0, "failed": 0, "message": "No contacts to export"}
    
    # Google batch create limit is 200 contacts at a time
    BATCH_SIZE = 200
    total_exported = 0
    total_failed = 0
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Process in batches
            for i in range(0, len(request.contacts), BATCH_SIZE):
                batch = request.contacts[i:i + BATCH_SIZE]
                
                # Build batch request
                contacts_data = []
                for contact in batch:
                    contact_data = {
                        "contactPerson": {
                            "names": [{"givenName": contact.name.split()[0] if contact.name else "Unknown"}]
                        }
                    }
                    
                    name_parts = contact.name.split() if contact.name else []
                    if len(name_parts) > 1:
                        contact_data["contactPerson"]["names"][0]["familyName"] = " ".join(name_parts[1:])
                    
                    if contact.email:
                        contact_data["contactPerson"]["emailAddresses"] = [{"value": contact.email}]
                    
                    if contact.phone:
                        contact_data["contactPerson"]["phoneNumbers"] = [{"value": contact.phone}]
                    
                    contacts_data.append(contact_data)
                
                # Make batch request
                try:
                    response = await client.post(
                        GOOGLE_BATCH_CREATE_API,
                        headers={
                            "Authorization": f"Bearer {request.access_token}",
                            "Content-Type": "application/json"
                        },
                        json={"contacts": contacts_data, "readMask": "names,emailAddresses,phoneNumbers"}
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        created = result.get("createdPeople", [])
                        total_exported += len(created)
                    else:
                        # Fallback to individual creates if batch fails
                        for contact in batch:
                            contact_payload = {
                                "names": [{"givenName": contact.name.split()[0] if contact.name else "Unknown"}]
                            }
                            if contact.email:
                                contact_payload["emailAddresses"] = [{"value": contact.email}]
                            if contact.phone:
                                contact_payload["phoneNumbers"] = [{"value": contact.phone}]
                            
                            single_response = await client.post(
                                GOOGLE_PEOPLE_CREATE_API,
                                headers={
                                    "Authorization": f"Bearer {request.access_token}",
                                    "Content-Type": "application/json"
                                },
                                json=contact_payload
                            )
                            
                            if single_response.status_code in [200, 201]:
                                total_exported += 1
                            else:
                                total_failed += 1
                                
                except Exception as batch_error:
                    logger.error(f"Batch export error: {batch_error}")
                    total_failed += len(batch)
            
            return {
                "exported": total_exported,
                "failed": total_failed,
                "total": len(request.contacts),
                "message": f"Exported {total_exported} contacts to Google"
            }
            
    except Exception as e:
        logger.error(f"Error in batch export: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def google_oauth_status():
    """Check if Google OAuth is configured and provide setup info."""
    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
        "client_secret_set": bool(GOOGLE_CLIENT_SECRET),
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "all_redirect_uris": ALLOWED_REDIRECT_URIS,
        "setup_instructions": {
            "step_1": "Go to https://console.cloud.google.com/apis/credentials",
            "step_2": "Select your OAuth 2.0 Client ID",
            "step_3": "Add ALL these URIs to 'Authorized redirect URIs':",
            "required_redirect_uris": ALLOWED_REDIRECT_URIS,
            "step_4": "Click Save and wait 5 minutes for changes to propagate",
            "note": "For desktop (.exe) apps, you need the localhost URIs registered"
        }
    }


@router.get("/test-redirect")
async def test_google_redirect():
    """Test endpoint to verify redirect URI configuration.
    Visit this URL to see the exact redirect URI that must be in Google Console."""
    
    # Generate list of URIs for the HTML
    uri_list_html = "\n".join([f'<li style="margin: 8px 0;"><code style="background: #0d1117; padding: 4px 8px; border-radius: 4px; user-select: all;">{uri}</code></li>' for uri in ALLOWED_REDIRECT_URIS])
    
    return HTMLResponse(content=f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google OAuth Setup Guide - FaceConnect</title>
        <style>
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white; 
                padding: 40px;
                min-height: 100vh;
                margin: 0;
            }}
            .container {{ max-width: 900px; margin: 0 auto; }}
            h1 {{ color: #00a884; }}
            h2 {{ color: #8b5cf6; margin-top: 30px; }}
            .uri-box {{ 
                background: #0d1117; 
                border: 2px solid #00a884;
                border-radius: 8px; 
                padding: 20px; 
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 14px;
                user-select: all;
            }}
            .uri-list {{
                background: #0d1117;
                border: 2px solid #8b5cf6;
                border-radius: 8px;
                padding: 15px 15px 15px 35px;
                margin: 20px 0;
            }}
            .step {{ 
                background: rgba(255,255,255,0.05); 
                border-radius: 8px; 
                padding: 15px; 
                margin: 10px 0;
            }}
            .step-num {{ 
                background: #00a884;
                color: white;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                font-weight: bold;
            }}
            a {{ color: #00a884; }}
            .warning {{ background: #ff6b6b22; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .success {{ background: #00a88422; border-left: 4px solid #00a884; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .info {{ background: #8b5cf622; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            code {{ background: #0d1117; padding: 2px 6px; border-radius: 4px; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-left: 8px; }}
            .badge-web {{ background: #00a884; }}
            .badge-desktop {{ background: #8b5cf6; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Google OAuth Setup Guide for FaceConnect</h1>
            
            <div class="warning">
                <strong>⚠️ redirect_uri_mismatch Error?</strong><br>
                This means the redirect URI in Google Cloud Console doesn't match the one your app is using.
                You need to add ALL the URIs below to fix this.
            </div>
            
            <h2>📱 Primary Web URI (Required)</h2>
            <div class="uri-box">
                {GOOGLE_REDIRECT_URI}
            </div>
            
            <h2>🖥️ All Redirect URIs (For Desktop .exe Support)</h2>
            <div class="info">
                <strong>For Desktop App:</strong> Add ALL these URIs to support both web preview and Electron desktop app.
            </div>
            <ol class="uri-list">
                {uri_list_html}
            </ol>
            
            <h2>📋 Setup Steps:</h2>
            
            <div class="step">
                <span class="step-num">1</span>
                Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console → APIs & Services → Credentials</a>
            </div>
            
            <div class="step">
                <span class="step-num">2</span>
                Click on your <strong>OAuth 2.0 Client ID</strong> (Client ID: <code>{GOOGLE_CLIENT_ID[:20]}...</code>)
            </div>
            
            <div class="step">
                <span class="step-num">3</span>
                Under <strong>"Authorized redirect URIs"</strong>, click <code>+ ADD URI</code> for EACH URI above
            </div>
            
            <div class="step">
                <span class="step-num">4</span>
                Click <strong>Save</strong> and wait <strong>5 minutes</strong> for changes to propagate
            </div>
            
            <div class="success">
                <strong>✅ After Setup:</strong><br>
                Return to FaceConnect and try the Google Contacts export again. The OAuth flow should now work for both web and desktop.
            </div>
            
            <h2>📊 Current Configuration Status:</h2>
            <ul style="line-height: 2;">
                <li>Client ID Set: <strong>{'✅ Yes' if GOOGLE_CLIENT_ID else '❌ No'}</strong></li>
                <li>Client Secret Set: <strong>{'✅ Yes' if GOOGLE_CLIENT_SECRET else '❌ No'}</strong></li>
                <li>Primary Redirect URI: <strong>{GOOGLE_REDIRECT_URI}</strong> <span class="badge badge-web">Web</span></li>
                <li>Total URIs Configured: <strong>{len(ALLOWED_REDIRECT_URIS)}</strong> <span class="badge badge-desktop">Desktop Ready</span></li>
            </ul>
        </div>
    </body>
    </html>
    """)


@router.get("/user-token")
async def get_user_google_token(token: str):
    """Get the user's stored Google access token for export operations."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get stored Google credentials for this user
    google_creds = await db.google_credentials.find_one({"user_id": user['id']})
    
    if not google_creds:
        return {"access_token": None, "message": "No Google account linked"}
    
    access_token = google_creds.get("access_token")
    refresh_token = google_creds.get("refresh_token")
    expires_at = google_creds.get("expires_at")
    
    # Check if token is expired
    if expires_at:
        from datetime import datetime
        if datetime.fromisoformat(expires_at.replace('Z', '+00:00')) < datetime.now():
            # Token expired, try to refresh
            if refresh_token and GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://oauth2.googleapis.com/token",
                            data={
                                "client_id": GOOGLE_CLIENT_ID,
                                "client_secret": GOOGLE_CLIENT_SECRET,
                                "refresh_token": refresh_token,
                                "grant_type": "refresh_token"
                            }
                        )
                        
                        if response.status_code == 200:
                            token_data = response.json()
                            new_access_token = token_data.get("access_token")
                            expires_in = token_data.get("expires_in", 3600)
                            
                            # Update stored credentials
                            new_expires_at = (datetime.now() + timedelta(seconds=expires_in)).isoformat()
                            await db.google_credentials.update_one(
                                {"user_id": user['id']},
                                {"$set": {
                                    "access_token": new_access_token,
                                    "expires_at": new_expires_at
                                }}
                            )
                            
                            return {"access_token": new_access_token}
                except Exception as e:
                    logger.error(f"Failed to refresh Google token: {e}")
                    return {"access_token": None, "message": "Token expired, please re-authenticate"}
            
            return {"access_token": None, "message": "Token expired, please re-authenticate"}
    
    return {"access_token": access_token}


# Export for other modules
__all__ = ["router"]
