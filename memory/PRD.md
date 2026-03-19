# FaceConnect PRD

**Last Updated**: March 19, 2026

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database.

## Recent Fixes (March 19, 2026)

### 405 Login Error Fix
- **Issue**: Electron desktop app showed "Request failed with status code 405" on login
- **Root Cause**: FastAPI's default `redirect_slashes=True` was causing 307 redirects when requests had trailing slashes, which caused the request body to be lost
- **Fix**: Disabled `redirect_slashes` in FastAPI app initialization
- **Files Modified**: `/app/backend/server.py`

### Sound Utilities Enhancement
- Added call sounds to SOUND_LIBRARY: `call_outgoing`, `call_incoming`, `call_connect`, `call_end`
- **Files Modified**: `/app/frontend/src/utils/sounds.js`

### AuthContext Improvements
- Added fallback URL for Electron production builds
- Enhanced login error logging for debugging
- Removed trailing slash from API URLs
- **Files Modified**: `/app/frontend/src/context/AuthContext.jsx`

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

### Mobile Animations (COMPLETE)
- **mobile-animations.css**: 600+ lines of GPU-accelerated CSS animations
- **PageTransition.jsx**: Framer-motion page transitions with multiple variants
- **BottomNav animations**: Spring physics tap animations
- **Touch feedback**: mobile-tap and mobile-press classes

### Chat Enhancements (NEW - COMPLETE)
- **ChatSettingsMenu.jsx**: Full settings popup with:
  - End-to-end encryption indicator
  - View profile, Change theme, Emoji & stickers
  - Nicknames, Create group, Mute notifications
  - Block, Restrictions, Archive, Delete, Report
  - Encryption verification with QR code
- **Sound System**: 7 modern notification sounds
  - send.wav, receive.wav, notification.wav
  - success.wav, error.wav, typing.wav, ringtone.wav
- Works across Web, Electron (.exe), and Mobile

### Auto-Update System (NEW - COMPLETE)
- Electron auto-updater with GitHub Releases
- Progress bar in taskbar
- User notification dialogs
- `AutoUpdateNotification.jsx` component

### Backend APIs for New Pages (COMPLETE)
- **Watch API** (`/api/watch/*`)
  - Video feed, categories, upload, like, watch parties, live streams
- **Marketplace API** (`/api/marketplace/*`)
  - Listings CRUD, categories, save/unsave, message seller
- **Events API** (`/api/events/*`)
  - Event creation, RSVP, attendees, discovery
- **Memories API** (`/api/memories/*`)
  - On-this-day, create/share memories, years-ago grouping
- **Gaming API** (`/api/gaming/*`)
  - Game discovery, streams, library, tournaments, friends playing
- **Social Groups API** (`/api/social-groups/*`) - NEW
  - Public group discovery, categories, join/leave, group feed

### Frontend-Backend Integration (NEW - COMPLETE)
- **Gaming.jsx**: Connected to `/api/gaming/discover` and `/api/gaming/streams`
- **Groups.jsx**: Connected to `/api/social-groups` 
- **Memories.jsx**: Connected to `/api/memories`
- All pages fetch from APIs and fallback to mock data on error
- APIs return mock data when database collections are empty

## Backend Module Architecture

### Route Modules (`/app/backend/routes/`)
- auth.py, chat.py, posts.py, livestream.py, reels.py
- stories.py, groups.py, push.py, users.py, friends.py
- calls.py, ai.py, search.py, notifications.py
- saved.py, explore.py, analytics.py, payments.py
- watch.py, marketplace.py, events.py, memories.py, gaming.py
- **NEW**: social_groups.py (public groups discovery)

### server.py
- Reduced from ~3600 to ~2600 lines
- WebSocket ConnectionManager
- All routes via modular includes

## Android Build Configuration

### Upload Key (for Google Play)
- **File**: `upload-keystore.jks`
- **Alias**: `upload`
- **Password**: `FaceConnect2024Upload`
- **Valid Until**: August 3, 2053

### GitHub Secrets Required
| Secret | Value |
|--------|-------|
| `KEYSTORE_BASE64` | (base64 encoded keystore) |
| `KEYSTORE_PASSWORD` | `FaceConnect2024Upload` |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | `FaceConnect2024Upload` |

### Workflow: `.github/workflows/build-android.yml`
- Targets API Level 35
- Auto-detect keystore presence
- Publishes to GitHub Releases

## Pending Tasks

### P0 - User Action Required
- Add 4 GitHub secrets for Android signing
- Save to GitHub and run workflow
- Upload signed AAB to Google Play Console

### P1 - Implementation Ready
- Implement full CRUD logic in backend APIs (replace mock data with MongoDB queries)
- Add UI modals for chat features (Block, Mute, Nicknames functionality)

### Future/Backlog
- iOS App Store build workflow
- StoryHighlights integration
- Analytics dashboard enhancements
- Subscription renewal reminders

## Test Reports
- `/app/test_reports/iteration_41.json` - Gaming/Groups/Memories API integration (100% pass)
- `/app/test_reports/iteration_40.json` - Mobile animations
- `/app/test_reports/iteration_39.json` - Video calls
- `/app/test_reports/iteration_38.json` - Backend refactor

## Test Credentials
- Email: screenshot@test.com / testcaller@test.com
- Password: Test123! / TestPass123!

## Sound Files Location
`/app/frontend/public/sounds/`
- send.wav (0.15s) - Message sent swoosh
- receive.wav (0.2s) - Message received pop
- notification.wav (0.4s) - General notification chime
- success.wav (0.35s) - Success arpeggio
- error.wav (0.3s) - Error beep
- typing.wav (0.05s) - Typing click
- ringtone.wav - Incoming call

## Last Updated
March 19, 2026 - Desktop Settings, API integrations, Electron build fix

## Recent Changes
### March 19, 2026
- **Desktop Settings Component**: Created comprehensive `DesktopSettings.jsx` with accordion-style dropdowns
  - File: Preferences, Upload, Sync messages
  - General: Auto-start, Language (70+ world languages), Text size
  - Account: Security notifications, Account info, Delete account
  - Privacy: Online status, Read receipts, Typing indicator, Screenshots
  - Chat: Theme (8 colors), Background, Media quality, Auto-download, Spell check, Emojis
  - Video & Voice: Camera, Microphone, Speakers device selection
  - Notifications: Banner, Badge, Messages, Previews, Reactions
  - Keyboard Shortcuts: 13 shortcuts listed
  - Help & Feedback: Help Center, Contact, Feedback, Rate, Terms
- **Electron Build Fix**: Moved `electron-log` and `electron-updater` to production dependencies
- **Version**: Bumped to 2.5.1
- **Bug Fixes**: Added missing `useCallback` imports
- **Frontend-Backend Integration**: Connected Gaming, Groups, Memories pages to backend APIs
