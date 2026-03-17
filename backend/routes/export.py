"""
Data Export routes for FaceConnect.
Handles exporting user data, conversations, and posts to CSV/PDF.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timezone
import csv
import io
import json

from .shared import db, get_user_by_id

router = APIRouter(prefix="/export", tags=["Data Export"])

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

def format_datetime(dt_value) -> str:
    """Format datetime for export."""
    if not dt_value:
        return ""
    if isinstance(dt_value, str):
        return dt_value[:19].replace("T", " ")
    return dt_value.strftime("%Y-%m-%d %H:%M:%S")

def generate_csv(headers: List[str], rows: List[List]) -> str:
    """Generate CSV content."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue()

def generate_html_pdf(title: str, content: str) -> str:
    """Generate HTML that can be printed as PDF."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }}
        h1 {{ color: #7000FF; border-bottom: 2px solid #00F0FF; padding-bottom: 10px; }}
        h2 {{ color: #333; margin-top: 30px; }}
        .section {{ margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }}
        .item {{ padding: 10px 0; border-bottom: 1px solid #ddd; }}
        .item:last-child {{ border-bottom: none; }}
        .label {{ font-weight: bold; color: #555; }}
        .value {{ color: #333; }}
        .timestamp {{ color: #888; font-size: 0.9em; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th, td {{ padding: 10px; text-align: left; border: 1px solid #ddd; }}
        th {{ background: #7000FF; color: white; }}
        tr:nth-child(even) {{ background: #f9f9f9; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 0.9em; }}
    </style>
</head>
<body>
    <h1>FaceConnect - {title}</h1>
    <p class="timestamp">Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")} UTC</p>
    {content}
    <div class="footer">
        <p>This data was exported from FaceConnect. For privacy concerns, please contact support.</p>
    </div>
</body>
</html>
"""

# ============== ROUTES ==============
@router.get("/profile")
async def export_profile(token: str, format: Literal["csv", "json", "pdf"] = "json"):
    """Export user profile data"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get user data (excluding sensitive fields)
    profile_data = {
        "id": user.get("id"),
        "username": user.get("username"),
        "email": user.get("email"),
        "display_name": user.get("display_name"),
        "status": user.get("status"),
        "avatar": user.get("avatar"),
        "created_at": format_datetime(user.get("created_at")),
        "oauth_provider": user.get("oauth_provider", "email")
    }
    
    # Get stats
    posts_count = await db.posts.count_documents({"user_id": user["id"]})
    friends_count = await db.friends.count_documents({
        "$or": [{"user_id": user["id"]}, {"friend_id": user["id"]}],
        "status": "accepted"
    })
    
    if format == "csv":
        headers = list(profile_data.keys()) + ["posts_count", "friends_count"]
        values = list(profile_data.values()) + [posts_count, friends_count]
        content = generate_csv(headers, [values])
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_profile_{user['username']}.csv"}
        )
    
    elif format == "pdf":
        html_content = f"""
        <div class="section">
            <h2>Profile Information</h2>
            <div class="item"><span class="label">Username:</span> <span class="value">@{profile_data['username']}</span></div>
            <div class="item"><span class="label">Display Name:</span> <span class="value">{profile_data['display_name'] or 'Not set'}</span></div>
            <div class="item"><span class="label">Email:</span> <span class="value">{profile_data['email']}</span></div>
            <div class="item"><span class="label">Status:</span> <span class="value">{profile_data['status'] or 'No status'}</span></div>
            <div class="item"><span class="label">Account Created:</span> <span class="value">{profile_data['created_at']}</span></div>
            <div class="item"><span class="label">Login Method:</span> <span class="value">{profile_data['oauth_provider'].title()}</span></div>
        </div>
        <div class="section">
            <h2>Statistics</h2>
            <div class="item"><span class="label">Total Posts:</span> <span class="value">{posts_count}</span></div>
            <div class="item"><span class="label">Friends:</span> <span class="value">{friends_count}</span></div>
        </div>
        """
        html = generate_html_pdf("Profile Export", html_content)
        return StreamingResponse(
            io.StringIO(html),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_profile_{user['username']}.html"}
        )
    
    else:  # json
        return {
            "profile": profile_data,
            "stats": {
                "posts_count": posts_count,
                "friends_count": friends_count
            },
            "exported_at": datetime.now(timezone.utc).isoformat()
        }

@router.get("/conversations")
async def export_conversations(token: str, format: Literal["csv", "json", "pdf"] = "json"):
    """Export user's conversations and messages"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get all conversations
    conversations = await db.conversations.find(
        {"participant_ids": user["id"]},
        {"_id": 0}
    ).to_list(500)
    
    export_data = []
    
    for conv in conversations:
        # Get messages for this conversation
        messages = await db.messages.find(
            {"conversation_id": conv["id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(1000)
        
        # Get participant info
        participants = []
        for pid in conv.get("participant_ids", []):
            p = await get_user_by_id(pid)
            if p:
                participants.append({
                    "username": p.get("username"),
                    "display_name": p.get("display_name")
                })
        
        conv_export = {
            "id": conv["id"],
            "is_group": conv.get("is_group", False),
            "name": conv.get("name"),
            "participants": participants,
            "message_count": len(messages),
            "created_at": format_datetime(conv.get("created_at")),
            "messages": [
                {
                    "sender": (await get_user_by_id(m.get("sender_id")) or {}).get("username", "Unknown"),
                    "content": m.get("content", ""),
                    "type": m.get("message_type", "text"),
                    "sent_at": format_datetime(m.get("created_at"))
                }
                for m in messages
            ]
        }
        export_data.append(conv_export)
    
    if format == "csv":
        # Flatten for CSV
        headers = ["conversation_id", "is_group", "name", "participants", "sender", "message", "type", "sent_at"]
        rows = []
        for conv in export_data:
            participant_names = ", ".join([p["username"] for p in conv["participants"]])
            for msg in conv["messages"]:
                rows.append([
                    conv["id"][:8],
                    conv["is_group"],
                    conv["name"] or "",
                    participant_names,
                    msg["sender"],
                    msg["content"][:100],  # Truncate for CSV
                    msg["type"],
                    msg["sent_at"]
                ])
        
        content = generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_conversations_{user['username']}.csv"}
        )
    
    elif format == "pdf":
        html_sections = []
        for conv in export_data:
            participant_names = ", ".join([p["display_name"] or p["username"] for p in conv["participants"]])
            conv_name = conv["name"] or participant_names
            
            messages_html = ""
            for msg in conv["messages"][-50:]:  # Last 50 messages per conversation
                messages_html += f"""
                <tr>
                    <td>{msg['sender']}</td>
                    <td>{msg['content'][:200]}</td>
                    <td>{msg['sent_at']}</td>
                </tr>
                """
            
            html_sections.append(f"""
            <div class="section">
                <h2>{'Group: ' if conv['is_group'] else ''}{conv_name}</h2>
                <p><span class="label">Messages:</span> {conv['message_count']} | <span class="label">Created:</span> {conv['created_at']}</p>
                <table>
                    <tr><th>From</th><th>Message</th><th>Time</th></tr>
                    {messages_html}
                </table>
            </div>
            """)
        
        html = generate_html_pdf("Conversations Export", "".join(html_sections))
        return StreamingResponse(
            io.StringIO(html),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_conversations_{user['username']}.html"}
        )
    
    else:  # json
        return {
            "conversations": export_data,
            "total_conversations": len(export_data),
            "exported_at": datetime.now(timezone.utc).isoformat()
        }

@router.get("/posts")
async def export_posts(token: str, format: Literal["csv", "json", "pdf"] = "json"):
    """Export user's posts"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get all user's posts
    posts = await db.posts.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    export_data = []
    for post in posts:
        export_data.append({
            "id": post["id"],
            "content": post.get("content", ""),
            "media_urls": post.get("media_urls", []),
            "likes_count": len(post.get("likes", [])),
            "comments_count": post.get("comments_count", 0),
            "is_highlighted": post.get("is_highlighted", False),
            "created_at": format_datetime(post.get("created_at")),
            "updated_at": format_datetime(post.get("updated_at"))
        })
    
    if format == "csv":
        headers = ["id", "content", "media_count", "likes", "comments", "highlighted", "created_at"]
        rows = [
            [
                p["id"][:8],
                p["content"][:100],
                len(p["media_urls"]),
                p["likes_count"],
                p["comments_count"],
                p["is_highlighted"],
                p["created_at"]
            ]
            for p in export_data
        ]
        
        content = generate_csv(headers, rows)
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_posts_{user['username']}.csv"}
        )
    
    elif format == "pdf":
        posts_html = ""
        for post in export_data:
            media_info = f"{len(post['media_urls'])} media files" if post['media_urls'] else "No media"
            posts_html += f"""
            <div class="item">
                <p><strong>{post['created_at']}</strong></p>
                <p>{post['content'] or '(No text content)'}</p>
                <p class="timestamp">{media_info} | {post['likes_count']} likes | {post['comments_count']} comments</p>
            </div>
            """
        
        html_content = f"""
        <div class="section">
            <h2>Your Posts ({len(export_data)} total)</h2>
            {posts_html or '<p>No posts yet</p>'}
        </div>
        """
        html = generate_html_pdf("Posts Export", html_content)
        return StreamingResponse(
            io.StringIO(html),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_posts_{user['username']}.html"}
        )
    
    else:  # json
        return {
            "posts": export_data,
            "total_posts": len(export_data),
            "exported_at": datetime.now(timezone.utc).isoformat()
        }

@router.get("/all")
async def export_all_data(token: str, format: Literal["json", "pdf"] = "json"):
    """Export all user data (GDPR compliance)"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Gather all data
    profile = await export_profile(token, "json")
    conversations = await export_conversations(token, "json")
    posts = await export_posts(token, "json")
    
    # Get additional data
    friends = await db.friends.find(
        {"$or": [{"user_id": user["id"]}, {"friend_id": user["id"]}]},
        {"_id": 0}
    ).to_list(500)
    
    reels = await db.reels.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    stories = await db.stories.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    if format == "pdf":
        html_content = f"""
        <div class="section">
            <h2>Account Summary</h2>
            <div class="item"><span class="label">Username:</span> @{user.get('username')}</div>
            <div class="item"><span class="label">Email:</span> {user.get('email')}</div>
            <div class="item"><span class="label">Posts:</span> {len(posts.get('posts', []))}</div>
            <div class="item"><span class="label">Conversations:</span> {len(conversations.get('conversations', []))}</div>
            <div class="item"><span class="label">Friends:</span> {len(friends)}</div>
            <div class="item"><span class="label">Reels:</span> {len(reels)}</div>
            <div class="item"><span class="label">Stories:</span> {len(stories)}</div>
        </div>
        <p style="margin-top: 30px;">For complete data in machine-readable format, please export as JSON.</p>
        """
        html = generate_html_pdf("Complete Data Export", html_content)
        return StreamingResponse(
            io.StringIO(html),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=faceconnect_complete_export_{user['username']}.html"}
        )
    
    return {
        "user": {
            "id": user.get("id"),
            "username": user.get("username"),
            "email": user.get("email"),
            "display_name": user.get("display_name"),
            "status": user.get("status"),
            "created_at": format_datetime(user.get("created_at"))
        },
        "profile": profile.get("profile") if isinstance(profile, dict) else profile,
        "conversations": conversations.get("conversations") if isinstance(conversations, dict) else conversations,
        "posts": posts.get("posts") if isinstance(posts, dict) else posts,
        "friends": [{"friend_id": f.get("friend_id") if f.get("user_id") == user["id"] else f.get("user_id"), "status": f.get("status")} for f in friends],
        "reels_count": len(reels),
        "stories_count": len(stories),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data_request_type": "GDPR_EXPORT"
    }
