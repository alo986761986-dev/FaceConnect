# FaceConnect PRD

**Last Updated**: March 20, 2026

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database. Desktop version uses WhatsApp-style UI with Electron.

## Recent Updates (March 20, 2026)

### Smooth Rounded Corners & Language Menu (v4.31.0) - NEW
**Smooth Rounded Corners Throughout App:**
- Updated `index.css` with global smooth radius variables
- Updated `tailwind.config.js` border-radius defaults
- Cards, panels: 1.25rem (xl)
- Buttons, inputs: 1rem (lg)
- Message bubbles: 1.5rem (2xl)
- Avatars: fully rounded

**Electron Language Menu:**
- Added "Language" menu in toolbar (File, Edit, View, **Language**, Window, Help)
- 60+ languages with native names
- One-click language change throughout entire app
- Updated `electron/main.js` with Menu API
- Updated `electron/preload.js` with IPC handlers
- Updated `LanguageContext.jsx` to listen for Electron menu events

### Translation & Dictionary Features (v4.30.0)
Added language, dictionary, and instant translation capabilities:

**Translation Panel (New Sidebar Tab)**:
- 30+ languages with flag icons
- Auto-detect source language option
- Swap languages button
- Text-to-speech for source & translated text
- Copy translation to clipboard
- Translation history (last 10)
- Powered by Gemini AI

**Dictionary Lookup**:
- In Copilot panel via "Open Dictionary" button
- Right-click context menu on any selected word
- Provides: Part of speech, Definitions, Examples, Synonyms, Etymology
- Text-to-speech pronunciation
- Powered by Gemini AI

**New Components**:
- `TranslationPanel.jsx` (265 lines)
- `DictionaryLookup.jsx` (180 lines) - includes popup component
- Updated `DesktopSidebar.jsx` with Languages icon

### Voice Input for Copilot Chat (v4.29.0)
Added OpenAI Whisper voice transcription to Copilot panel:
- **New Backend Endpoint**: `POST /api/speech/transcribe`
  - Uses OpenAI Whisper (whisper-1) via Emergent LLM Key
  - Supports: mp3, mp4, mpeg, m4a, wav, webm
  - Max 25MB file size
- **Frontend Voice UI**:
  - Mic button in Copilot chat input
  - Red pulsing animation while recording
  - "Transcribing..." loading state
  - Auto-sends transcribed text to Copilot
- File: `/app/backend/routes/speech.py`

### In-App Copilot Chat with GPT-4o (v4.29.0)
Enhanced the Microsoft Copilot panel with real-time in-app chat:
- **"Start Chat with Copilot" Button**: Opens in-app chat interface
- **Real-time Chat**: Uses GPT-4o via Emergent LLM Key
- **Chat UI**: Blue gradient bubbles for user, gray for AI responses
- **Loading State**: Shows "Thinking..." animation during response
- **Back Navigation**: Return to main Copilot panel

### Chat Context Menu Backend Logic (v4.29.0) - NEW
Implemented full CRUD operations for chat actions:
- **DELETE /api/conversations/{id}** - Soft delete conversation (hidden from user)
- **DELETE /api/conversations/{id}/messages** - Empty chat (clears messages for user)
- **POST /api/chat/pin** - Pin conversation (max 3)
- **POST /api/chat/unpin** - Unpin conversation
- **GET /api/chat/pinned** - Get pinned conversation IDs
- Updated get_conversations to filter deleted/archived
- Updated get_messages to filter cleared chats

### Component Refactoring (v4.29.0) - NEW
Refactored WhatsAppDesktopLayout.jsx from 3317 → 2863 lines:
- **New directory**: `/app/frontend/src/components/desktop/`
- **ChatListItem.jsx** (72 lines) - Chat list item component
- **CopilotPanel.jsx** (386 lines) - Microsoft Copilot panel with in-app chat & voice
- **AIPanel.jsx** (123 lines) - AI assistant panel
- **DesktopSidebar.jsx** (217 lines) - Left sidebar navigation
- **GamesPanel.jsx** (123 lines) - Gaming platforms panel
- **MediaPanel.jsx** (113 lines) - Media files upload panel
- **index.js** (36 lines) - Component exports and animation variants
- Total: 1070 lines extracted into reusable components

### Microsoft Copilot Sidebar Panel (v4.29.0)
Added dedicated Microsoft Copilot panel to the desktop app sidebar:
- **New Sidebar Tab**: Copilot icon (Sparkles) with "Microsoft Copilot AI Assistant" tooltip
- **Welcome Section**: Blue gradient branding with Copilot description
- **Quick Actions Grid**:
  - ✍️ Write - Draft emails, essays & more
  - 🎨 Design - Create images & art
  - 💻 Code - Get coding help
  - 📊 Analyze - Data insights & summaries
- **Features List**: Answer questions, Generate content, Create images, Summarize documents
- **Launch Button**: Opens copilot.microsoft.com in embedded browser
- **Dark/Light Mode Support**: Full theme compatibility
- All actions open via embedded browser or external browser

### Code Signing Guide Created
Created comprehensive guide at `/app/docs/CODE_SIGNING_GUIDE.md`:
- **Azure Trusted Signing** workflow (~$120/year) - RECOMMENDED
- **Traditional Certificate** workflow (~$200-226/year)
- Step-by-step GitHub Actions integration
- GitHub Secrets configuration
- Troubleshooting section

### Removed Update Popups & New Icon (v4.6.0)
- **Removed both update popups** - No more update notifications visible
- Updates now download silently in background and install on restart
- **New Windows icon** - Modern gradient icon (teal to blue)
- All PNG icons regenerated (72x72 to 512x512)
- New ICO file with multiple sizes (16, 32, 48, 64, 128, 256)
- Updated apple-touch-icon and maskable icon

### Code Signing Fix (v4.5.0)
All GitHub branding and references removed from the app:
- ❌ Removed "GitHub" indicator → Changed to "Online/Offline" with Cloud icon
- ❌ Removed GitHub icon from error section → Changed to Globe icon
- ❌ "Open GitHub Releases" → Changed to "Download from Website"
- ❌ "Checking GitHub releases" → Changed to "Checking for updates..."
- ❌ "Updates from GitHub" → Changed to "Updates are downloaded automatically"
- ❌ GitHub connection status → Changed to generic server connection
- Changed all internal variable names (isConnectedToGithub → isConnectedToServer)
- Update URL now points to generic releases page

### Copyright & UI Updates (v4.3.0)
**Copyright & Certification:**
- Full copyright: "Copyright © 2024-2026 FaceConnect Development Team. All Rights Reserved."
- Publisher name: "FaceConnect Development Team"
- Legal trademarks: "FaceConnect™"
- LICENSE.txt with full EULA agreement
- Windows installer language settings

**UI Changes:**
- Removed white chat button from floating buttons
- **New Chat Popup**: Opens in-app conversation chat with back button
- **Social Media Popup**: Added back button header, improved layout
- Social button icon changed from Chrome to Users icon
- Individual social links open in built-in browser

**Floating Buttons (Bottom-Right):**
1. 💬 Chat Button (green) → Opens new conversation popup
2. 👥 Social Button (gradient) → Opens social media popup

### Auto-Update GitHub Connection Fix (v4.2.0)
Fixed automatic updates and improved pop-up behavior:
- **GitHub Connection Status** - Shows "GitHub" or "Offline" indicator in header
- **10-Second Auto-Dismiss** - All pop-ups disappear after 10 seconds
- **Countdown Timer** - Shows remaining seconds before auto-dismiss
- **GitHub Link on Error** - "Open GitHub Releases" button for manual download
- **Connection Error Handling** - Detects network/connection failures
- **Hover to Pause** - Mouse hover stops auto-dismiss countdown
- **Manual Download Link** - Direct link to GitHub releases page

**Pop-up Auto-Dismiss (10 seconds):**
- "Up to Date" notification
- "Update Ready" notification  
- Error notifications
- Does NOT auto-dismiss during active download

### Enhanced Update Progress Display (v4.1.0)
Detailed download progress with data and network info:
- **Circular Progress Ring** - Visual 0% to 100% with percentage in center
- **Linear Progress Bar** - Shows 0% to 100% scale below
- **Download Phases**:
  - 🔄 Initializing...
  - 🌐 Connecting to server...
  - ⬇️ Downloading update...
  - ✅ Verifying download...
  - 🎉 Download complete!
- **Data Downloaded**: Shows "5.2 MB / 45.8 MB" format
- **Network Speed**: Shows real-time speed (KB/s, MB/s)
- **Mini Progress Bar** (when minimized):
  - Phase label
  - Percentage
  - Data transferred
  - Download speed

### Built-in Browser (v4.0.0)
Added an embedded Chrome-like browser within the .exe app:
- **Full Browser Experience** - Navigate websites without leaving the app
- **URL Bar** with search/URL detection
- **Navigation Controls**: Back, Forward, Reload, Home
- **Security Indicator**: Lock icon for HTTPS sites
- **Bookmarks Bar**: Quick access to Google, YouTube, Facebook, Instagram, WhatsApp, Twitter
- **Loading Progress Bar**: Animated progress indicator
- **Favorites**: Add any page to bookmarks
- **Actions**: Copy URL, Open in system browser, Add to favorites
- **Status Bar**: Shows connection security and page title
- All social media links now open in this built-in browser
- Gaming platforms open in built-in browser
- Can still open links in external Chrome if preferred

**Files:**
- `/app/frontend/src/components/EmbeddedBrowser.jsx` - Full browser component
- `/app/frontend/electron/main.js` - Enabled `webviewTag` for embedded browsing

### Chat Button Added (v3.9.0)
Added Chat button next to Social Media button in bottom-right corner:
- **Chat Button** (green WhatsApp-style) - Opens WhatsApp Web in Chrome
- **Social Media Button** (gradient) - Opens popup with all social platforms
- Both buttons have Chrome indicator badge
- Tooltips show "Chat" and "Social" labels
- Connected to Chrome browser via `openExternalLink`

### Enhanced Auto-Update UI (v3.8.0)
Improved the auto-update system with beautiful visual feedback:
- **Progress Bar with Percentage** - Animated gradient progress bar showing exact download percentage
- **Download Speed** - Shows current download speed (KB/s, MB/s)
- **State Indicators**:
  - Checking → Spinning refresh icon
  - Available → Sparkle animation
  - Downloading → Animated progress with shine effect
  - Ready → Pulsing checkmark
  - Installing → Spinning lightning bolt
  - Complete → Party popper with success message
- **Confirmation Message** - "Update Installed Successfully!" banner with auto-restart countdown
- **Mini Progress Bar** - Compact floating bar at bottom when banner is minimized
- **Visual polish** - Gradient headers, animated shine effects, spring animations

### Auto-Update System (v3.7.0)
The app now automatically updates from GitHub releases without requiring manual uninstall:
- **Automatic update checking** - Checks for updates on app launch
- **Background download** - Downloads updates silently in the background
- **Update notifications** - Visual banner shows download progress
- **One-click install** - "Restart & Update" button installs immediately
- **Taskbar progress** - Windows taskbar shows download progress
- **GitHub integration** - Fetches releases from your GitHub repository

**Components:**
- `/app/frontend/src/components/UpdateManager.jsx` - Update UI notifications
- `/app/frontend/electron/main.js` - Auto-updater logic (already configured)

**How it works:**
1. App checks GitHub releases for new versions
2. If update available, downloads automatically
3. Shows notification with "Restart & Update" button
4. User clicks to restart and install
5. No need to uninstall the app!

### Floating Social Media Popup (v3.6.0)
Added a floating pop-up button in the bottom-right corner with:
- **Chrome browser icon** - Main floating button with gradient colors
- **Social Media Links** (all open in Chrome):
  - Facebook
  - Instagram
  - TikTok
  - Telegram
  - WhatsApp
  - YouTube
- Each link shows brand icon with color
- Smooth open/close animations
- "Open in Chrome" header with Chrome icon
- X button to close popup
- External link indicators
- Tooltip on hover

### UI/UX Improvements (v3.5.0)
1. **AI Section Back Button**: Added prominent back button with arrow icon in AI assistant header
2. **ALO Button Enhanced Animation**: 
   - Matrix-style animated gradient background
   - Pulsing glow effect
   - Modern AudioWaveform icon
   - Active indicator dot animation
   - Scale/rotate animation on hover
3. **Gaming Platforms**:
   - All game cards now open in Chrome browser
   - Added shine effect animation on hover
   - Chrome icon indicator on each game card
   - 8 gaming platforms with direct links (Poki, CrazyGames, Miniclip, etc.)
   - 8 additional gaming sites with descriptions
4. **Social Media Links**:
   - Added "Open in Chrome" label section
   - Chrome icon indicator on hover
   - Enhanced hover animations with scale effect
   - All 6 platforms connected (Facebook, Instagram, TikTok, Telegram, WhatsApp, YouTube)
   - Toast notification shows Chrome icon when opening

### Advanced Chat Features (v3.4.0)
Six major chat features implemented in `/app/frontend/src/components/ChatFeatures.jsx`:

1. **Message Reactions** 👍
   - Emoji reaction picker (👍❤️😂😮😢😡)
   - Right-click/hover to add reactions
   - Animated reaction display on messages
   - Reaction counts grouped by emoji

2. **Voice Messages** 🎤
   - Record voice notes with MediaRecorder API
   - Waveform visualization during recording & playback
   - Play/pause controls with progress bar
   - Duration display and auto-stop

3. **Typing Indicators** ⌨️
   - Real-time "typing..." animation with bouncing dots
   - Shows who is typing in chat header
   - Auto-clears after 3 seconds of inactivity

4. **Message Reply/Quote** ↩️
   - Click reply button on any message
   - Quoted message preview in input area
   - Visual quote block in sent messages
   - Jump to original message on click

5. **Disappearing Messages** ⏱️
   - Settings: Off, 24 hours, 7 days, 90 days
   - Timer icon on messages with countdown
   - Per-conversation settings stored locally
   - Access via chat menu → "Disappearing messages"

6. **Custom Chat Wallpapers** 🖼️
   - 10 preset wallpapers (solid colors & gradients)
   - Upload custom images
   - Per-chat wallpaper settings
   - Light/dark theme aware

### Desktop Sidebar Navigation (COMPLETE)
- Added fixed left sidebar to WhatsApp-style desktop layout
- **Main Navigation Items:**
  - Chat (with unread badge)
  - Calls
  - Status
  - Channels
  - Community
  - Media Files
  - Games
  - AI Assistant
- **Social Media Links:**
  - Facebook, Instagram, TikTok, Telegram, WhatsApp, YouTube
  - Each opens in external browser when clicked
- Each tab shows contextual content in the left panel

### Chat Features Implementation (COMPLETE)

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
- **Windows Build**: User needs to create new tag **v4.18.0** for next build
- **Android Build**: User needs to add GitHub secrets
- **Code Signing**: User needs to purchase certificate (see `/app/docs/CODE_SIGNING_GUIDE.md`)
  - Option A: Azure Trusted Signing (~$120/year) - RECOMMENDED
  - Option B: Traditional Sectigo/Comodo OV (~$200-226/year)

### P1 - Ready to Implement
- ~~Apple/Facebook social auth backend (currently UI-only)~~ **COMPLETED**
- ~~Advanced Chat Features (reactions, voice, typing, replies)~~ **COMPLETED v3.4.0**
- Connect remaining placeholder UI features

### Future/Backlog
- iOS App Store build workflow
- Analytics dashboard enhancements
- Subscription renewal reminders
- Real-time sync for reactions/typing via WebSocket

## New Components (v3.4.0)
- `/app/frontend/src/components/ChatFeatures.jsx` - All advanced chat features
  - `ReactionPicker` - Emoji reaction selector
  - `MessageReactions` - Reaction display component  
  - `VoiceRecorder` - Voice message recording
  - `VoiceMessagePlayer` - Audio playback with waveform
  - `TypingIndicator` - Animated typing dots
  - `ReplyPreview` - Reply-to message preview
  - `QuotedMessage` - Quoted message in bubble
  - `DisappearingMessagesDialog` - Timer settings modal
  - `DisappearingTimer` - Countdown display
  - `WallpaperPicker` - Custom wallpaper selector
  - `EnhancedMessageBubble` - Feature-rich message component

## Test Reports
- `/app/test_reports/iteration_42.json` - Chat features API + API bug fixes (39/39 passed)

## Build History
| Version | Date | Features |
|---------|------|----------|
| v4.6.0 | March 20, 2026 | Removed both update popups, new modern Windows icon |
| v4.5.0 | March 20, 2026 | Fixed code signing error - disabled signature verification |
| v4.4.0 | March 20, 2026 | Removed all GitHub watermarks and branding |
| v4.3.0 | March 20, 2026 | Copyright/certification, new chat popup, social popup back button |
| v4.2.0 | March 20, 2026 | Connection fix, 10-second auto-dismiss pop-ups |
| v4.1.0 | March 20, 2026 | Enhanced update progress display |
| v4.0.0 | March 20, 2026 | Built-in Chrome browser embedded in app |
| v3.9.0 | March 20, 2026 | Chat button added next to Social Media button, opens in Chrome |
| v3.8.0 | March 20, 2026 | Enhanced auto-update UI with progress bar, percentage, download speed, and confirmation |
| v3.7.0 | March 20, 2026 | Auto-update system with GitHub releases integration |
| v3.6.0 | March 20, 2026 | Floating social media popup button with Chrome integration |
| v3.5.0 | March 20, 2026 | AI back button, ALO enhanced animation, Gaming links, Social media Chrome integration |
| v3.4.0 | March 20, 2026 | Message reactions, voice messages, typing indicators, reply/quote, disappearing messages, custom wallpapers |
| v3.2.0 | March 19, 2026 | ALO voice assistant, universal search, chat context menu, animations |

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
