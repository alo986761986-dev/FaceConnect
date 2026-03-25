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
import json
import base64

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

# Temporary token storage (in production, use Redis or database)
pending_tokens = {}


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
        # Get the redirect URI that was used
        # For Electron apps, use the backend callback URL
        callback_uri = GOOGLE_REDIRECT_URI
        
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


@router.get("/status")
async def google_oauth_status():
    """Check if Google OAuth is configured and provide setup info."""
    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
        "client_secret_set": bool(GOOGLE_CLIENT_SECRET),
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "setup_instructions": {
            "step_1": "Go to https://console.cloud.google.com/apis/credentials",
            "step_2": "Select your OAuth 2.0 Client ID",
            "step_3": "Add this exact URI to 'Authorized redirect URIs':",
            "required_redirect_uri": GOOGLE_REDIRECT_URI,
            "step_4": "Click Save and wait 5 minutes for changes to propagate"
        }
    }


@router.get("/test-redirect")
async def test_google_redirect():
    """Test endpoint to verify redirect URI configuration.
    Visit this URL to see the exact redirect URI that must be in Google Console."""
    return HTMLResponse(content=f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google OAuth Setup Guide</title>
        <style>
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white; 
                padding: 40px;
                min-height: 100vh;
                margin: 0;
            }}
            .container {{ max-width: 800px; margin: 0 auto; }}
            h1 {{ color: #00a884; }}
            .uri-box {{ 
                background: #0d1117; 
                border: 2px solid #00a884;
                border-radius: 8px; 
                padding: 20px; 
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 16px;
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
            .warning {{ background: #ff6b6b22; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; }}
            .success {{ background: #00a88422; border-left: 4px solid #00a884; padding: 15px; margin: 20px 0; }}
            code {{ background: #0d1117; padding: 2px 6px; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Google OAuth Setup Guide</h1>
            
            <div class="warning">
                <strong>⚠️ redirect_uri_mismatch Error?</strong><br>
                This means the redirect URI in Google Cloud Console doesn't match the one your app is using.
            </div>
            
            <h2>Your App's Redirect URI:</h2>
            <div class="uri-box">
                {GOOGLE_REDIRECT_URI}
            </div>
            
            <h2>Setup Steps:</h2>
            
            <div class="step">
                <span class="step-num">1</span>
                Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console → APIs & Services → Credentials</a>
            </div>
            
            <div class="step">
                <span class="step-num">2</span>
                Click on your <strong>OAuth 2.0 Client ID</strong> (or create one if you haven't)
            </div>
            
            <div class="step">
                <span class="step-num">3</span>
                Under <strong>"Authorized redirect URIs"</strong>, click <code>+ ADD URI</code>
            </div>
            
            <div class="step">
                <span class="step-num">4</span>
                Paste this <strong>EXACT</strong> URI (copy from the green box above):
                <div class="uri-box" style="margin-top: 10px; border-color: #ffd93d;">
                    {GOOGLE_REDIRECT_URI}
                </div>
            </div>
            
            <div class="step">
                <span class="step-num">5</span>
                Click <strong>Save</strong> and wait <strong>5 minutes</strong> for changes to propagate
            </div>
            
            <div class="success">
                <strong>✅ After Setup:</strong><br>
                Return to FaceConnect and try importing Google Contacts again. The OAuth flow should now work.
            </div>
            
            <h2>Current Configuration Status:</h2>
            <ul>
                <li>Client ID Set: <strong>{'✅ Yes' if GOOGLE_CLIENT_ID else '❌ No'}</strong></li>
                <li>Client Secret Set: <strong>{'✅ Yes' if GOOGLE_CLIENT_SECRET else '❌ No'}</strong></li>
                <li>Redirect URI: <strong>{GOOGLE_REDIRECT_URI}</strong></li>
            </ul>
        </div>
    </body>
    </html>
    """)


# Export for other modules
__all__ = ["router"]
