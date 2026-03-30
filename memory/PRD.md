# FaceConnect - Product Requirements Document

## Original Problem Statement
Build "FaceConnect", an advanced social media and communication desktop (.exe) and mobile (.apk) app that combines:
- WhatsApp-style messaging, voice calls, and video calls
- Complete Facebook ecosystem with all features
- FaceConnect custom branding (purple/cyan colors)
- Multi-language support (Italian, English, Spanish, Russian, Chinese)

## Product Vision
A comprehensive social media platform that combines the best of WhatsApp and Facebook into a single branded experience.

---

## What's Been Implemented

### Core Features (DONE)
- [x] User Authentication (Register/Login)
- [x] Real-time Chat with WebSockets
- [x] Voice Calls with WebRTC
- [x] Video Calls with WebRTC
- [x] Call Ringing Audio (incoming/outgoing)
- [x] Media Permissions handling (Android)
- [x] Local Push Notifications
- [x] Multi-language i18n (5 languages)
- [x] Friend System with requests
- [x] Phone Verification UI (Twilio - needs keys)
- [x] **CSV Contact Import** - Import contacts from CSV files and find friends on FaceConnect
- [x] **Google Contacts Export** - Export imported contacts to Google Contacts

### Facebook Ecosystem (DONE - March 2025)
- [x] **News Feed** - Facebook-style home feed with stories, posts, reactions
- [x] **Marketplace** - Complete marketplace with categories, listings, product cards
- [x] **Dating** - Tinder-style swipeable cards with profiles, matches, interests
- [x] **Groups** - Group discovery, membership, posts, discussions
- [x] **Events** - Event discovery, RSVP, calendar integration
- [x] **Watch** - Video feed with live streams, categories, video player
- [x] **Gaming** - Gaming hub with streams, tournaments, popular games
- [x] **Memories** - "On This Day" feature with past memories
- [x] **Stories** - Stories row with create story feature
- [x] **Side Menu** - Complete navigation with all Facebook shortcuts

### UI Components (DONE)
- [x] Facebook-style header with search, notifications
- [x] Locked bottom TabBar (doesn't scroll)
- [x] Create Post modal with feelings, media
- [x] Reactions popup (like, love, care, haha, wow, sad, angry)
- [x] Comments section with replies
- [x] Share modal
- [x] Profile hover cards
- [x] Loading skeletons
- [x] Custom Android app icons (purple "FC")

### Technical Stack
- **Frontend**: React, Capacitor v5 (Android), Tailwind CSS, Framer Motion
- **Backend**: FastAPI, MongoDB (Motor Asyncio), WebSockets
- **Real-time**: WebRTC for calls, WebSocket for messaging
- **Notifications**: Local Notifications (Capacitor)
- **Auth**: JWT tokens
- **i18n**: Custom i18n service (5 languages)

---

## Blocked Features (Need User Action)

### Twilio SMS Verification
- Status: UI/API complete
- Blocked: Missing `.env` keys
- Required: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`

### Google OAuth
- Status: Backend logic complete
- Blocked: Redirect URI mismatch
- Required: Add callback URL to Google Cloud Console

### Firebase Push Notifications
- Status: Plugin removed (was causing crashes)
- Blocked: Missing `google-services.json`
- Required: Valid Firebase project config

---

## Routes & Pages

| Route | Page | Component | Status |
|-------|------|-----------|--------|
| `/` | Home Feed | Home.jsx + FacebookHomeLayout | DONE |
| `/marketplace` | Marketplace | FacebookMarketplace.jsx | DONE |
| `/dating` | Dating | FacebookDating.jsx | DONE |
| `/groups` | Groups | FacebookGroups.jsx | DONE |
| `/events` | Events | FacebookEvents.jsx | DONE |
| `/watch` | Watch | FacebookWatch.jsx | DONE |
| `/gaming` | Gaming | FacebookGaming.jsx | DONE |
| `/memories` | Memories | FacebookMemories.jsx | DONE |
| `/chat/:id` | Chat | ChatRoom.jsx | DONE |
| `/call/:id` | Voice Call | VoiceCall.jsx | DONE |
| `/video-call/:id` | Video Call | VideoCallEnhanced.jsx | DONE |
| `/profile` | Profile | Profile.jsx | DONE |
| `/settings` | Settings | Settings.jsx | DONE |
| `/friends` | Friends | Friends.jsx | DONE |

---

## File Structure

```
/app/frontend/src/components/facebook/
├── FacebookComplete.jsx      # Core components, reactions, menu
├── FacebookDating.jsx        # Dating with swipe cards
├── FacebookEvents.jsx        # Events with RSVP
├── FacebookGaming.jsx        # Gaming hub
├── FacebookGroups.jsx        # Groups system
├── FacebookHomeLayout.jsx    # Home feed layout
├── FacebookMarketplace.jsx   # Marketplace listings
├── FacebookMemories.jsx      # On This Day
└── FacebookWatch.jsx         # Video feed
```

---

## APK Build Instructions

1. Click **"Save to GitHub"** in the chat input
2. Create a **Release Tag** (e.g., `v5.8.0`)
3. GitHub Actions will automatically build the APK
4. Download from Releases tab

---

## Future Tasks (Backlog)

### P1 - High Priority
- [ ] Refactor `Settings.jsx` (>2000 lines, needs splitting)
- [ ] Apple OAuth integration
- [ ] Fix Twilio SMS when keys provided

### P2 - Medium Priority
- [ ] iOS/Mac App Store builds
- [ ] Facebook Reels (short-form video)
- [ ] Facebook Pages (business pages)
- [ ] Facebook Jobs section
- [ ] Facebook Fundraisers

### P3 - Nice to Have
- [ ] AI-powered content suggestions
- [ ] Creator Studio dashboard
- [ ] Ads Manager
- [ ] Professional Mode

---

## Known Issues
- WebSocket reconnection warnings (cosmetic, not functional issue)
- Some API 422 errors for optional endpoints (handled gracefully)

## Test Credentials
- Email: `facebook@test.com`
- Password: `Facebook123!`

---

*Last Updated: March 2025*
