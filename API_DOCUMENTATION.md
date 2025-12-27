# 📱 Flutter API Integration Guide

## Base URL

```dart
// Production
static const String baseUrl = 'https://tiffinmate-backend.onrender.com';

// Development
static const String baseUrl = 'http://localhost:5000';
```

---

## Authentication Flow

### 1. Login (Step 1: Credentials)

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "userId": "ADMIN001",
  "password": "Admin@123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "userId": "ADMIN001",
    "mobile": "9876543210",
    "otpExpiry": "2025-12-27T10:32:00.000Z",
    "requiresPasswordChange": false
  }
}
```

**Errors**:
- `400`: Missing userId or password
- `401`: Invalid credentials
- `403`: Account disabled
- `429`: Too many login attempts (rate limited)

---

### 2. Verify OTP (Step 2: Complete Login)

**Endpoint**: `POST /api/auth/verify-otp`

**Request**:
```json
{
  "userId": "ADMIN001",
  "otp": "123456"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "676...",
      "userId": "ADMIN001",
      "name": "Admin",
      "mobile": "9876543210",
      "role": "owner",
      "isActive": true,
      "isPasswordChanged": true
    },
    "requiresPasswordChange": false
  }
}
```

**Save token in SharedPreferences** and use in all subsequent requests:
```dart
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json'
}
```

**Errors**:
- `400`: Missing userId or OTP / OTP expired / Max attempts exceeded
- `401`: Invalid OTP
- `429`: Too many OTP attempts

---

### 3. Resend OTP

**Endpoint**: `POST /api/auth/resend-otp`

**Request**:
```json
{
  "userId": "ADMIN001"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "otpExpiry": "2025-12-27T10:34:00.000Z"
  }
}
```

---

### 4. Change Password

**Endpoint**: `POST /api/auth/change-password`  
**Auth Required**: Yes

**Request**:
```json
{
  "oldPassword": "Admin@123",
  "newPassword": "NewSecure123!",
  "confirmPassword": "NewSecure123!"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Password Requirements**:
- Minimum 6 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

---

### 5. Request Access (New User)

**Endpoint**: `POST /api/auth/request-access`

**Request**:
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "planType": "monthly",
  "mealPreferences": {
    "vegetarian": true,
    "lunchTime": "13:00",
    "dinnerTime": "20:00"
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Access request submitted successfully",
  "data": {
    "_id": "676...",
    "status": "pending"
  }
}
```

---

## Customer APIs

### Get My Active Subscription

**Endpoint**: `GET /api/subscriptions/my-subscription`  
**Auth Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "676...",
    "user": "676...",
    "planType": "monthly",
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "totalDays": 30,
    "usedDays": 15,
    "remainingDays": 15,
    "status": "active",
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
}
```

**Statuses**: `active`, `expired`, `disabled`, `paused`

---

### Get Today's Delivery

**Endpoint**: `GET /api/deliveries/my-today`  
**Auth Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "676...",
    "user": "676...",
    "deliveryDate": "2025-12-27",
    "meals": {
      "lunch": {
        "selected": true,
        "meal": "Dal, Rice, Roti, Sabzi"
      },
      "dinner": {
        "selected": true,
        "meal": "Paneer, Roti, Dal, Rice"
      }
    },
    "status": "on-the-way",
    "estimatedDeliveryTime": "2025-12-27T13:30:00.000Z",
    "deliveryBoy": {
      "name": "Delivery Boy Name",
      "mobile": "9876543210"
    }
  }
}
```

**Statuses**: `preparing`, `on-the-way`, `delivered`

---

### Get My Deliveries (Calendar Data)

**Endpoint**: `GET /api/deliveries/my-deliveries?startDate=2025-12-01&endDate=2025-12-31`  
**Auth Required**: Yes

**Query Params**:
- `startDate`: ISO date (optional, defaults to current month)
- `endDate`: ISO date (optional, defaults to current month)

**Response (200)**:
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "676...",
      "deliveryDate": "2025-12-27",
      "status": "delivered",
      "meals": { "lunch": { "selected": true }, "dinner": { "selected": true } }
    },
    {
      "_id": "676...",
      "deliveryDate": "2025-12-26",
      "status": "delivered",
      "meals": { "lunch": { "selected": true }, "dinner": { "selected": true } }
    }
  ]
}
```

**Use this for calendar color coding**:
- `delivered` = Green
- `on-the-way` = Blue
- `preparing` = Yellow
- No delivery = Red/Grey

---

### Select Meal for Tomorrow

**Endpoint**: `POST /api/meals/select-meal`  
**Auth Required**: Yes

**Request**:
```json
{
  "deliveryDate": "2025-12-28",
  "lunch": "Dal, Rice, Roti, Sabzi, Salad",
  "dinner": "Paneer Butter Masala, Naan, Rice"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Meal selected successfully",
  "data": {
    "_id": "676...",
    "deliveryDate": "2025-12-28",
    "selectedMeal": {
      "lunch": "Dal, Rice, Roti, Sabzi, Salad",
      "dinner": "Paneer Butter Masala, Naan, Rice"
    },
    "cutoffTime": "2025-12-27T15:00:00.000Z",
    "orderDate": "2025-12-27T10:30:00.000Z"
  }
}
```

**Errors**:
- `400`: Cutoff time passed (8 hours before delivery)
- `400`: No active subscription

---

### Get My Meal Selection

**Endpoint**: `GET /api/meals/my-selection?deliveryDate=2025-12-28`  
**Auth Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "lunch": "Dal, Rice, Roti, Sabzi, Salad",
    "dinner": "Paneer Butter Masala, Naan, Rice",
    "cutoffTime": "2025-12-27T15:00:00.000Z",
    "canModify": true
  }
}
```

`canModify` = `false` if cutoff time has passed

---

### Get My Payments

**Endpoint**: `GET /api/payments/my-payments`  
**Auth Required**: Yes

**Response (200)**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "676...",
      "amount": 3000,
      "paidAmount": 3000,
      "pendingAmount": 0,
      "paymentMethod": "upi",
      "paymentStatus": "paid",
      "dueDate": "2025-12-05T00:00:00.000Z",
      "paidDate": "2025-12-03T14:30:00.000Z",
      "upiScreenshot": "/uploads/payment_676...jpg"
    }
  ]
}
```

**Payment Statuses**: `paid`, `pending`, `partial`, `overdue`

---

### Upload UPI Screenshot

**Endpoint**: `POST /api/payments/:id/upload-screenshot`  
**Auth Required**: Yes  
**Content-Type**: `multipart/form-data`

**Request** (FormData):
```dart
FormData formData = FormData.fromMap({
  'screenshot': await MultipartFile.fromFile(
    imagePath,
    filename: 'payment.jpg',
  ),
});
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Screenshot uploaded successfully",
  "data": {
    "upiScreenshot": "/uploads/payment_676...jpg"
  }
}
```

---

## Owner APIs

### Dashboard Stats

**Endpoint**: `GET /api/admin/dashboard-stats`  
**Auth Required**: Yes (Owner only)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "totalCustomers": 45,
    "activeCustomers": 38,
    "inactiveCustomers": 7,
    "totalDeliveriesToday": 38,
    "deliveredToday": 25,
    "pendingDeliveries": 13,
    "todaysRevenue": 15000,
    "monthlyRevenue": 120000,
    "pendingPayments": 25000,
    "overduePayments": 8000,
    "expiringIn7Days": 5
  }
}
```

---

### Get All Customers

**Endpoint**: `GET /api/users/customers`  
**Auth Required**: Yes (Owner only)

**Response (200)**:
```json
{
  "success": true,
  "count": 45,
  "data": [
    {
      "_id": "676...",
      "userId": "CUST001",
      "name": "John Doe",
      "mobile": "9876543210",
      "isActive": true,
      "subscription": {
        "planType": "monthly",
        "remainingDays": 15,
        "status": "active"
      }
    }
  ]
}
```

---

### Today's Deliveries (Kitchen Summary)

**Endpoint**: `GET /api/deliveries/kitchen-summary`  
**Auth Required**: Yes (Owner/Delivery)

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "date": "2025-12-27",
    "totalDeliveries": 38,
    "lunchCount": 35,
    "dinnerCount": 32,
    "bothCount": 29,
    "mealBreakdown": [
      {
        "meal": "Dal, Rice, Roti, Sabzi",
        "count": 20
      },
      {
        "meal": "Paneer, Naan, Rice",
        "count": 15
      }
    ],
    "deliveries": [
      {
        "_id": "676...",
        "user": {
          "name": "John Doe",
          "address": { "street": "...", "city": "..." }
        },
        "meals": { "lunch": true, "dinner": true },
        "status": "preparing"
      }
    ]
  }
}
```

---

### Update Delivery Status

**Endpoint**: `PATCH /api/deliveries/:id/status`  
**Auth Required**: Yes (Owner/Delivery)

**Request**:
```json
{
  "status": "on-the-way"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Delivery status updated and SMS sent",
  "data": {
    "status": "on-the-way",
    "estimatedDeliveryTime": "2025-12-27T13:30:00.000Z"
  }
}
```

**Status Flow**: `preparing` → `on-the-way` → `delivered`

**Auto SMS Sent**:
- `preparing`: "Food being prepared"
- `on-the-way`: "On the way, delivery in 1 hour"
- `delivered`: "Delivered successfully"

---

### Approve Access Request

**Endpoint**: `POST /api/access-requests/:id/approve`  
**Auth Required**: Yes (Owner only)

**Request**:
```json
{
  "userId": "CUST045",
  "tempPassword": "TempPass123",
  "totalDays": 30
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Access approved and credentials sent via SMS",
  "data": {
    "user": {
      "_id": "676...",
      "userId": "CUST045",
      "name": "John Doe"
    },
    "subscription": {
      "_id": "676...",
      "planType": "monthly",
      "startDate": "2025-12-27",
      "endDate": "2026-01-26"
    }
  }
}
```

**SMS auto-sent** to customer with credentials.

---

### Get Access Requests

**Endpoint**: `GET /api/access-requests?status=pending`  
**Auth Required**: Yes (Owner only)

**Query Params**:
- `status`: `pending`, `approved`, `rejected` (optional)

**Response (200)**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "676...",
      "name": "John Doe",
      "mobile": "9876543210",
      "address": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "planType": "monthly",
      "status": "pending",
      "createdAt": "2025-12-27T10:00:00.000Z"
    }
  ]
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

**Common Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid token/credentials)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Server Error

---

## Rate Limits

**OTP Endpoints**: 5 requests per 15 minutes per IP  
**Login Endpoint**: 10 requests per 15 minutes per IP  
**General API**: 100 requests per 15 minutes per IP

When rate limited:
```json
{
  "success": false,
  "message": "Too many requests. Please try again after 15 minutes."
}
```

---

## Date Formats

**All dates in ISO 8601 format**:
- `2025-12-27T10:30:00.000Z` (with time)
- `2025-12-27` (date only for deliveryDate)

**Flutter parsing**:
```dart
DateTime.parse("2025-12-27T10:30:00.000Z");
```

---

## File Uploads

**Supported**: UPI payment screenshots  
**Max Size**: 5MB  
**Formats**: JPG, PNG, JPEG

**Access uploaded files**:
```
https://your-backend-url.onrender.com/uploads/filename.jpg
```

---

## WebSocket / Real-time Updates

**Not implemented yet**. Use polling for now:

- Poll `/api/deliveries/my-today` every 30 seconds for delivery updates
- Poll `/api/subscriptions/my-subscription` on app open

---

## Testing Credentials

**Default Admin**:
- User ID: `ADMIN001`
- Password: Check Render environment variables

**After first login**:
- Change password immediately
- Create test customer accounts via access requests

---

## Integration Checklist

### ✅ Setup
- [ ] Add base URL to constants
- [ ] Implement token storage (SharedPreferences)
- [ ] Add Authorization header to all authenticated requests
- [ ] Handle token expiry (7 days)

### ✅ Authentication
- [ ] Login screen with userId + password
- [ ] OTP screen with 2-minute timer
- [ ] Resend OTP functionality
- [ ] Change password on first login
- [ ] Request access form for new users

### ✅ Customer Features
- [ ] Home dashboard with today's delivery
- [ ] Mini calendar with color-coded dates
- [ ] Meal selection screen with cutoff timer
- [ ] Payment history
- [ ] UPI screenshot upload

### ✅ Owner Features
- [ ] Dashboard with statistics
- [ ] Customer list
- [ ] Today's deliveries / kitchen summary
- [ ] Delivery status updates (trigger SMS)
- [ ] Access request approval
- [ ] Expiring subscriptions

### ✅ Error Handling
- [ ] Show user-friendly error messages
- [ ] Handle network errors
- [ ] Handle 401 (redirect to login)
- [ ] Handle 429 (rate limit message)
- [ ] Handle 500 (try again message)

---

**API is PRODUCTION READY! 🚀**
