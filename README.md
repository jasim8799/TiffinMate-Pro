# TiffinMate Backend - Production Ready 🚀

**Private Tiffin Service Management System - Backend API**

> ✅ Production-hardened | 🔒 Security-first | 📱 SMS-enabled | ⏰ Auto-managed

---

## 🎯 Features

### Authentication & Security
- 🔐 **OTP-based login** with Fast2SMS integration
- 🔑 **JWT authentication** (7-day token expiry)
- 🛡️ **Rate limiting** on sensitive endpoints
- 👥 **Role-based access** (Owner, Customer, Delivery)
- 🚫 **Owner-controlled access** (no public signup)
- ✅ **Input validation** on all endpoints
- 🔒 **Security headers** (Helmet.js)
- 🛑 **NoSQL injection prevention**

### Subscription Management
- 📅 **Daily/Weekly/Monthly** plans
- ⏰ **Auto-expiry detection** (2 days warning)
- 🔕 **Auto-disable** after 1 day of expiry
- ⏸️ **Pause/unpause** subscriptions
- 🔄 **Renewal system**
- 📊 **Usage tracking** (used/remaining days)

### Delivery & Meals
- 🚚 **Delivery tracking** (Preparing → On Way → Delivered)
- 🍽️ **Meal selection** with 8-hour cutoff
- 📱 **Auto SMS** on status updates
- 🧑‍🍳 **Kitchen summary** for preparation
- 📆 **Calendar integration** support

### Payments
- 💰 **Cash payment** tracking
- 📸 **UPI screenshot** upload
- 💳 **Payment statuses** (Paid/Pending/Partial/Overdue)
- ⏰ **Auto overdue reminders**

### Automation
- ⏰ **4 Cron Jobs** running daily:
  - 9:00 AM - Expiring subscriptions check
  - 10:00 AM - Mark expired subscriptions
  - 11:00 AM - Auto-disable services
  - 12:00 PM - Overdue payment reminders
- 📱 **14 SMS notification types**
- 📝 **Complete SMS logging**

### Admin Dashboard
- 📊 **Real-time statistics**
- 👥 **Customer management**
- 🚦 **Access request approval**
- 📈 **Revenue tracking**
- 📅 **Expiring subscriptions view**
- 💰 **Payment overview**

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js v16+ |
| **Framework** | Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Authentication** | JWT + bcryptjs |
| **SMS Service** | Fast2SMS API |
| **Security** | Helmet, Rate Limiter, Mongo Sanitize |
| **File Upload** | Multer |
| **Scheduling** | node-cron |
| **Logging** | Morgan + Custom Logger |
| **Validation** | express-validator |

---

## 📦 Installation

### Prerequisites
- Node.js v16 or higher
- MongoDB Atlas account (or local MongoDB)
- Fast2SMS API key
- Git

### Local Setup

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
```

4. **Edit `.env` file**:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tiffinmate
JWT_SECRET=your_super_secure_secret_key
FAST2SMS_API_KEY=your_fast2sms_api_key
DEFAULT_ADMIN_USERID=ADMIN001
DEFAULT_ADMIN_PASSWORD=Admin@123
DEFAULT_ADMIN_MOBILE=9876543210
```

5. **Start the server**:
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

6. **Verify setup**:
Visit: `http://localhost:5000/health`

Expected response:
```json
{
  "status": "OK",
  "message": "TiffinMate Backend is running",
  "timestamp": "2025-12-27T...",
  "environment": "development"
}
```

---

## 🚀 Production Deployment

### Deploy to Render (Recommended)

**Complete guide**: See [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md)

**Quick steps**:
1. Create MongoDB Atlas cluster (free)
2. Get Fast2SMS API key
3. Push code to GitHub
4. Create Render Web Service
5. Add environment variables
6. Deploy!

**Your backend URL**: `https://your-app-name.onrender.com`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) | Complete API reference for Flutter integration |
| [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md) | Step-by-step deployment to Render |
| [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) | Production readiness verification |
| [`.env.example`](.env.example) | All environment variables explained |

---

## 🔑 Default Credentials

**Admin Account** (auto-created on first run):
- User ID: `ADMIN001` (or from `DEFAULT_ADMIN_USERID`)
- Password: `Admin@123` (or from `DEFAULT_ADMIN_PASSWORD`)

⚠️ **IMPORTANT**: Change password immediately after first login!

---

## 📡 API Endpoints

### Base URL
```
Development: http://localhost:5000
Production: https://your-app-name.onrender.com
```

### Authentication
- `POST /api/auth/login` - Login step 1 (credentials)
- `POST /api/auth/verify-otp` - Login step 2 (OTP)
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/request-access` - Request access (new user)
- `GET /api/auth/me` - Get current user

### Subscriptions
- `GET /api/subscriptions/my-subscription` - My active subscription
- `POST /api/subscriptions` - Create subscription (Owner)
- `PATCH /api/subscriptions/:id/renew` - Renew (Owner)
- `PATCH /api/subscriptions/:id/pause` - Pause/unpause (Owner)

### Deliveries
- `GET /api/deliveries/my-today` - Today's delivery status
- `GET /api/deliveries/my-deliveries` - Calendar data
- `GET /api/deliveries/kitchen-summary` - Kitchen prep (Owner)
- `PATCH /api/deliveries/:id/status` - Update status (Owner)

### Meals
- `POST /api/meals/select-meal` - Select meal for tomorrow
- `GET /api/meals/my-selection` - View selection

### Payments
- `GET /api/payments/my-payments` - Payment history
- `POST /api/payments/:id/upload-screenshot` - Upload UPI screenshot
- `POST /api/payments` - Create payment (Owner)

### Admin (Owner Only)
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/expiring` - Expiring subscriptions
- `POST /api/admin/create-customer` - Create customer

### Access Requests (Owner Only)
- `GET /api/access-requests` - All requests
- `POST /api/access-requests/:id/approve` - Approve
- `POST /api/access-requests/:id/reject` - Reject

**📖 Full API documentation**: See [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)

---

## 🔒 Security Features

### Implemented
✅ Helmet.js security headers  
✅ Rate limiting (OTP, login, API)  
✅ NoSQL injection prevention  
✅ JWT token authentication  
✅ Password hashing (bcrypt)  
✅ Input validation  
✅ Role-based access control  
✅ CORS configuration  
✅ Environment variable secrets  

### Best Practices
- No secrets in code
- Stack traces hidden in production
- Graceful error handling
- Request logging
- SMS logging for audit trail

---

## ⏰ Automated Tasks (Cron Jobs)

| Time | Job | Action |
|------|-----|--------|
| **9:00 AM** | Expiring Check | Send reminder 2 days before expiry |
| **10:00 AM** | Expiry Check | Mark subscriptions as expired |
| **11:00 AM** | Auto-Disable | Disable service 1 day after expiry |
| **12:00 PM** | Payment Check | Send overdue payment reminders |

All cron jobs are:
- ✅ Idempotent (safe to run multiple times)
- ✅ Error-handled (failures don't crash server)
- ✅ Logged (execution tracked)
- ✅ Render-compatible (no worker process needed)

**Disable cron jobs**: Set `ENABLE_CRON=false` in environment

---

## 📱 SMS Notifications (14 Types)

### User Actions
- OTP verification
- Welcome credentials
- Access approved/rejected

### Subscription Events
- 2 days before expiry warning
- Subscription expired
- Service auto-disabled

### Delivery Updates
- Food preparing
- Out for delivery (with ETA)
- Delivered confirmation

### Payment Alerts
- Payment reminder
- Payment overdue
- Custom notifications

**All SMS logged** in `NotificationLog` collection for audit trail.

---

## 📊 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Request handlers (8 files)
│   ├── authController.js
│   ├── subscriptionController.js
│   ├── deliveryController.js
│   ├── mealController.js
│   ├── paymentController.js
│   ├── userController.js
│   ├── adminController.js
│   └── accessRequestController.js
├── middleware/              # Express middleware
│   ├── auth.js             # JWT + role auth
│   ├── rateLimiter.js      # Rate limiting
│   ├── validators.js       # Input validation
│   └── upload.js           # File upload (Multer)
├── models/                  # Mongoose schemas (10 files)
│   ├── User.js
│   ├── Subscription.js
│   ├── Delivery.js
│   ├── MealOrder.js
│   ├── Payment.js
│   ├── Pause.js
│   ├── AccessRequest.js
│   ├── ExtraTiffin.js
│   ├── NotificationLog.js
│   └── DefaultMeal.js
├── routes/                  # API routes (8 files)
│   ├── authRoutes.js
│   ├── subscriptionRoutes.js
│   ├── deliveryRoutes.js
│   ├── mealRoutes.js
│   ├── paymentRoutes.js
│   ├── userRoutes.js
│   ├── adminRoutes.js
│   └── accessRequestRoutes.js
├── services/                # Business logic
│   ├── smsService.js       # Fast2SMS integration
│   └── cronService.js      # Scheduled jobs
├── utils/
│   └── logger.js           # Custom logger
├── uploads/                 # UPI screenshots
├── .env.example            # Environment template
├── .gitignore
├── package.json
├── server.js               # Entry point
├── README.md               # This file
├── API_DOCUMENTATION.md    # API reference
├── PRODUCTION_DEPLOYMENT.md # Deployment guide
└── PRODUCTION_CHECKLIST.md # Readiness checklist
```

---

## 🧪 Testing

### Test Login Flow
```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN001","password":"Admin@123"}'

# 2. Verify OTP (check SMS)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN001","otp":"123456"}'

# 3. Use token in subsequent requests
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Health Check
```bash
curl http://localhost:5000/health
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
- Verify `MONGODB_URI` format
- Check MongoDB Atlas network access
- Ensure database user exists

### SMS Not Sending
- Verify `FAST2SMS_API_KEY`
- Check Fast2SMS account balance
- Review `NotificationLog` in database

### Cron Jobs Not Running
- Check `ENABLE_CRON=true`
- Look for startup logs
- Verify server timezone (jobs run in UTC)

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F
```

---

## 📈 Performance

### Optimizations Implemented
- ✅ Gzip compression
- ✅ Mongoose lean queries
- ✅ Request rate limiting
- ✅ Connection pooling (MongoDB default)
- ✅ Efficient cron job execution

### Monitoring
- Request logging (Morgan)
- Custom logger with timestamps
- SMS delivery logging
- Error tracking

---

## 🔄 Updates & Maintenance

### Update Dependencies
```bash
npm update
```

### Database Backup
```bash
mongodump --uri="your_mongodb_uri" --out=./backup
```

### View Logs (Render)
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab

---

## 📞 Support

### Issues?
1. Check documentation files
2. Review Render logs
3. Verify environment variables
4. Test health endpoint

### Documentation Files
- API integration: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)
- Deployment: [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md)
- Checklist: [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md)

---

## 📄 License

ISC

---

## ✅ Production Status

| Component | Status |
|-----------|--------|
| Security | ✅ Production Ready |
| Database | ✅ MongoDB Atlas Compatible |
| Authentication | ✅ JWT + OTP Complete |
| API Endpoints | ✅ 50+ Endpoints |
| Cron Jobs | ✅ 4 Automated Tasks |
| SMS Integration | ✅ 14 Notification Types |
| Error Handling | ✅ Comprehensive |
| Documentation | ✅ Complete |
| Deployment | ✅ Render Compatible |

**🚀 READY FOR PRODUCTION DEPLOYMENT!**

---

**Built with ❤️ for TiffinMate**
# Development
npm run dev

# Production
npm start
```

## Default Admin Credentials

On first run, a default admin is created:
- User ID: `ADMIN001`
- Password: `Admin@123`
- Mobile: `1234567890`

**Important:** Change these credentials after first login!

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (Step 1: Send OTP)
- `POST /api/auth/verify-otp` - Verify OTP (Step 2)
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/request-access` - Request access (New users)
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Owner)
- `GET /api/users/customers` - Get customers only (Owner)
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `PATCH /api/users/:id/toggle-active` - Activate/deactivate user (Owner)

### Subscriptions
- `POST /api/subscriptions` - Create subscription (Owner)
- `GET /api/subscriptions` - Get all subscriptions (Owner)
- `GET /api/subscriptions/my-active` - Get my active subscription
- `GET /api/subscriptions/user/:userId` - Get user's subscriptions
- `GET /api/subscriptions/:id` - Get subscription details
- `POST /api/subscriptions/:id/renew` - Renew subscription (Owner)
- `PATCH /api/subscriptions/:id/toggle-pause` - Pause/unpause (Owner)

### Deliveries
- `POST /api/deliveries` - Create delivery (Owner)
- `GET /api/deliveries/today` - Get today's deliveries (Owner, Delivery)
- `GET /api/deliveries/kitchen-summary` - Get kitchen summary (Owner)
- `GET /api/deliveries/my` - Get my deliveries (Customer)
- `GET /api/deliveries/my-today` - Get my today's delivery (Customer)
- `GET /api/deliveries/user/:userId` - Get user's deliveries
- `GET /api/deliveries/:id` - Get delivery details
- `PATCH /api/deliveries/:id/status` - Update delivery status

### Meals
- `POST /api/meals/select` - Select meal (Customer)
- `GET /api/meals/my-selection` - Get my meal selection (Customer)
- `GET /api/meals/defaults` - Get default meals
- `POST /api/meals/defaults` - Set default meal (Owner)
- `GET /api/meals/orders` - Get all meal orders (Owner)

### Payments
- `POST /api/payments` - Create payment record (Owner)
- `GET /api/payments` - Get all payments (Owner)
- `GET /api/payments/my` - Get my payments (Customer)
- `GET /api/payments/user/:userId` - Get user's payments
- `GET /api/payments/:id` - Get payment details
- `PATCH /api/payments/:id/mark-paid` - Mark as paid (Owner)
- `POST /api/payments/:id/upload-screenshot` - Upload UPI screenshot (Customer)

### Access Requests
- `GET /api/access-requests` - Get all requests (Owner)
- `GET /api/access-requests/:id` - Get request details (Owner)
- `POST /api/access-requests/:id/approve` - Approve request (Owner)
- `POST /api/access-requests/:id/reject` - Reject request (Owner)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats (Owner)
- `GET /api/admin/expiring-subscriptions` - Get expiring subscriptions (Owner)
- `POST /api/admin/create-customer` - Create customer with subscription (Owner)
- `GET /api/admin/extra-tiffins` - Get extra tiffin requests (Owner)
- `POST /api/admin/extra-tiffins/:id/approve` - Approve extra tiffin (Owner)
- `GET /api/admin/pause-requests` - Get pause requests (Owner)
- `POST /api/admin/pause-requests/:id/approve` - Approve pause request (Owner)

## Automated Jobs

Cron jobs run daily:
- **9:00 AM** - Check subscriptions expiring in 2 days
- **10:00 AM** - Check expired subscriptions
- **11:00 AM** - Auto-disable services 1 day after expiry
- **12:00 PM** - Check overdue payments

## SMS Notifications

Automated SMS sent via Fast2SMS for:
- OTP verification
- New user credentials
- Subscription reminders
- Subscription expiry
- Service disabled
- Delivery status updates
- Payment reminders
- Access request approvals/rejections

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- OTP verification (2-minute expiry, 3 attempts max)
- Force password change on first login

## License

Private Project - All Rights Reserved
