"""
Analytics routes for FaceConnect.
Provides user analytics, content analytics, and revenue analytics.
Both admin-level and user-level statistics.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from .shared import db

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)

# Response models
class UserAnalytics(BaseModel):
    total_users: int
    new_users_today: int
    new_users_week: int
    new_users_month: int
    active_users_today: int
    active_users_week: int
    premium_users: int
    retention_rate: float

class ContentAnalytics(BaseModel):
    total_posts: int
    posts_today: int
    posts_week: int
    total_likes: int
    total_comments: int
    total_shares: int
    total_stories: int
    total_reels: int
    avg_likes_per_post: float
    avg_comments_per_post: float

class RevenueAnalytics(BaseModel):
    total_revenue: float
    revenue_today: float
    revenue_week: float
    revenue_month: float
    total_subscriptions: int
    active_subscriptions: int
    total_coin_purchases: int
    coins_sold: int

class UserPersonalStats(BaseModel):
    posts_count: int
    likes_received: int
    comments_received: int
    followers_count: int
    following_count: int
    profile_views: int
    coins_balance: int
    is_premium: bool
    engagement_rate: float

class AdminDashboard(BaseModel):
    user_analytics: UserAnalytics
    content_analytics: ContentAnalytics
    revenue_analytics: RevenueAnalytics
    top_posts: List[Dict[str, Any]]
    recent_signups: List[Dict[str, Any]]

# Helper functions
def get_date_range(days: int):
    """Get datetime for N days ago."""
    return datetime.now(timezone.utc) - timedelta(days=days)

# Admin Analytics Endpoints
@router.get("/admin/dashboard", response_model=AdminDashboard)
async def get_admin_dashboard():
    """Get comprehensive admin dashboard with all analytics."""
    try:
        # Date ranges
        today = get_date_range(1)
        week_ago = get_date_range(7)
        month_ago = get_date_range(30)
        
        # User Analytics
        total_users = await db.users.count_documents({})
        new_users_today = await db.users.count_documents({"created_at": {"$gte": today}})
        new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
        new_users_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
        active_users_today = await db.users.count_documents({"last_active": {"$gte": today}})
        active_users_week = await db.users.count_documents({"last_active": {"$gte": week_ago}})
        premium_users = await db.users.count_documents({"is_premium": True})
        
        retention_rate = (active_users_week / total_users * 100) if total_users > 0 else 0
        
        user_analytics = UserAnalytics(
            total_users=total_users,
            new_users_today=new_users_today,
            new_users_week=new_users_week,
            new_users_month=new_users_month,
            active_users_today=active_users_today,
            active_users_week=active_users_week,
            premium_users=premium_users,
            retention_rate=round(retention_rate, 2)
        )
        
        # Content Analytics
        total_posts = await db.posts.count_documents({})
        posts_today = await db.posts.count_documents({"created_at": {"$gte": today}})
        posts_week = await db.posts.count_documents({"created_at": {"$gte": week_ago}})
        
        # Aggregate likes and comments
        likes_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$likes_count"}}}]
        comments_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$comments_count"}}}]
        
        likes_result = await db.posts.aggregate(likes_pipeline).to_list(1)
        comments_result = await db.posts.aggregate(comments_pipeline).to_list(1)
        
        total_likes = likes_result[0]["total"] if likes_result else 0
        total_comments = comments_result[0]["total"] if comments_result else 0
        
        total_stories = await db.stories.count_documents({})
        total_reels = await db.posts.count_documents({"type": "reel"})
        
        avg_likes = total_likes / total_posts if total_posts > 0 else 0
        avg_comments = total_comments / total_posts if total_posts > 0 else 0
        
        content_analytics = ContentAnalytics(
            total_posts=total_posts,
            posts_today=posts_today,
            posts_week=posts_week,
            total_likes=total_likes,
            total_comments=total_comments,
            total_shares=0,  # If you track shares
            total_stories=total_stories,
            total_reels=total_reels,
            avg_likes_per_post=round(avg_likes, 2),
            avg_comments_per_post=round(avg_comments, 2)
        )
        
        # Revenue Analytics
        revenue_pipeline = [
            {"$match": {"payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        revenue_today_pipeline = [
            {"$match": {"payment_status": "paid", "created_at": {"$gte": today}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        revenue_week_pipeline = [
            {"$match": {"payment_status": "paid", "created_at": {"$gte": week_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        revenue_month_pipeline = [
            {"$match": {"payment_status": "paid", "created_at": {"$gte": month_ago}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        
        total_revenue_result = await db.payment_transactions.aggregate(revenue_pipeline).to_list(1)
        revenue_today_result = await db.payment_transactions.aggregate(revenue_today_pipeline).to_list(1)
        revenue_week_result = await db.payment_transactions.aggregate(revenue_week_pipeline).to_list(1)
        revenue_month_result = await db.payment_transactions.aggregate(revenue_month_pipeline).to_list(1)
        
        total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
        revenue_today = revenue_today_result[0]["total"] if revenue_today_result else 0
        revenue_week = revenue_week_result[0]["total"] if revenue_week_result else 0
        revenue_month = revenue_month_result[0]["total"] if revenue_month_result else 0
        
        total_subscriptions = await db.payment_transactions.count_documents({"package_type": "subscription", "payment_status": "paid"})
        active_subscriptions = await db.users.count_documents({"is_premium": True, "subscription_end": {"$gte": datetime.now(timezone.utc)}})
        total_coin_purchases = await db.payment_transactions.count_documents({"package_type": "coins", "payment_status": "paid"})
        
        coins_pipeline = [
            {"$match": {"type": "purchase"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        coins_result = await db.coin_transactions.aggregate(coins_pipeline).to_list(1)
        coins_sold = coins_result[0]["total"] if coins_result else 0
        
        revenue_analytics = RevenueAnalytics(
            total_revenue=round(total_revenue, 2),
            revenue_today=round(revenue_today, 2),
            revenue_week=round(revenue_week, 2),
            revenue_month=round(revenue_month, 2),
            total_subscriptions=total_subscriptions,
            active_subscriptions=active_subscriptions,
            total_coin_purchases=total_coin_purchases,
            coins_sold=coins_sold
        )
        
        # Top posts (by likes)
        top_posts = await db.posts.find(
            {},
            {"_id": 0, "id": 1, "content": 1, "user_id": 1, "likes_count": 1, "comments_count": 1, "created_at": 1}
        ).sort("likes_count", -1).limit(10).to_list(10)
        
        # Recent signups
        recent_signups = await db.users.find(
            {},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "email": 1, "created_at": 1}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        return AdminDashboard(
            user_analytics=user_analytics,
            content_analytics=content_analytics,
            revenue_analytics=revenue_analytics,
            top_posts=top_posts,
            recent_signups=recent_signups
        )
        
    except Exception as e:
        logger.error(f"Error getting admin dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/users")
async def get_user_analytics():
    """Get detailed user analytics."""
    today = get_date_range(1)
    week_ago = get_date_range(7)
    month_ago = get_date_range(30)
    
    # Daily signups for the last 30 days
    daily_signups_pipeline = [
        {"$match": {"created_at": {"$gte": month_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_signups = await db.users.aggregate(daily_signups_pipeline).to_list(30)
    
    return {
        "total_users": await db.users.count_documents({}),
        "new_today": await db.users.count_documents({"created_at": {"$gte": today}}),
        "new_week": await db.users.count_documents({"created_at": {"$gte": week_ago}}),
        "new_month": await db.users.count_documents({"created_at": {"$gte": month_ago}}),
        "premium_users": await db.users.count_documents({"is_premium": True}),
        "daily_signups": daily_signups
    }

@router.get("/admin/content")
async def get_content_analytics():
    """Get detailed content analytics."""
    month_ago = get_date_range(30)
    
    # Daily posts for the last 30 days
    daily_posts_pipeline = [
        {"$match": {"created_at": {"$gte": month_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_posts = await db.posts.aggregate(daily_posts_pipeline).to_list(30)
    
    # Content type breakdown
    type_breakdown = await db.posts.aggregate([
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total_posts": await db.posts.count_documents({}),
        "total_stories": await db.stories.count_documents({}),
        "daily_posts": daily_posts,
        "type_breakdown": type_breakdown
    }

@router.get("/admin/revenue")
async def get_revenue_analytics():
    """Get detailed revenue analytics."""
    month_ago = get_date_range(30)
    
    # Daily revenue for the last 30 days
    daily_revenue_pipeline = [
        {"$match": {"payment_status": "paid", "created_at": {"$gte": month_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_revenue = await db.payment_transactions.aggregate(daily_revenue_pipeline).to_list(30)
    
    # Revenue by package type
    package_revenue = await db.payment_transactions.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {
            "_id": "$package_id",
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]).to_list(20)
    
    return {
        "daily_revenue": daily_revenue,
        "package_breakdown": package_revenue
    }

# User Personal Analytics Endpoints
@router.get("/user/{user_id}/stats", response_model=UserPersonalStats)
async def get_user_personal_stats(user_id: str):
    """Get personal statistics for a specific user."""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count user's posts
        posts_count = await db.posts.count_documents({"user_id": user_id})
        
        # Aggregate likes received on user's posts
        likes_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$likes_count"}}}
        ]
        likes_result = await db.posts.aggregate(likes_pipeline).to_list(1)
        likes_received = likes_result[0]["total"] if likes_result else 0
        
        # Aggregate comments received
        comments_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$comments_count"}}}
        ]
        comments_result = await db.posts.aggregate(comments_pipeline).to_list(1)
        comments_received = comments_result[0]["total"] if comments_result else 0
        
        # Followers/Following counts
        followers_count = len(user.get("followers", []))
        following_count = len(user.get("following", []))
        
        # Profile views (if tracked)
        profile_views = user.get("profile_views", 0)
        
        # Engagement rate
        total_interactions = likes_received + comments_received
        engagement_rate = (total_interactions / posts_count * 100) if posts_count > 0 else 0
        
        return UserPersonalStats(
            posts_count=posts_count,
            likes_received=likes_received,
            comments_received=comments_received,
            followers_count=followers_count,
            following_count=following_count,
            profile_views=profile_views,
            coins_balance=user.get("coins", 0),
            is_premium=user.get("is_premium", False),
            engagement_rate=round(engagement_rate, 2)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/posts-performance")
async def get_user_posts_performance(user_id: str):
    """Get performance metrics for a user's posts."""
    # Get user's top performing posts
    top_posts = await db.posts.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "content": 1, "likes_count": 1, "comments_count": 1, "created_at": 1, "type": 1}
    ).sort("likes_count", -1).limit(10).to_list(10)
    
    # Posts over time
    month_ago = get_date_range(30)
    daily_posts_pipeline = [
        {"$match": {"user_id": user_id, "created_at": {"$gte": month_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "posts": {"$sum": 1},
            "likes": {"$sum": "$likes_count"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_activity = await db.posts.aggregate(daily_posts_pipeline).to_list(30)
    
    return {
        "top_posts": top_posts,
        "daily_activity": daily_activity
    }

@router.get("/user/{user_id}/growth")
async def get_user_growth(user_id: str):
    """Get follower growth and engagement trends for a user."""
    # This would require tracking historical data
    # For now, return current counts
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "followers": len(user.get("followers", [])),
        "following": len(user.get("following", [])),
        "posts": await db.posts.count_documents({"user_id": user_id}),
        "stories": await db.stories.count_documents({"user_id": user_id})
    }
