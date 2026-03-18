"""
Instagram-style features for FaceConnect.
Includes: Story Highlights, Carousel Posts, Story Stickers, Voice Messages, etc.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os
import base64

from .shared import db, UPLOAD_DIR

router = APIRouter(prefix="/instagram", tags=["Instagram Features"])
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class StoryHighlight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    cover_url: Optional[str] = None
    story_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StorySticker(BaseModel):
    type: str  # poll, question, quiz, mention, location, countdown, emoji_slider
    data: Dict[str, Any]
    position: Dict[str, float]  # x, y, width, height, rotation

class InteractiveStory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    media_url: str
    media_type: str = "image"  # image, video
    stickers: List[StorySticker] = []
    mentions: List[str] = []
    location: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=24))
    viewers: List[str] = []
    reactions: List[Dict[str, Any]] = []

class CarouselPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    media_items: List[Dict[str, str]]  # [{url, type, filter}]
    caption: str = ""
    location: Optional[Dict[str, Any]] = None
    tagged_users: List[str] = []
    hashtags: List[str] = []
    filter_applied: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoiceMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    audio_url: str
    duration: float  # seconds
    waveform: List[float] = []  # audio visualization data
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_listened: bool = False

class MessageReaction(BaseModel):
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== STORY HIGHLIGHTS ==============

@router.post("/highlights")
async def create_highlight(
    user_id: str,
    name: str,
    story_ids: List[str],
    cover_url: Optional[str] = None
):
    """Create a story highlight."""
    highlight = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "cover_url": cover_url or (await get_first_story_media(story_ids)),
        "story_ids": story_ids,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.story_highlights.insert_one(highlight)
    highlight.pop("_id", None)
    return highlight

@router.get("/highlights/{user_id}")
async def get_user_highlights(user_id: str):
    """Get all highlights for a user."""
    highlights = await db.story_highlights.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return highlights

@router.put("/highlights/{highlight_id}")
async def update_highlight(highlight_id: str, name: Optional[str] = None, story_ids: Optional[List[str]] = None):
    """Update a highlight."""
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if name:
        update_data["name"] = name
    if story_ids:
        update_data["story_ids"] = story_ids
    
    await db.story_highlights.update_one(
        {"id": highlight_id},
        {"$set": update_data}
    )
    return {"success": True}

@router.delete("/highlights/{highlight_id}")
async def delete_highlight(highlight_id: str):
    """Delete a highlight."""
    await db.story_highlights.delete_one({"id": highlight_id})
    return {"success": True}

@router.post("/highlights/{highlight_id}/stories")
async def add_story_to_highlight(highlight_id: str, story_id: str):
    """Add a story to a highlight."""
    await db.story_highlights.update_one(
        {"id": highlight_id},
        {"$addToSet": {"story_ids": story_id}}
    )
    return {"success": True}

# ============== INTERACTIVE STORIES (STICKERS) ==============

@router.post("/stories/interactive")
async def create_interactive_story(
    user_id: str,
    media_url: str,
    media_type: str = "image",
    stickers: List[Dict] = [],
    mentions: List[str] = [],
    location: Optional[Dict] = None
):
    """Create a story with interactive stickers."""
    story = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "media_url": media_url,
        "media_type": media_type,
        "stickers": stickers,
        "mentions": mentions,
        "location": location,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        "viewers": [],
        "reactions": [],
        "sticker_responses": {}  # For poll votes, question answers, etc.
    }
    
    await db.interactive_stories.insert_one(story)
    
    # Notify mentioned users
    for mentioned_user_id in mentions:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": mentioned_user_id,
            "type": "story_mention",
            "actor_id": user_id,
            "story_id": story["id"],
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
    
    story.pop("_id", None)
    return story

@router.post("/stories/{story_id}/poll-vote")
async def vote_on_poll(story_id: str, user_id: str, option_index: int):
    """Vote on a story poll."""
    await db.interactive_stories.update_one(
        {"id": story_id},
        {
            "$set": {f"sticker_responses.poll.{user_id}": option_index},
            "$addToSet": {"viewers": user_id}
        }
    )
    
    # Get updated poll results
    story = await db.interactive_stories.find_one({"id": story_id}, {"_id": 0, "sticker_responses": 1})
    return {"success": True, "responses": story.get("sticker_responses", {}).get("poll", {})}

@router.post("/stories/{story_id}/question-answer")
async def answer_story_question(story_id: str, user_id: str, answer: str):
    """Answer a story question."""
    answer_data = {
        "user_id": user_id,
        "answer": answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.interactive_stories.update_one(
        {"id": story_id},
        {
            "$push": {"sticker_responses.questions": answer_data},
            "$addToSet": {"viewers": user_id}
        }
    )
    return {"success": True}

@router.post("/stories/{story_id}/quiz-answer")
async def answer_story_quiz(story_id: str, user_id: str, answer_index: int):
    """Answer a story quiz."""
    await db.interactive_stories.update_one(
        {"id": story_id},
        {
            "$set": {f"sticker_responses.quiz.{user_id}": answer_index},
            "$addToSet": {"viewers": user_id}
        }
    )
    return {"success": True}

@router.post("/stories/{story_id}/emoji-slider")
async def respond_to_emoji_slider(story_id: str, user_id: str, value: float):
    """Respond to emoji slider (0-1 range)."""
    await db.interactive_stories.update_one(
        {"id": story_id},
        {
            "$set": {f"sticker_responses.emoji_slider.{user_id}": value},
            "$addToSet": {"viewers": user_id}
        }
    )
    return {"success": True}

@router.post("/stories/{story_id}/reaction")
async def react_to_story(story_id: str, user_id: str, emoji: str):
    """Send a quick emoji reaction to a story."""
    reaction = {
        "user_id": user_id,
        "emoji": emoji,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.interactive_stories.update_one(
        {"id": story_id},
        {"$push": {"reactions": reaction}}
    )
    
    # Get story owner and notify
    story = await db.interactive_stories.find_one({"id": story_id})
    if story:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": story["user_id"],
            "type": "story_reaction",
            "actor_id": user_id,
            "story_id": story_id,
            "emoji": emoji,
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {"success": True}

# ============== CAROUSEL POSTS ==============

@router.post("/posts/carousel")
async def create_carousel_post(
    user_id: str,
    media_items: List[Dict[str, str]],
    caption: str = "",
    location: Optional[Dict] = None,
    tagged_users: List[str] = [],
    hashtags: List[str] = []
):
    """Create a carousel post with multiple images/videos."""
    post = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "carousel",
        "media_items": media_items,  # [{url, type, filter}]
        "caption": caption,
        "location": location,
        "tagged_users": tagged_users,
        "hashtags": hashtags,
        "likes_count": 0,
        "comments_count": 0,
        "liked_by": [],
        "saved_by": [],
        "created_at": datetime.now(timezone.utc),
        "is_archived": False
    }
    
    await db.posts.insert_one(post)
    
    # Notify tagged users
    for tagged_user_id in tagged_users:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": tagged_user_id,
            "type": "post_tag",
            "actor_id": user_id,
            "post_id": post["id"],
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
    
    post.pop("_id", None)
    return post

@router.get("/posts/tagged/{user_id}")
async def get_tagged_posts(user_id: str, skip: int = 0, limit: int = 20):
    """Get posts where user is tagged."""
    posts = await db.posts.find(
        {"tagged_users": user_id, "is_archived": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return posts

# ============== IMAGE FILTERS ==============

AVAILABLE_FILTERS = [
    {"id": "none", "name": "Normal", "css": ""},
    {"id": "clarendon", "name": "Clarendon", "css": "contrast(1.2) saturate(1.35)"},
    {"id": "gingham", "name": "Gingham", "css": "brightness(1.05) hue-rotate(-10deg)"},
    {"id": "moon", "name": "Moon", "css": "grayscale(1) contrast(1.1) brightness(1.1)"},
    {"id": "lark", "name": "Lark", "css": "contrast(0.9) brightness(1.1) saturate(0.85)"},
    {"id": "reyes", "name": "Reyes", "css": "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)"},
    {"id": "juno", "name": "Juno", "css": "sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)"},
    {"id": "slumber", "name": "Slumber", "css": "saturate(0.66) brightness(1.05)"},
    {"id": "crema", "name": "Crema", "css": "sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)"},
    {"id": "ludwig", "name": "Ludwig", "css": "sepia(0.25) contrast(1.05) brightness(1.05) saturate(2)"},
    {"id": "aden", "name": "Aden", "css": "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)"},
    {"id": "perpetua", "name": "Perpetua", "css": "contrast(1.1) brightness(1.25) saturate(1.1)"},
    {"id": "valencia", "name": "Valencia", "css": "contrast(1.08) brightness(1.08) sepia(0.08)"},
    {"id": "xpro2", "name": "X-Pro II", "css": "sepia(0.3) contrast(1.2) saturate(1.3)"},
    {"id": "willow", "name": "Willow", "css": "grayscale(0.5) contrast(0.95) brightness(0.9)"},
    {"id": "inkwell", "name": "Inkwell", "css": "sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)"},
]

@router.get("/filters")
async def get_available_filters():
    """Get all available image filters."""
    return AVAILABLE_FILTERS

# ============== VOICE MESSAGES ==============

@router.post("/messages/voice")
async def send_voice_message(
    conversation_id: str,
    sender_id: str,
    audio_base64: str,
    duration: float,
    waveform: List[float] = []
):
    """Send a voice message."""
    # Save audio file
    audio_data = base64.b64decode(audio_base64)
    audio_id = str(uuid.uuid4())
    audio_filename = f"voice_{audio_id}.webm"
    audio_path = os.path.join(UPLOAD_DIR, audio_filename)
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(audio_path, "wb") as f:
        f.write(audio_data)
    
    voice_message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "type": "voice",
        "audio_url": f"/uploads/{audio_filename}",
        "duration": duration,
        "waveform": waveform,
        "created_at": datetime.now(timezone.utc),
        "is_listened": False
    }
    
    await db.messages.insert_one(voice_message)
    
    # Update conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {
                "last_message": {"type": "voice", "duration": duration},
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    voice_message.pop("_id", None)
    return voice_message

@router.put("/messages/voice/{message_id}/listened")
async def mark_voice_listened(message_id: str):
    """Mark a voice message as listened."""
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"is_listened": True}}
    )
    return {"success": True}

# ============== MESSAGE REACTIONS ==============

@router.post("/messages/{message_id}/reaction")
async def add_message_reaction(message_id: str, user_id: str, emoji: str):
    """Add a reaction to a message."""
    reaction = {
        "user_id": user_id,
        "emoji": emoji,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove existing reaction from same user
    await db.messages.update_one(
        {"id": message_id},
        {"$pull": {"reactions": {"user_id": user_id}}}
    )
    
    # Add new reaction
    await db.messages.update_one(
        {"id": message_id},
        {"$push": {"reactions": reaction}}
    )
    
    return {"success": True}

@router.delete("/messages/{message_id}/reaction")
async def remove_message_reaction(message_id: str, user_id: str):
    """Remove a reaction from a message."""
    await db.messages.update_one(
        {"id": message_id},
        {"$pull": {"reactions": {"user_id": user_id}}}
    )
    return {"success": True}

# ============== VANISH MODE ==============

@router.post("/conversations/{conversation_id}/vanish-mode")
async def toggle_vanish_mode(conversation_id: str, enabled: bool):
    """Toggle vanish mode for a conversation."""
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"vanish_mode": enabled, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if enabled:
        # Schedule deletion of messages after they're seen
        pass  # Would implement with background task
    
    return {"success": True, "vanish_mode": enabled}

# ============== POST ARCHIVE ==============

@router.post("/posts/{post_id}/archive")
async def archive_post(post_id: str, user_id: str):
    """Archive a post (hide from profile but keep it)."""
    result = await db.posts.update_one(
        {"id": post_id, "user_id": user_id},
        {"$set": {"is_archived": True, "archived_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or not authorized")
    
    return {"success": True}

@router.post("/posts/{post_id}/unarchive")
async def unarchive_post(post_id: str, user_id: str):
    """Unarchive a post."""
    await db.posts.update_one(
        {"id": post_id, "user_id": user_id},
        {"$set": {"is_archived": False}, "$unset": {"archived_at": ""}}
    )
    return {"success": True}

@router.get("/posts/archived/{user_id}")
async def get_archived_posts(user_id: str, skip: int = 0, limit: int = 20):
    """Get user's archived posts."""
    posts = await db.posts.find(
        {"user_id": user_id, "is_archived": True},
        {"_id": 0}
    ).sort("archived_at", -1).skip(skip).limit(limit).to_list(limit)
    return posts

# ============== SHARE POST TO STORY ==============

@router.post("/posts/{post_id}/share-to-story")
async def share_post_to_story(post_id: str, user_id: str):
    """Share a post to your story."""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Create a story that references the post
    story = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "shared_post",
        "shared_post_id": post_id,
        "shared_post_preview": {
            "user_id": post.get("user_id"),
            "media_url": post.get("media_url") or (post.get("media_items", [{}])[0].get("url") if post.get("media_items") else None),
            "caption": post.get("caption", "")[:100]
        },
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        "viewers": []
    }
    
    await db.stories.insert_one(story)
    story.pop("_id", None)
    return story

# ============== LOCATION FEATURES ==============

@router.get("/locations/search")
async def search_locations(q: str):
    """Search for locations (mock data - would integrate with Google Places API)."""
    # Mock locations for demo
    mock_locations = [
        {"id": "1", "name": "New York, NY", "type": "city"},
        {"id": "2", "name": "Central Park", "type": "landmark"},
        {"id": "3", "name": "Times Square", "type": "landmark"},
        {"id": "4", "name": "Los Angeles, CA", "type": "city"},
        {"id": "5", "name": "San Francisco, CA", "type": "city"},
    ]
    
    results = [loc for loc in mock_locations if q.lower() in loc["name"].lower()]
    return results

@router.get("/posts/location/{location_id}")
async def get_posts_by_location(location_id: str, skip: int = 0, limit: int = 20):
    """Get posts from a specific location."""
    posts = await db.posts.find(
        {"location.id": location_id, "is_archived": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return posts

# ============== HELPER FUNCTIONS ==============

async def get_first_story_media(story_ids: List[str]) -> Optional[str]:
    """Get the media URL of the first story for highlight cover."""
    if not story_ids:
        return None
    
    story = await db.stories.find_one({"id": story_ids[0]}, {"media_url": 1})
    if story:
        return story.get("media_url")
    
    interactive_story = await db.interactive_stories.find_one({"id": story_ids[0]}, {"media_url": 1})
    if interactive_story:
        return interactive_story.get("media_url")
    
    return None
