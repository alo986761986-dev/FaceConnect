"""
Gaming API Routes
Handles game discovery, gaming activity, and tournaments
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/gaming", tags=["Gaming"])

def get_db():
    from server import db
    return db

# Pydantic Models
class GameActivityCreate(BaseModel):
    game_id: str
    status: str = "playing"  # playing, completed, want_to_play
    hours_played: Optional[float] = None
    rating: Optional[int] = None  # 1-5

class TournamentCreate(BaseModel):
    name: str
    game_id: str
    description: Optional[str] = ""
    start_time: datetime
    max_participants: Optional[int] = None
    prize_pool: Optional[str] = None
    rules: Optional[List[str]] = []

# Helper functions
def serialize_game(game: dict, user_activity: dict = None) -> dict:
    return {
        "id": str(game["_id"]),
        "name": game.get("name", ""),
        "description": game.get("description", ""),
        "cover_image": game.get("cover_image"),
        "genre": game.get("genre", ""),
        "platform": game.get("platform", []),
        "developer": game.get("developer", ""),
        "release_date": game.get("release_date"),
        "rating": game.get("rating", 0),
        "players_count": game.get("players_count", 0),
        "user_status": user_activity.get("status") if user_activity else None,
        "user_hours": user_activity.get("hours_played") if user_activity else None,
        "user_rating": user_activity.get("rating") if user_activity else None
    }

def serialize_tournament(tournament: dict, game: dict = None, host: dict = None) -> dict:
    return {
        "id": str(tournament["_id"]),
        "name": tournament.get("name", ""),
        "game_id": str(tournament.get("game_id", "")),
        "game_name": game.get("name", "") if game else "",
        "game_cover": game.get("cover_image") if game else None,
        "description": tournament.get("description", ""),
        "start_time": tournament.get("start_time", datetime.now(timezone.utc)).isoformat(),
        "max_participants": tournament.get("max_participants"),
        "current_participants": tournament.get("current_participants", 0),
        "prize_pool": tournament.get("prize_pool"),
        "rules": tournament.get("rules", []),
        "host_id": str(tournament.get("host_id", "")),
        "host_name": host.get("display_name", host.get("username", "")) if host else "",
        "status": tournament.get("status", "upcoming"),
        "created_at": tournament.get("created_at", datetime.now(timezone.utc)).isoformat()
    }

# Routes
@router.get("/discover")
async def discover_games(
    token: str,
    genre: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "popular",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Discover games"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {}
    
    if genre and genre != "all":
        query["genre"] = genre
    if platform:
        query["platform"] = platform
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    sort_options = {
        "popular": [("players_count", -1)],
        "rating": [("rating", -1)],
        "newest": [("release_date", -1)],
        "name": [("name", 1)]
    }
    sort_by = sort_options.get(sort, [("players_count", -1)])
    
    skip = (page - 1) * limit
    games = list(db.games.find(query).sort(sort_by).skip(skip).limit(limit))
    
    # Get user's activity for these games
    game_ids = [str(g["_id"]) for g in games]
    activities = {a["game_id"]: a for a in db.game_activities.find({
        "user_id": session["user_id"],
        "game_id": {"$in": game_ids}
    })}
    
    return {
        "games": [serialize_game(g, activities.get(str(g["_id"]))) for g in games],
        "page": page,
        "has_more": len(games) == limit
    }

@router.get("/genres")
async def get_genres(token: str):
    """Get game genres"""
    return {
        "genres": [
            {"id": "all", "name": "All Games", "icon": "gamepad-2"},
            {"id": "action", "name": "Action", "icon": "zap"},
            {"id": "adventure", "name": "Adventure", "icon": "compass"},
            {"id": "rpg", "name": "RPG", "icon": "sword"},
            {"id": "strategy", "name": "Strategy", "icon": "brain"},
            {"id": "sports", "name": "Sports", "icon": "trophy"},
            {"id": "racing", "name": "Racing", "icon": "car"},
            {"id": "puzzle", "name": "Puzzle", "icon": "puzzle"},
            {"id": "simulation", "name": "Simulation", "icon": "building"},
            {"id": "fps", "name": "FPS", "icon": "crosshair"},
            {"id": "moba", "name": "MOBA", "icon": "users"},
            {"id": "casual", "name": "Casual", "icon": "smile"},
        ]
    }

@router.get("/my-library")
async def get_my_library(
    token: str,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get user's game library"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"user_id": session["user_id"]}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    activities = list(db.game_activities.find(query).sort("updated_at", -1).skip(skip).limit(limit))
    
    game_ids = [ObjectId(a["game_id"]) for a in activities if ObjectId.is_valid(a["game_id"])]
    games = {str(g["_id"]): g for g in db.games.find({"_id": {"$in": game_ids}})}
    
    result = []
    for activity in activities:
        game = games.get(activity["game_id"])
        if game:
            result.append(serialize_game(game, activity))
    
    return {
        "games": result,
        "page": page,
        "has_more": len(activities) == limit
    }

@router.post("/activity")
async def update_game_activity(activity: GameActivityCreate, token: str):
    """Update game activity (playing, completed, etc.)"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    existing = db.game_activities.find_one({
        "user_id": user_id,
        "game_id": activity.game_id
    })
    
    activity_doc = {
        "user_id": user_id,
        "game_id": activity.game_id,
        "status": activity.status,
        "hours_played": activity.hours_played,
        "rating": activity.rating,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if existing:
        db.game_activities.update_one({"_id": existing["_id"]}, {"$set": activity_doc})
    else:
        activity_doc["created_at"] = datetime.now(timezone.utc)
        db.game_activities.insert_one(activity_doc)
        # Increment players count
        db.games.update_one({"_id": ObjectId(activity.game_id)}, {"$inc": {"players_count": 1}})
    
    return {"success": True, "status": activity.status}

@router.get("/friends-playing")
async def get_friends_playing(token: str, limit: int = Query(10, ge=1, le=50)):
    """Get what friends are currently playing"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get friends
    friendships = list(db.friendships.find({
        "$or": [
            {"user_id": session["user_id"], "status": "accepted"},
            {"friend_id": session["user_id"], "status": "accepted"}
        ]
    }))
    
    friend_ids = []
    for f in friendships:
        if f["user_id"] == session["user_id"]:
            friend_ids.append(f["friend_id"])
        else:
            friend_ids.append(f["user_id"])
    
    # Get recent activities from friends
    activities = list(db.game_activities.find({
        "user_id": {"$in": friend_ids},
        "status": "playing"
    }).sort("updated_at", -1).limit(limit))
    
    # Get users and games
    user_ids = [ObjectId(a["user_id"]) for a in activities if ObjectId.is_valid(a["user_id"])]
    game_ids = [ObjectId(a["game_id"]) for a in activities if ObjectId.is_valid(a["game_id"])]
    
    users = {str(u["_id"]): u for u in db.users.find({"_id": {"$in": user_ids}})}
    games = {str(g["_id"]): g for g in db.games.find({"_id": {"$in": game_ids}})}
    
    result = []
    for activity in activities:
        user = users.get(activity["user_id"])
        game = games.get(activity["game_id"])
        if user and game:
            result.append({
                "user": {
                    "id": str(user["_id"]),
                    "username": user.get("username", ""),
                    "display_name": user.get("display_name", ""),
                    "avatar": user.get("avatar")
                },
                "game": serialize_game(game),
                "updated_at": activity.get("updated_at", datetime.now(timezone.utc)).isoformat()
            })
    
    return {"activities": result}

@router.get("/tournaments")
async def get_tournaments(
    token: str,
    game_id: Optional[str] = None,
    status: str = "upcoming",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get gaming tournaments"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"status": status}
    if game_id:
        query["game_id"] = game_id
    
    skip = (page - 1) * limit
    tournaments = list(db.tournaments.find(query).sort("start_time", 1).skip(skip).limit(limit))
    
    # Get games and hosts
    game_ids = [ObjectId(t["game_id"]) for t in tournaments if ObjectId.is_valid(t.get("game_id"))]
    host_ids = [ObjectId(t["host_id"]) for t in tournaments if ObjectId.is_valid(t.get("host_id"))]
    
    games = {str(g["_id"]): g for g in db.games.find({"_id": {"$in": game_ids}})}
    hosts = {str(h["_id"]): h for h in db.users.find({"_id": {"$in": host_ids}})}
    
    return {
        "tournaments": [
            serialize_tournament(t, games.get(t.get("game_id")), hosts.get(t.get("host_id")))
            for t in tournaments
        ],
        "page": page,
        "has_more": len(tournaments) == limit
    }

@router.post("/tournaments/create")
async def create_tournament(tournament: TournamentCreate, token: str):
    """Create a gaming tournament"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    tournament_doc = {
        "name": tournament.name,
        "game_id": tournament.game_id,
        "description": tournament.description,
        "start_time": tournament.start_time,
        "max_participants": tournament.max_participants,
        "current_participants": 0,
        "prize_pool": tournament.prize_pool,
        "rules": tournament.rules,
        "host_id": session["user_id"],
        "participants": [],
        "status": "upcoming",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.tournaments.insert_one(tournament_doc)
    tournament_doc["_id"] = result.inserted_id
    
    game = db.games.find_one({"_id": ObjectId(tournament.game_id)}) if ObjectId.is_valid(tournament.game_id) else None
    host = db.users.find_one({"_id": ObjectId(session["user_id"])})
    
    return serialize_tournament(tournament_doc, game, host)

@router.post("/tournaments/{tournament_id}/join")
async def join_tournament(tournament_id: str, token: str):
    """Join a tournament"""
    db = get_db()
    
    session = db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    tournament = db.tournaments.find_one({"_id": ObjectId(tournament_id)})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if session["user_id"] in tournament.get("participants", []):
        raise HTTPException(status_code=400, detail="Already joined")
    
    if tournament.get("max_participants") and tournament.get("current_participants", 0) >= tournament["max_participants"]:
        raise HTTPException(status_code=400, detail="Tournament is full")
    
    db.tournaments.update_one(
        {"_id": ObjectId(tournament_id)},
        {
            "$push": {"participants": session["user_id"]},
            "$inc": {"current_participants": 1}
        }
    )
    
    return {"success": True}
