"""
Events API Routes
Handles event creation, RSVPs, and event discovery
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/events", tags=["Events"])

def get_db():
    from server import db
    return db

# Pydantic Models
class EventCreate(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    is_online: bool = False
    online_link: Optional[str] = None
    cover_image: Optional[str] = None
    category: str = "social"
    privacy: str = "public"  # public, private, friends
    max_attendees: Optional[int] = None
    ticket_price: Optional[float] = None
    ticket_currency: str = "USD"

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    cover_image: Optional[str] = None
    is_online: Optional[bool] = None
    online_link: Optional[str] = None

class RSVPRequest(BaseModel):
    status: str  # going, interested, not_going

# Helper functions
def serialize_event(event: dict, host: dict = None, user_rsvp: str = None, counts: dict = None) -> dict:
    return {
        "id": str(event["_id"]),
        "title": event.get("title", ""),
        "description": event.get("description", ""),
        "start_time": event.get("start_time", datetime.now(timezone.utc)).isoformat(),
        "end_time": event.get("end_time").isoformat() if event.get("end_time") else None,
        "location": event.get("location"),
        "location_lat": event.get("location_lat"),
        "location_lng": event.get("location_lng"),
        "is_online": event.get("is_online", False),
        "online_link": event.get("online_link"),
        "cover_image": event.get("cover_image"),
        "category": event.get("category", "social"),
        "privacy": event.get("privacy", "public"),
        "max_attendees": event.get("max_attendees"),
        "ticket_price": event.get("ticket_price"),
        "ticket_currency": event.get("ticket_currency", "USD"),
        "host_id": str(event.get("host_id", "")),
        "host_name": host.get("display_name", host.get("username", "Unknown")) if host else "Unknown",
        "host_avatar": host.get("avatar") if host else None,
        "going_count": counts.get("going", 0) if counts else 0,
        "interested_count": counts.get("interested", 0) if counts else 0,
        "user_rsvp": user_rsvp,
        "created_at": event.get("created_at", datetime.now(timezone.utc)).isoformat()
    }

# Routes
@router.get("/discover")
async def discover_events(
    token: str,
    category: Optional[str] = None,
    date_filter: Optional[str] = None,  # today, tomorrow, this_week, this_month
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Discover events"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {
        "privacy": "public",
        "start_time": {"$gte": datetime.now(timezone.utc)}
    }
    
    if category and category != "all":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Date filters
    if date_filter == "today":
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        tomorrow = today.replace(hour=23, minute=59, second=59)
        query["start_time"] = {"$gte": today, "$lte": tomorrow}
    elif date_filter == "tomorrow":
        from datetime import timedelta
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=0, minute=0, second=0)
        day_after = tomorrow.replace(hour=23, minute=59, second=59)
        query["start_time"] = {"$gte": tomorrow, "$lte": day_after}
    
    skip = (page - 1) * limit
    events = list(db.events.find(query).sort("start_time", 1).skip(skip).limit(limit))
    
    # Get hosts and RSVP counts
    result = []
    for event in events:
        host = db.users.find_one({"_id": ObjectId(event.get("host_id"))}) if event.get("host_id") else None
        
        counts = {
            "going": db.event_rsvps.count_documents({"event_id": str(event["_id"]), "status": "going"}),
            "interested": db.event_rsvps.count_documents({"event_id": str(event["_id"]), "status": "interested"})
        }
        
        user_rsvp_doc = db.event_rsvps.find_one({
            "event_id": str(event["_id"]),
            "user_id": session["user_id"]
        })
        user_rsvp = user_rsvp_doc.get("status") if user_rsvp_doc else None
        
        result.append(serialize_event(event, host, user_rsvp, counts))
    
    return {
        "events": result,
        "page": page,
        "has_more": len(events) == limit
    }

@router.get("/my-events")
async def get_my_events(
    token: str,
    filter_type: str = "hosting",  # hosting, going, interested
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get user's events"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if filter_type == "hosting":
        events = list(db.events.find({
            "host_id": session["user_id"]
        }).sort("start_time", 1).skip((page - 1) * limit).limit(limit))
    else:
        rsvps = list(db.event_rsvps.find({
            "user_id": session["user_id"],
            "status": filter_type
        }))
        event_ids = [ObjectId(r["event_id"]) for r in rsvps if ObjectId.is_valid(r["event_id"])]
        events = list(db.events.find({"_id": {"$in": event_ids}}))
    
    result = []
    for event in events:
        host = db.users.find_one({"_id": ObjectId(event.get("host_id"))}) if event.get("host_id") else None
        counts = {
            "going": db.event_rsvps.count_documents({"event_id": str(event["_id"]), "status": "going"}),
            "interested": db.event_rsvps.count_documents({"event_id": str(event["_id"]), "status": "interested"})
        }
        user_rsvp_doc = db.event_rsvps.find_one({
            "event_id": str(event["_id"]),
            "user_id": session["user_id"]
        })
        result.append(serialize_event(event, host, user_rsvp_doc.get("status") if user_rsvp_doc else None, counts))
    
    return {
        "events": result,
        "page": page,
        "has_more": len(events) == limit
    }

@router.get("/categories")
async def get_categories(token: str):
    """Get event categories"""
    return {
        "categories": [
            {"id": "all", "name": "All Events", "icon": "calendar"},
            {"id": "social", "name": "Social", "icon": "users"},
            {"id": "music", "name": "Music", "icon": "music"},
            {"id": "sports", "name": "Sports", "icon": "trophy"},
            {"id": "food", "name": "Food & Drink", "icon": "utensils"},
            {"id": "art", "name": "Art & Culture", "icon": "palette"},
            {"id": "business", "name": "Business", "icon": "briefcase"},
            {"id": "education", "name": "Education", "icon": "graduation-cap"},
            {"id": "gaming", "name": "Gaming", "icon": "gamepad-2"},
            {"id": "fitness", "name": "Fitness", "icon": "dumbbell"},
            {"id": "community", "name": "Community", "icon": "heart"},
        ]
    }

@router.post("/create")
async def create_event(event: EventCreate, token: str):
    """Create a new event"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    event_doc = {
        "title": event.title,
        "description": event.description,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "location": event.location,
        "location_lat": event.location_lat,
        "location_lng": event.location_lng,
        "is_online": event.is_online,
        "online_link": event.online_link,
        "cover_image": event.cover_image,
        "category": event.category,
        "privacy": event.privacy,
        "max_attendees": event.max_attendees,
        "ticket_price": event.ticket_price,
        "ticket_currency": event.ticket_currency,
        "host_id": session["user_id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.events.insert_one(event_doc)
    event_doc["_id"] = result.inserted_id
    
    host = db.users.find_one({"_id": ObjectId(session["user_id"])})
    return serialize_event(event_doc, host, "going", {"going": 1, "interested": 0})

@router.get("/{event_id}")
async def get_event(event_id: str, token: str):
    """Get event details"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")
    
    event = db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    host = db.users.find_one({"_id": ObjectId(event.get("host_id"))}) if event.get("host_id") else None
    counts = {
        "going": db.event_rsvps.count_documents({"event_id": event_id, "status": "going"}),
        "interested": db.event_rsvps.count_documents({"event_id": event_id, "status": "interested"})
    }
    user_rsvp_doc = db.event_rsvps.find_one({
        "event_id": event_id,
        "user_id": session["user_id"]
    })
    
    return serialize_event(event, host, user_rsvp_doc.get("status") if user_rsvp_doc else None, counts)

@router.post("/{event_id}/rsvp")
async def rsvp_event(event_id: str, rsvp: RSVPRequest, token: str):
    """RSVP to an event"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    event = db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already RSVPd
    existing = db.event_rsvps.find_one({
        "event_id": event_id,
        "user_id": session["user_id"]
    })
    
    if rsvp.status == "not_going":
        if existing:
            db.event_rsvps.delete_one({"_id": existing["_id"]})
        return {"status": None, "success": True}
    
    if existing:
        db.event_rsvps.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": rsvp.status, "updated_at": datetime.now(timezone.utc)}}
        )
    else:
        db.event_rsvps.insert_one({
            "event_id": event_id,
            "user_id": session["user_id"],
            "status": rsvp.status,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"status": rsvp.status, "success": True}

@router.get("/{event_id}/attendees")
async def get_attendees(
    event_id: str,
    token: str,
    status: str = "going",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get event attendees"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    skip = (page - 1) * limit
    rsvps = list(db.event_rsvps.find({
        "event_id": event_id,
        "status": status
    }).skip(skip).limit(limit))
    
    user_ids = [ObjectId(r["user_id"]) for r in rsvps if ObjectId.is_valid(r["user_id"])]
    users = list(db.users.find({"_id": {"$in": user_ids}}))
    
    attendees = []
    for user in users:
        attendees.append({
            "id": str(user["_id"]),
            "username": user.get("username", ""),
            "display_name": user.get("display_name", ""),
            "avatar": user.get("avatar")
        })
    
    return {
        "attendees": attendees,
        "page": page,
        "has_more": len(rsvps) == limit
    }

@router.delete("/{event_id}")
async def delete_event(event_id: str, token: str):
    """Delete an event"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    event = db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if str(event["host_id"]) != session["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.events.delete_one({"_id": ObjectId(event_id)})
    db.event_rsvps.delete_many({"event_id": event_id})
    
    return {"success": True}
