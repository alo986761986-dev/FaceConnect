"""
FaceConnect Backend Routes

Modular route organization for better maintainability.
Each module handles a specific feature domain.

Modules:
- auth.py: Authentication, registration, login, OAuth
- chat.py: Conversations, messages, real-time chat
- posts.py: Posts, comments, likes, feed
- livestream.py: Live streaming, stream chat, AI effects
- shared.py: Database connection, utilities, helpers

Usage in server.py:
    from routes.auth import router as auth_router
    from routes.chat import router as chat_router
    from routes.posts import router as posts_router
    from routes.livestream import router as livestream_router
    
    api_router.include_router(auth_router)
    api_router.include_router(chat_router)
    api_router.include_router(posts_router)
    api_router.include_router(livestream_router)

Note: The main server.py still contains most routes for backwards compatibility.
These modules can be gradually integrated to reduce the monolith size.
"""

# Export routers when ready to integrate
# from .auth import router as auth_router
# from .chat import router as chat_router
# from .posts import router as posts_router
# from .livestream import router as livestream_router

__all__ = [
    # 'auth_router',
    # 'chat_router', 
    # 'posts_router',
    # 'livestream_router'
]
