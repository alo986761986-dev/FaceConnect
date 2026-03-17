"""
Group Chat routes for FaceConnect.
Handles group creation, member management, and group settings.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from .shared import db, get_user_by_id

router = APIRouter(prefix="/groups", tags=["Group Chat"])

# ============== MODELS ==============
class GroupCreate(BaseModel):
    name: str
    participant_ids: List[str]
    avatar: Optional[str] = None
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    description: Optional[str] = None

class AddMembersRequest(BaseModel):
    user_ids: List[str]

class RemoveMemberRequest(BaseModel):
    user_id: str

class GroupMemberResponse(BaseModel):
    id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "member"  # admin, moderator, member
    joined_at: datetime

class GroupResponse(BaseModel):
    id: str
    name: str
    avatar: Optional[str] = None
    description: Optional[str] = None
    member_count: int
    members: List[GroupMemberResponse]
    admins: List[str]
    created_by: str
    created_at: datetime
    updated_at: datetime

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

async def is_group_admin(group_id: str, user_id: str) -> bool:
    """Check if user is admin of the group."""
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        return False
    return user_id in group.get("admins", [group.get("created_by")])

async def is_group_member(group_id: str, user_id: str) -> bool:
    """Check if user is member of the group."""
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        return False
    return user_id in group.get("participant_ids", [])

# ============== ROUTES ==============
@router.post("", response_model=GroupResponse)
async def create_group(token: str, data: GroupCreate):
    """Create a new group chat"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if len(data.name.strip()) < 1:
        raise HTTPException(status_code=400, detail="Group name is required")
    
    if len(data.participant_ids) < 1:
        raise HTTPException(status_code=400, detail="At least one other participant is required")
    
    # Include creator in participants
    participant_ids = list(set([user['id']] + data.participant_ids))
    
    group_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Create the group document
    group_doc = {
        "id": group_id,
        "name": data.name.strip(),
        "avatar": data.avatar,
        "description": data.description,
        "participant_ids": participant_ids,
        "admins": [user['id']],  # Creator is admin
        "created_by": user['id'],
        "is_group": True,
        "last_message": None,
        "member_roles": {user['id']: "admin"},  # Role mapping
        "member_joined_at": {pid: now.isoformat() for pid in participant_ids},
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.conversations.insert_one(group_doc)
    
    # Build member list
    members = []
    for pid in participant_ids:
        p = await get_user_by_id(pid)
        if p:
            role = "admin" if pid == user['id'] else "member"
            members.append(GroupMemberResponse(
                id=p['id'],
                username=p.get('username'),
                display_name=p.get('display_name'),
                avatar=p.get('avatar'),
                role=role,
                joined_at=now
            ))
    
    return GroupResponse(
        id=group_id,
        name=data.name,
        avatar=data.avatar,
        description=data.description,
        member_count=len(participant_ids),
        members=members,
        admins=[user['id']],
        created_by=user['id'],
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[GroupResponse])
async def get_user_groups(token: str):
    """Get all groups the user is a member of"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    groups = await db.conversations.find(
        {"participant_ids": user['id'], "is_group": True},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for group in groups:
        members = []
        for pid in group.get('participant_ids', []):
            p = await get_user_by_id(pid)
            if p:
                role = group.get('member_roles', {}).get(pid, "member")
                joined_at_str = group.get('member_joined_at', {}).get(pid, group.get('created_at'))
                if isinstance(joined_at_str, str):
                    joined_at = datetime.fromisoformat(joined_at_str)
                else:
                    joined_at = joined_at_str
                    
                members.append(GroupMemberResponse(
                    id=p['id'],
                    username=p.get('username'),
                    display_name=p.get('display_name'),
                    avatar=p.get('avatar'),
                    role=role,
                    joined_at=joined_at
                ))
        
        created_at = group.get('created_at')
        updated_at = group.get('updated_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        result.append(GroupResponse(
            id=group['id'],
            name=group.get('name', 'Group Chat'),
            avatar=group.get('avatar'),
            description=group.get('description'),
            member_count=len(group.get('participant_ids', [])),
            members=members,
            admins=group.get('admins', [group.get('created_by')]),
            created_by=group.get('created_by'),
            created_at=created_at,
            updated_at=updated_at
        ))
    
    return result

@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(group_id: str, token: str):
    """Get group details"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user['id'] not in group.get('participant_ids', []):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    members = []
    for pid in group.get('participant_ids', []):
        p = await get_user_by_id(pid)
        if p:
            role = group.get('member_roles', {}).get(pid, "member")
            joined_at_str = group.get('member_joined_at', {}).get(pid, group.get('created_at'))
            if isinstance(joined_at_str, str):
                joined_at = datetime.fromisoformat(joined_at_str)
            else:
                joined_at = joined_at_str
                
            members.append(GroupMemberResponse(
                id=p['id'],
                username=p.get('username'),
                display_name=p.get('display_name'),
                avatar=p.get('avatar'),
                role=role,
                joined_at=joined_at
            ))
    
    created_at = group.get('created_at')
    updated_at = group.get('updated_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return GroupResponse(
        id=group['id'],
        name=group.get('name', 'Group Chat'),
        avatar=group.get('avatar'),
        description=group.get('description'),
        member_count=len(group.get('participant_ids', [])),
        members=members,
        admins=group.get('admins', [group.get('created_by')]),
        created_by=group.get('created_by'),
        created_at=created_at,
        updated_at=updated_at
    )

@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, token: str, data: GroupUpdate):
    """Update group info (admins only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not await is_group_admin(group_id, user['id']):
        raise HTTPException(status_code=403, detail="Only admins can update group info")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update_data["name"] = data.name.strip()
    if data.avatar is not None:
        update_data["avatar"] = data.avatar
    if data.description is not None:
        update_data["description"] = data.description
    
    await db.conversations.update_one(
        {"id": group_id},
        {"$set": update_data}
    )
    
    # Return updated group
    return await get_group(group_id, token)

@router.post("/{group_id}/members")
async def add_members(group_id: str, token: str, data: AddMembersRequest):
    """Add members to the group (admins only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not await is_group_admin(group_id, user['id']):
        raise HTTPException(status_code=403, detail="Only admins can add members")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    now = datetime.now(timezone.utc)
    new_members = []
    
    for uid in data.user_ids:
        if uid not in group.get('participant_ids', []):
            # Verify user exists
            member = await get_user_by_id(uid)
            if member:
                new_members.append(uid)
    
    if new_members:
        await db.conversations.update_one(
            {"id": group_id},
            {
                "$addToSet": {"participant_ids": {"$each": new_members}},
                "$set": {
                    f"member_joined_at.{uid}": now.isoformat() for uid in new_members
                } | {
                    f"member_roles.{uid}": "member" for uid in new_members
                } | {
                    "updated_at": now.isoformat()
                }
            }
        )
    
    return {
        "success": True,
        "added_count": len(new_members),
        "added_members": new_members
    }

@router.delete("/{group_id}/members/{user_id}")
async def remove_member(group_id: str, user_id: str, token: str):
    """Remove a member from the group (admins only, or self-leave)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check permissions
    is_admin = await is_group_admin(group_id, user['id'])
    is_self_leave = user_id == user['id']
    
    if not is_admin and not is_self_leave:
        raise HTTPException(status_code=403, detail="Only admins can remove other members")
    
    # Creator cannot be removed unless leaving
    if user_id == group.get('created_by') and not is_self_leave:
        raise HTTPException(status_code=403, detail="Cannot remove group creator")
    
    # Cannot remove if only one member left
    if len(group.get('participant_ids', [])) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove last member. Delete the group instead.")
    
    await db.conversations.update_one(
        {"id": group_id},
        {
            "$pull": {"participant_ids": user_id, "admins": user_id},
            "$unset": {
                f"member_joined_at.{user_id}": "",
                f"member_roles.{user_id}": ""
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # If removed user was the only admin, promote oldest member
    updated_group = await db.conversations.find_one({"id": group_id})
    if not updated_group.get('admins'):
        # Find oldest member
        joined_times = updated_group.get('member_joined_at', {})
        oldest_member = min(joined_times.keys(), key=lambda k: joined_times.get(k, ''))
        await db.conversations.update_one(
            {"id": group_id},
            {
                "$addToSet": {"admins": oldest_member},
                "$set": {f"member_roles.{oldest_member}": "admin"}
            }
        )
    
    return {
        "success": True,
        "removed": user_id,
        "is_self_leave": is_self_leave
    }

@router.post("/{group_id}/admins/{user_id}")
async def make_admin(group_id: str, user_id: str, token: str):
    """Promote a member to admin (admins only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not await is_group_admin(group_id, user['id']):
        raise HTTPException(status_code=403, detail="Only admins can promote members")
    
    if not await is_group_member(group_id, user_id):
        raise HTTPException(status_code=400, detail="User is not a member of this group")
    
    await db.conversations.update_one(
        {"id": group_id},
        {
            "$addToSet": {"admins": user_id},
            "$set": {
                f"member_roles.{user_id}": "admin",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "new_admin": user_id}

@router.delete("/{group_id}/admins/{user_id}")
async def remove_admin(group_id: str, user_id: str, token: str):
    """Demote an admin to member (creator only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Only creator can demote admins
    if user['id'] != group.get('created_by'):
        raise HTTPException(status_code=403, detail="Only group creator can demote admins")
    
    # Cannot demote the creator
    if user_id == group.get('created_by'):
        raise HTTPException(status_code=400, detail="Cannot demote group creator")
    
    await db.conversations.update_one(
        {"id": group_id},
        {
            "$pull": {"admins": user_id},
            "$set": {
                f"member_roles.{user_id}": "member",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "demoted": user_id}

@router.delete("/{group_id}")
async def delete_group(group_id: str, token: str):
    """Delete a group (creator only)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Only creator can delete the group
    if user['id'] != group.get('created_by'):
        raise HTTPException(status_code=403, detail="Only group creator can delete the group")
    
    # Delete group and all messages
    await db.conversations.delete_one({"id": group_id})
    await db.messages.delete_many({"conversation_id": group_id})
    
    return {"success": True, "deleted": group_id}

@router.post("/{group_id}/leave")
async def leave_group(group_id: str, token: str):
    """Leave a group"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    group = await db.conversations.find_one({"id": group_id, "is_group": True})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if user['id'] not in group.get('participant_ids', []):
        raise HTTPException(status_code=400, detail="Not a member of this group")
    
    # If creator is leaving and is the only admin, transfer ownership
    if user['id'] == group.get('created_by'):
        other_members = [m for m in group.get('participant_ids', []) if m != user['id']]
        if other_members:
            # Transfer to oldest member or first admin
            admins = [a for a in group.get('admins', []) if a != user['id']]
            new_owner = admins[0] if admins else other_members[0]
            
            await db.conversations.update_one(
                {"id": group_id},
                {
                    "$set": {
                        "created_by": new_owner,
                        f"member_roles.{new_owner}": "admin"
                    },
                    "$addToSet": {"admins": new_owner}
                }
            )
    
    # Remove self from group
    return await remove_member(group_id, user['id'], token)
