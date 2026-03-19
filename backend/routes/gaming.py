"""
Gaming API Routes
Handles game discovery, gaming activity, and tournaments
Returns mock data when database is empty to ensure the frontend always has content.
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
    game_id = str(game.get("_id", game.get("id", "")))
    return {
        "id": game_id,
        "name": game.get("name", ""),
        "description": game.get("description", ""),
        "thumbnail": game.get("thumbnail") or game.get("cover_image"),
        "cover_image": game.get("cover_image") or game.get("thumbnail"),
        "genre": game.get("genre", ""),
        "category": game.get("category", game.get("genre", "")),
        "platform": game.get("platform", []),
        "developer": game.get("developer", ""),
        "release_date": game.get("release_date"),
        "rating": game.get("rating", 0),
        "players": game.get("players_count", game.get("players", 0)),
        "players_count": game.get("players_count", game.get("players", 0)),
        "is_instant": game.get("is_instant", True),
        "user_status": user_activity.get("status") if user_activity else None,
        "user_hours": user_activity.get("hours_played") if user_activity else None,
        "user_rating": user_activity.get("rating") if user_activity else None
    }

def serialize_tournament(tournament: dict, game: dict = None, host: dict = None) -> dict:
    return {
        "id": str(tournament.get("_id", tournament.get("id", ""))),
        "name": tournament.get("name", ""),
        "game_id": str(tournament.get("game_id", "")),
        "game_name": game.get("name", "") if game else "",
        "game_cover": game.get("cover_image") if game else None,
        "description": tournament.get("description", ""),
        "start_time": tournament.get("start_time", datetime.now(timezone.utc)).isoformat() if isinstance(tournament.get("start_time"), datetime) else tournament.get("start_time", ""),
        "max_participants": tournament.get("max_participants"),
        "current_participants": tournament.get("current_participants", 0),
        "prize_pool": tournament.get("prize_pool"),
        "rules": tournament.get("rules", []),
        "host_id": str(tournament.get("host_id", "")),
        "host_name": host.get("display_name", host.get("username", "")) if host else "",
        "status": tournament.get("status", "upcoming"),
        "created_at": tournament.get("created_at", datetime.now(timezone.utc)).isoformat() if isinstance(tournament.get("created_at"), datetime) else tournament.get("created_at", "")
    }

def serialize_stream(stream: dict) -> dict:
    return {
        "id": str(stream.get("_id", stream.get("id", ""))),
        "title": stream.get("title", ""),
        "game": stream.get("game", ""),
        "thumbnail": stream.get("thumbnail"),
        "streamer": stream.get("streamer", {}),
        "viewers": stream.get("viewers", 0),
        "is_live": stream.get("is_live", True)
    }

# Generate mock games for when database is empty
def generate_mock_games():
    game_data = [
        {"name": "Cosmic Runner", "description": "An epic space adventure game with stunning visuals and challenging gameplay.", "genre": "Action", "category": "Action"},
        {"name": "Puzzle Quest", "description": "Challenge your mind with hundreds of brain-teasing puzzles.", "genre": "Puzzle", "category": "Puzzle"},
        {"name": "Battle Arena", "description": "Epic multiplayer battles with friends and players worldwide.", "genre": "Action", "category": "Multiplayer"},
        {"name": "Speed Racer", "description": "High-octane racing action with customizable vehicles.", "genre": "Racing", "category": "Racing"},
        {"name": "Word Master", "description": "Test your vocabulary skills in this addictive word game.", "genre": "Puzzle", "category": "Puzzle"},
        {"name": "Chess Pro", "description": "Classic chess with modern features and online matchmaking.", "genre": "Strategy", "category": "Strategy"},
        {"name": "Trivia Time", "description": "Test your knowledge across thousands of categories.", "genre": "Casual", "category": "Arcade"},
        {"name": "Dragon Quest", "description": "Embark on an epic RPG adventure to save the kingdom.", "genre": "Adventure", "category": "Adventure"},
    ]
    
    import random
    games = []
    for i, data in enumerate(game_data):
        games.append({
            "id": f"game-{i}",
            "name": data["name"],
            "description": data["description"],
            "thumbnail": f"https://picsum.photos/400/300?random={i + 50}",
            "cover_image": f"https://picsum.photos/400/300?random={i + 50}",
            "genre": data["genre"],
            "category": data["category"],
            "players": random.randint(10000, 100000),
            "players_count": random.randint(10000, 100000),
            "rating": round(random.uniform(3.5, 5.0), 1),
            "is_instant": True,
            "platform": ["web", "mobile"],
            "developer": "FaceConnect Games"
        })
    return games

def generate_mock_streams():
    streams = []
    for i in range(6):
        streams.append({
            "id": f"stream-{i}",
            "title": f"Epic Gaming Session #{i + 1}",
            "game": f"Game {i + 1}",
            "thumbnail": f"https://picsum.photos/400/225?random={i + 60}",
            "streamer": {
                "username": f"gamer{i}",
                "display_name": f"Pro Gamer {i + 1}",
                "avatar": None
            },
            "viewers": 100 + (i * 500),
            "is_live": True
        })
    return streams

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
    
    session = await db.sessions.find_one({"token": token})
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
    games = await db.games.find(query).sort(sort_by).skip(skip).limit(limit).to_list(limit)
    
    # If no games in database, return mock data
    if not games:
        mock_games = generate_mock_games()
        if genre and genre != "all":
            mock_games = [g for g in mock_games if g.get("genre", "").lower() == genre.lower()]
        if search:
            mock_games = [g for g in mock_games if search.lower() in g.get("name", "").lower()]
        return {
            "games": mock_games[skip:skip+limit],
            "page": page,
            "has_more": len(mock_games) > skip + limit
        }
    
    # Get user's activity for these games
    game_ids = [str(g["_id"]) for g in games]
    activities_cursor = db.game_activities.find({
        "user_id": session["user_id"],
        "game_id": {"$in": game_ids}
    })
    activities_list = await activities_cursor.to_list(100)
    activities = {a["game_id"]: a for a in activities_list}
    
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

@router.get("/streams")
async def get_streams(
    token: str,
    game_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get live gaming streams"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"is_live": True}
    if game_id:
        query["game_id"] = game_id
    
    skip = (page - 1) * limit
    streams = await db.game_streams.find(query).sort("viewers", -1).skip(skip).limit(limit).to_list(limit)
    
    # If no streams in database, return mock data
    if not streams:
        mock_streams = generate_mock_streams()
        return {
            "streams": mock_streams[skip:skip+limit],
            "page": page,
            "has_more": len(mock_streams) > skip + limit
        }
    
    return {
        "streams": [serialize_stream(s) for s in streams],
        "page": page,
        "has_more": len(streams) == limit
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
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"user_id": session["user_id"]}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    activities = await db.game_activities.find(query).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    game_ids = []
    for a in activities:
        if ObjectId.is_valid(a.get("game_id", "")):
            game_ids.append(ObjectId(a["game_id"]))
    
    games_list = await db.games.find({"_id": {"$in": game_ids}}).to_list(100)
    games = {str(g["_id"]): g for g in games_list}
    
    result = []
    for activity in activities:
        game = games.get(activity.get("game_id"))
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
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = session["user_id"]
    
    existing = await db.game_activities.find_one({
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
        await db.game_activities.update_one({"_id": existing["_id"]}, {"$set": activity_doc})
    else:
        activity_doc["created_at"] = datetime.now(timezone.utc)
        await db.game_activities.insert_one(activity_doc)
        # Increment players count
        if ObjectId.is_valid(activity.game_id):
            await db.games.update_one({"_id": ObjectId(activity.game_id)}, {"$inc": {"players_count": 1}})
    
    return {"success": True, "status": activity.status}

@router.get("/friends-playing")
async def get_friends_playing(token: str, limit: int = Query(10, ge=1, le=50)):
    """Get what friends are currently playing"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get friends
    friendships = await db.friendships.find({
        "$or": [
            {"user_id": session["user_id"], "status": "accepted"},
            {"friend_id": session["user_id"], "status": "accepted"}
        ]
    }).to_list(100)
    
    friend_ids = []
    for f in friendships:
        if f["user_id"] == session["user_id"]:
            friend_ids.append(f["friend_id"])
        else:
            friend_ids.append(f["user_id"])
    
    if not friend_ids:
        return {"activities": []}
    
    # Get recent activities from friends
    activities = await db.game_activities.find({
        "user_id": {"$in": friend_ids},
        "status": "playing"
    }).sort("updated_at", -1).limit(limit).to_list(limit)
    
    # Get users and games
    user_ids = []
    game_ids = []
    for a in activities:
        if ObjectId.is_valid(a.get("user_id", "")):
            user_ids.append(ObjectId(a["user_id"]))
        if ObjectId.is_valid(a.get("game_id", "")):
            game_ids.append(ObjectId(a["game_id"]))
    
    users_list = await db.users.find({"_id": {"$in": user_ids}}).to_list(100)
    games_list = await db.games.find({"_id": {"$in": game_ids}}).to_list(100)
    
    users = {str(u["_id"]): u for u in users_list}
    games = {str(g["_id"]): g for g in games_list}
    
    result = []
    for activity in activities:
        user = users.get(activity.get("user_id"))
        game = games.get(activity.get("game_id"))
        if user and game:
            result.append({
                "user": {
                    "id": str(user["_id"]),
                    "username": user.get("username", ""),
                    "display_name": user.get("display_name", ""),
                    "avatar": user.get("avatar")
                },
                "game": serialize_game(game),
                "updated_at": activity.get("updated_at", datetime.now(timezone.utc)).isoformat() if isinstance(activity.get("updated_at"), datetime) else activity.get("updated_at", "")
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
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = {"status": status}
    if game_id:
        query["game_id"] = game_id
    
    skip = (page - 1) * limit
    tournaments = await db.tournaments.find(query).sort("start_time", 1).skip(skip).limit(limit).to_list(limit)
    
    # Get games and hosts
    game_ids = []
    host_ids = []
    for t in tournaments:
        if ObjectId.is_valid(t.get("game_id", "")):
            game_ids.append(ObjectId(t["game_id"]))
        if ObjectId.is_valid(t.get("host_id", "")):
            host_ids.append(ObjectId(t["host_id"]))
    
    games_list = await db.games.find({"_id": {"$in": game_ids}}).to_list(100)
    hosts_list = await db.users.find({"_id": {"$in": host_ids}}).to_list(100)
    
    games = {str(g["_id"]): g for g in games_list}
    hosts = {str(h["_id"]): h for h in hosts_list}
    
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
    
    session = await db.sessions.find_one({"token": token})
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
    
    result = await db.tournaments.insert_one(tournament_doc)
    tournament_doc["_id"] = result.inserted_id
    
    game = None
    if ObjectId.is_valid(tournament.game_id):
        game = await db.games.find_one({"_id": ObjectId(tournament.game_id)})
    host = await db.users.find_one({"_id": ObjectId(session["user_id"])}) if ObjectId.is_valid(session["user_id"]) else None
    
    return serialize_tournament(tournament_doc, game, host)

@router.post("/tournaments/{tournament_id}/join")
async def join_tournament(tournament_id: str, token: str):
    """Join a tournament"""
    db = get_db()
    
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not ObjectId.is_valid(tournament_id):
        raise HTTPException(status_code=400, detail="Invalid tournament ID")
    
    tournament = await db.tournaments.find_one({"_id": ObjectId(tournament_id)})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if session["user_id"] in tournament.get("participants", []):
        raise HTTPException(status_code=400, detail="Already joined")
    
    if tournament.get("max_participants") and tournament.get("current_participants", 0) >= tournament["max_participants"]:
        raise HTTPException(status_code=400, detail="Tournament is full")
    
    await db.tournaments.update_one(
        {"_id": ObjectId(tournament_id)},
        {
            "$push": {"participants": session["user_id"]},
            "$inc": {"current_participants": 1}
        }
    )
    
    return {"success": True}
