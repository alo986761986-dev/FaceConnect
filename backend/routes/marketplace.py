"""
Marketplace API Routes
Handles product listings, categories, and transactions
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

def get_db():
    from server import db
    return db

# Pydantic Models
class ListingCreate(BaseModel):
    title: str
    description: str
    price: float
    currency: str = "USD"
    category: str
    condition: str = "new"  # new, like_new, good, fair
    images: List[str] = []
    location: Optional[str] = None
    is_negotiable: bool = True
    shipping_available: bool = False

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    images: Optional[List[str]] = None
    is_sold: Optional[bool] = None

class MessageCreate(BaseModel):
    listing_id: str
    message: str

# Helper functions
def serialize_listing(listing: dict, seller: dict = None) -> dict:
    return {
        "id": str(listing["_id"]),
        "title": listing.get("title", ""),
        "description": listing.get("description", ""),
        "price": listing.get("price", 0),
        "currency": listing.get("currency", "USD"),
        "category": listing.get("category", "other"),
        "condition": listing.get("condition", "good"),
        "images": listing.get("images", []),
        "location": listing.get("location"),
        "is_negotiable": listing.get("is_negotiable", True),
        "shipping_available": listing.get("shipping_available", False),
        "is_sold": listing.get("is_sold", False),
        "seller_id": str(listing.get("seller_id", "")),
        "seller_name": seller.get("display_name", seller.get("username", "Unknown")) if seller else "Unknown",
        "seller_avatar": seller.get("avatar") if seller else None,
        "views": listing.get("views", 0),
        "saves": listing.get("saves", 0),
        "created_at": listing.get("created_at", datetime.now(timezone.utc)).isoformat()
    }

# Routes
@router.get("/listings")
async def get_listings(
    token: str,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get marketplace listings with filters"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Build query
    query = {"is_active": {"$ne": False}, "is_sold": {"$ne": True}}
    
    if category and category != "all":
        query["category"] = category
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if condition:
        query["condition"] = condition
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Sort options
    sort_options = {
        "newest": [("created_at", -1)],
        "price_low": [("price", 1)],
        "price_high": [("price", -1)],
        "popular": [("views", -1)]
    }
    sort_by = sort_options.get(sort, [("created_at", -1)])
    
    skip = (page - 1) * limit
    listings = await db.marketplace_listings.find(query).sort(sort_by).skip(skip).limit(limit).to_list(limit)
    
    # Get sellers
    seller_ids = list(set(str(l.get("seller_id")) for l in listings if l.get("seller_id")))
    sellers_list = await db.users.find({"_id": {"$in": [ObjectId(sid) for sid in seller_ids if ObjectId.is_valid(sid)]}}).to_list(100)
    sellers = {str(s["_id"]): s for s in sellers_list}
    
    return {
        "listings": [serialize_listing(l, sellers.get(str(l.get("seller_id")))) for l in listings],
        "page": page,
        "has_more": len(listings) == limit
    }

@router.get("/categories")
async def get_categories(token: str):
    """Get marketplace categories"""
    return {
        "categories": [
            {"id": "all", "name": "All Categories", "icon": "grid"},
            {"id": "vehicles", "name": "Vehicles", "icon": "car"},
            {"id": "property", "name": "Property Rentals", "icon": "home"},
            {"id": "electronics", "name": "Electronics", "icon": "smartphone"},
            {"id": "furniture", "name": "Home & Garden", "icon": "sofa"},
            {"id": "clothing", "name": "Clothing & Accessories", "icon": "shirt"},
            {"id": "toys", "name": "Toys & Games", "icon": "gamepad-2"},
            {"id": "sports", "name": "Sports & Outdoors", "icon": "dumbbell"},
            {"id": "books", "name": "Books & Media", "icon": "book"},
            {"id": "pets", "name": "Pet Supplies", "icon": "paw-print"},
            {"id": "free", "name": "Free Stuff", "icon": "gift"},
        ]
    }

@router.post("/listings")
async def create_listing(listing: ListingCreate, token: str):
    """Create a new listing"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    listing_doc = {
        "title": listing.title,
        "description": listing.description,
        "price": listing.price,
        "currency": listing.currency,
        "category": listing.category,
        "condition": listing.condition,
        "images": listing.images,
        "location": listing.location,
        "is_negotiable": listing.is_negotiable,
        "shipping_available": listing.shipping_available,
        "seller_id": session["user_id"],
        "is_sold": False,
        "is_active": True,
        "views": 0,
        "saves": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.marketplace_listings.insert_one(listing_doc)
    listing_doc["_id"] = result.inserted_id
    
    user = await db.users.find_one({"_id": ObjectId(session["user_id"])})
    return serialize_listing(listing_doc, user)

@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, token: str):
    """Get listing details"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not ObjectId.is_valid(listing_id):
        raise HTTPException(status_code=400, detail="Invalid listing ID")
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Increment views
    await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$inc": {"views": 1}})
    listing["views"] += 1
    
    seller = await db.users.find_one({"_id": ObjectId(listing.get("seller_id"))}) if listing.get("seller_id") else None
    return serialize_listing(listing, seller)

@router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, update: ListingUpdate, token: str):
    """Update a listing"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["seller_id"]) != session["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$set": update_data})
    
    updated = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    seller = await db.users.find_one({"_id": ObjectId(session["user_id"])})
    return serialize_listing(updated, seller)

@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, token: str):
    """Delete a listing"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["seller_id"]) != session["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.marketplace_listings.delete_one({"_id": ObjectId(listing_id)})
    return {"success": True}

@router.post("/listings/{listing_id}/save")
async def save_listing(listing_id: str, token: str):
    """Save/unsave a listing"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    existing = await db.saved_listings.find_one({"listing_id": listing_id, "user_id": user_id})
    
    if existing:
        await db.saved_listings.delete_one({"_id": existing["_id"]})
        await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$inc": {"saves": -1}})
        return {"saved": False}
    else:
        await db.saved_listings.insert_one({
            "listing_id": listing_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc)
        })
        await db.marketplace_listings.update_one({"_id": ObjectId(listing_id)}, {"$inc": {"saves": 1}})
        return {"saved": True}

@router.get("/saved")
async def get_saved_listings(token: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50)):
    """Get user's saved listings"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    skip = (page - 1) * limit
    saved = await db.saved_listings.find({"user_id": session["user_id"]}).skip(skip).limit(limit).to_list(limit)
    
    listing_ids = [ObjectId(s["listing_id"]) for s in saved if ObjectId.is_valid(s["listing_id"])]
    listings = await db.marketplace_listings.find({"_id": {"$in": listing_ids}}).to_list(100)
    
    seller_ids = list(set(str(l.get("seller_id")) for l in listings if l.get("seller_id")))
    sellers_list = await db.users.find({"_id": {"$in": [ObjectId(sid) for sid in seller_ids if ObjectId.is_valid(sid)]}}).to_list(100)
    sellers = {str(s["_id"]): s for s in sellers_list}
    
    return {
        "listings": [serialize_listing(l, sellers.get(str(l.get("seller_id")))) for l in listings],
        "page": page,
        "has_more": len(saved) == limit
    }

@router.post("/listings/{listing_id}/message")
async def message_seller(listing_id: str, message: MessageCreate, token: str):
    """Send message to seller"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    listing = await db.marketplace_listings.find_one({"_id": ObjectId(listing_id)})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Create or get conversation
    participants = sorted([session["user_id"], str(listing["seller_id"])])
    
    conversation = await db.conversations.find_one({
        "participants": {"$all": participants},
        "type": "marketplace"
    })
    
    if not conversation:
        conv_result = await db.conversations.insert_one({
            "participants": participants,
            "type": "marketplace",
            "listing_id": listing_id,
            "created_at": datetime.now(timezone.utc)
        })
        conversation_id = str(conv_result.inserted_id)
    else:
        conversation_id = str(conversation["_id"])
    
    # Add message
    await db.messages.insert_one({
        "conversation_id": conversation_id,
        "sender_id": session["user_id"],
        "content": message.message,
        "message_type": "text",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"conversation_id": conversation_id, "success": True}
