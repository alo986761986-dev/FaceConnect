# FaceConnect PRD

## Original Problem Statement
Build "FaceConnect," a facial recognition PWA that evolved into a full-featured Instagram/Facebook-style social media application with AI-powered face scanning, social profile discovery, reels, live streaming, and real-time chat.

## User Personas
- Social media users seeking unique face-based networking
- Premium users wanting advanced features (filters, unlimited carousels)
- Mobile users (Android/Windows) wanting native-like experience

## Core Requirements
1. AI facial recognition for profile discovery
2. Social features: posts, stories, reels, live streaming
3. Real-time chat with voice messages and reactions
4. Premium subscription system (Stripe)
5. Cross-platform: PWA + Android + Windows builds
6. Modern Instagram/Facebook-style UI/UX

## Tech Stack
- **Frontend**: React, Framer Motion, Capacitor, Craco
- **Backend**: FastAPI, MongoDB
- **Builds**: GitHub Actions (Android/Windows)
- **Payments**: Stripe via emergentintegrations

## What's Been Implemented

### Core Features (Complete)
- User authentication (email/social)
- Face recognition scanning
- Posts with carousel images
- Stories and reels
- Real-time chat with WebSockets
- Push notifications
- Premium subscription system

### Instagram Features (Complete)
- Voice messages in chat
- Message reactions
- Carousel posts
- Image filters (premium-gated)
- Story highlights

### Facebook Features (Complete - Dec 2024)
- Facebook-style reactions (like, love, haha, etc.)
- Loading skeletons
- Profile hover cards
- Floating chat widget
- Smooth animations and transitions
- **NEW**: Facebook-style sidebars (LeftSidebar, RightSidebar)
- **NEW**: CreatePostWidget ("What's on your mind")
- **NEW**: Three-column desktop layout

### Build Configuration (Complete - Dec 2024)
- Android build workflow (fixed Gradle issue)
- Windows build workflow
- Domain changed to `www.faceconnect.com`
- 3D app icons generated and placed
- Emergent watermark removed
- **NEW**: Android signing keystore generated and configured

### Premium Gating (Complete)
- PremiumContext and PremiumGate components
- Carousel image limits for free users
- Advanced filters restricted to premium

## Pending/Backlog

### P0 - Critical
- [USER ACTION] Trigger GitHub Actions for Android/Windows builds
- [USER ACTION] Configure DNS for www.faceconnect.com

### P1 - High Priority
- Backend `server.py` refactor (significant tech debt, 4+ times postponed)

### P2 - Medium Priority
- Complete Capacitor Android signing
- Verify Windows .exe build
- iOS build workflow

### P3 - Low Priority/Future
- Enhanced analytics dashboard
- Subscription renewal reminders
- Security audit logging

## Known Technical Debt
1. **server.py monolith**: Contains legacy routes that duplicate modular route logic. Refactoring has been consciously postponed due to complexity. The backend works but carries risk of conflicting logic.

## Architecture Notes
```
/app
├── .github/workflows/     # Build configs for Android/Windows
├── backend/
│   ├── routes/           # Modular route files (partial)
│   └── server.py         # Legacy monolith (needs refactor)
└── frontend/
    ├── public/           # PWA assets, 3D icons
    ├── src/components/
    │   ├── facebook/     # Facebook-style components
    │   │   ├── FacebookSidebar.jsx    # LeftSidebar & RightSidebar
    │   │   ├── CreatePostWidget.jsx   # "What's on your mind"
    │   │   ├── FacebookReactions.jsx
    │   │   ├── ProfileHoverCard.jsx
    │   │   ├── FloatingChat.jsx
    │   │   └── ...
    │   ├── instagram/    # Instagram-style components
    │   └── ui/           # Shadcn UI components
    └── android/          # Capacitor Android project
        └── app/
            └── faceconnect-release.keystore  # Signing key
```

## Test Reports
- iteration_34.json: Instagram features - 100% pass
- iteration_35.json: Facebook features - 95% pass
- iteration_36.json: Facebook sidebars & layout - 95% pass

## Last Updated
December 2024 - Added Facebook sidebars, CreatePostWidget, three-column layout, Android signing keystore
