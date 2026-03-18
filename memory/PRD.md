# FaceConnect PRD

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database.

## Core Architecture
- **Frontend**: React 18 with TailwindCSS, React.lazy code-splitting, Capacitor for PWA
- **Backend**: FastAPI with modular routes in `/backend/routes/`
- **Database**: MongoDB via Motor async driver
- **Integrations**: Stripe, Google Auth, VAPID Push Notifications, AI services

## Performance Optimizations
- React.lazy() code splitting (18+ pages)
- Suspense with spinner fallback
- GPU-accelerated animations
- 0.25s page transitions
- Page-specific loading skeletons

## Loading Skeletons (Complete - 11 Pages)
Core pages:
- HomeFeedSkeleton, ExploreSkeleton, ReelsSkeleton
- ProfileSkeleton, ChatSkeleton

Social pages:
- GamingSkeleton, WatchSkeleton, MarketplaceSkeleton
- GroupsSkeleton, EventsSkeleton, MemoriesSkeleton

Primitives:
- SkeletonBox, SkeletonCircle, SkeletonText

## Responsive Design
- Desktop: Three-column Facebook-style layout
- Ultra-wide: 1920px, 2560px+ support
- Tablet/Mobile: Adaptive breakpoints
- Touch: 48px minimum targets

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
| **push.py** | 150 | Push notifications (NEW) |
| **users.py** | 224 | User management (NEW) |
| **friends.py** | 250 | Friendships (NEW) |
| **calls.py** | 231 | Video/voice calls (NEW) |
| **ai.py** | 433 | AI features (NEW) |
| **search.py** | 116 | Universal search (NEW) |
| notifications.py | 380 | Activity notifications |
| saved.py | ~250 | Saved posts/collections |
| explore.py | ~320 | Explore feed |
| analytics.py | ~480 | User analytics |
| payments.py | ~340 | Stripe integration |
| backup.py | ~600 | Data backup/export |
| close_friends.py | ~250 | Close friends lists |
| instagram_features.py | ~600 | Instagram features |
| reels_enhanced.py | ~350 | Enhanced reels |
| face_compare.py | ~300 | Face recognition |
| shared.py | 87 | DB, utilities |

### server.py
- Reduced from ~3600 lines to ~2600 lines
- Contains: App setup, ConnectionManager (WebSocket), core models, conversation/message routes, persons routes, streaming routes
- All route modules properly included via `api_router.include_router()`

## Social Pages (MOCKED - Need Backend APIs)
- Watch, Marketplace, Groups, Events, Memories, Gaming
- All use client-side mock data
- P2 priority for backend implementation

## Completed This Session
1. Backend Refactor (P1) - COMPLETE
   - Extracted 6 route modules from server.py
   - Created push.py, users.py, friends.py, calls.py, ai.py, search.py
   - Reduced server.py from 3600+ to 2599 lines
   - 100% test pass rate verified

## Pending Tasks
### P0 - User Action Required
- Verify GitHub Actions builds (user must trigger manually)
- Add keystore secrets to GitHub for signed Android builds

### P2 - Upcoming
- Create backend APIs for mocked pages (Watch, Marketplace, Groups, Events, Memories, Gaming)

### Future/Backlog
- iOS App Store build workflow
- StoryHighlights integration on profile
- Analytics dashboard enhancements
- Subscription renewal reminders
- Loading skeletons for Activity/Settings pages
- News Feed algorithm refinement

## Test Reports
- `/app/test_reports/iteration_38.json` - Backend refactor verification (100% pass)
- `/app/test_reports/iteration_37.json` - Previous tests

## Last Updated
March 2025 - Backend refactor complete, 6 new route modules
