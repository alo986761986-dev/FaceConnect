# FaceConnect Android APK Build Guide

## Prerequisites
1. **Android Studio** installed (latest version)
2. **Node.js 18+** and **Yarn** installed
3. **Java JDK 17+** installed

## Quick Build Steps

### Step 1: Build the React App
```bash
cd frontend
yarn install
yarn build
```

### Step 2: Sync with Capacitor
```bash
npx cap sync android
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

### Step 4: Build APK in Android Studio
1. Wait for Gradle sync to complete
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Or for signed release: **Build** → **Generate Signed Bundle / APK**

### Step 5: Find Your APK
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

## First Time Setup

If the `android` folder doesn't exist:
```bash
cd frontend
yarn build
npx cap add android
npx cap sync android
```

## Signing for Release

### Create a Keystore (one-time)
```bash
keytool -genkey -v -keystore faceconnect-release-key.keystore -alias faceconnect -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing in `android/app/build.gradle`
Add to `android { }` block:
```gradle
signingConfigs {
    release {
        storeFile file('faceconnect-release-key.keystore')
        storePassword 'your-store-password'
        keyAlias 'faceconnect'
        keyPassword 'your-key-password'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

## App Icon & Splash Screen

Icons are automatically picked up from:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

To update icons:
1. Create icons in all sizes (48x48 to 512x512)
2. Replace files in `mipmap-*` folders
3. Or use Android Studio: Right-click `res` → **New** → **Image Asset**

## Permissions

The app requests these permissions (configured in `AndroidManifest.xml`):
- `INTERNET` - Network access
- `CAMERA` - Face scanning, video calls
- `RECORD_AUDIO` - Voice messages, calls
- `ACCESS_FINE_LOCATION` - Location sharing
- `WRITE_EXTERNAL_STORAGE` - Saving photos
- `VIBRATE` - Haptic feedback

## Troubleshooting

### Gradle Sync Failed
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Build Errors
1. Check Java version: `java -version` (needs JDK 17+)
2. Update Gradle: Android Studio → **File** → **Project Structure** → **Project**
3. Invalidate caches: **File** → **Invalidate Caches / Restart**

### Capacitor Issues
```bash
npm install -g @capacitor/cli@latest
npx cap sync android --force
```

## Testing

### On Emulator
1. Android Studio → **Tools** → **Device Manager**
2. Create emulator (Pixel 6, API 33+)
3. Run app with green play button

### On Physical Device
1. Enable **Developer Options** on your phone
2. Enable **USB Debugging**
3. Connect via USB
4. Select device in Android Studio
5. Run app

## Building for Google Play

1. Build signed AAB (not APK):
   **Build** → **Generate Signed Bundle / APK** → **Android App Bundle**

2. Upload to Google Play Console:
   - Create app listing
   - Upload AAB file
   - Complete store listing
   - Submit for review

## File Locations
- Source: `frontend/build/` (compiled React app)
- Android project: `frontend/android/`
- APK output: `frontend/android/app/build/outputs/apk/`
- Keystore: Keep secure, never commit to git!
