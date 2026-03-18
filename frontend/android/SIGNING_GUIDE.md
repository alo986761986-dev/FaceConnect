# Android Signing Setup Guide

## Step 1: Generate a Keystore (One-time setup)

Run this command on your local machine to create a keystore:

```bash
keytool -genkey -v -keystore faceconnect-release.keystore -alias faceconnect -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- **Keystore password**: Choose a strong password (save this!)
- **Key password**: Can be same as keystore password
- **Name, Organization, etc.**: Fill in your details

**⚠️ IMPORTANT: Keep this keystore file safe! If you lose it, you cannot update your app on Play Store.**

## Step 2: Convert Keystore to Base64

```bash
# On Mac/Linux
base64 -i faceconnect-release.keystore > keystore_base64.txt

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("faceconnect-release.keystore")) > keystore_base64.txt
```

## Step 3: Add GitHub Secrets

Go to your GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these 4 secrets:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | Contents of keystore_base64.txt (the entire base64 string) |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_ALIAS` | `faceconnect` (or whatever alias you used) |
| `KEY_PASSWORD` | Your key password |

## Step 4: Trigger the Build

After adding secrets:
1. Push any change to the `main` branch, OR
2. Go to **Actions** → **Build Android APK/AAB** → **Run workflow**

## Step 5: Download Signed AAB

1. Go to **Actions** → Latest workflow run
2. Download **"FaceConnect-release-aab"** artifact
3. The `.aab` file inside is signed and ready for Play Store!

## Uploading to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create new)
3. Go to **Release** → **Production** (or Testing track)
4. Click **"Create new release"**
5. Upload your signed `.aab` file
6. Fill in release notes
7. Review and roll out

## Troubleshooting

### "Keystore was tampered with, or password was incorrect"
- Double-check KEYSTORE_PASSWORD secret
- Make sure base64 encoding didn't add extra characters

### "No key with alias found"
- Verify KEY_ALIAS matches what you used in keytool command

### Build succeeds but AAB is unsigned
- Check that all 4 secrets are configured correctly
- Secrets are case-sensitive

## Security Notes

- Never commit keystore files to git
- Use strong, unique passwords
- Store keystore backup securely (e.g., encrypted cloud storage)
- GitHub secrets are encrypted and not visible in logs
