"""
FaceConnect Backend Routes

Modular route organization for better maintainability.
Each module handles a specific feature domain.

Modules:
- auth.py: Authentication, registration, login, OAuth
- chat.py: Conversations, messages, real-time chat
- posts.py: Posts, comments, likes, feed
- livestream.py: Live streaming, stream chat, AI effects
- push.py: Push notifications (VAPID)
- users.py: User management, search, profile
- friends.py: Friend requests, friendships
- calls.py: Video/voice calls, WebRTC signaling
- ai.py: AI content generation, chat, image gen
- search.py: Universal search
- reels.py: Reels/short videos
- stories.py: Stories with 24h expiry
- groups.py: Group management
- notifications.py: Activity notifications
- saved.py: Saved posts/collections
- explore.py: Explore feed
- backup.py: Data export/backup
- analytics.py: User analytics
- payments.py: Stripe payments
- close_friends.py: Close friends lists
- instagram_features.py: Instagram-style features
- reels_enhanced.py: Enhanced reels with effects
- face_compare.py: Face recognition
- export.py: Data export
- shared.py: Database connection, utilities, helpers

Usage in server.py:
    from routes.auth import router as auth_router
    from routes.push import router as push_router
    from routes.users import router as users_router
    
    api_router.include_router(auth_router)
    api_router.include_router(push_router)
    api_router.include_router(users_router)
"""

__all__ = [
    'auth',
    'chat',
    'posts',
    'livestream',
    'push',
    'users',
    'friends',
    'calls',
    'ai',
    'search',
    'reels',
    'stories',
    'groups',
    'notifications',
    'saved',
    'explore',
    'backup',
    'analytics',
    'payments',
    'close_friends',
    'instagram_features',
    'reels_enhanced',
    'face_compare',
    'export',
    'shared'
]
