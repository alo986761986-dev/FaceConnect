# FaceConnect - Render Production Deployment Guide

## Overview
This guide walks you through deploying FaceConnect backend to **Render** (free tier).

---

## Prerequisites

1. **GitHub account** with FaceConnect repo
2. **Render account** - Sign up free at https://render.com
3. **MongoDB Atlas account** - Free tier at https://mongodb.com/atlas

---

## Step 1: Set Up MongoDB Atlas (Free)

### Create Cluster
1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Select **"M0 FREE"** tier
4. Choose cloud provider (AWS recommended) and region closest to you
5. Name your cluster: `faceconnect-cluster`
6. Click **"Create"**

### Create Database User
1. Go to **Database Access** → **Add New Database User**
2. Username: `faceconnect-admin`
3. Password: Generate a strong password (save this!)
4. Role: **Atlas admin**
5. Click **"Add User"**

### Allow Network Access
1. Go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is needed for Render's dynamic IPs
3. Click **"Confirm"**

### Get Connection String
1. Go to **Database** → **Connect** → **Drivers**
2. Copy the connection string:
   ```
   mongodb+srv://faceconnect-admin:<password>@faceconnect-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password
4. Add database name before the `?`:
   ```
   mongodb+srv://faceconnect-admin:YOUR_PASSWORD@faceconnect-cluster.xxxxx.mongodb.net/faceconnect?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy to Render

### Option A: One-Click Blueprint Deploy (Recommended)

1. Go to https://render.com/deploy
2. Connect your GitHub account
3. Select your FaceConnect repository
4. Render will auto-detect `render.yaml`
5. Click **"Apply"**
6. Set the `MONGO_URL` environment variable when prompted

### Option B: Manual Deploy

1. Log in to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `faceconnect-api`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | Your MongoDB Atlas connection string |
   | `DB_NAME` | `faceconnect` |
   | `JWT_SECRET` | (click Generate) |
   | `ALLOWED_ORIGINS` | `*` |

6. Click **"Create Web Service"**

---

## Step 3: Verify Deployment

1. Wait for deployment to complete (2-5 minutes)
2. Your API URL will be: `https://faceconnect-api.onrender.com`
3. Test the health endpoint:
   ```bash
   curl https://faceconnect-api.onrender.com/api/health
   ```
   Should return: `{"status": "healthy"}`

4. Test login:
   ```bash
   curl -X POST https://faceconnect-api.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@test.com", "password": "Test1234!", "username": "testuser", "display_name": "Test"}'
   ```

---

## Step 4: Update Desktop App Build

Once your Render deployment is working, update the GitHub workflow to use your production URL:

### Edit `.github/workflows/build-windows.yml`:
```yaml
$env:REACT_APP_BACKEND_URL="https://faceconnect-api.onrender.com"
```

### Edit `.github/workflows/build-msix.yml`:
```yaml
$env:REACT_APP_BACKEND_URL="https://faceconnect-api.onrender.com"
```

Then rebuild your desktop app.

---

## Step 5: Custom Domain (Optional)

### Add Custom Domain in Render
1. Go to your service → **Settings** → **Custom Domains**
2. Add: `api.faceconnect.com`
3. Render will show DNS records to add

### Configure DNS (at your domain registrar)
Add a CNAME record:
- **Type**: CNAME
- **Name**: `api`
- **Value**: `faceconnect-api.onrender.com`

### Update App to Use Custom Domain
```yaml
$env:REACT_APP_BACKEND_URL="https://api.faceconnect.com"
```

---

## Free Tier Limitations

### Render Free Tier:
- Service spins down after 15 min of inactivity
- First request after sleep takes ~30 seconds (cold start)
- 750 hours/month (plenty for one service)

### MongoDB Atlas Free (M0):
- 512 MB storage
- Shared RAM/CPU
- Perfect for small-medium apps

### Upgrade When Needed:
- Render Starter: $7/month (always on, no cold starts)
- MongoDB M2: $9/month (more storage/performance)

---

## Troubleshooting

### Service won't start
- Check **Logs** in Render dashboard
- Verify `requirements.txt` has all dependencies
- Check `MONGO_URL` is correct

### Database connection errors
- Verify MongoDB Atlas network access allows `0.0.0.0/0`
- Check password doesn't have special characters that need encoding
- Try URL-encoding the password if it has `@`, `#`, etc.

### 405 errors
- Ensure `redirect_slashes=False` is in `server.py`
- Check the backend logs for the actual error

### Cold start slow
- This is normal for free tier
- Consider upgrading to Starter ($7/month) for always-on

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `ALLOWED_ORIGINS` | CORS origins (use `*` or specific domains) | Yes |
| `PORT` | Server port (auto-set by Render) | No |

---

## Quick Reference

| Item | Value |
|------|-------|
| Render Dashboard | https://dashboard.render.com |
| MongoDB Atlas | https://cloud.mongodb.com |
| Your API URL | https://faceconnect-api.onrender.com |
| Health Check | https://faceconnect-api.onrender.com/api/health |

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Update desktop app build URLs
3. ✅ Rebuild and release new .exe
4. ✅ (Optional) Add custom domain
5. ✅ (Optional) Upgrade to paid tier for better performance
