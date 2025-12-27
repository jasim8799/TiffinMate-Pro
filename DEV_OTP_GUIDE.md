# Development OTP Bypass Guide

## ⚠️ TEMPORARY FEATURE FOR TESTING ONLY

This guide explains the dev OTP feature that allows admin testing without Fast2SMS costs.

---

## Overview

**Purpose:** Allow OWNER (admin) role to login with a fixed OTP during development/testing without sending real SMS.

**Security:** Customers and delivery agents ALWAYS use real SMS OTP (no bypass).

---

## Environment Setup

### Enable Dev OTP (Development/Testing)

Add to your `.env` file or Render environment variables:

```env
DEV_OTP_ENABLED=true
```

### Disable Dev OTP (Production)

Set to false or remove the variable:

```env
DEV_OTP_ENABLED=false
```

Or simply remove the variable entirely.

---

## How It Works

### Login Flow with Dev OTP

1. **Admin Login:**
   - UserID: `ADMIN001`
   - Password: `Admin@123`
   - Backend checks: `role === 'owner'` AND `DEV_OTP_ENABLED === 'true'`
   - **Result:** Fixed OTP `111111` generated, **NO SMS sent**

2. **Customer/Delivery Login:**
   - UserID: `CUST001`
   - Password: `Customer@123`
   - Backend checks: `role === 'customer'` (not owner)
   - **Result:** Random 6-digit OTP generated, **SMS sent via Fast2SMS**

### OTP Verification

| User Role | OTP Entered | DEV_OTP_ENABLED | Result |
|-----------|-------------|-----------------|--------|
| OWNER | 111111 | true | ✅ Accepted |
| OWNER | 111111 | false | ❌ Rejected |
| OWNER | 123456 (real) | true/false | ✅ Accepted (if valid) |
| CUSTOMER | 111111 | true | ❌ Rejected (security) |
| CUSTOMER | 123456 (real) | true/false | ✅ Accepted (if valid) |
| DELIVERY | 111111 | true | ❌ Rejected (security) |

---

## Security Features

✅ **Role-Based:** Dev OTP ONLY works for OWNER role  
✅ **Environment-Controlled:** Requires explicit `DEV_OTP_ENABLED=true`  
✅ **Customer Protection:** Customers/delivery ALWAYS use real SMS  
✅ **No Hardcoding:** No mobile numbers or OTPs hardcoded  
✅ **Safe Logging:** OTP values never logged, only events  
✅ **Expiry Rules:** Dev OTP still respects 2-minute expiry and 3-attempt limit  

---

## Testing Instructions

### Test Admin Login with Dev OTP

```bash
# 1. Set environment variable
DEV_OTP_ENABLED=true

# 2. Login request
POST /api/auth/login
{
  "userId": "ADMIN001",
  "password": "Admin@123"
}

# 3. Response (NO SMS SENT)
{
  "success": true,
  "message": "OTP sent successfully to ******0471"
}

# 4. Verify with dev OTP
POST /api/auth/verify-otp
{
  "userId": "ADMIN001",
  "otp": "111111"
}

# 5. Success!
{
  "success": true,
  "token": "eyJhbGc...",
  "data": { ... }
}
```

### Test Customer Login (Real SMS)

```bash
# 1. Customer login (always uses real SMS regardless of DEV_OTP_ENABLED)
POST /api/auth/login
{
  "userId": "CUST001",
  "password": "Customer@123"
}

# 2. SMS sent to customer's registered mobile
# 3. Customer must enter REAL OTP from SMS
# 4. Dev OTP (111111) will be REJECTED for customers
```

---

## Production Deployment

### Before Going Live

1. **Disable Dev OTP:**
   ```env
   DEV_OTP_ENABLED=false
   ```
   Or remove the variable entirely.

2. **Verify:** All users (including admin) will use real SMS OTP.

3. **Test:** Confirm admin cannot use `111111` in production.

---

## Code Locations

### User Model
**File:** `backend/models/User.js`
- `generateDevOTP()` method - Generates fixed OTP 111111

### Auth Controller
**File:** `backend/controllers/authController.js`
- `login()` method - Checks role and DEV_OTP_ENABLED, skips SMS for admin
- `verifyOTP()` method - Validates dev OTP only for OWNER role

---

## Logs to Watch

```
✅ DEV OTP mode: Fixed OTP generated for admin user ADMIN001
✅ DEV OTP mode: Dev OTP accepted for admin user ADMIN001
```

**Note:** Actual OTP value is NEVER logged for security.

---

## FAQ

**Q: Can customers use dev OTP?**  
A: No. Dev OTP (111111) is rejected for customer/delivery roles.

**Q: What if I forget to disable dev OTP in production?**  
A: Only admin can use it, and only if `DEV_OTP_ENABLED=true`. Customers are not affected.

**Q: Does dev OTP expire?**  
A: Yes. It still follows the 2-minute expiry and 3-attempt limit rules.

**Q: Why use 111111 instead of random OTP?**  
A: Easy to remember for testing. Real production will use random OTP via SMS.

**Q: Can I change the dev OTP value?**  
A: Yes, edit `generateDevOTP()` method in User.js, but keep it simple for testing.

---

## Removal Plan (Future)

When ready for full production (all users via SMS):

1. Remove `generateDevOTP()` method from User.js
2. Remove dev OTP logic from authController.js (login and verifyOTP)
3. Remove `DEV_OTP_ENABLED` from environment variables
4. Delete this guide

---

**Last Updated:** December 27, 2025  
**Status:** ACTIVE (Development Feature)
