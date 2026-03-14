# FaceConnect - Facial Recognition Social Tracker

## Original Problem Statement
Create a facial recognition app that includes for each person how many social networks they have.

## User Choices
- **Social Networks**: Facebook, Instagram, TikTok, Snapchat, X, LinkedIn, Discord, Reddit, Pinterest, YouTube, WhatsApp, Telegram (12 total)
- **Face Detection**: Client-side simulation (no AI service)
- **Social Entry**: Manual input with toggle switches
- **Theme**: Dark modern with neon accents

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB driver)
- **Database**: MongoDB

## Core Requirements
1. Upload photos per person
2. Track social network presence (12 platforms)
3. Display social network count per person
4. Search and filter persons
5. CRUD operations for persons

## What's Been Implemented (Jan 2026)
### Backend
- Person model with social networks array and face_descriptor field
- CRUD endpoints: GET/POST/PUT/DELETE /api/persons
- Stats endpoint: GET /api/stats
- Health check endpoint
- **Messages/Notes endpoints**: POST/GET /api/persons/{id}/messages, DELETE /api/persons/{id}/messages/{msg_id}
- **Face Matching endpoint**: POST /api/face-match - Euclidean distance matching
- Cascade delete: removing a person deletes all their notes

### Frontend
- Dashboard with stats cards (Total Persons, Social Connections, Active Platforms)
- Add Person modal with photo upload, name input, social toggles
- **Real face detection**: Extracts 128-dimensional face descriptor when uploading photo
- Person cards in bento grid layout
- Person detail page with edit/delete functionality
- **Private Notes section**: Write and manage personal notes about each person
- **Face Scanner**: Camera-based face scanning to identify/match persons in database
- Search functionality
- Dark theme with neon cyan (#00F0FF) and purple (#7000FF) accents

### Face Recognition Features
- face-api.js integration for client-side face detection
- TinyFaceDetector for fast face detection
- 128-dimensional face embeddings for recognition
- Euclidean distance matching with confidence scores
- Camera-based scanning via WebRTC
- **Bulk gallery scanning**: Upload multiple images, scan all at once
- Progress tracking and per-image status indicators

### UI Components
- PersonCard - displays person with photo, name, social count
- StatsCard - animated stat display
- SocialIcon - platform-specific icons

## Prioritized Backlog
### P0 (Complete)
- [x] Person CRUD operations
- [x] Social network tracking
- [x] Dashboard with stats
- [x] Photo upload

### P1 (Future)
- [ ] Real face detection AI integration (cloud service)
- [ ] Face comparison/matching improvements
- [ ] Social media API verification
- [ ] Bulk import

### P2 (Nice to have)
- [ ] Export data to CSV/PDF
- [ ] Person groups/categories
- [ ] Activity timeline
- [ ] Dark/Light theme toggle
- [ ] Push notifications (server-side)
- [ ] Biometric authentication

### PWA & Mobile Features (Implemented)
- [x] Progressive Web App (installable)
- [x] Service worker with offline caching
- [x] Mobile-responsive UI
- [x] Bottom navigation with FAB
- [x] Pull-to-refresh gesture
- [x] Haptic feedback (vibration)
- [x] Share API integration
- [x] Network status indicator
- [x] Safe area insets for notched devices
- [x] Touch-optimized interactions

## Next Tasks
1. Integrate real face detection (face-api.js or cloud service)
2. Add person categories/tags
3. Export functionality
