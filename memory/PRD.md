# FaceConnect PRD

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database.

## Core Architecture
- **Frontend**: React 18 with TailwindCSS, React.lazy code-splitting, Capacitor for PWA
- **Backend**: FastAPI with modular routes in `/backend/routes/`
- **Database**: MongoDB via Motor async driver
- **Integrations**: Stripe, Google Auth, VAPID Push Notifications, AI services

## Key Features

### Video/Voice Calls (COMPLETE)
- CallContext for global call state management
- IncomingCallOverlay for full-screen incoming call UI
- WebRTC-based video/voice calls
- Ringtone at `/sounds/ringtone.wav`
- Mobile support via Capacitor

### Mobile Animations (NEW - COMPLETE)
- **mobile-animations.css**: 600+ lines of GPU-accelerated CSS animations
- **PageTransition.jsx**: Framer-motion page transitions with multiple variants
- **BottomNav animations**: Spring physics tap animations (stiffness: 400, damping: 25)
- **Touch feedback**: mobile-tap and mobile-press classes for haptic-like feedback
- **Safe area support**: Notched device compatibility

#### Animation System:
| Animation Type | Duration | Easing |
|---------------|----------|--------|
| Fast | 150ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Normal | 250ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Slow | 350ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Spring | 250ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Bounce | 250ms | cubic-bezier(0.68, -0.55, 0.265, 1.55) |

#### Key Animation Classes:
- `.mobile-animate-fade-in-up` - Page entry
- `.mobile-animate-slide-in-right` - Forward navigation
- `.mobile-animate-slide-in-left` - Back navigation
- `.mobile-animate-slide-up` - Bottom sheets
- `.mobile-animate-pop-in` - Notifications/badges
- `.mobile-stagger-children` - List item stagger
- `.mobile-tap` / `.mobile-press` - Touch feedback

## Backend Module Architecture

### Route Modules (`/app/backend/routes/`)
- auth.py, chat.py, posts.py, livestream.py, reels.py
- stories.py, groups.py, push.py, users.py, friends.py
- calls.py, ai.py, search.py, notifications.py
- saved.py, explore.py, analytics.py, payments.py, etc.

### server.py
- Reduced from ~3600 to ~2600 lines
- WebSocket ConnectionManager
- All routes via modular includes

## Completed This Session
1. ✅ Backend Refactor - 6 new route modules
2. ✅ Video/Voice Calls - Full WebRTC implementation
3. ✅ Mobile Animations - Comprehensive animation system

## Pending Tasks

### P0 - User Action Required
- Verify GitHub Actions builds (trigger manually)
- Add keystore secrets to GitHub for signed Android builds

### P2 - Upcoming
- Create backend APIs for mocked pages (Watch, Marketplace, Groups, Events, Memories, Gaming)

### Future/Backlog
- iOS App Store build workflow
- StoryHighlights integration
- Analytics dashboard enhancements

## Test Reports
- `/app/test_reports/iteration_40.json` - Mobile animations (100% pass)
- `/app/test_reports/iteration_39.json` - Video calls (100% pass)
- `/app/test_reports/iteration_38.json` - Backend refactor (100% pass)

## Test Credentials
- Email: testcaller@test.com
- Password: TestPass123!

## Last Updated
March 2025 - Mobile animations implemented
