# 🚀 Production Deployment Guide - Render + MongoDB Atlas

## Prerequisites

✅ GitHub account  
✅ Render account (https://render.com)  
✅ MongoDB Atlas account (https://www.mongodb.com/cloud/atlas)  
✅ Fast2SMS account (https://www.fast2sms.com/)

---

## Step 1: MongoDB Atlas Setup

### 1.1 Create Free Cluster

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up and create a FREE cluster
3. Choose **M0 Sandbox** (Free tier)
4. Select region closest to your users
5. Click **Create Cluster**

### 1.2 Configure Database Access

1. Click **Database Access** in left sidebar
2. Click **Add New Database User**
3. Create username and **STRONG password** (save it!)
4. Set role to **Atlas admin**
5. Click **Add User**

### 1.3 Configure Network Access

1. Click **Network Access** in left sidebar
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for Render)
4. Click **Confirm**

### 1.4 Get Connection String

1. Click **Database** in left sidebar
2. Click **Connect** on your cluster
3. Select **Connect your application**
4. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your credentials
6. Add database name before `?`: 
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tiffinmate?retryWrites=true&w=majority
   ```

**Save this connection string!** You'll need it for Render.

---

## Step 2: Fast2SMS Setup

### 2.1 Get API Key

1. Go to https://www.fast2sms.com/
2. Sign up / Log in
3. Go to **Dev API** section
4. Copy your **API Key**
5. Test the API with a sample SMS

**Save this API key!**

---

## Step 3: GitHub Repository

### 3.1 Push Code to GitHub

```bash
cd backend
git init
git add .
git commit -m "Production ready backend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tiffinmate-backend.git
git push -u origin main
```

---

## Step 4: Deploy to Render

### 4.1 Create Web Service

1. Go to https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `tiffinmate-backend`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Root Directory**: `backend` (if backend is in subfolder)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for production)

### 4.2 Add Environment Variables

Click **Advanced** → **Add Environment Variable** and add these:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tiffinmate?retryWrites=true&w=majority
JWT_SECRET=GENERATE_A_SUPER_LONG_RANDOM_STRING_HERE_USE_PASSWORD_GENERATOR
JWT_EXPIRE=7d
FAST2SMS_API_KEY=your_fast2sms_api_key_here
MEAL_CUTOFF_HOURS=8
DEFAULT_ADMIN_USERID=ADMIN001
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123!
DEFAULT_ADMIN_MOBILE=9876543210
ENABLE_CRON=true
DISABLE_RATE_LIMIT=false
CORS_ORIGIN=*
```

**IMPORTANT**: 
- Generate a strong JWT_SECRET (use https://passwordsgenerator.net/)
- Use real mobile number for DEFAULT_ADMIN_MOBILE
- Change DEFAULT_ADMIN_PASSWORD after first login
- Fast2SMS uses Quick Transactional Route ('q') - NO DLT registration required

### 4.3 Deploy

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Your backend will be live at: `https://tiffinmate-backend.onrender.com`

---

## Step 5: Verify Deployment

### 5.1 Health Check

Visit: `https://tiffinmate-backend.onrender.com/health`

You should see:
```json
{
  "status": "OK",
  "message": "TiffinMate Backend is running",
  "timestamp": "2025-12-27T...",
  "environment": "production"
}
```

### 5.2 Check Logs

1. Go to Render dashboard
2. Click on your service
3. Click **Logs** tab
4. Look for:
   - ✅ MongoDB Connected
   - ✅ Default admin user created
   - ✅ Server running on port...
   - ✅ Starting cron jobs
   - ✅ All cron jobs started

---

## Step 6: Flutter App Configuration

### 6.1 Update API URL

Edit `lib/utils/constants.dart`:

```dart
class AppConstants {
  // Production API
  static const String baseUrl = 'https://tiffinmate-backend.onrender.com';
  
  // Rest of your constants...
}
```

### 6.2 Test Login

1. Run Flutter app
2. Login with:
   - User ID: `ADMIN001`
   - Password: `ChangeThisPassword123!` (or your password)
3. You should receive OTP SMS
4. Verify OTP
5. Change password immediately

---

## Step 7: Post-Deployment Checklist

### ✅ Security

- [ ] Changed default admin password
- [ ] JWT_SECRET is strong and unique
- [ ] MongoDB user has strong password
- [ ] Network access configured correctly
- [ ] CORS origin set properly (not * for production)

### ✅ Functionality

- [ ] Health endpoint responds
- [ ] Login works
- [ ] OTP SMS received
- [ ] Cron jobs running (check logs at scheduled times)
- [ ] API responds to requests
- [ ] Database operations work

### ✅ Monitoring

- [ ] Check Render logs daily
- [ ] Monitor MongoDB metrics
- [ ] Track SMS delivery
- [ ] Watch for errors

---

## Step 8: Custom Domain (Optional)

### 8.1 Add Custom Domain in Render

1. Go to service settings
2. Click **Custom Domains**
3. Add your domain
4. Follow DNS configuration instructions

### 8.2 Update Flutter App

```dart
static const String baseUrl = 'https://api.yourdomain.com';
```

---

## Troubleshooting

### Deployment Failed

- Check build logs for errors
- Verify `package.json` has correct scripts
- Ensure all dependencies in `dependencies` (not devDependencies)

### MongoDB Connection Error

- Verify connection string format
- Check username/password (URL encode special characters)
- Confirm network access allows all IPs
- Check MongoDB Atlas cluster is running

### SMS Not Sending

- Verify Fast2SMS API key
- Check account balance
- Test API key on Fast2SMS dashboard
- Check logs for error messages

### Cron Jobs Not Running

- Check `ENABLE_CRON=true` in environment variables
- Look for cron job start messages in logs
- Wait for scheduled time and check execution
- Render Free tier may sleep - upgrade if needed

### App Can't Connect

- Verify backend URL in Flutter app
- Check CORS configuration
- Ensure backend is deployed and running
- Test health endpoint in browser

---

## Important Notes

### Render Free Tier Limitations

- ⚠️ **Spins down after 15 minutes of inactivity**
- ⚠️ **Cold start takes 30-60 seconds**
- ⚠️ **750 hours/month free** (enough for 1 service 24/7)

**For Production**: Upgrade to paid tier ($7/month) for:
- No spin down
- Faster performance
- Better reliability

### MongoDB Free Tier

- 512 MB storage
- Shared RAM
- Good for 1000+ users
- Upgrade if you need more

### Fast2SMS Costs

- Pay per SMS sent
- Check pricing on dashboard
- Monitor usage regularly

---

## Production Optimization

### 1. Enable Persistent Disk (Render)

For file uploads to persist across deployments:

1. Go to service settings
2. Add **Persistent Disk**
3. Mount path: `/uploads`

### 2. Add Health Check Endpoint

Already configured in your backend:
- Endpoint: `/health`
- Method: GET
- Success: 200 status

### 3. Database Indexing

MongoDB Atlas automatically indexes `_id`.

Add custom indexes for performance:
```javascript
// In models where needed
schema.index({ userId: 1 });
schema.index({ status: 1, endDate: -1 });
```

### 4. Monitoring

Set up in Render:
- **Notifications**: Email on deployment failure
- **Alerts**: CPU/Memory usage
- **Logs**: Enable log retention

---

## Maintenance

### Daily
- Check Render logs for errors
- Monitor MongoDB usage
- Verify SMS delivery

### Weekly
- Review cron job execution logs
- Check subscription expirations
- Monitor payment overdues

### Monthly
- Update dependencies (`npm update`)
- Review MongoDB performance
- Check SMS costs
- Backup database

---

## Support

If you encounter issues:

1. Check Render logs first
2. Verify environment variables
3. Test health endpoint
4. Check MongoDB connection
5. Verify SMS API key

**Backend is now PRODUCTION READY! 🚀**
