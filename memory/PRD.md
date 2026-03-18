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
- Facebook-style sidebars (LeftSidebar, RightSidebar)
- CreatePostWidget ("What's on your mind")
- Three-column desktop layout

### NEW: Social Media Pages (Dec 2024)
- **Watch** (`/watch`) - Video browsing with categories
- **Marketplace** (`/marketplace`) - Buy/sell listings
- **Groups** (`/groups`) - Community groups
- **Events** (`/events`) - Event calendar with RSVP
- **Memories** (`/memories`) - "On This Day" feature
- **Gaming** (`/gaming`) - Gaming hub with instant games

### Build Configuration (Complete)
- Android build workflow (fixed Gradle, fixed YAML)
- Windows build workflow
- Domain: `www.faceconnect.com`
- 3D app icons
- Android signing keystore

### Premium Gating (Complete)
- PremiumContext and PremiumGate components
- Carousel image limits for free users
- Advanced filters restricted to premium

## Pending/Backlog

### P0 - Critical
- [USER ACTION] Re-trigger GitHub Actions builds (YAML fixed)

### P1 - High Priority
- Backend `server.py` refactor (tech debt, 4+ times postponed)
- Create backend APIs for new social pages (optional)

### P2 - Medium Priority
- iOS build workflow
- Enhanced analytics dashboard

### P3 - Low Priority/Future
- Subscription renewal reminders
- Security audit logging

## Known Technical Debt
1. **server.py monolith**: Legacy routes duplicate modular logic
2. **New pages use MOCKED data**: Watch, Marketplace, Groups, Events, Memories, Gaming - all use client-side mock data, no backend APIs

## Architecture
```
/app
├── .github/workflows/     # Build configs
├── backend/
│   ├── routes/           # Modular routes
│   └── server.py         # Legacy monolith
└── frontend/
    ├── public/           # PWA assets, icons
    ├── src/
    │   ├── pages/
    │   │   ├── Watch.jsx       # NEW
    │   │   ├── Marketplace.jsx # NEW
    │   │   ├── Groups.jsx      # NEW
    │   │   ├── Events.jsx      # NEW
    │   │   ├── Memories.jsx    # NEW
    │   │   ├── Gaming.jsx      # NEW
    │   │   └── ... (other pages)
    │   ├── components/
    │   │   ├── facebook/
    │   │   └── instagram/
    │   └── App.js
    └── android/
```

## Test Reports
- iteration_34.json: Instagram features - 100%
- iteration_35.json: Facebook features - 95%
- iteration_36.json: Facebook sidebars - 95%
- iteration_37.json: Social media pages - 92%

## Last Updated
December 2024 - Added 6 social media pages (Watch, Marketplace, Groups, Events, Memories, Gaming)
