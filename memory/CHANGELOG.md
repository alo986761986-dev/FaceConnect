# FaceConnect Changelog

## March 17, 2026 - Chat Media & Video Call Enhancements

### Added
- **Chat Media Types**: Support for GIF, sticker, and location messages with metadata
  - GIF messages display inline in chat
  - Sticker messages from sticker packs
  - Location sharing with "Shared Location" card and Maps link
  - MessageCreate/MessageResponse models updated with `metadata` field

- **VideoCallEnhanced Component**: Full-featured video call experience
  - End call, mute microphone, speaker toggle
  - Camera rotate (front/back facing)
  - Visual effects panel (beauty, filters, backgrounds)
  - Add people to ongoing call
  - Screen sharing capability
  - In-call messaging with PiP mode
  - Picture-in-Picture video window
  - Connection state indicators
  - Call duration timer

- **AI-Powered Live Stream Effects**: Backend endpoints for real-time effects
  - `POST /api/streams/{id}/ai-effect` - Apply effects
  - `DELETE /api/streams/{id}/ai-effect/{type}` - Remove effects
  - `GET /api/streams/{id}/ai-effects` - List active effects
  - Beauty effects: smooth skin, brighten, slim face, big eyes, lipstick, blush
  - Background effects: blur, virtual backgrounds, AI replacement
  - Filter effects: warm, cool, vintage, noir, vivid
  - Sticker effects: bunny ears, glasses, crown, floating hearts
  - Real-time WebSocket sync to stream viewers

### Fixed
- Fixed bare `except` linting error in WebSocket connection manager
- ChatView now imports VideoCallEnhanced instead of old VideoCall component

### Testing
- Backend: 18/18 tests passed (100%)
- Frontend: All UI elements verified
- Test report: `/app/test_reports/iteration_23.json`
- Test file: `/app/backend/tests/test_chat_media_features.py`

---

## Previous Updates (March 2026)

### Live Streaming UI Overhaul
- Effects Studio Panel with 8 tabs (Beauty, Filters, AR, Retouch, Stickers, Music, Voice, Sound)
- Enhanced Gift System with animated gifts and categories
- Camera controls (rotate, mirror, pause)
- Audio controls (mute, noise reduction, voice effects)
- Share to all social networks

### Social Interaction Features
- Like animations with heart burst effect
- Post/Reel settings menu (archive, hide likes/shares, disable comments)
- Universal share sheet to 14 social networks

### UI/UX Improvements
- Universal Search (posts, reels, stories, live, users, hashtags)
- Friend Request System with badge
- Mini Player / Picture-in-Picture
- Reels enhancements (speed control, auto-scroll, follow button)

### Notification Settings
- Comprehensive notification controls for messages, groups, calls, status
- Notification tones, vibration, high priority options
