# FaceConnect - Microsoft Store Submission Guide

## Overview
This guide walks you through publishing FaceConnect to the Microsoft Store using MSIX packaging.

---

## Prerequisites

### 1. Microsoft Partner Center Account
- **Cost**: $19 USD one-time registration fee
- **Sign up**: https://partner.microsoft.com/dashboard
- **Requirements**: Microsoft account, valid payment method

### 2. Publisher Identity
After registering, you'll receive a **Publisher ID** that looks like:
```
CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```
You'll need this for the MSIX package configuration.

---

## Step 1: Update Publisher ID

Edit `frontend/package.json` and replace the placeholder publisher:

```json
"appx": {
  "publisher": "CN=YOUR_ACTUAL_PUBLISHER_ID",
  ...
}
```

Replace `CN=YOUR_PUBLISHER_ID` with your actual Publisher ID from Partner Center.

---

## Step 2: Build the MSIX Package

### Option A: Using GitHub Actions (Recommended)
1. Go to your GitHub repo → **Actions**
2. Select **"Build MSIX for Microsoft Store"**
3. Click **"Run workflow"**
4. Enter the version number (e.g., `2.5.5`)
5. Click **"Run workflow"**
6. Download the MSIX artifact when complete

### Option B: Build Locally
```bash
cd frontend
yarn install
yarn build
yarn electron:build:msix
```
The MSIX file will be in `frontend/dist/`

---

## Step 3: Create App in Partner Center

1. Go to https://partner.microsoft.com/dashboard
2. Click **"Apps and games"** → **"New product"** → **"App"**
3. Reserve your app name: **"FaceConnect"**

### App Identity
After creating the app, note these values:
- **Package/Identity/Name**
- **Package/Identity/Publisher**
- **Package/Properties/PublisherDisplayName**

---

## Step 4: Configure Store Listing

### Properties
- **Category**: Social
- **Sub-category**: Social networking
- **Privacy policy URL**: (your privacy policy URL)
- **Website**: (your website URL)

### Age Ratings
Complete the IARC questionnaire for age rating.

### Store Listing (en-US)

**Product name**: FaceConnect

**Short description** (100 chars max):
```
Connect with friends through facial recognition. Share, chat, and video call.
```

**Description** (10,000 chars max):
```
FaceConnect is a modern social networking app that brings people together through innovative facial recognition technology.

KEY FEATURES:

🎥 Video & Voice Calls
- Crystal-clear HD video calls
- Secure voice calls with end-to-end encryption
- Screen sharing for presentations
- TURN server support for reliable connections

💬 Messaging
- Real-time chat with friends
- Group conversations
- Media sharing (photos, videos, files)
- Read receipts and typing indicators

👥 Social Features
- Create and share posts
- Like, comment, and share content
- Follow friends and discover new people
- Stories and Reels

🔒 Privacy & Security
- End-to-end encrypted calls
- Secure authentication
- Privacy controls for your content

🎨 Customization
- Dark and light themes
- Notification preferences
- Profile personalization

FaceConnect works seamlessly across all your devices - desktop, mobile, and web.

Download now and start connecting!
```

**Search terms** (7 terms, 30 chars each):
```
social network
video call
messaging
chat app
face recognition
friends
connect
```

### Screenshots
Required sizes:
- **Desktop**: 1366×768 or 1920×1080 (minimum 2, maximum 10)
- Capture the app showing:
  1. Home feed
  2. Chat/messaging
  3. Video call interface
  4. Profile page
  5. Settings

### App Icon
- **Store logo**: 300×300 PNG
- **Tile images**: Various sizes (provided in submission UI)

---

## Step 5: Upload MSIX Package

1. In Partner Center, go to your app → **"Packages"**
2. Click **"Upload"**
3. Select your `.appx` file from `frontend/dist/`
4. Wait for processing and validation

### Common Issues:
- **Publisher mismatch**: Ensure `package.json` publisher matches Partner Center
- **Version conflict**: Increment version number for each submission
- **Missing assets**: Include all required tile images

---

## Step 6: Submit for Certification

1. Review all sections have green checkmarks
2. Click **"Submit to the Store"**
3. Wait for certification (typically 1-3 business days)

### Certification Requirements:
- App must launch without crashes
- All features must work as described
- No placeholder content
- Privacy policy must be accessible
- Age rating must be accurate

---

## Step 7: Post-Submission

### After Approval:
- App will be live in Microsoft Store within 24 hours
- Monitor reviews and respond to feedback
- Plan regular updates

### If Rejected:
- Review the certification report
- Fix noted issues
- Resubmit

---

## Updating Your App

1. Increment version in `package.json`:
   ```json
   "version": "2.5.6"
   ```

2. Build new MSIX package

3. In Partner Center:
   - Create new submission
   - Upload new package
   - Update release notes
   - Submit for certification

---

## Store Assets Checklist

| Asset | Size | Required |
|-------|------|----------|
| Store logo | 300×300 | Yes |
| Screenshot (Desktop) | 1366×768+ | Yes (min 2) |
| Square 44 tile | 44×44 | Yes |
| Square 150 tile | 150×150 | Yes |
| Wide 310 tile | 310×150 | Yes |
| Square 310 tile | 310×310 | Recommended |

---

## Pricing

You can set your app as:
- **Free**: No charge to download
- **Paid**: Set your price (Microsoft takes 15-30% commission)
- **Free with in-app purchases**: Combine with Stripe integration

---

## Support

For Microsoft Store submission issues:
- Partner Center Support: https://partner.microsoft.com/support
- Documentation: https://docs.microsoft.com/windows/uwp/publish/

---

## Quick Reference

| Item | Value |
|------|-------|
| App ID | com.faceconnect.app |
| Publisher | CN=YOUR_PUBLISHER_ID |
| Package Name | FaceConnect |
| Min Windows Version | Windows 10 1809+ |
| Architecture | x64 |
