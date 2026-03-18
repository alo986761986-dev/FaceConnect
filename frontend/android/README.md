# FaceConnect Android Build Guide

## Building for Google Play Store

### Prerequisites
1. Android Studio (for local builds)
2. Java JDK 17+
3. Google Play Developer Account ($25 one-time fee)

### Automated Build (GitHub Actions)
The Android APK/AAB is automatically built via GitHub Actions when you push to the main branch.

**Workflow file:** `.github/workflows/build-android.yml`

**Artifacts produced:**
- `FaceConnect-debug-apk` - Debug APK for testing
- `FaceConnect-release-apk` - Release APK (unsigned)
- `FaceConnect-release-aab` - Release AAB for Play Store

### To Download Build Artifacts:
1. Go to GitHub → Actions → "Build Android APK/AAB"
2. Click on the latest successful run
3. Download artifacts from the "Artifacts" section

### For Play Store Release (Signed Build)

1. **Generate a Keystore** (one-time):
```bash
keytool -genkey -v -keystore faceconnect-release.keystore -alias faceconnect -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing** in `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('faceconnect-release.keystore')
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias 'faceconnect'
        keyPassword System.getenv("KEY_PASSWORD")
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

3. **Add GitHub Secrets**:
   - `KEYSTORE_PASSWORD` - Your keystore password
   - `KEY_PASSWORD` - Your key password
   - `KEYSTORE_BASE64` - Base64 encoded keystore file

### Play Store Listing Requirements

1. **Store Listing:**
   - App title: FaceConnect
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - Screenshots (min 2, max 8)
   - Feature graphic (1024 x 500)
   - App icon (512 x 512)

2. **Content Rating:**
   - Complete IARC questionnaire in Play Console

3. **Privacy Policy:**
   - Required URL for apps that handle personal data

4. **App Category:**
   - Social

### Version Management
- `versionCode`: Integer, increment with each release (1, 2, 3...)
- `versionName`: User-visible version string (1.0.0, 1.1.0...)

Edit in `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 1
    versionName "1.0.0"
}
```

### Testing Before Release
1. Download debug APK from GitHub Actions
2. Install on Android device: `adb install app-debug.apk`
3. Test all features
4. Submit release AAB to Play Console

## App Configuration

**Package name:** `com.faceconnect.app`
**Min SDK:** 22 (Android 5.1)
**Target SDK:** 34 (Android 14)

## Required Permissions
- INTERNET - Network access
- CAMERA - Face recognition, photo capture
- RECORD_AUDIO - Voice messages, video calls
- ACCESS_FINE_LOCATION - Location sharing
- VIBRATE - Haptic feedback
- POST_NOTIFICATIONS - Push notifications
