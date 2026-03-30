"""
Contacts routes for FaceConnect.
Handles contact synchronization, discovery, and friend suggestions.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from .shared import db, get_current_user, get_user_by_id

router = APIRouter(prefix="/contacts", tags=["Contacts"])
logger = logging.getLogger(__name__)


# ============== MODELS ==============
class ContactSyncRequest(BaseModel):
    """Request to sync contacts from device"""
    contacts: List[dict]  # List of {name, email, phone}


class EmailImportRequest(BaseModel):
    """Request to import contacts from email"""
    emails: List[str]


class CSVMatchRequest(BaseModel):
    """Request to match contacts from CSV import"""
    emails: List[str] = []
    phones: List[str] = []
    token: str = None


class BulkFriendRequest(BaseModel):
    """Request to send friend requests to multiple users"""
    user_ids: List[str]


class SaveContactsRequest(BaseModel):
    """Request to save contacts to address book"""
    contacts: List[dict]  # List of {name, email, phone, notes}


# ============== ROUTES ==============
@router.post("/save")
async def save_contacts_to_addressbook(token: str, request: SaveContactsRequest):
    """Save contacts to user's personal address book."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    saved_count = 0
    updated_count = 0
    
    for contact in request.contacts:
        contact_id = str(uuid.uuid4())
        
        # Check if contact already exists (by email or phone)
        existing = None
        if contact.get('email'):
            existing = await db.address_book.find_one({
                "user_id": user['id'],
                "email": contact['email'].lower()
            })
        elif contact.get('phone'):
            phone = ''.join(filter(str.isdigit, contact.get('phone', '')))
            if phone:
                existing = await db.address_book.find_one({
                    "user_id": user['id'],
                    "phone": phone
                })
        
        if existing:
            # Update existing contact
            await db.address_book.update_one(
                {"id": existing['id']},
                {"$set": {
                    "name": contact.get('name', existing.get('name')),
                    "email": contact.get('email', '').lower() if contact.get('email') else existing.get('email'),
                    "phone": ''.join(filter(str.isdigit, contact.get('phone', ''))) if contact.get('phone') else existing.get('phone'),
                    "notes": contact.get('notes', existing.get('notes', '')),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            updated_count += 1
        else:
            # Create new contact
            await db.address_book.insert_one({
                "id": contact_id,
                "user_id": user['id'],
                "name": contact.get('name', 'Unknown'),
                "email": contact.get('email', '').lower() if contact.get('email') else None,
                "phone": ''.join(filter(str.isdigit, contact.get('phone', ''))) if contact.get('phone') else None,
                "notes": contact.get('notes', ''),
                "source": contact.get('source', 'manual'),  # google, facebook, csv, vcard, manual
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            saved_count += 1
    
    return {
        "saved_count": saved_count,
        "updated_count": updated_count,
        "total": saved_count + updated_count
    }


@router.get("/addressbook")
@router.get("/address-book")
async def get_addressbook(token: str, page: int = 1, limit: int = 50, search: str = None):
    """Get user's personal address book contacts."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    skip = (page - 1) * limit
    
    # Build query
    query = {"user_id": user['id']}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Get contacts
    contacts = await db.address_book.find(
        query,
        {"_id": 0}
    ).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    
    # Get total count
    total = await db.address_book.count_documents(query)
    
    return {
        "contacts": contacts,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": skip + len(contacts) < total
    }


@router.delete("/addressbook/{contact_id}")
async def delete_contact(token: str, contact_id: str):
    """Delete a contact from address book."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.address_book.delete_one({
        "id": contact_id,
        "user_id": user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"message": "Contact deleted"}


@router.put("/addressbook/{contact_id}")
async def update_contact(token: str, contact_id: str, contact: dict):
    """Update a contact in address book."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    existing = await db.address_book.find_one({
        "id": contact_id,
        "user_id": user['id']
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if 'name' in contact:
        update_data['name'] = contact['name']
    if 'email' in contact:
        update_data['email'] = contact['email'].lower() if contact['email'] else None
    if 'phone' in contact:
        update_data['phone'] = ''.join(filter(str.isdigit, contact['phone'])) if contact['phone'] else None
    if 'notes' in contact:
        update_data['notes'] = contact['notes']
    
    await db.address_book.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    return {"message": "Contact updated"}


@router.get("/all-users")
async def get_all_users(token: str, page: int = 1, limit: int = 50):
    """Get all registered users for contact discovery."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Calculate skip
    skip = (page - 1) * limit
    
    # Get all users except current user
    users = await db.users.find(
        {"id": {"$ne": user['id']}},
        {"_id": 0, "password": 0, "token": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Get total count
    total = await db.users.count_documents({"id": {"$ne": user['id']}})
    
    # Get current user's friends
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": user['id'], "status": "accepted"},
            {"user2_id": user['id'], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f['user2_id'] if f['user1_id'] == user['id'] else f['user1_id'])
    
    # Get pending friend requests
    sent_requests = await db.friend_requests.find({
        "from_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(1000)
    sent_request_ids = {r['to_user_id'] for r in sent_requests}
    
    received_requests = await db.friend_requests.find({
        "to_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(1000)
    received_request_ids = {r['from_user_id'] for r in received_requests}
    
    # Enrich users with friendship status
    enriched_users = []
    for u in users:
        user_data = {
            "id": u.get('id'),
            "name": u.get('name'),
            "email": u.get('email'),
            "avatar": u.get('avatar'),
            "online": u.get('online', False),
            "last_seen": u.get('last_seen'),
            "bio": u.get('bio', ''),
            "is_friend": u['id'] in friend_ids,
            "request_sent": u['id'] in sent_request_ids,
            "request_received": u['id'] in received_request_ids,
        }
        enriched_users.append(user_data)
    
    return {
        "users": enriched_users,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": skip + len(users) < total
    }


@router.get("/search")
async def search_users(token: str, query: str, limit: int = 20):
    """Search users by name or email."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not query or len(query) < 2:
        return {"users": []}
    
    # Search by name or email (case insensitive)
    users = await db.users.find({
        "id": {"$ne": user['id']},
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}}
        ]
    }, {"_id": 0, "password": 0, "token": 0}).limit(limit).to_list(limit)
    
    # Get friendship status for each user
    enriched_users = []
    for u in users:
        # Check if already friends
        friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": u['id'], "status": "accepted"},
                {"user1_id": u['id'], "user2_id": user['id'], "status": "accepted"}
            ]
        })
        
        # Check for pending requests
        sent_request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": u['id'],
            "status": "pending"
        })
        
        received_request = await db.friend_requests.find_one({
            "from_user_id": u['id'],
            "to_user_id": user['id'],
            "status": "pending"
        })
        
        user_data = {
            "id": u.get('id'),
            "name": u.get('name'),
            "email": u.get('email'),
            "avatar": u.get('avatar'),
            "online": u.get('online', False),
            "last_seen": u.get('last_seen'),
            "bio": u.get('bio', ''),
            "is_friend": friendship is not None,
            "request_sent": sent_request is not None,
            "request_received": received_request is not None,
        }
        enriched_users.append(user_data)
    
    return {"users": enriched_users}


@router.post("/match")
async def match_csv_contacts(request: CSVMatchRequest, token: str = None):
    """Match contacts from CSV import against registered users."""
    # Get token from request body or query param
    auth_token = request.token or token
    if not auth_token:
        raise HTTPException(status_code=401, detail="Token required")
    
    user = await get_current_user(auth_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Normalize inputs
    normalized_emails = [e.lower().strip() for e in request.emails if e and '@' in e]
    normalized_phones = [''.join(filter(str.isdigit, p)) for p in request.phones if p]
    normalized_phones = [p for p in normalized_phones if len(p) >= 7]  # Filter out very short numbers
    
    if not normalized_emails and not normalized_phones:
        return {"matched": [], "total_checked": 0}
    
    # Build query conditions
    query_conditions = []
    if normalized_emails:
        query_conditions.append({"email": {"$in": normalized_emails}})
    if normalized_phones:
        query_conditions.append({"phone": {"$in": normalized_phones}})
    
    # Find matching users
    matched_users = await db.users.find({
        "id": {"$ne": user['id']},
        "$or": query_conditions
    }, {"_id": 0, "password": 0, "token": 0}).to_list(500)
    
    # Enrich with friendship status
    enriched_users = []
    for u in matched_users:
        # Check if already friends
        friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": u['id'], "status": "accepted"},
                {"user1_id": u['id'], "user2_id": user['id'], "status": "accepted"}
            ]
        })
        
        # Check for pending requests
        sent_request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": u['id'],
            "status": "pending"
        })
        
        user_data = {
            "id": u.get('id'),
            "username": u.get('username') or u.get('name'),
            "display_name": u.get('display_name') or u.get('name'),
            "email": u.get('email'),
            "phone": u.get('phone'),
            "avatar": u.get('avatar'),
            "is_friend": friendship is not None,
            "request_sent": sent_request is not None,
        }
        enriched_users.append(user_data)
    
    return {
        "matched": enriched_users,
        "total_checked": len(normalized_emails) + len(normalized_phones)
    }


@router.post("/sync")
async def sync_contacts(token: str, request: ContactSyncRequest):
    """Sync contacts from device and find matching users."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Extract emails and phones from contacts
    contact_emails = []
    contact_phones = []
    
    for contact in request.contacts:
        if contact.get('email'):
            contact_emails.append(contact['email'].lower())
        if contact.get('phone'):
            # Normalize phone number (remove spaces, dashes, etc.)
            phone = ''.join(filter(str.isdigit, contact['phone']))
            if phone:
                contact_phones.append(phone)
    
    # Find users matching these contacts
    query_conditions = []
    if contact_emails:
        query_conditions.append({"email": {"$in": contact_emails}})
    if contact_phones:
        query_conditions.append({"phone": {"$in": contact_phones}})
    
    if not query_conditions:
        return {"matched_users": [], "synced_count": 0}
    
    matched_users = await db.users.find({
        "id": {"$ne": user['id']},
        "$or": query_conditions
    }, {"_id": 0, "password": 0, "token": 0}).to_list(100)
    
    # Store synced contacts for this user
    await db.synced_contacts.update_one(
        {"user_id": user['id']},
        {
            "$set": {
                "user_id": user['id'],
                "contacts": request.contacts,
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Enrich with friendship status
    enriched_users = []
    for u in matched_users:
        friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": u['id'], "status": "accepted"},
                {"user1_id": u['id'], "user2_id": user['id'], "status": "accepted"}
            ]
        })
        
        sent_request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": u['id'],
            "status": "pending"
        })
        
        user_data = {
            "id": u.get('id'),
            "name": u.get('name'),
            "email": u.get('email'),
            "avatar": u.get('avatar'),
            "is_friend": friendship is not None,
            "request_sent": sent_request is not None,
        }
        enriched_users.append(user_data)
    
    return {
        "matched_users": enriched_users,
        "synced_count": len(request.contacts)
    }


@router.post("/import-email")
async def import_from_email(token: str, request: EmailImportRequest):
    """Find users from a list of email addresses."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not request.emails:
        return {"matched_users": []}
    
    # Normalize emails
    normalized_emails = [e.lower().strip() for e in request.emails if e]
    
    # Find users with these emails
    matched_users = await db.users.find({
        "id": {"$ne": user['id']},
        "email": {"$in": normalized_emails}
    }, {"_id": 0, "password": 0, "token": 0}).to_list(100)
    
    # Enrich with friendship status
    enriched_users = []
    for u in matched_users:
        friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": u['id'], "status": "accepted"},
                {"user1_id": u['id'], "user2_id": user['id'], "status": "accepted"}
            ]
        })
        
        sent_request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": u['id'],
            "status": "pending"
        })
        
        user_data = {
            "id": u.get('id'),
            "name": u.get('name'),
            "email": u.get('email'),
            "avatar": u.get('avatar'),
            "is_friend": friendship is not None,
            "request_sent": sent_request is not None,
        }
        enriched_users.append(user_data)
    
    return {"matched_users": enriched_users}


@router.post("/bulk-friend-request")
async def send_bulk_friend_requests(token: str, request: BulkFriendRequest):
    """Send friend requests to multiple users at once."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    sent_count = 0
    already_friends = 0
    already_requested = 0
    errors = []
    
    for target_user_id in request.user_ids:
        if target_user_id == user['id']:
            continue
        
        # Check if target user exists
        target_user = await get_user_by_id(target_user_id)
        if not target_user:
            errors.append({"user_id": target_user_id, "error": "User not found"})
            continue
        
        # Check if already friends
        existing_friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": target_user_id},
                {"user1_id": target_user_id, "user2_id": user['id']}
            ]
        })
        if existing_friendship:
            already_friends += 1
            continue
        
        # Check if request already exists
        existing_request = await db.friend_requests.find_one({
            "from_user_id": user['id'],
            "to_user_id": target_user_id,
            "status": "pending"
        })
        if existing_request:
            already_requested += 1
            continue
        
        # Create friend request
        request_id = str(uuid.uuid4())
        await db.friend_requests.insert_one({
            "id": request_id,
            "from_user_id": user['id'],
            "to_user_id": target_user_id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        sent_count += 1
    
    return {
        "sent_count": sent_count,
        "already_friends": already_friends,
        "already_requested": already_requested,
        "errors": errors
    }


@router.post("/auto-add")
async def auto_add_friends(token: str, request: BulkFriendRequest):
    """Automatically add users as friends (for imported contacts)."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    added_count = 0
    already_friends = 0
    
    for target_user_id in request.user_ids:
        if target_user_id == user['id']:
            continue
        
        # Check if target user exists
        target_user = await get_user_by_id(target_user_id)
        if not target_user:
            continue
        
        # Check if already friends
        existing_friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['id'], "user2_id": target_user_id},
                {"user1_id": target_user_id, "user2_id": user['id']}
            ]
        })
        if existing_friendship:
            already_friends += 1
            continue
        
        # Auto-create friendship (both directions)
        friendship_id = str(uuid.uuid4())
        await db.friendships.insert_one({
            "id": friendship_id,
            "user1_id": user['id'],
            "user2_id": target_user_id,
            "status": "accepted",
            "auto_added": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        added_count += 1
    
    return {
        "added_count": added_count,
        "already_friends": already_friends
    }


@router.get("/suggestions")
async def get_friend_suggestions(token: str, limit: int = 10):
    """Get friend suggestions based on mutual friends and activity."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get current friends
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": user['id'], "status": "accepted"},
            {"user2_id": user['id'], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f['user2_id'] if f['user1_id'] == user['id'] else f['user1_id'])
    
    # Get pending requests (to exclude)
    sent_requests = await db.friend_requests.find({
        "from_user_id": user['id'],
        "status": "pending"
    }, {"_id": 0}).to_list(1000)
    pending_ids = {r['to_user_id'] for r in sent_requests}
    
    # Get friends of friends (mutual connections)
    mutual_suggestions = {}
    for friend_id in list(friend_ids)[:20]:  # Limit to first 20 friends for performance
        friend_friendships = await db.friendships.find({
            "$or": [
                {"user1_id": friend_id, "status": "accepted"},
                {"user2_id": friend_id, "status": "accepted"}
            ]
        }, {"_id": 0}).to_list(100)
        
        for ff in friend_friendships:
            fof_id = ff['user2_id'] if ff['user1_id'] == friend_id else ff['user1_id']
            if fof_id != user['id'] and fof_id not in friend_ids and fof_id not in pending_ids:
                mutual_suggestions[fof_id] = mutual_suggestions.get(fof_id, 0) + 1
    
    # Sort by number of mutual friends
    sorted_suggestions = sorted(mutual_suggestions.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    # Get user details for suggestions
    suggestions = []
    for user_id, mutual_count in sorted_suggestions:
        suggested_user = await get_user_by_id(user_id)
        if suggested_user:
            suggestions.append({
                "id": suggested_user['id'],
                "name": suggested_user.get('name'),
                "email": suggested_user.get('email'),
                "avatar": suggested_user.get('avatar'),
                "mutual_friends": mutual_count
            })
    
    # If not enough suggestions from mutual friends, add random users
    if len(suggestions) < limit:
        remaining = limit - len(suggestions)
        exclude_ids = list(friend_ids) + list(pending_ids) + [s['id'] for s in suggestions] + [user['id']]
        
        random_users = await db.users.find({
            "id": {"$nin": exclude_ids}
        }, {"_id": 0, "password": 0, "token": 0}).limit(remaining).to_list(remaining)
        
        for u in random_users:
            suggestions.append({
                "id": u['id'],
                "name": u.get('name'),
                "email": u.get('email'),
                "avatar": u.get('avatar'),
                "mutual_friends": 0
            })
    
    return {"suggestions": suggestions}


# Export for other modules
__all__ = ["router"]
