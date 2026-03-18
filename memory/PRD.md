# FaceConnect PRD

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database.

## Core Architecture
- **Frontend**: React 18 with TailwindCSS, React.lazy code-splitting, Capacitor for PWA
- **Backend**: FastAPI with modular routes in `/backend/routes/`
- **Database**: MongoDB via Motor async driver
- **Integrations**: Stripe, Google Auth, VAPID Push Notifications, AI services

## Key Features

### Video/Voice Calls (NEW - COMPLETE)
- **CallContext** (`/context/CallContext.jsx`): Global state management for calls
- **IncomingCallOverlay** (`/components/IncomingCallOverlay.jsx`): Full-screen incoming call UI
- **VideoCall** (`/components/chat/VideoCall.jsx`): WebRTC-based video/voice calls
- **Backend API** (`/backend/routes/calls.py`): Call initiation, answer, reject, end, signaling
- **Ringtone**: `/sounds/ringtone.wav` for incoming call alerts
- **Mobile Support**: Works on web and via Capacitor on Android/iOS

### Call Features:
- Initiate video or voice calls from chat
- Real-time incoming call notifications via WebSocket
- WebRTC peer-to-peer connections
- Call history tracking
- Screen sharing support
- Picture-in-picture mode
- Call effects (beauty, filters)

## Backend Module Architecture (REFACTORED)

### Route Modules (`/app/backend/routes/`)
| Module | Lines | Description |
|--------|-------|-------------|
| auth.py | 253 | Authentication, OAuth, sessions |
| chat.py | 369 | Conversations, messages |
| posts.py | 408 | Posts, comments, reactions |
| livestream.py | ~400 | Live streaming, WebRTC |
| reels.py | 450 | Short video content |
| stories.py | ~300 | 24h expiring stories |
| groups.py | ~550 | Group management |
| push.py | 150 | Push notifications (VAPID) |
| users.py | 224 | User management |
| friends.py | 250 | Friendships |
| **calls.py** | 231 | Video/voice calls (WebRTC) |
| ai.py | 433 | AI features |
| search.py | 116 | Universal search |
| notifications.py | 380 | Activity notifications |
| saved.py | ~250 | Saved posts/collections |
| explore.py | ~320 | Explore feed |
| analytics.py | ~480 | User analytics |
| payments.py | ~340 | Stripe integration |

### server.py
- Reduced from ~3600 lines to ~2600 lines
- Contains: App setup, ConnectionManager (WebSocket), core models

## Completed This Session
1. ✅ Backend Refactor (P1) - 6 new route modules
2. ✅ Video/Voice Calls - Full implementation for web & mobile

## Pending Tasks

### P0 - User Action Required
- Verify GitHub Actions builds (trigger manually in repo)
- Add keystore secrets to GitHub for signed Android builds

### P2 - Upcoming
- Create backend APIs for mocked pages (Watch, Marketplace, Groups, Events, Memories, Gaming)

### Future/Backlog
- iOS App Store build workflow
- StoryHighlights integration on profile
- Analytics dashboard enhancements
- Loading skeletons for Activity/Settings pages

## Test Reports
- `/app/test_reports/iteration_39.json` - Video call feature (100% pass)
- `/app/test_reports/iteration_38.json` - Backend refactor (100% pass)

## Test Credentials
- Email: testcaller@test.com
- Password: TestPass123!

## Last Updated
March 2025 - Video/voice calls implemented
