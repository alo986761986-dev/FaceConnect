"""
Encrypted Backup routes for FaceConnect.
Supports local encrypted export, cloud storage, and server-side backup.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import json
import base64
import hashlib
import os
import io
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from .shared import db, get_current_user, exclude_id

router = APIRouter(prefix="/backup", tags=["backup"])

# Encryption helpers
def derive_key(password: str, salt: bytes) -> bytes:
    """Derive encryption key from password using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))


def encrypt_data(data: str, password: str) -> dict:
    """Encrypt data with password-derived key."""
    salt = os.urandom(16)
    key = derive_key(password, salt)
    fernet = Fernet(key)
    encrypted = fernet.encrypt(data.encode())
    
    return {
        "salt": base64.b64encode(salt).decode(),
        "data": base64.b64encode(encrypted).decode()
    }


def decrypt_data(encrypted_payload: dict, password: str) -> str:
    """Decrypt data with password-derived key."""
    salt = base64.b64decode(encrypted_payload["salt"])
    encrypted = base64.b64decode(encrypted_payload["data"])
    key = derive_key(password, salt)
    fernet = Fernet(key)
    return fernet.decrypt(encrypted).decode()


class BackupRequest(BaseModel):
    password: str
    include_posts: bool = True
    include_messages: bool = True
    include_saved: bool = True
    include_settings: bool = True


class CloudBackupRequest(BaseModel):
    password: str
    provider: str  # "google_drive", "dropbox", "server"
    access_token: Optional[str] = None  # For OAuth providers


class RestoreRequest(BaseModel):
    password: str
    backup_data: str  # Base64 encoded encrypted backup


# ============== LOCAL ENCRYPTED EXPORT (Option A) ==============

@router.post("/export")
async def export_encrypted_backup(request: BackupRequest, token: str):
    """
    Create an encrypted backup of user data for local download.
    Returns encrypted JSON that can be decrypted with the same password.
    """
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    backup_data = {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["id"],
        "username": user.get("username"),
        "data": {}
    }
    
    # Export profile
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    if profile:
        backup_data["data"]["profile"] = profile
    
    # Export posts
    if request.include_posts:
        posts = await db.posts.find(
            {"user_id": user["id"]}, {"_id": 0}
        ).to_list(10000)
        backup_data["data"]["posts"] = posts
        
        # Export stories
        stories = await db.stories.find(
            {"user_id": user["id"]}, {"_id": 0}
        ).to_list(1000)
        backup_data["data"]["stories"] = stories
    
    # Export messages
    if request.include_messages:
        # Get user's conversations
        conversations = await db.conversations.find(
            {"participant_ids": user["id"]}, {"_id": 0}
        ).to_list(1000)
        backup_data["data"]["conversations"] = conversations
        
        # Get messages from those conversations
        conv_ids = [c["id"] for c in conversations]
        messages = await db.messages.find(
            {"conversation_id": {"$in": conv_ids}}, {"_id": 0}
        ).to_list(100000)
        backup_data["data"]["messages"] = messages
    
    # Export saved posts
    if request.include_saved:
        saved = await db.saved_posts.find(
            {"user_id": user["id"]}, {"_id": 0}
        ).to_list(10000)
        backup_data["data"]["saved_posts"] = saved
        
        collections = await db.collections.find(
            {"user_id": user["id"]}, {"_id": 0}
        ).to_list(100)
        backup_data["data"]["collections"] = collections
    
    # Export settings
    if request.include_settings:
        settings = await db.user_settings.find_one(
            {"user_id": user["id"]}, {"_id": 0}
        )
        backup_data["data"]["settings"] = settings
    
    # Encrypt the backup
    json_data = json.dumps(backup_data, default=str)
    encrypted = encrypt_data(json_data, request.password)
    
    # Create downloadable file
    backup_content = json.dumps({
        "type": "faceconnect_backup",
        "version": "1.0",
        "encrypted": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payload": encrypted
    })
    
    return {
        "backup": backup_content,
        "filename": f"faceconnect_backup_{user['username']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        "size_bytes": len(backup_content),
        "items": {
            "posts": len(backup_data["data"].get("posts", [])),
            "stories": len(backup_data["data"].get("stories", [])),
            "conversations": len(backup_data["data"].get("conversations", [])),
            "messages": len(backup_data["data"].get("messages", [])),
            "saved_posts": len(backup_data["data"].get("saved_posts", []))
        }
    }


@router.post("/export/download")
async def download_encrypted_backup(request: BackupRequest, token: str):
    """Download encrypted backup as a file."""
    result = await export_encrypted_backup(request, token)
    
    # Create streaming response
    content = result["backup"]
    filename = result["filename"]
    
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== CLOUD STORAGE (Option B) ==============

@router.post("/cloud/google-drive")
async def backup_to_google_drive(request: CloudBackupRequest, token: str):
    """
    Upload encrypted backup to Google Drive.
    Requires user's Google OAuth access token.
    """
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not request.access_token:
        raise HTTPException(status_code=400, detail="Google Drive access token required")
    
    # Create encrypted backup
    backup_request = BackupRequest(
        password=request.password,
        include_posts=True,
        include_messages=True,
        include_saved=True,
        include_settings=True
    )
    backup_result = await export_encrypted_backup(backup_request, token)
    
    try:
        import aiohttp
        
        # Upload to Google Drive
        async with aiohttp.ClientSession() as session:
            # Create file metadata
            metadata = {
                "name": backup_result["filename"],
                "mimeType": "application/json",
                "parents": ["appDataFolder"]  # Store in app-specific folder
            }
            
            # Multipart upload
            form = aiohttp.FormData()
            form.add_field(
                "metadata",
                json.dumps(metadata),
                content_type="application/json"
            )
            form.add_field(
                "file",
                backup_result["backup"],
                content_type="application/json"
            )
            
            async with session.post(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                headers={"Authorization": f"Bearer {request.access_token}"},
                data=form
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    raise HTTPException(status_code=500, detail=f"Google Drive upload failed: {error}")
                
                result = await response.json()
                
                # Save backup record
                await db.cloud_backups.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "provider": "google_drive",
                    "file_id": result.get("id"),
                    "filename": backup_result["filename"],
                    "size_bytes": backup_result["size_bytes"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                return {
                    "success": True,
                    "provider": "google_drive",
                    "file_id": result.get("id"),
                    "filename": backup_result["filename"]
                }
                
    except ImportError:
        raise HTTPException(status_code=500, detail="aiohttp not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cloud/dropbox")
async def backup_to_dropbox(request: CloudBackupRequest, token: str):
    """
    Upload encrypted backup to Dropbox.
    Requires user's Dropbox OAuth access token.
    """
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if not request.access_token:
        raise HTTPException(status_code=400, detail="Dropbox access token required")
    
    # Create encrypted backup
    backup_request = BackupRequest(
        password=request.password,
        include_posts=True,
        include_messages=True,
        include_saved=True,
        include_settings=True
    )
    backup_result = await export_encrypted_backup(backup_request, token)
    
    try:
        import aiohttp
        
        filename = backup_result["filename"]
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://content.dropboxapi.com/2/files/upload",
                headers={
                    "Authorization": f"Bearer {request.access_token}",
                    "Dropbox-API-Arg": json.dumps({
                        "path": f"/FaceConnect Backups/{filename}",
                        "mode": "add",
                        "autorename": True
                    }),
                    "Content-Type": "application/octet-stream"
                },
                data=backup_result["backup"].encode()
            ) as response:
                if response.status != 200:
                    error = await response.text()
                    raise HTTPException(status_code=500, detail=f"Dropbox upload failed: {error}")
                
                result = await response.json()
                
                # Save backup record
                await db.cloud_backups.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "provider": "dropbox",
                    "file_id": result.get("id"),
                    "path": result.get("path_display"),
                    "filename": filename,
                    "size_bytes": backup_result["size_bytes"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                return {
                    "success": True,
                    "provider": "dropbox",
                    "path": result.get("path_display"),
                    "filename": filename
                }
                
    except ImportError:
        raise HTTPException(status_code=500, detail="aiohttp not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== SERVER-SIDE BACKUP (Option C) ==============

@router.post("/server")
async def create_server_backup(request: BackupRequest, token: str):
    """
    Store encrypted backup on server.
    Maximum 3 backups per user, oldest gets deleted.
    """
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Create encrypted backup
    backup_request = BackupRequest(
        password=request.password,
        include_posts=True,
        include_messages=True,
        include_saved=True,
        include_settings=True
    )
    backup_result = await export_encrypted_backup(backup_request, token)
    
    # Check existing backups (max 3)
    existing_backups = await db.server_backups.find(
        {"user_id": user["id"]}
    ).sort("created_at", 1).to_list(10)
    
    # Delete oldest if over limit
    if len(existing_backups) >= 3:
        oldest = existing_backups[0]
        await db.server_backups.delete_one({"id": oldest["id"]})
    
    # Store new backup
    backup_id = str(uuid.uuid4())
    await db.server_backups.insert_one({
        "id": backup_id,
        "user_id": user["id"],
        "encrypted_data": backup_result["backup"],
        "size_bytes": backup_result["size_bytes"],
        "items": backup_result["items"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "backup_id": backup_id,
        "size_bytes": backup_result["size_bytes"],
        "items": backup_result["items"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/server")
async def list_server_backups(token: str):
    """List all server-side backups for the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    backups = await db.server_backups.find(
        {"user_id": user["id"]},
        {"_id": 0, "encrypted_data": 0}  # Don't send actual data in list
    ).sort("created_at", -1).to_list(10)
    
    return {"backups": backups}


@router.get("/server/{backup_id}")
async def get_server_backup(backup_id: str, token: str):
    """Get a specific server backup."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    backup = await db.server_backups.find_one({
        "id": backup_id,
        "user_id": user["id"]
    }, {"_id": 0})
    
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    return backup


@router.delete("/server/{backup_id}")
async def delete_server_backup(backup_id: str, token: str):
    """Delete a server backup."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.server_backups.delete_one({
        "id": backup_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    return {"success": True, "message": "Backup deleted"}


# ============== RESTORE ==============

@router.post("/restore")
async def restore_from_backup(request: RestoreRequest, token: str):
    """
    Restore user data from an encrypted backup.
    Warning: This will merge data with existing data.
    """
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Parse backup file
        backup_file = json.loads(request.backup_data)
        
        if backup_file.get("type") != "faceconnect_backup":
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        if not backup_file.get("encrypted"):
            raise HTTPException(status_code=400, detail="Backup is not encrypted")
        
        # Decrypt
        decrypted_json = decrypt_data(backup_file["payload"], request.password)
        backup_data = json.loads(decrypted_json)
        
        # Verify ownership (optional - allow restoring to different account)
        # if backup_data.get("user_id") != user["id"]:
        #     raise HTTPException(status_code=403, detail="Backup belongs to different user")
        
        restored = {
            "posts": 0,
            "stories": 0,
            "saved_posts": 0,
            "collections": 0
        }
        
        data = backup_data.get("data", {})
        
        # Restore posts (skip duplicates)
        if "posts" in data:
            for post in data["posts"]:
                post["user_id"] = user["id"]  # Assign to current user
                existing = await db.posts.find_one({"id": post["id"]})
                if not existing:
                    await db.posts.insert_one(post)
                    restored["posts"] += 1
        
        # Restore stories
        if "stories" in data:
            for story in data["stories"]:
                story["user_id"] = user["id"]
                existing = await db.stories.find_one({"id": story["id"]})
                if not existing:
                    await db.stories.insert_one(story)
                    restored["stories"] += 1
        
        # Restore saved posts
        if "saved_posts" in data:
            for saved in data["saved_posts"]:
                saved["user_id"] = user["id"]
                existing = await db.saved_posts.find_one({
                    "user_id": user["id"],
                    "post_id": saved["post_id"]
                })
                if not existing:
                    await db.saved_posts.insert_one(saved)
                    restored["saved_posts"] += 1
        
        # Restore collections
        if "collections" in data:
            for collection in data["collections"]:
                collection["user_id"] = user["id"]
                existing = await db.collections.find_one({"id": collection["id"]})
                if not existing:
                    await db.collections.insert_one(collection)
                    restored["collections"] += 1
        
        return {
            "success": True,
            "restored": restored,
            "backup_date": backup_data.get("created_at")
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid backup file")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Restore failed: {str(e)}")


@router.get("/cloud/list")
async def list_cloud_backups(token: str):
    """List all cloud backup records for the current user."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    backups = await db.cloud_backups.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"backups": backups}
