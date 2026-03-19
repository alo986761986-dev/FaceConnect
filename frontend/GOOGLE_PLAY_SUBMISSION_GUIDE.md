# Google Play Store Submission Guide

## Quick Checklist

- [ ] Save code to GitHub
- [ ] Add Android signing secrets
- [ ] Run Android build workflow
- [ ] Download AAB file from artifacts
- [ ] Create Google Play Console listing
- [ ] Upload AAB and assets
- [ ] Submit for review

---

## Step 1: Build the Signed AAB

### Add GitHub Secrets
Go to: `GitHub Repo → Settings → Secrets and variables → Actions`

Add these 4 secrets:

| Secret Name | Description |
|-------------|-------------|
| `KEYSTORE_BASE64` | Base64-encoded keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | Key password |

### Get KEYSTORE_BASE64
On your machine with the keystore file:

**macOS/Linux:**
```bash
base64 -w 0 upload-keystore.jks
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks"))
```

### Run the Build
1. Go to `Actions` tab
2. Select `Build Android APK/AAB`
3. Click `Run workflow`
4. Wait for completion (~5-10 min)
5. Download `app-release.aab` from artifacts

---

## Step 2: Google Play Console

### Create App
1. Go to [Google Play Console](https://play.google.com/console)
2. Click `Create app`
3. Fill in:
   - App name: `FaceConnect - Social Network`
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
   - Accept policies

### Store Listing

**Main Store Listing:**
- App name: `FaceConnect - Social Network`
- Short description: `Connect with friends, share moments, and discover amazing content. Your social hub!`
- Full description: (See PLAY_STORE_LISTING.md)

**Graphics:**
| Asset | Size | File |
|-------|------|------|
| App icon | 512x512 | Download from generated image |
| Feature graphic | 1024x500 | Download from generated image |
| Phone screenshots | 1080x1920 | 6 screenshots captured |

### App Content

**Privacy Policy:**
```
https://profile-connector-3.preview.emergentagent.com/privacy
```

**App Access:**
- Select: All functionality is available without special access

**Ads:**
- Select: No, this app does not contain ads

**Content Rating:**
- Complete the questionnaire
- Category: Social/Communication
- Expected rating: Teen or Mature

**Target Audience:**
- Select: 18 and over
- Reason: Social networking with user-generated content

**News Apps:**
- Select: No

**COVID-19 Contact Tracing:**
- Select: No

**Data Safety:**
Fill out based on actual data collection:
- User account information: Yes (collected)
- Photos and videos: Yes (if user uploads)
- Messages: Yes (chat feature)
- Location: Optional

### Release

**Create Production Release:**
1. Go to `Release → Production`
2. Click `Create new release`
3. Upload `app-release.aab`
4. Add release notes:
```
🚀 FaceConnect v2.5.2

New Features:
• Connect with friends through posts and messages
• Gaming section with instant games
• Marketplace for buying and selling
• Groups to join communities
• Stories and Reels
• Video and voice calls

Privacy & Security:
• End-to-end encryption indicators
• Privacy controls
• Block and report features
```

5. Click `Review release`
6. Click `Start rollout to Production`

---

## Step 3: Review Process

### Timeline
- Initial review: 1-3 days (first submission may take longer)
- Subsequent updates: Usually within 24 hours

### Common Rejection Reasons & Solutions

| Issue | Solution |
|-------|----------|
| Missing privacy policy | ✅ Already have: /privacy |
| Impersonation | Don't mention "Facebook" anywhere |
| Broken functionality | Test all features before submission |
| Inappropriate content | Ensure content moderation is working |
| Missing permissions explanation | Explain camera use in privacy policy |

### If Rejected
1. Read the rejection email carefully
2. Fix the issues mentioned
3. Resubmit with explanation of fixes

---

## Assets Download Links

### Generated Images
- **App Icon (512x512):** https://static.prod-images.emergentagent.com/jobs/33ed20c7-e819-4633-a2e9-2bb95a5b1fad/images/d5dc73ff7f84901b2f982507741f5ba3c6d1a12ae3b6719c8b059a721ea7e262.png
- **Feature Graphic (1024x500):** https://static.prod-images.emergentagent.com/jobs/33ed20c7-e819-4633-a2e9-2bb95a5b1fad/images/d0f0c54afd2f9e9bc77036e01ac5b4e5c5b7aa1c552b9f0cf5fea32e31dac59b.png

### Screenshots (capture from device or use provided)
Take screenshots from a real Android device for best results, showing:
1. Home Feed
2. Messages/Chat
3. Gaming
4. Marketplace
5. Groups
6. Profile

---

## Test Account for Reviewers

If Google requests test access:
- Email: `reviewer@faceconnect.app`
- Password: `ReviewTest123!`

(Create this account before submission)

---

## Support Contact

For Play Store listing:
- Developer email: support@faceconnect.app
- Website: https://faceconnect.app
- Privacy policy: https://profile-connector-3.preview.emergentagent.com/privacy

---

## Version Info

- Package name: `com.faceconnect.app`
- Version code: 2
- Version name: 2.5.2
- Min SDK: 22 (Android 5.1)
- Target SDK: 35 (Android 15)
