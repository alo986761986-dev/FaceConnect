# FaceConnect - Facial Recognition Social Tracker

## Original Problem Statement
Create a facial recognition app that includes for each person how many social networks they have.

## User Choices
- **Social Networks**: Facebook, Instagram, TikTok, Snapchat, X, LinkedIn, Discord, Reddit, Pinterest, YouTube, WhatsApp, Telegram (12 total)
- **Face Detection**: Client-side with face-api.js
- **Social Entry**: Manual input with toggle switches
- **Theme**: Dark modern with neon accents
- **Chat Type**: Real-time interactive chat with file sharing (photos, videos, audio, documents)
- **Notifications**: In-app notifications with push notifications when screen is off

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB driver) + WebSockets
- **Database**: MongoDB
- **Auth**: Token-based session authentication

## Core Requirements
1. Upload photos per person
2. Track social network presence (12 platforms)
3. Display social network count per person
4. Search and filter persons
5. CRUD operations for persons
6. User authentication (registration/login)
7. Real-time chat with file sharing
8. Unified social homepage with Stories, Reels, Highlighted Posts, and real-time sharing

## What's Been Implemented (March 2026)

### Backend (server.py)
- **Auth Endpoints**: 
  - POST /api/auth/register - User registration
  - POST /api/auth/login - User login
  - POST /api/auth/logout - User logout
  - GET /api/auth/me - Get current user
  - PUT /api/auth/profile - Update profile
- **User Endpoints**:
  - GET /api/users - Get users list (with search)
  - GET /api/users/search - Search users for friend requests
  - GET /api/users/{id} - Get user by ID
- **Chat Endpoints**:
  - POST /api/conversations - Create conversation
  - GET /api/conversations - Get user conversations
  - GET /api/conversations/{id} - Get conversation by ID
  - POST /api/conversations/{id}/messages - Send message
  - GET /api/conversations/{id}/messages - Get messages
  - POST /api/conversations/{id}/read - Mark messages as read
- **File Upload**:
  - POST /api/upload - Upload file (photos, videos, audio, documents)
  - GET /api/files/{filename} - Serve uploaded files
- **Push Notifications**:
  - GET /api/push/vapid-public-key - Get VAPID public key for subscription
  - POST /api/push/subscribe - Subscribe device to push notifications
  - DELETE /api/push/unsubscribe - Unsubscribe from push notifications
- **Reels Endpoints**:
  - POST /api/reels - Create reel
  - GET /api/reels - Get reels feed
  - POST /api/reels/{id}/like - Like/unlike reel
  - POST /api/reels/{id}/comments - Add comment
  - GET /api/reels/{id}/comments - Get comments
  - POST /api/reels/{id}/share - Share reel
- **Posts/Stories Endpoints**:
  - POST /api/posts - Create post or story
  - GET /api/posts - Get posts feed (with type filter)
- **Friends Endpoints**:
  - GET /api/friends - Get friends list
  - GET /api/friends/requests - Get pending friend requests
  - GET /api/friends/sent - Get sent friend requests
  - POST /api/friends/request - Send friend request
  - POST /api/friends/accept - Accept friend request
  - POST /api/friends/decline - Decline friend request
  - DELETE /api/friends/request/{id} - Cancel sent request
  - DELETE /api/friends/{id} - Remove friend
- **WebSocket**:
  - WS /ws/{token} - Real-time messaging, typing indicators, read receipts, online status
- **Person Endpoints**: GET/POST/PUT/DELETE /api/persons
- **Face Matching**: POST /api/face-match
- **Stats**: GET /api/stats

### Frontend

#### Auth System
- `/app/frontend/src/pages/Auth.jsx` - Login/Registration page
- `/app/frontend/src/context/AuthContext.jsx` - Auth state, WebSocket connection, notifications
- Protected routes - Redirect to /auth if not logged in

#### Chat System
- `/app/frontend/src/pages/Chat.jsx` - Main chat page
- `/app/frontend/src/components/chat/ConversationList.jsx` - Conversations list with search
- `/app/frontend/src/components/chat/ChatView.jsx` - Chat view with messages, file attachments

#### Core Features
- Dashboard with stats cards (Total Persons, Social Connections, Active Platforms)
- Person cards in bento grid layout
- Person detail page with social networks and notes
- Face Scanner with live camera and bulk gallery scanning
- Add Person modal with photo upload and face detection

#### Mobile/PWA Features
- Progressive Web App (installable)
- Service worker with offline caching
- Mobile-responsive UI
- Bottom navigation with FAB (Home, Chat, Scan, Security)
- Pull-to-refresh gesture
- Haptic feedback
- Share API integration
- Network status indicator
- Biometric authentication (WebAuthn)
- Encrypted local storage (AES-GCM)

## Test Coverage
- Backend tests: `/app/backend/tests/test_auth_chat.py` (19 tests)
- Test reports: `/app/test_reports/iteration_8.json`
- Test credentials: test1916@example.com / password123

## Prioritized Backlog

### P0 (Complete)
- [x] Person CRUD operations
- [x] Social network tracking
- [x] Dashboard with stats
- [x] Photo upload with face detection
- [x] User authentication (registration/login)
- [x] Real-time chat with WebSockets
- [x] File sharing in chat (photos, videos, audio, documents)
- [x] PWA with offline support
- [x] Mobile responsive UI
- [x] Biometric authentication
- [x] Encrypted local storage
- [x] Push notifications for chat messages (when screen is off)
- [x] Real-time online/offline status updates with last seen
- [x] Voice message recording and sending
- [x] Location sharing in chat
- [x] Reels feature with upload, like, comment, and share
- [x] Custom FaceConnect logo
- [x] Comprehensive Settings page with language, theme, notifications, sounds, and updates
- [x] Create menu with Post, Story, Reel, Live, AI options
- [x] Friends system with requests, search, and online status
- [x] Posts and Stories creation
- [x] User search endpoint (route conflict fixed)
- [x] Allow All Notifications feature with browser permission request
- [x] Comprehensive Permissions Manager for mobile app permissions (photos/videos, notifications, location, calendar, contacts, nearby devices, camera, microphone, call log, phone)
- [x] Full i18n internationalization system with 115+ world languages and translations
- [x] Light/Dark theme system with CSS variables and smooth transitions
- [x] Language search functionality in Settings
- [x] Full-featured Live Streaming with reactions, gifts, chat, and screen sharing
- [x] AI Content Generation (text captions, story ideas, bios, hashtags, image generation)
- [x] AI Content Enhancement (improve, shorten, expand, tone adjustments)
- [x] In-chat Camera for real-time photo/video capture with social sharing
- [x] Full Post/Story creation with media upload, likes, comments
- [x] Feed page with posts and stories (Instagram-style)
- [x] Story viewer with auto-progress and navigation
- [x] Real-time WebRTC video streaming for Live feature
- [x] WebRTC signaling for peer-to-peer video connections
- [x] Camera switching (front/back) during live streams
- [x] **Unified Social Homepage** with Stories row, Reels preview, Highlighted/Featured posts, and Regular posts feed
- [x] **Real-time feed updates** via WebSocket for new posts, stories, and like counts
- [x] **/api/feed/home** endpoint for unified feed data
- [x] **Updated navigation** with Home (social feed) and Profiles (face recognition) tabs
- [x] **Social Login** - Google Sign-In with Emergent-managed OAuth (pre-configured)
- [x] **Social Login UI** - Apple and Facebook buttons (credentials required, shows coming soon)
- [x] **/api/auth/google** endpoint for Google OAuth session exchange
- [x] **/auth/callback** route for OAuth redirect handling

### P1 (Next)
- [ ] Apple Sign-In (requires Apple Developer credentials)
- [ ] Facebook Login (requires Facebook Developer credentials)
- [ ] Search and filtering for Private Notes
- [ ] Improve conversation sidebar real-time updates

### P2 (Future)
- [ ] Face comparison between two specific photos
- [ ] Security audit logging
- [ ] Encrypted cloud backup
- [ ] Export data to CSV/PDF
- [ ] Person groups/categories
- [ ] Group chat support

## Database Collections
- `users` - User accounts with hashed passwords
- `sessions` - Auth tokens
- `persons` - Tracked individuals with face descriptors
- `person_notes` - Private notes for persons
- `conversations` - Chat conversations
- `messages` - Chat messages

## UI/UX
- Dark theme with neon cyan (#00F0FF) and purple (#7000FF) accents
- Glass morphism effects
- Framer Motion animations
- Font: Outfit for headings
