# 🚀 Render Deployment & Database Seeding Guide

## Problem Solved
✅ Fixed 404 error for `/api/subscription-plans`
✅ Created production seed script for subscription plans
✅ Backend route properly registered

---

## 🔥 STEP 1: Verify Render Deployment

Render auto-deploys when you push to `main` branch.

**Check deployment status:**
1. Go to: https://dashboard.render.com
2. Click on your `tiffinmate-pro` service
3. Wait for "Deploy succeeded" message (usually 2-3 minutes)

---

## 🔥 STEP 2: Seed Production Database (CRITICAL)

Once Render deployment is complete, you MUST seed the database.

### Option A: Via Render Shell (Recommended)

1. Go to Render Dashboard → Your Service
2. Click **"Shell"** tab
3. Run this command:
```bash
node seedProductionPlans.js
```

4. You should see:
```
✓ Connected to MongoDB successfully
✓ Inserted 10 subscription plans
✅ PRODUCTION subscription plans seeded successfully!
```

### Option B: Via Render Deploy Hook (Alternative)

Add this to your `package.json` scripts:
```json
{
  "scripts": {
    "seed": "node seedProductionPlans.js"
  }
}
```

Then in Render Settings → Build & Deploy → Build Command:
```
npm install && npm run seed
```

---

## 🔥 STEP 3: Test the API

### Test 1: Check if plans exist
```bash
curl https://tiffinmate-pro.onrender.com/api/subscription-plans
```

**Expected Response:**
```json
{
  "success": true,
  "count": 10,
  "plans": [
    {
      "name": "daily-lunch",
      "displayName": "Daily Lunch",
      "totalPrice": 100,
      ...
    }
  ]
}
```

### Test 2: Filter by duration
```bash
curl "https://tiffinmate-pro.onrender.com/api/subscription-plans?durationType=monthly"
```

### Test 3: From Flutter
Open Add Customer screen → Plans should load automatically!

---

## 🔥 STEP 4: Verify Flutter Integration

1. **Run Flutter Web:**
```bash
cd "e:\SCHOOL PROJECT\tiffinmate"
flutter run -d chrome
```

2. **Login as Owner:**
   - User ID: `owner1` or `ADMIN001`
   - Password: (your password)

3. **Go to Add Customer Screen**

4. **Verify:**
   - ✅ Subscription plans load (no 404 error)
   - ✅ 10 plans visible (Daily/Weekly/Monthly)
   - ✅ Can select a plan
   - ✅ Price updates instantly
   - ✅ Can create customer

---

## 📊 Available Plans

| Plan | Duration | Meals | Price | Per Day |
|------|----------|-------|-------|---------|
| Daily Lunch | 1 day | Lunch | ₹100 | ₹100 |
| Daily Dinner | 1 day | Dinner | ₹120 | ₹120 |
| Daily Both | 1 day | Both | ₹180 | ₹180 |
| Weekly Lunch | 7 days | Lunch | ₹630 | ₹90 |
| Weekly Dinner | 7 days | Dinner | ₹770 | ₹110 |
| Weekly Both | 7 days | Both | ₹1,190 | ₹170 |
| Monthly Lunch | 30 days | Lunch | ₹2,400 | ₹80 |
| Monthly Dinner | 30 days | Dinner | ₹3,000 | ₹100 |
| **Monthly Both** | 30 days | Both | **₹4,500** | ₹150 |
| Trial | 1 day | Both | ₹0 | FREE |

---

## 🐛 Troubleshooting

### Issue: Still getting 404
**Solution:** Render hasn't deployed yet. Wait 2-3 minutes and check deployment logs.

### Issue: Empty plans array `[]`
**Solution:** Database not seeded. Run `node seedProductionPlans.js` in Render Shell.

### Issue: "MONGODB_URI not set"
**Solution:** Add environment variable in Render Dashboard → Environment tab.

### Issue: Flutter still shows error
**Solution:** 
1. Hard reload: `Ctrl + Shift + R` in Chrome
2. Clear cache
3. Restart Flutter app

---

## 🎉 Success Checklist

- ✅ Backend deployed to Render
- ✅ Route `/api/subscription-plans` returns 200
- ✅ Database has 10 subscription plans
- ✅ Flutter loads plans without 404
- ✅ Owner can create customers with subscriptions
- ✅ Pricing updates dynamically

---

## 📝 Files Changed

1. ✅ `backend/server.js` - Added subscription-plans route
2. ✅ `backend/routes/subscriptionPlanRoutes.js` - New route file
3. ✅ `backend/controllers/subscriptionPlanController.js` - Controller
4. ✅ `backend/seedProductionPlans.js` - Production seed script
5. ✅ `lib/screens/owner/owner_add_customer_screen.dart` - Clean rewrite

---

## 🚀 Next Steps

1. **Deploy to Render** (auto-deploys on git push) ✅ DONE
2. **Run seed script** on Render Shell
3. **Test in Flutter** - Add Customer flow
4. **Create first customer** with subscription
5. **Verify in database** that data is created

---

**Need help?** Check Render logs for detailed error messages.
