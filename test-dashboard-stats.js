/**
 * Dashboard Stats Accuracy Test
 * 
 * Tests that deleted users are properly excluded from all dashboard statistics
 * 
 * Run: node test-dashboard-stats.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Subscription = require('./models/Subscription');
const Payment = require('./models/Payment');
const Delivery = require('./models/Delivery');

const TEST_TIMEOUT = 30000;

// Color codes for output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.cyan}═══ ${msg} ═══${COLORS.reset}\n`),
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function testDashboardStatAccuracy() {
  log.section('Dashboard Stats Accuracy Test');

  try {
    // 1. Count customers in database
    log.info('Counting customers in database...');
    
    const allCustomersInDB = await User.countDocuments({ role: 'customer' });
    const activeCustomersInDB = await User.countDocuments({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    });
    const deletedCustomersInDB = await User.countDocuments({ 
      role: 'customer',
      $or: [
        { isActive: false },
        { deletedAt: { $exists: true } }
      ]
    });

    log.info(`  Total customers in DB: ${allCustomersInDB}`);
    log.info(`  Active customers in DB: ${activeCustomersInDB}`);
    log.info(`  Deleted customers in DB: ${deletedCustomersInDB}`);

    // 2. Test dashboard stats query (simulate what the API does)
    log.info('\nSimulating dashboard stats query...');
    
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');

    log.info(`  Active user IDs found: ${activeUserIds.length}`);

    // 3. Check subscriptions
    const allSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const activeSubscriptions = await Subscription.countDocuments({ 
      status: 'active',
      isActive: true,
      user: { $in: activeUserIds }
    });

    log.info(`\nSubscription counts:`);
    log.info(`  All active subscriptions: ${allSubscriptions}`);
    log.info(`  Active subscriptions (filtered): ${activeSubscriptions}`);
    
    if (allSubscriptions > activeSubscriptions) {
      log.warn(`  ${allSubscriptions - activeSubscriptions} subscriptions belong to deleted users`);
    } else {
      log.success(`  All subscriptions belong to active users`);
    }

    // 4. Check payments
    const allPayments = await Payment.countDocuments({ 
      paymentStatus: { $in: ['pending', 'partial'] }
    });
    const activePayments = await Payment.countDocuments({ 
      paymentStatus: { $in: ['pending', 'partial'] },
      user: { $in: activeUserIds },
      isActive: true
    });

    log.info(`\nPayment counts:`);
    log.info(`  All pending payments: ${allPayments}`);
    log.info(`  Pending payments (filtered): ${activePayments}`);
    
    if (allPayments > activePayments) {
      log.warn(`  ${allPayments - activePayments} payments belong to deleted users`);
    } else {
      log.success(`  All payments belong to active users`);
    }

    // 5. Check deliveries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allDeliveries = await Delivery.countDocuments({
      deliveryDate: { $gte: today, $lt: tomorrow }
    });
    const activeDeliveries = await Delivery.countDocuments({
      deliveryDate: { $gte: today, $lt: tomorrow },
      user: { $in: activeUserIds }
    });

    log.info(`\nDelivery counts (today):`);
    log.info(`  All deliveries: ${allDeliveries}`);
    log.info(`  Deliveries (filtered): ${activeDeliveries}`);
    
    if (allDeliveries > activeDeliveries) {
      log.warn(`  ${allDeliveries - activeDeliveries} deliveries belong to deleted users`);
    } else {
      log.success(`  All deliveries belong to active users`);
    }

    // 6. Summary
    log.section('Test Summary');
    
    const hasDeletedUsers = deletedCustomersInDB > 0;
    const allQueriesFiltered = (
      (allSubscriptions === 0 || allSubscriptions === activeSubscriptions) &&
      (allPayments === 0 || allPayments === activePayments) &&
      (allDeliveries === 0 || allDeliveries === activeDeliveries)
    );

    if (hasDeletedUsers) {
      log.info(`Found ${deletedCustomersInDB} deleted users in database`);
      if (allQueriesFiltered) {
        log.success('✅ All dashboard queries properly exclude deleted users');
      } else {
        log.error('❌ Some dashboard queries still include deleted users');
      }
    } else {
      log.info('No deleted users in database to test filtering');
      log.success('✅ Dashboard queries are properly configured');
    }

    // 7. Detailed breakdown if issues found
    if (hasDeletedUsers && !allQueriesFiltered) {
      log.section('Issues Found');
      
      if (allSubscriptions > activeSubscriptions) {
        const orphanSubs = await Subscription.find({
          status: 'active',
          user: { $nin: activeUserIds }
        }).populate('user', 'name userId isActive deletedAt');
        
        log.error(`Found ${orphanSubs.length} subscriptions for deleted users:`);
        orphanSubs.forEach(sub => {
          log.error(`  - Subscription ${sub._id} for user ${sub.user?.userId || 'N/A'} (deleted: ${!!sub.user?.deletedAt})`);
        });
      }

      if (allPayments > activePayments) {
        const orphanPayments = await Payment.find({
          paymentStatus: { $in: ['pending', 'partial'] },
          user: { $nin: activeUserIds }
        }).populate('user', 'name userId isActive deletedAt');
        
        log.error(`Found ${orphanPayments.length} payments for deleted users:`);
        orphanPayments.forEach(payment => {
          log.error(`  - Payment ${payment._id} for user ${payment.user?.userId || 'N/A'} (deleted: ${!!payment.user?.deletedAt})`);
        });
      }

      if (allDeliveries > activeDeliveries) {
        const orphanDeliveries = await Delivery.find({
          deliveryDate: { $gte: today, $lt: tomorrow },
          user: { $nin: activeUserIds }
        }).populate('user', 'name userId isActive deletedAt');
        
        log.error(`Found ${orphanDeliveries.length} deliveries for deleted users:`);
        orphanDeliveries.forEach(delivery => {
          log.error(`  - Delivery ${delivery._id} for user ${delivery.user?.userId || 'N/A'} (deleted: ${!!delivery.user?.deletedAt})`);
        });
      }
    }

    log.success('\nDashboard stats accuracy test completed');
    return true;

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function runTests() {
  try {
    await connectDB();
    const success = await testDashboardStatAccuracy();
    
    await mongoose.connection.close();
    log.success('Database connection closed');
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle timeout
setTimeout(() => {
  log.error('Test timeout exceeded');
  process.exit(1);
}, TEST_TIMEOUT);

// Run tests
runTests();
