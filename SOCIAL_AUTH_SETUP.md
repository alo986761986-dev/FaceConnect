# Social Authentication Setup Guide

FaceConnect supports three social login providers:

## 1. Google OAuth (Ready to Use)

Google OAuth is powered by Emergent Auth and works out of the box.

**No configuration required!** Just click "Continue with Google" and you're good to go.

---

## 2. Facebook OAuth Setup

To enable Facebook login, you need to create a Facebook Developer App.

### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" or "Business" app type
4. Fill in app name and contact email

### Step 2: Configure Facebook Login
1. In your app dashboard, add "Facebook Login" product
2. Go to Settings → Basic
3. Copy your **App ID** and **App Secret**

### Step 3: Add Valid OAuth Redirect URIs
In Facebook Login → Settings, add:
- `https://your-domain.com/auth/callback`
- For development: `http://localhost:3000/auth/callback`

### Step 4: Add Environment Variables

**Frontend (.env):**
```
REACT_APP_FACEBOOK_APP_ID=your_fb_app_id
```

**Backend (.env):**
```
FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_app_secret
```

### Step 5: Restart Services
```bash
sudo supervisorctl restart backend frontend
```

---

## 3. Apple Sign In Setup

Apple Sign In requires an Apple Developer account ($99/year).

### Step 1: Configure in Apple Developer Portal
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a new App ID with "Sign In with Apple" capability
4. Create a Services ID for web authentication
5. Generate a private key for Sign In with Apple

### Step 2: Collect Required Credentials
- **Client ID**: Your Services ID (e.g., `com.yourapp.signin`)
- **Team ID**: Your Apple Developer Team ID
- **Key ID**: The ID of the private key you generated
- **Private Key**: The `.p8` file contents

### Step 3: Add Environment Variables

**Frontend (.env):**
```
REACT_APP_APPLE_CLIENT_ID=com.yourapp.signin
```

**Backend (.env):**
```
APPLE_CLIENT_ID=com.yourapp.signin
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your private key content...
-----END PRIVATE KEY-----"
```

### Step 4: Configure Redirect URI
In Apple Developer Portal, add your domain as a Return URL:
- `https://your-domain.com/auth/callback`

### Step 5: Restart Services
```bash
sudo supervisorctl restart backend frontend
```

---

## Testing Social Auth

Once configured, test each provider:

1. **Google**: Should work immediately with Emergent Auth
2. **Facebook**: Will redirect to Facebook login, then back to your app
3. **Apple**: Will show Apple's login page (dark themed)

## Troubleshooting

### "Facebook sign-in requires configuration"
- Ensure `REACT_APP_FACEBOOK_APP_ID` is set in frontend `.env`

### "Apple Sign In not configured"
- Ensure all Apple credentials are set in backend `.env`

### OAuth callback fails
- Check that redirect URIs match exactly in provider settings
- Verify environment variables are correctly loaded
- Check browser console and backend logs for detailed errors

---

## Current Status

| Provider | Status | Requirements |
|----------|--------|--------------|
| Google | Ready | None (Emergent Auth) |
| Facebook | Ready | FB App ID + Secret |
| Apple | Ready | Apple Developer Account |

