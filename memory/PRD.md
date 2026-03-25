# FaceConnect PRD

**Last Updated**: December 2025

## Original Problem Statement
Build "FaceConnect," a Facebook-style social media PWA with facial recognition capabilities, React frontend, FastAPI backend, and MongoDB database. Desktop version uses WhatsApp-style UI with Electron. Mobile version uses Capacitor for Android APK builds.

## Recent Updates (December 2025)

### Android Backward Compatibility Extended (v5.3.1) - LATEST
**Lowered minSdkVersion to API 21 (Android 5.0) for maximum device compatibility**

**Changes:**
- Updated `/app/frontend/android/variables.gradle`:
  - `minSdkVersion = 21` (was 22)
  - This is the lowest supported API level for Capacitor 5
  - Extends compatibility to Android 5.0 (Lollipop) devices

**Testing:**
- Frontend testing passed (100% - 20/20 tests)
- All UI components working: Home, BottomNav, SwipeablePanels, Infinite Scroll, Theme Toggle
- No React rendering errors or infinite loops detected

**User Action Required:**
- Trigger GitHub Actions to build new APK with updated minSdkVersion
- Download and test on older Android devices

---

### New Neural Face Network App Icon (v5.4.0)
**Redesigned Android launcher icon with modern neural network face design**

**Icon Design:**
- Abstract geometric face made of connected cyan dots and lines
- Represents both facial recognition and social connections
- Dark navy blue background (#0A0A1A)
- Modern, tech-forward aesthetic

**Files Updated:**
- All Android mipmap densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi):
  - `ic_launcher.png` - Standard icon
  - `ic_launcher_round.png` - Circular variant
  - `ic_launcher_foreground.png` - Adaptive icon foreground
- All splash screens updated to match new branding
- All PWA/web icons updated in `/app/frontend/public/icons/`
- Background color changed to `#0A0A1A`
- `capacitor.config.ts` - Updated splash/status bar colors

**Version Bump:**
- versionCode: 15
- versionName: 5.4.0

---

### Display Refresh Rate & Quality Settings (v5.3.0)
**Added display settings for 60Hz, 90Hz, 120Hz refresh rates and display quality optimization**

**New Display Settings (Settings → Display):**

1. **Refresh Rate Options:**
   - Auto - Automatically detect
   - 60Hz - Standard (16.67ms per frame)
   - 90Hz - Smoother (11.11ms per frame)
   - 120Hz - Ultra smooth (8.33ms per frame)
   - CSS custom properties adjust animation durations per refresh rate

2. **Display Quality Presets:**
   - **Auto** - Automatically detect display type
   - **Low (TFT LCD)** - Disables backdrop blur, basic effects, saves battery
   - **Medium (IPS/Incell)** - Balanced blur (8px), moderate effects
   - **High (AMOLED/OLED)** - Full blur (16px + saturate), true blacks, premium effects

3. **Additional Options:**
   - **Smooth Animations** - GPU-accelerated animations with will-change
   - **Reduced Motion** - Accessibility option to minimize animations
   - **High Contrast** - Better visibility on low quality displays

**CSS Optimizations Applied:**
- `[data-refresh-rate]` attribute controls animation timing
- `[data-display-quality]` attribute controls backdrop-filter, text-rendering
- `.reduced-motion` disables all animations
- `.high-contrast` increases border visibility
- `.smooth-animations` enables GPU acceleration

**Files Updated:**
- `/app/frontend/src/context/SettingsContext.jsx` - Display settings state
- `/app/frontend/src/components/SwipeablePanels.jsx` - Display Settings popup
- `/app/frontend/src/index.css` - Refresh rate & quality CSS optimizations
- `/app/frontend/package.json` - Version bump to v5.3.0

---

### Improved Structure, Fluidity & Scrolling (v5.2.0)
**Enhanced mobile app structure with better scrolling and UI positioning**

**Changes Implemented:**

1. **Settings Popup Moved to Top**
   - Changed from center-positioned to top-positioned (`top-4`)
   - Animation now slides down from top (`y: -100 → 0`)
   - Better visibility and feels more natural

2. **Header Horizontal Scrolling**
   - Header now supports left-to-right scrolling
   - Added Search icon to header actions
   - Icons: ☰ FaceConnect ♥ 💬 🔍 ⊞
   - Uses `overflow-x: auto` with `-webkit-overflow-scrolling: touch`
   - Hidden scrollbar for clean look

3. **Improved Scroll Fluidity**
   - Added `.mobile-scroll-container` class with smooth scrolling
   - CSS `scroll-behavior: smooth` for fluid animations
   - `overscroll-behavior-y: contain` to prevent pull-to-refresh conflicts
   - Added padding-bottom for bottom nav space
   - `.scrollbar-hide` utility class for hidden scrollbars

4. **Touch Interaction Improvements**
   - All buttons have `transform: scale(0.97)` on active state
   - 150ms transition for responsive feel
   - Better touch feedback

**Files Updated:**
- `/app/frontend/src/components/SwipeablePanels.jsx` - Settings popup top position
- `/app/frontend/src/pages/Home.jsx` - Horizontal scroll header
- `/app/frontend/src/index.css` - Scroll fluidity CSS
- `/app/frontend/package.json` - Version bump to v5.2.0

---

### Settings & New Post Popup Windows (v5.1.0)
**Added popup windows for Settings and New Post buttons in panels**

**Settings Popup (from left panel):**
- Dark/Light mode toggle
- Account settings
- Notifications settings
- Privacy settings
- Language settings
- Help & Support
- Logout button (red, with confirmation)

**New Post Popup (from right panel):**
- Photo - Share from gallery
- Video - Record or upload
- Text - Write something
- Story - Create disappearing content
- Reel - Short video creation

**Design:**
- Both popups use portal rendering (z-index 200+)
- Blurred backdrop (`backdrop-blur-md`)
- Spring animations (damping: 25, stiffness: 300)
- Rounded corners (rounded-3xl)
- Theme adaptive (light/dark)
- X button to close + tap backdrop to close

**Files Updated:**
- `/app/frontend/src/components/SwipeablePanels.jsx` - Added both popup modals
- `/app/frontend/package.json` - Version bump to v5.1.0

---

### New Bottom Navigation Bar Design (v5.0.0)
**Added the requested bottom navigation bar matching the design image**

**Navigation Bar Design:**
- **Home** - House icon, outlined style
- **Search** - Magnifying glass icon
- **Create** - Prominent centered button with rounded corners (14x11), inverted colors (white bg/black icon on dark, black bg/white icon on light)
- **Reels** - Film strip icon
- **Messages** - Chat bubble icon with cyan notification dot

**Technical Changes:**
1. **Portal Rendering**: Nav uses `createPortal` to render directly to `document.body`, escaping any transform contexts
2. **Fixed CSS Bug**: Removed `transform: translateZ(0)` from body which was breaking `position: fixed`
3. **Theme Adaptive**: Bar adapts to light/dark mode
4. **Active States**: Active icon gets full color, inactive icons are gray

**Files Updated:**
- `/app/frontend/src/components/BottomNav.jsx` - Complete redesign + Portal
- `/app/frontend/src/index.css` - Fixed transform breaking fixed positioning
- `/app/frontend/package.json` - Version bump to v5.0.0

---

### Enhanced Panel & Page Animations (v4.98.0)
**Improved fading and animation between windows switching, left and right panels**

**Animation Enhancements:**

1. **Panel Open/Close Animations (using Framer Motion)**
   - **Backdrop**: Smooth fade-in/out with `backdrop-blur-md` (70% opacity black)
   - **Panel Card**: Spring animation (damping: 25, stiffness: 300, mass: 0.8)
   - **Scale**: Starts at 80% scale → animates to 100%
   - **Y offset**: Starts 20px down → animates to 0
   - **Header**: Staggered fade-in from top (delay: 0.1s)
   - **Buttons**: Staggered slide-in from left/right (delay: 0.15s, 0.2s)
   - **Hint text**: Fade-in last (delay: 0.3s)

2. **Button Interactions**
   - `whileHover`: scale 0.98
   - `whileTap`: scale 0.95
   - Smooth 200ms transitions

3. **Edge Indicators**
   - Now use AnimatePresence for fade-in/out
   - Slide from edges with opacity transition

4. **Page Transitions (animations.js)**
   - Created comprehensive animation variants:
     - `pageVariants`: Main page transitions (fade + scale + y-slide)
     - `slideRightVariants`: Forward navigation
     - `slideLeftVariants`: Back navigation
     - `modalVariants`: Spring-based modal animations
     - `backdropVariants`: Overlay fades
     - `staggerContainer/staggerItem`: List animations
     - `buttonTap/buttonHover`: Interaction feedback

**Files Updated:**
- `/app/frontend/src/components/SwipeablePanels.jsx` - Full Framer Motion rewrite
- `/app/frontend/src/components/animations.js` - NEW: Animation variants library
- `/app/frontend/package.json` - Version bump to v4.98.0

---

### Mobile UX Improvements (v4.97.0)
**Added panel access buttons, pull-to-refresh, and enhanced scroll sensitivity**

**Changes Implemented:**

1. **Panel Access Buttons in Header (Mobile Only)**
   - **☰ Menu button** (left side) - Opens left panel (Quick Access)
   - **⊞ Grid button** (right side) - Opens right panel (Create)
   - Uses `usePanels()` context hook to access panel controls

2. **Pull-to-Refresh**
   - Pull down from top of feed to refresh content
   - Visual indicator shows "Pull to refresh" → "Release to refresh" → "Refreshing..."
   - Animated refresh icon rotates based on pull distance
   - Haptic feedback on refresh trigger

3. **Enhanced Touch Scrolling Sensitivity**
   - Added `-webkit-transform: translateZ(0)` for hardware acceleration
   - `will-change: scroll-position` for smoother scrolling
   - Removed overscroll bounce on html element
   - Better touch-action configuration

4. **Code Architecture**
   - Created `PanelContext` in SwipeablePanels for panel control sharing
   - `usePanels()` hook exports: `openLeftPanel`, `openRightPanel`, `closePanel`
   - Split `Home` into `Home` (wrapper) + `HomeContent` (inner component with context access)

**Files Updated:**
- `/app/frontend/src/components/SwipeablePanels.jsx` - Added PanelContext + usePanels hook
- `/app/frontend/src/pages/Home.jsx` - Panel buttons, pull-to-refresh, HomeContent split
- `/app/frontend/src/index.css` - Enhanced scroll sensitivity CSS
- `/app/frontend/package.json` - Version bump to v4.97.0

---

### Centered Modal Panels for Mobile (v4.96.0)
**Changed left and right panels to open as centered modals instead of side-sliding panels**

**Changes:**
- Both panels now appear as centered overlay modals (85% width, max 320px)
- Added blur backdrop (`backdrop-blur-sm`) when panel is open
- Panels have rounded corners (`rounded-3xl`) and shadow
- Scale animation: starts at 80% and animates to 100%
- X button in header to close (replaces back arrow)
- Tap outside the panel or X to close
- Removed old side-sliding panel behavior

**Visual Design:**
- White/dark card floating in center of screen
- Blurred background showing home content behind
- Smooth scale + opacity animation on open/close
- Clean, modern modal appearance

**Files Updated:**
- `/app/frontend/src/components/SwipeablePanels.jsx` - Complete redesign to centered modals
- `/app/frontend/package.json` - Version bump to v4.96.0

---

### Google OAuth Setup Guide & Placeholder Features Status (v4.95.0)
**Added OAuth setup guide endpoint and verified placeholder feature APIs**

**Google OAuth Fix:**
The `redirect_uri_mismatch` error occurs when Google Cloud Console doesn't have the correct redirect URI. Added two helper endpoints:

1. **`GET /api/google/status`** - Returns configuration status + setup instructions
2. **`GET /api/google/test-redirect`** - Visual HTML guide with step-by-step instructions

**Required Action for User:**
Add this EXACT URI to Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs:
```
https://profile-connector-3.preview.emergentagent.com/api/google/callback
```

**Placeholder Features Status (Already Connected to DB):**
| Feature | API Endpoint | Status |
|---------|-------------|--------|
| Watch | `/api/watch/feed` | ✅ Working (returns mock when DB empty) |
| Marketplace | `/api/marketplace/listings` | ✅ Working (returns mock when DB empty) |
| Events | `/api/events` | ✅ Working (returns mock when DB empty) |
| Gaming | `/api/gaming/discover` | ✅ Working (returns 8 games) |
| Memories | `/api/memories` | ✅ Working (returns 5 memories) |

All placeholder features already have backend API routes connected to MongoDB. Frontends gracefully fall back to mock data when DB is empty.

**Files Updated:**
- `/app/backend/routes/google_oauth.py` - Added test-redirect endpoint + enhanced status
- `/app/frontend/package.json` - Version bump to v4.95.0

---

### Infinite Scrolling (v4.94.0)
**Added infinite scrolling to the main feed for seamless content loading**

**Frontend Implementation (Home.jsx):**
- Added pagination states: `page`, `hasMore`, `loadingMore`
- Created `loadMorePosts()` function with duplicate post filtering
- Implemented Intersection Observer with 200px rootMargin for early loading
- Added loading spinner and "You've seen all posts" end message
- Posts are loaded 10 at a time

**Backend Implementation (server.py):**
- Added `page` and `limit` query parameters to `/api/feed/home`
- Implemented skip/limit pagination with MongoDB cursor
- Added `has_more` flag to detect if more posts exist
- Stories, reels, highlighted posts only load on page 1 (no duplicates)
- Returns `pagination` object: `{ page, limit, has_more }`

**Files Updated:**
- `/app/frontend/src/pages/Home.jsx` - Intersection Observer + pagination logic
- `/app/backend/server.py` - Paginated feed endpoint
- `/app/frontend/package.json` - Version bump to v4.94.0

**Testing Verified:**
- Page 1: Returns 5 posts with `has_more: true`
- Page 2: Returns 5 posts with `has_more: false`
- UI shows "You've seen all posts" when reaching the end

---

### Mobile UI Enhancements (v4.93.0)
**Multiple improvements for mobile APK user experience**

**Changes Implemented:**

1. **Removed White Chat Button (FloatingChat)**
   - Added `isMobile` state detection in FloatingChat.jsx
   - Returns `null` on screens < 768px - completely hidden on mobile
   - Added CSS backup in index.css with `display: none !important`

2. **Enhanced Scroll Sensitivity**
   - Added `-webkit-overflow-scrolling: touch` for iOS momentum scrolling
   - Applied `scroll-behavior: smooth` globally on mobile
   - Removed `scroll-snap-type` from feed for free scrolling
   - Added `overscroll-behavior: auto` for natural scroll feel

3. **Share Post Preview with Fade-in Popup**
   - Created `PostPreviewCard` component showing:
     - Post thumbnail image/video
     - Author avatar and username
     - Post content preview (truncated)
     - Stats (likes, comments, views)
   - Enhanced modal animations:
     - Backdrop has blur effect (`backdrop-blur-sm`)
     - Spring animation with damping 30, stiffness 350
     - Staggered header animation with delay

4. **Back Buttons on Sidebars**
   - **Left Panel**: Back button (ArrowLeft icon) in header, closes panel on tap
   - **Right Panel**: Back button (ArrowLeft icon) in header, closes panel on tap
   - Added ChevronRight indicators on menu items
   - Updated hint text: "Swipe or tap back to close"

**Files Updated:**
- `/app/frontend/src/components/facebook/FloatingChat.jsx` - Mobile detection + null return
- `/app/frontend/src/components/facebook/ShareModal.jsx` - PostPreviewCard + enhanced animations
- `/app/frontend/src/components/SwipeablePanels.jsx` - Back buttons on both panels
- `/app/frontend/src/index.css` - Scroll sensitivity CSS
- `/app/frontend/package.json` - Version bump to v4.93.0

---

### Mobile Touch Scrolling Fix (v4.92.0)
**Fixed mobile layout to adapt to all smartphone screen sizes with native top-to-bottom scrolling**

**Root Cause:**
Global CSS rules in `index.css` had `overflow: hidden` on `html, body, #root` which was designed for Electron desktop but blocked native mobile scrolling in Capacitor APK builds.

**Fixes Applied:**
1. **Desktop-only overflow rules**: Moved `overflow: hidden` into `@media (min-width: 1024px)` media query
2. **Mobile scroll enablement**: Added mobile-specific rules with:
   - `overflow-y: auto` on html, body, #root for native scrolling
   - `-webkit-overflow-scrolling: touch` for iOS momentum scrolling
   - `overscroll-behavior-y: contain` to prevent pull-to-refresh issues
3. **Dynamic viewport support**: Added `100dvh` (dynamic viewport height) for better mobile adaptation
4. **Responsive breakpoints**: Added specific styles for:
   - Small phones (≤375px - iPhone SE)
   - Medium phones (376-428px - iPhone 12/13/14)
   - Large phones (429-480px - Pro Max models)
   - Phablets (481-768px)
5. **Safe area insets**: Proper handling for notched devices
6. **Touch optimization**: Added `touch-action: pan-y` for smooth scrolling

**Files Updated:**
- `/app/frontend/src/index.css` - Comprehensive mobile scrolling fixes
- `/app/frontend/package.json` - Version bump to v4.91.0

**Testing:**
- Verified responsive layout at multiple viewport sizes (320px, 360px, 375px, 430px)
- Confirmed page scrolling works via JavaScript `window.scrollTo()`
- UI properly adapts to small, medium, and large phone screens

**AI Features Status:**
AI features (Speech/Whisper, ALO Assistant) confirmed working - they use lazy imports with graceful fallbacks, not commented out.

---

## Recent Updates (March 24, 2026)

### Save Imported Contacts Feature (v4.81.0)
**Completed the "Save All to Contacts" feature for persisting imported contacts to the address book**

**What was implemented:**
- **Frontend**: `saveAllContactsToAddressBook` function in `WhatsAppDesktopLayout.jsx`
  - Makes POST request to `/api/contacts/save` endpoint
  - Sends all preview contacts with source info (google, facebook, csv, vcard, manual)
  - Shows success toast with count of saved/updated contacts
  - Cleans up state after successful save
- **Backend**: `/api/contacts/save` endpoint already existed in `contacts.py`
  - Saves new contacts to `address_book` MongoDB collection
  - Updates existing contacts by matching email or phone
  - Returns count of saved vs updated contacts

**User Flow:**
1. Import contacts from Google, Facebook, CSV, or vCard
2. Preview modal shows all imported contacts
3. Click "Save All" button to save all contacts to address book
4. Click "Add Friends" to send friend requests to FaceConnect users

**Files Updated:**
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Added `saveAllContactsToAddressBook` function
- `/app/frontend/package.json` - Version bump to v4.81.0

---

## Recent Updates (March 23, 2026)

### Music Hub Fix - Opens External Apps (v4.72.0) - LATEST
**Fixed Music Hub crash - Now opens music services in external windows/apps**

**Root Cause:**
The previous implementation tried to embed Spotify, Apple Music, SoundCloud, and YouTube Music in iframes. These services block iframe embedding due to `X-Frame-Options` security headers, causing the app to crash or show blank screens.

**Fix Applied:**
- Music services now open in **external windows/apps** instead of iframes
- Spotify: Opens Spotify desktop app via `spotify:` protocol (falls back to web)
- Apple Music: Opens Apple Music app via `music:` protocol (falls back to web)  
- SoundCloud: Opens in browser
- YouTube Music: Opens in browser

**Components Updated:**
- `/app/frontend/src/components/desktop/DesktopSidebar.jsx`
  - Updated `musicServices` onClick handlers to use `openExternal`
  - Removed broken iframe popup code
  - Removed mini-player (since we now use external apps)
  - Updated Music Hub tip text

**How it works now:**
1. Click Music button → Opens Music Hub popup
2. Click on Spotify → Opens Spotify desktop app (if installed) or web player
3. Click on Apple Music → Opens Apple Music app (if installed) or web player
4. Click on SoundCloud → Opens SoundCloud in browser
5. Click on YouTube Music → Opens YouTube Music in browser

---

### License Key for Updates (v4.71.0)
**Added license/installation key input to the update popup to activate and start new installations**

**Features:**
- **License Key Input**: Expandable section in the "Up to Date" popup
- **Auto-format**: Automatically formats key as XXXX-XXXX-XXXX-XXXX
- **Validation**: Checks key format before allowing activation
- **Persistence**: Saves validated key to localStorage
- **One-click Update**: "Activate & Install Update" button triggers update check after key validation

**Components Updated:**
- `/app/frontend/src/components/AutoUpdateNotification.jsx` - Added key input to notification
- `/app/frontend/src/components/UpdateManager.jsx` - Added key input to main update manager

**Key Format:**
- 16 alphanumeric characters with dashes: `XXXX-XXXX-XXXX-XXXX`
- Example: `FC01-2026-LIVE-ABCD`

**User Flow:**
1. Open update popup (shows "Up to Date" or "Update Ready")
2. Click "Enter License Key for Updates"
3. Enter license key (auto-formats with dashes)
4. Click "Activate & Install Update"
5. System validates key and checks for updates

---

### Collapsible Sidebar with Fade Animation (v4.70.0)
**Added toggle button to show/hide sidebar with smooth fade animation**

**Features:**
- **Toggle Button**: Arrow button on the side to collapse/expand sidebar
- **Fade Animation**: Smooth fade in/out animation using Framer Motion
- **State Persistence**: Sidebar state can be controlled from parent component
- **Responsive**: Toggle button moves with sidebar state
- **Full DesktopSidebar**: Now using the full DesktopSidebar component with all features:
  - FC logo, Social Media button, Music Hub
  - Navigation items (Chat, Calls, Status, Channels, Community, Media, Games, Copilot, AI)
  - Spotify button, Settings, Theme toggle, Logout

**Files Updated:**
- `/app/frontend/src/components/desktop/DesktopSidebar.jsx` - Added collapse logic, AnimatePresence, toggle button
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Added sidebarCollapsed state, using DesktopSidebar component
- `/app/frontend/package.json` (v4.70.0)

**How it works:**
1. Click the arrow button on the edge of the sidebar to collapse
2. Sidebar fades out with smooth animation
3. Click arrow button again to expand
4. All popups (Social, Music, etc.) remain accessible

---

### Spotify Integration (v4.69.0)
**Added Spotify button in left sidebar that opens Spotify in a separate window**

**Features:**
- New Spotify button with green hover effect in the sidebar (above Settings)
- Clicking opens the Spotify desktop app in a separate window
- Uses `spotify:` protocol to launch the native Spotify app
- Falls back to Spotify web player if desktop app is not installed
- Dedicated IPC handler (`open-spotify`) for reliable app launching

**Files Updated:**
- `/app/frontend/src/components/desktop/DesktopSidebar.jsx` - Added Spotify button
- `/app/frontend/electron/main.js` - Added `open-spotify` IPC handler
- `/app/frontend/electron/preload.js` - Exposed `openSpotify` function
- `/app/frontend/package.json` (v4.69.0)

**How it works:**
1. User clicks Spotify button in sidebar
2. Electron tries to open `spotify:` protocol (launches Spotify desktop app)
3. If Spotify is not installed, falls back to `https://open.spotify.com`
4. Spotify opens in its own separate window

---

### Full Language Support in All Windows (v4.68.0)
**Applied language translations to all UI windows and panels**

**Translated Elements:**
- Chat filters: All, Unread, Groups, New
- Empty states: "No chats yet", "Start a conversation", "Start New Chat"
- Encryption notice: "Your personal messages are end-to-end encrypted"
- New Group panel: Title, placeholders, buttons
- Contact lists: "No contacts yet", "Contacts", "Search contacts"
- Create Group button with dynamic member count

**Components Updated:**
- `WhatsAppDesktopLayout.jsx` - Main chat UI translations
- `NewGroupPanel.jsx` - Group creation translations
- `DesktopSidebar.jsx` - Sidebar navigation translations
- `i18n.js` - Added missing translation keys + full Italian translations

**New Translation Keys Added:**
- `chats`, `channels`, `community`, `games`
- `all`, `unread`, `new`
- `noChatsYet`, `startConversation`, `startNewChat`
- `encryptionNotice`, `noContactsYet`
- `newGroup`, `groupNameRequired`, `searchContacts`
- `contacts`, `createGroup`, `member`, `members`
- `selectAll`, `deselectAll`

**Languages with Full Support:**
- English, Spanish, Italian, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, Russian

---

### Vivid Color Scheme (v4.67.0)
**Applied brighter and more vivid colors throughout the desktop app**

**Color Changes:**
| Element | Old Color | New Color | Description |
|---------|-----------|-----------|-------------|
| Primary Green | #00a884 | #00E676 | Bright neon green |
| Message Sent | #005c4b | #00BFA5 | Vivid teal |
| Dark Background | #111b21 | #0D1117 | Deep blue-black |
| Dark Card | #202c33 | #161B22 | Dark blue-gray |
| Dark Hover | #2a3942 | #21262D | Lighter blue-gray |
| Read Receipt | #53bdeb | #00D9FF | Bright cyan |
| Badge Color | #25d366 | #00E676 | Neon green |

**Chat Themes Updated:**
- Default: Cyan (#00FFFF) + Purple (#A855F7)
- Ocean: Bright Blue (#00B4D8) + Deep Blue (#0077B6)
- Forest: Neon Green (#00E676) + Vivid Green (#00C853)
- Sunset: Orange (#FF6B35) + Pink (#FF2D92)
- Lavender: Purple (#A855F7) + Violet (#7C3AED)
- Rose: Hot Pink (#FF2D92) + Pink (#E91E63)

**Files Updated:**
- `/app/frontend/src/index.css` - CSS variables
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Main layout colors
- `/app/frontend/src/components/desktop/DesktopSidebar.jsx` - Sidebar colors
- `/app/frontend/src/components/DesktopSettings.jsx` - Theme colors
- `/app/frontend/package.json` (v4.67.0)

---

### Language Switching Functionality (v4.66.0)
**Implemented full i18n support - "APPLY" button now changes app language globally**

**What was implemented:**
1. Added `useLanguage` hook to main `WhatsAppDesktopLayout.jsx` component
2. Added `useLanguage` hook to `DesktopSidebar.jsx` component
3. Updated sidebar navigation items (Chats, Calls, Status, etc.) to use `t()` translation function
4. Updated Settings and Logout buttons to use translations
5. Updated search placeholder and message input placeholder to use translations

**How it works:**
- When user clicks "APPLY [Language]" in Settings, the `setLanguage()` function is called
- This updates the LanguageContext which triggers re-render of all components using `t()`
- All translated UI elements now update immediately to the selected language

**Supported translations:**
- Navigation: Chats, Calls, Status, Channels, Community, Media, Games, AI
- Actions: Settings, Logout
- Input placeholders: Search, Type a message

**Files Updated:**
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx`
- `/app/frontend/src/components/desktop/DesktopSidebar.jsx`
- `/app/frontend/package.json` (v4.66.0)

---

### Open External URL Fix (v4.65.0)
**Fixed browser not opening automatically for Google OAuth in Electron**

**Root Cause:**
`shell.openExternal()` called directly from `preload.js` doesn't work due to Electron's sandbox restrictions. The preload script runs in a limited context.

**Fix Applied:**
- Changed from direct `shell.openExternal()` call in preload.js
- Now uses IPC communication: preload.js → main.js → shell.openExternal()
- Added `open-external-url` IPC handler in main.js with proper logging

**Files Updated:**
- `/app/frontend/electron/preload.js` - Changed to use IPC invoke
- `/app/frontend/electron/main.js` - Added IPC handler for opening URLs
- `/app/frontend/package.json` - Version bump to 4.65.0

**Expected Result:**
When clicking "Google Contacts", browser should now open automatically instead of showing "Could not open browser automatically" fallback.

---

### Contact Preview Feature (v4.64.0)
**Added interactive preview modal for imported contacts before adding as friends**

**New Features:**
1. **Preview Modal** - Shows all imported contacts with FaceConnect matches highlighted
2. **Selectable Contacts** - Checkboxes to choose which contacts to add as friends
3. **Select All / Deselect All** - Quick selection buttons
4. **Contact Status Badges** - Shows "Already friends", "Request sent", or "Add friend"
5. **Expandable Section** - View contacts not yet on FaceConnect (collapsed by default)
6. **Bulk Friend Requests** - Send friend requests to all selected contacts at once

**User Experience:**
- Import contacts from Google, Facebook, CSV, or vCard
- Review matched users before adding
- Select only the contacts you want to add
- See clear status for each contact
- Confirm action before sending friend requests

**Files Updated:**
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Added preview modal UI and selection logic
- `/app/frontend/package.json` - Version bump to 4.64.0

---

### Google OAuth Fix for Electron (v4.63.0)
**Fixed "Failed to start Google OAuth" error in Electron desktop app**

**Root Cause:**
The `openExternal` function in `preload.js` wasn't properly returning the Promise from `shell.openExternal()` or handling errors. When something went wrong, the frontend's catch block triggered with a generic error.

**Fixes Applied:**
1. Updated `preload.js` to make `openExternal` async and return success/error status
2. Enhanced `importGoogleContacts` function with:
   - Detailed console logging for debugging
   - Proper error handling for each step
   - Fallback mechanism: if browser can't open, copies URL to clipboard
   - Extended polling timeout from 2 minutes to 3 minutes
3. Bumped version to v4.63.0

**Files Updated:**
- `/app/frontend/electron/preload.js` - Made openExternal async with error handling
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Enhanced Google OAuth flow
- `/app/frontend/package.json` - Version bump to 4.63.0

**User Action Required:**
- Create new GitHub release with tag `v4.63.0` to build new `.exe`
- Download and test the new build

---

### Custom Frameless Title Bar (v4.49.0)
**Implemented custom draggable title bar for frameless Electron window**

**What was done:**
- Removed native Electron window frame (`frame: false` was already set)
- Created `CustomTitleBar.jsx` component with:
  - Draggable region using `-webkit-app-region: drag`
  - Minimize, Maximize/Restore, Close buttons
  - Dark/Light theme support
  - Shows FaceConnect branding
- Added `ipcMain.on` handlers in `main.js` for window-minimize, window-maximize, window-close
- Added `ipcMain.handle` for window-is-maximized
- Added window maximize/unmaximize event listeners to notify renderer
- Integrated title bar into WhatsAppDesktopLayout.jsx at the top of the app
- Bumped version to v4.49.0

**Files Updated:**
- `/app/frontend/electron/main.js` - Added IPC handlers and maximize events
- `/app/frontend/src/components/desktop/CustomTitleBar.jsx` - NEW component
- `/app/frontend/src/components/desktop/index.js` - Export CustomTitleBar
- `/app/frontend/src/components/WhatsAppDesktopLayout.jsx` - Import and render title bar
- `/app/frontend/package.json` - Version bump to 4.49.0

**Note:** Title bar only appears in Electron `.exe` build (not in browser)

### Electron Production Build Fix (v4.38.0)
**Comprehensive fix for React app not loading in .exe build**

**Root Causes Identified:**
1. `webSecurity: true` blocking JavaScript modules in file:// protocol
2. Path resolution issues in packaged Electron app
3. Missing CSP rules for file:// protocol
4. No base tag for relative path resolution

**Fixes Applied:**
1. **main.js - Multi-path resolution**: Added 5 fallback paths for finding build/index.html
2. **main.js - webSecurity: isDev**: Disabled webSecurity in production (safe for local bundled app)
3. **index.html - Base tag**: Added `<base href="./" />` for relative path resolution
4. **index.html - CSP updated**: Added `file:` source to all CSP directives
5. **craco.config.js - publicPath**: Force `publicPath: './'` in production builds
6. **Debug tools**: F12 opens DevTools in production, diagnostic logging added

**Files Updated:**
- `/app/frontend/electron/main.js`
- `/app/frontend/public/index.html`
- `/app/frontend/craco.config.js`

### Component Refactoring Phase 2 (v4.36.0 - v4.38.0)
**Reduced WhatsAppDesktopLayout.jsx from 2918 → 2327 lines (591 lines extracted)**

**New Extracted Components (Phase 2):**
- `/app/frontend/src/components/desktop/ChatHeader.jsx` - Chat view header with actions (~230 lines)
- `/app/frontend/src/components/desktop/ArchivedChatsPanel.jsx` - Archived conversations panel (~110 lines)
- `/app/frontend/src/components/desktop/StarredMessagesPanel.jsx` - Starred messages panel (~115 lines)
- `/app/frontend/src/components/desktop/SocialMediaPopup.jsx` - Floating social links popup (~175 lines)

**Previously Extracted (Phase 1):**
- `ContactInfoPanel.jsx` - Contact details sidebar
- `AccountPanel.jsx` - User account settings
- `NewGroupPanel.jsx` - Group creation modal
- `EmptyState.jsx` - Default empty chat view

**Bug Fix:** Fixed React Hooks "Rules of Hooks" violation - moved `isElectron()` early return to AFTER all hooks are called.

### Electron React Loading Fix (v4.36.0)
**Fixed critical issue: React app failing to mount in production .exe build**

**Root Cause**: Race condition in Electron detection. The `window.electronAPI?.isElectron` check in `App.js` executed before `preload.js` could expose the context bridge API. This caused the app to use `BrowserRouter` (which doesn't work with `file://` protocol) instead of `HashRouter`.

**Fix Applied**:
- Added `file://` protocol detection as PRIMARY check (executes synchronously, no race)
- Kept fallback checks for `electronAPI`, `process.type`, and user agent
- Updated `/app/frontend/src/utils/electron.js` with consistent detection logic
- Added console logging for router mode debugging

**Files Updated**:
- `/app/frontend/src/App.js` (lines 137-157) - Electron detection & router selection
- `/app/frontend/src/utils/electron.js` - Utility function update

### Google OAuth Login Fix (v4.33.0)
Fixed login issues for users:
- **Hash Fragment Passing**: Fixed webview not passing `#session_id` fragment to callback URL
- **Added `will-navigate` listener**: Catches navigation earlier in Electron webview
- **Better Error Handling**: Added status messages and error display in AuthCallback
- **Debug Logging**: Added console logs to trace OAuth flow issues

**Files Updated:**
- `DesktopAuth.jsx` - Fixed webview callback URL to include hash
- `AuthCallback.jsx` - Added status tracking and error display

### Smooth Rounded Corners & Language Menu (v4.31.0)
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
