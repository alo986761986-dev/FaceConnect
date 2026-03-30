"""
Dating API Routes
Facebook Dating style with profiles, matches, and secret crush feature
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/dating", tags=["dating"])

# In-memory database simulation (replace with actual MongoDB in production)
# This will be connected to MongoDB via the shared db instance

# Pydantic Models
class DatingProfileCreate(BaseModel):
    bio: Optional[str] = None
    photos: List[str] = []
    interests: List[str] = []
    zodiac_sign: Optional[str] = None
    job_title: Optional[str] = None
    looking_for: str = "dating"  # dating, friendship, both
    age_range_min: int = 18
    age_range_max: int = 99
    distance_km: int = 50

class DatingProfileUpdate(BaseModel):
    bio: Optional[str] = None
    photos: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    zodiac_sign: Optional[str] = None
    job_title: Optional[str] = None
    looking_for: Optional[str] = None
    age_range_min: Optional[int] = None
    age_range_max: Optional[int] = None
    distance_km: Optional[int] = None

class DatingProfileResponse(BaseModel):
    id: str
    user_id: str
    name: str
    age: int
    bio: Optional[str]
    photos: List[str]
    interests: List[str]
    zodiac_sign: Optional[str]
    job_title: Optional[str]
    location: Optional[str]
    distance: Optional[str]
    verified: bool = False
    looking_for: str
    created_at: str
    is_active: bool = True

class LikeCreate(BaseModel):
    liked_user_id: str
    like_type: str = "like"  # like, super_like

class MatchResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    matched_at: str
    match_type: str  # dating, friendship
    has_messaged: bool = False

class SecretCrushCreate(BaseModel):
    crush_user_id: str

class SecretCrushResponse(BaseModel):
    id: str
    user_id: str
    crush_user_id: str
    created_at: str
    is_mutual: bool = False
    revealed_at: Optional[str] = None


# Helper to get database (will be imported from main app)
def get_db():
    from server import db
    return db

async def get_user_by_token(token: str):
    """Get user from session token."""
    db = get_db()
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    return user


# ============== DATING PROFILE ROUTES ==============

@router.post("/profile", response_model=DatingProfileResponse)
async def create_dating_profile(token: str, profile: DatingProfileCreate):
    """Create or update dating profile for current user"""
    db = get_db()
    
    # Get user from token
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Check if profile exists
    existing = await db.dating_profiles.find_one({"user_id": user_id})
    
    # Calculate age from user's birthdate or default
    age = user.get("age", 25)
    
    profile_data = {
        "user_id": user_id,
        "name": user.get("display_name") or user.get("username"),
        "age": age,
        "bio": profile.bio,
        "photos": profile.photos or [user.get("avatar")] if user.get("avatar") else [],
        "interests": profile.interests,
        "zodiac_sign": profile.zodiac_sign,
        "job_title": profile.job_title,
        "location": user.get("location", ""),
        "looking_for": profile.looking_for,
        "age_range_min": profile.age_range_min,
        "age_range_max": profile.age_range_max,
        "distance_km": profile.distance_km,
        "verified": user.get("verified", False),
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.dating_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile_data}
        )
        profile_id = str(existing.get("id", existing.get("_id")))
    else:
        profile_data["id"] = str(uuid.uuid4())
        profile_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.dating_profiles.insert_one(profile_data)
        profile_id = profile_data["id"]
    
    return DatingProfileResponse(
        id=profile_id,
        user_id=user_id,
        name=profile_data["name"],
        age=profile_data["age"],
        bio=profile_data.get("bio"),
        photos=profile_data["photos"],
        interests=profile_data["interests"],
        zodiac_sign=profile_data.get("zodiac_sign"),
        job_title=profile_data.get("job_title"),
        location=profile_data.get("location"),
        distance=None,
        verified=profile_data["verified"],
        looking_for=profile_data["looking_for"],
        created_at=profile_data.get("created_at", datetime.now(timezone.utc).isoformat()),
        is_active=profile_data["is_active"]
    )


@router.get("/profile", response_model=DatingProfileResponse)
async def get_my_dating_profile(token: str):
    """Get current user's dating profile"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    profile = await db.dating_profiles.find_one({"user_id": user_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Dating profile not found")
    
    return DatingProfileResponse(
        id=str(profile.get("id", profile.get("_id"))),
        user_id=profile["user_id"],
        name=profile["name"],
        age=profile["age"],
        bio=profile.get("bio"),
        photos=profile.get("photos", []),
        interests=profile.get("interests", []),
        zodiac_sign=profile.get("zodiac_sign"),
        job_title=profile.get("job_title"),
        location=profile.get("location"),
        distance=None,
        verified=profile.get("verified", False),
        looking_for=profile.get("looking_for", "dating"),
        created_at=profile.get("created_at", ""),
        is_active=profile.get("is_active", True)
    )


@router.get("/discover", response_model=List[DatingProfileResponse])
async def discover_profiles(token: str, mode: str = "dating", limit: int = 20, skip: int = 0):
    """Get profiles to swipe on (excludes already liked/passed profiles)"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Get user's dating profile for preferences
    my_profile = await db.dating_profiles.find_one({"user_id": user_id})
    
    # Get already interacted profiles
    interactions = await db.dating_interactions.find({"user_id": user_id}).to_list(1000)
    interacted_ids = [i["target_user_id"] for i in interactions]
    interacted_ids.append(user_id)  # Exclude self
    
    # Build query
    query = {
        "user_id": {"$nin": interacted_ids},
        "is_active": True,
        "looking_for": {"$in": [mode, "both"]}
    }
    
    # Apply age preferences if profile exists
    if my_profile:
        query["age"] = {
            "$gte": my_profile.get("age_range_min", 18),
            "$lte": my_profile.get("age_range_max", 99)
        }
    
    # Fetch profiles
    profiles = await db.dating_profiles.find(query).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for p in profiles:
        result.append(DatingProfileResponse(
            id=str(p.get("id", p.get("_id"))),
            user_id=p["user_id"],
            name=p["name"],
            age=p["age"],
            bio=p.get("bio"),
            photos=p.get("photos", []),
            interests=p.get("interests", []),
            zodiac_sign=p.get("zodiac_sign"),
            job_title=p.get("job_title"),
            location=p.get("location"),
            distance=f"{(hash(p['user_id']) % 20) + 1} km",  # Simulated distance
            verified=p.get("verified", False),
            looking_for=p.get("looking_for", "dating"),
            created_at=p.get("created_at", ""),
            is_active=p.get("is_active", True)
        ))
    
    return result


# ============== LIKES & MATCHING ==============

@router.post("/like")
async def like_profile(token: str, like: LikeCreate):
    """Like or super-like a profile. Returns match if mutual."""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Record the interaction
    interaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "target_user_id": like.liked_user_id,
        "action": like.like_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dating_interactions.insert_one(interaction)
    
    # Check for mutual like
    mutual = await db.dating_interactions.find_one({
        "user_id": like.liked_user_id,
        "target_user_id": user_id,
        "action": {"$in": ["like", "super_like"]}
    })
    
    if mutual:
        # Create match!
        match_id = str(uuid.uuid4())
        match = {
            "id": match_id,
            "user1_id": user_id,
            "user2_id": like.liked_user_id,
            "matched_at": datetime.now(timezone.utc).isoformat(),
            "match_type": "dating",
            "has_messaged": False
        }
        await db.dating_matches.insert_one(match)
        
        return {
            "action": "match",
            "match_id": match_id,
            "matched_with": like.liked_user_id,
            "message": "It's a match!"
        }
    
    return {
        "action": "liked",
        "liked_user_id": like.liked_user_id,
        "message": "Profile liked"
    }


@router.post("/pass")
async def pass_profile(token: str, user_id: str):
    """Pass on a profile (won't see again for a while)"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    my_user_id = str(user.get("id", user.get("_id")))
    
    # Record the pass
    interaction = {
        "id": str(uuid.uuid4()),
        "user_id": my_user_id,
        "target_user_id": user_id,
        "action": "pass",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.dating_interactions.insert_one(interaction)
    
    return {"action": "passed", "user_id": user_id}


@router.get("/matches", response_model=List[MatchResponse])
async def get_matches(token: str):
    """Get all matches for current user"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Find matches where user is either user1 or user2
    matches = await db.dating_matches.find({
        "$or": [
            {"user1_id": user_id},
            {"user2_id": user_id}
        ]
    }).to_list(100)
    
    result = []
    for m in matches:
        result.append(MatchResponse(
            id=str(m.get("id", m.get("_id"))),
            user1_id=m["user1_id"],
            user2_id=m["user2_id"],
            matched_at=m["matched_at"],
            match_type=m.get("match_type", "dating"),
            has_messaged=m.get("has_messaged", False)
        ))
    
    return result


@router.get("/likes-you")
async def get_likes_you(token: str):
    """Get profiles that have liked you (premium feature)"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Get users who liked you but you haven't interacted with
    my_interactions = await db.dating_interactions.find({"user_id": user_id}).to_list(1000)
    my_interacted_ids = [i["target_user_id"] for i in my_interactions]
    
    likes = await db.dating_interactions.find({
        "target_user_id": user_id,
        "action": {"$in": ["like", "super_like"]},
        "user_id": {"$nin": my_interacted_ids}
    }).to_list(50)
    
    # Get profiles of likers
    liker_ids = [like["user_id"] for like in likes]
    profiles = await db.dating_profiles.find({"user_id": {"$in": liker_ids}}).to_list(50)
    
    return {
        "count": len(profiles),
        "profiles": profiles
    }


# ============== SECRET CRUSH ==============

@router.post("/secret-crush", response_model=SecretCrushResponse)
async def add_secret_crush(token: str, crush: SecretCrushCreate):
    """Add someone as a secret crush (max 9 crushes)"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    # Check crush limit
    existing_crushes = await db.secret_crushes.count_documents({"user_id": user_id})
    if existing_crushes >= 9:
        raise HTTPException(status_code=400, detail="Maximum 9 secret crushes allowed")
    
    # Check if already crushed
    existing = await db.secret_crushes.find_one({
        "user_id": user_id,
        "crush_user_id": crush.crush_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already added as crush")
    
    # Check for mutual crush
    mutual = await db.secret_crushes.find_one({
        "user_id": crush.crush_user_id,
        "crush_user_id": user_id
    })
    
    crush_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    crush_data = {
        "id": crush_id,
        "user_id": user_id,
        "crush_user_id": crush.crush_user_id,
        "created_at": now,
        "is_mutual": mutual is not None,
        "revealed_at": now if mutual else None
    }
    await db.secret_crushes.insert_one(crush_data)
    
    # If mutual, update the other crush and create a match
    if mutual:
        await db.secret_crushes.update_one(
            {"id": str(mutual.get("id", mutual.get("_id")))},
            {"$set": {"is_mutual": True, "revealed_at": now}}
        )
        
        # Create match
        match = {
            "id": str(uuid.uuid4()),
            "user1_id": user_id,
            "user2_id": crush.crush_user_id,
            "matched_at": now,
            "match_type": "secret_crush",
            "has_messaged": False
        }
        await db.dating_matches.insert_one(match)
    
    return SecretCrushResponse(
        id=crush_id,
        user_id=user_id,
        crush_user_id=crush.crush_user_id,
        created_at=now,
        is_mutual=mutual is not None,
        revealed_at=now if mutual else None
    )


@router.get("/secret-crushes")
async def get_secret_crushes(token: str):
    """Get your secret crushes"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    crushes = await db.secret_crushes.find({"user_id": user_id}).to_list(9)
    
    return {
        "count": len(crushes),
        "max": 9,
        "crushes": [
            {
                "id": str(c.get("id", c.get("_id"))),
                "crush_user_id": c["crush_user_id"],
                "created_at": c["created_at"],
                "is_mutual": c.get("is_mutual", False),
                "revealed_at": c.get("revealed_at")
            }
            for c in crushes
        ]
    }


@router.delete("/secret-crush/{crush_id}")
async def remove_secret_crush(crush_id: str, token: str):
    """Remove a secret crush"""
    db = get_db()
    
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = str(user.get("id", user.get("_id")))
    
    result = await db.secret_crushes.delete_one({
        "id": crush_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crush not found")
    
    return {"message": "Secret crush removed"}
