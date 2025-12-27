# TiffinMate Backend

Private Tiffin Service Management System - Backend API

## Features

- 🔐 OTP-based authentication with Fast2SMS
- 👥 Role-based access (Owner, Customer, Delivery Boy)
- 📅 Subscription management with auto-expiry
- 🚚 Delivery tracking with real-time status
- 🍽️ Meal selection with cutoff time
- 💰 Payment tracking (Cash & UPI)
- 📱 Automated SMS notifications
- 📊 Admin dashboard with analytics
- ⏸️ Vacation/pause mode
- 🔔 Automated cron jobs for reminders

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Fast2SMS for OTP & Notifications
- Multer for file uploads
- Node-cron for scheduled jobs

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure `.env` variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tiffinmate
JWT_SECRET=your_jwt_secret_key
FAST2SMS_API_KEY=your_fast2sms_api_key
```

4. Start MongoDB

5. Run the server:
```bash
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
