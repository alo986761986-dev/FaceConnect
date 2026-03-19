# FaceConnect PRD

**Last Updated**: March 19, 2026

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database. Desktop version uses WhatsApp-style UI with Electron.

## Recent Updates (March 19, 2026)

### Chat Features Implementation (NEW - COMPLETE)

### Desktop App Features
- Password recovery flow (complete)
- **Backend API** (`/app/backend/routes/chat_features.py`):
  - `/api/chat/block` - Block/unblock users
  - `/api/chat/mute` - Mute conversations (8h, 1w, forever)
  - `/api/chat/archive` - Archive/unarchive conversations
  - `/api/chat/star` - Star/unstar messages
  - `/api/chat/nickname` - Set nicknames for users in conversations
  - All endpoints include proper authentication, validation, and error handling

### Desktop UI Panels (ENHANCED)
- **Account Panel**: Enhanced with profile editing, status display, organized settings sections
- **New Group Panel**: Complete functionality with member selection, group creation API integration
- **Archived Panel**: Connected to `/api/chat/archived` endpoint, unarchive support
- **Starred Messages Panel**: Connected to `/api/chat/starred` endpoint, unstar support
- All panels have proper back buttons and data-testid attributes for testing

### API Bug Fixes (CRITICAL - COMPLETE)
- **watch.py**: Fixed missing async/await on all MongoDB operations
- **marketplace.py**: Fixed missing async/await on all MongoDB operations
- Both files were causing 500 errors due to synchronous calls in async functions

## Core Architecture
- **Frontend**: React 18 with TailwindCSS, React.lazy code-splitting, Capacitor for PWA
- **Backend**: FastAPI with modular routes in `/backend/routes/`
- **Database**: MongoDB via Motor async driver
- **Desktop**: Electron with WhatsApp-style UI
- **Integrations**: Stripe, Google Auth, VAPID Push Notifications, AI services

## Key Features

### Video/Voice Calls (COMPLETE)
- CallManager.jsx with full WebRTC implementation
- TURN server support for NAT traversal
- Connection quality monitoring
- Backend signaling API (`/api/calls/*`)

### Chat Features (NEW - COMPLETE)
- Block/Unblock users
- Mute notifications (timed or permanent)
- Archive conversations
- Star important messages
- Set nicknames for contacts

### Mobile Animations (COMPLETE)
- mobile-animations.css with GPU-accelerated animations
- PageTransition.jsx with Framer Motion
- Touch feedback classes

### Content APIs (COMPLETE)
- **Gaming API** (`/api/gaming/*`): Game discovery, streams, library, tournaments
- **Marketplace API** (`/api/marketplace/*`): Listings CRUD, categories, save/message
- **Watch API** (`/api/watch/*`): Video feed, upload, like, watch parties
- **Events API** (`/api/events/*`): Event creation, RSVP, discovery
- **Memories API** (`/api/memories/*`): On-this-day memories, sharing
- **Social Groups API** (`/api/social-groups/*`): Public group discovery

### Social Authentication (COMPLETE)
- **Google OAuth**: Ready via Emergent Auth (no configuration needed)
- **Facebook OAuth**: Backend implemented, requires FB App credentials
- **Apple Sign In**: Backend implemented, requires Apple Developer credentials
- See `/app/SOCIAL_AUTH_SETUP.md` for configuration guide
- Settings persistence (localStorage)
- Social auth redirect flow (Google)
- Direct update link for manual updates

## Backend Module Architecture

### Route Modules (`/app/backend/routes/`)
- auth.py - Authentication & password reset
- chat.py - Chat core (disabled, using server.py)
- chat_features.py - Block, Mute, Archive, Star, Nickname (NEW)
- calls.py - WebRTC signaling
- gaming.py - Game discovery & activity (FIXED)
- marketplace.py - Listings & transactions (FIXED)
- watch.py - Video content (FIXED)
- posts.py, stories.py, reels.py - Content creation
- friends.py - Friend management
- users.py - User profiles
- push.py - Push notifications

### server.py
- WebSocket ConnectionManager
- All routes via modular includes
- Disabled redirect_slashes for Electron compatibility

## Pending Tasks

### P0 - User Action Required
- **Render Deployment**: User needs to "Save to GitHub" and trigger deploy
- **Windows Build**: User needs to create new tag (e.g., v2.5.7)
- **Android Build**: User needs to add GitHub secrets

### P1 - Ready to Implement
- ~~Apple/Facebook social auth backend (currently UI-only)~~ **COMPLETED**
- Connect remaining placeholder UI features

### Future/Backlog
- iOS App Store build workflow
- Analytics dashboard enhancements
- Subscription renewal reminders

## Test Reports
- `/app/test_reports/iteration_42.json` - Chat features API + API bug fixes (39/39 passed)

## Test Credentials
- Email: chattest@test.com / Password: Test123!
- Email: screenshot@test.com / Password: Test123!

## Sound Files
`/app/frontend/public/sounds/`
- send.wav, receive.wav, notification.wav
- success.wav, error.wav, typing.wav, ringtone.wav

## Android Build Configuration
### Upload Key
- File: `upload-keystore.jks`
- Alias: `upload`
- Password: `FaceConnect2024Upload`

### GitHub Secrets Required
| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | (base64 encoded keystore) |
| `KEYSTORE_PASSWORD` | `FaceConnect2024Upload` |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | `FaceConnect2024Upload` |
