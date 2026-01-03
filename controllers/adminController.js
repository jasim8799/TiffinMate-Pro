const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const AccessRequest = require('../models/AccessRequest');
const ExtraTiffin = require('../models/ExtraTiffin');
const Pause = require('../models/Pause');
const MealOrder = require('../models/MealOrder');
const Lead = require('../models/Lead');
const moment = require('moment');
const { getTodayMeals } = require('../utils/mealCounter');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Owner only)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts - ONLY include non-deleted users
    const totalCustomers = await User.countDocuments({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    });
    const activeCustomers = await User.countDocuments({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    });
    const activeSubscriptions = await Subscription.countDocuments({ 
      status: 'active'
    });
    const pendingRequests = await AccessRequest.countDocuments({ status: 'pending' });

    // Tomorrow's deliveries and meal orders (users select for next day)
    // Users order meals for TOMORROW, not today
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();
    const dayAfter = moment().add(2, 'days').startOf('day').toDate();
    
    // Get active users first
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    const todayDeliveries = await Delivery.countDocuments({
      deliveryDate: { $gte: tomorrow, $lt: dayAfter },
      user: { $in: activeUserIds }
    });

    // ======================================================================
    // ✅ TODAY MEALS TO COOK - STRICT TODAY ONLY
    // ======================================================================
    console.log('📊 [DASHBOARD] Getting TODAY meals ONLY...');
    
    const todayMealsData = await getTodayMeals(activeUserIds, MealOrder);
    
    const { lunchCount, dinnerCount, totalUsers: totalTodayMeals, duplicates } = todayMealsData;

    console.log('📊 [DASHBOARD] Meals to Cook TODAY:');
    console.log(`      - Lunch: ${lunchCount}`);
    console.log(`      - Dinner: ${dinnerCount}`);
    console.log(`      - Total: ${totalTodayMeals}`);
    
    if (duplicates.length > 0) {
      console.error(`   ❌ WARNING: ${duplicates.length} duplicate meal orders detected!`);
    }
    
    console.log('   ✅ Dashboard: TODAY ONLY (no tomorrow)');
    console.log('');
    
    // Debug: Check if ANY meal orders exist at all
    if (totalTodayMeals === 0) {
      const totalMealOrders = await MealOrder.countDocuments({});
      console.log('   ⚠️ Total meal orders in DB:', totalMealOrders);
      
      // Check recent orders
      const recentOrders = await MealOrder.find({}).sort({ createdAt: -1 }).limit(5).select('createdAt mealType deliveryDate user');
      console.log('   ⚠️ Recent meal orders in DB:');
      recentOrders.forEach(order => {
        console.log(`      - Created: ${moment(order.createdAt).format('YYYY-MM-DD HH:mm')}, Type: ${order.mealType}, Delivery: ${moment(order.deliveryDate).format('YYYY-MM-DD')}`);
      });
    }

    // Pending payments - exclude deleted users
    const pendingPayments = await Payment.countDocuments({
      paymentStatus: { $in: ['pending', 'partial'] },
      user: { $in: activeUserIds }
    });

    const overduePayments = await Payment.countDocuments({
      paymentStatus: 'overdue',
      user: { $in: activeUserIds }
    });

    // Expiring subscriptions (next 7 days) - exclude deleted users
    const sevenDaysFromNow = moment().add(7, 'days').endOf('day').toDate();
    const expiringSubscriptions = await Subscription.countDocuments({
      status: 'active',
      user: { $in: activeUserIds },
      endDate: { $gte: tomorrow, $lte: sevenDaysFromNow }
    });

    // Revenue calculations (this month)
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();
    
    const monthPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: monthStart, $lte: monthEnd },
          paymentStatus: 'paid',
          user: { $in: activeUserIds }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paidAmount' }
        }
      }
    ]);

    const monthlyRevenue = monthPayments.length > 0 ? monthPayments[0].totalRevenue : 0;

    // Today's collection (paid payments today)
    const todayPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          paymentStatus: 'paid',
          user: { $in: activeUserIds }
        }
      },
      {
        $group: {
          _id: null,
          totalCollection: { $sum: '$paidAmount' }
        }
      }
    ]);

    const todayCollection = todayPayments.length > 0 ? todayPayments[0].totalCollection : 0;

    // Pending amount (sum of all pending payments)
    const pendingAmount = await Payment.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['pending', 'partial'] },
          user: { $in: activeUserIds }
        }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$amount' }
        }
      }
    ]);

    const totalPendingAmount = pendingAmount.length > 0 ? pendingAmount[0].totalPending : 0;

    // ======================================================================
    // ✅ SUBSCRIPTION ALERTS (REAL DATA)
    // ======================================================================
    console.log('🚨 [DASHBOARD] Calculating subscription alerts...');
    
    const todayDate = moment().startOf('day').toDate();
    const warningDate = moment().add(3, 'days').endOf('day').toDate();
    
    // 1️⃣ EXPIRING SOON (within 3 days)
    const expiringSoonCount = await Subscription.countDocuments({
      status: 'active',
      user: { $in: activeUserIds },
      endDate: { $gte: todayDate, $lte: warningDate }
    });
    
    // 2️⃣ EXPIRED (endDate < today)
    const expiredCount = await Subscription.countDocuments({
      user: { $in: activeUserIds },
      endDate: { $lt: todayDate }
    });
    
    // 3️⃣ PAUSED
    const pausedCount = await Subscription.countDocuments({
      status: 'paused',
      user: { $in: activeUserIds }
    });
    
    const totalAlerts = expiringSoonCount + expiredCount + pausedCount;
    
    console.log('🚨 [DASHBOARD] Subscription Alerts:');
    console.log(`      - Expiring Soon (≤3 days): ${expiringSoonCount}`);
    console.log(`      - Expired: ${expiredCount}`);
    console.log(`      - Paused: ${pausedCount}`);
    console.log(`      - Total Alerts: ${totalAlerts}`);
    console.log('');

    // ✅ MONTHLY COLLECTION (TASK 2 & 3)
    // Calculate total subscription amounts for current month (paid + pending)
    const currentMonth = moment().month() + 1; // 1-12
    const currentYear = moment().year();
    
    console.log('💰 Calculating Monthly Collection:');
    console.log('   Current Month/Year:', `${currentMonth}/${currentYear}`);
    console.log('   Active Users:', activeUserIds.length);
    
    // Debug: Check all payments in DB
    const allPaymentsCount = await Payment.countDocuments({});
    console.log('   Total Payments in DB:', allPaymentsCount);
    
    // Use month/year fields for reliable filtering
    const thisMonthPaymentsCount = await Payment.countDocuments({
      month: currentMonth,
      year: currentYear
    });
    console.log('   Payments This Month (month/year filter):', thisMonthPaymentsCount);
    
    // Debug: Show sample payments from this month
    if (thisMonthPaymentsCount > 0) {
      const samplePayments = await Payment.find({
        month: currentMonth,
        year: currentYear
      }).limit(3).select('amount status month year createdAt user subscription');
      console.log('   Sample Payments This Month:');
      samplePayments.forEach(p => {
        console.log(`      - ID: ${p._id}, Amount: ₹${p.amount}, Status: ${p.status}, Month/Year: ${p.month}/${p.year}`);
      });
    }
    
    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          month: currentMonth,
          year: currentYear,
          status: { $in: ['paid', 'verified', 'pending'] },
          user: { $in: activeUserIds }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          paidAmount: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['paid', 'verified']] }, 
                '$amount', 
                0
              ] 
            } 
          },
          pendingAmount: { 
            $sum: { 
              $cond: [
                { $eq: ['$status', 'pending'] }, 
                '$amount', 
                0
              ] 
            } 
          }
        }
      }
    ]);

    const monthlyCollection = monthlyPayments.length > 0 ? {
      thisMonth: monthlyPayments[0].totalAmount,
      paid: monthlyPayments[0].paidAmount,
      pending: monthlyPayments[0].pendingAmount
    } : {
      thisMonth: 0,
      paid: 0,
      pending: 0
    };
    
    console.log('   Monthly Collection Result:');
    console.log('   - Payments Found:', monthlyPayments.length > 0 ? monthlyPayments[0].count : 0);
    console.log('   - Total This Month: ₹' + monthlyCollection.thisMonth);
    console.log('   - Paid: ₹' + monthlyCollection.paid);
    console.log('   - Pending: ₹' + monthlyCollection.pending);

    // ======================================================================
    // ✅ SERVICE LEADS (REAL DATA)
    // ======================================================================
    console.log('📞 [DASHBOARD] Calculating service leads...');
    
    const totalLeads = await Lead.countDocuments({});
    const newLeads = await Lead.countDocuments({ status: 'new' });
    
    console.log('📞 [DASHBOARD] Service Leads:');
    console.log(`      - Total Leads: ${totalLeads}`);
    console.log(`      - New Leads: ${newLeads}`);
    console.log('');

    res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers
        },
        subscriptions: {
          active: activeSubscriptions,
          expiring: expiringSubscriptions
        },
        deliveries: {
          today: todayDeliveries
        },
        mealOrders: {
          today: totalTodayMeals // Meals to cook today (matches Kitchen)
        },
        todayOrders: {
          lunch: lunchCount,
          dinner: dinnerCount,
          total: totalTodayMeals
        },
        payments: {
          pending: pendingPayments,
          overdue: overduePayments,
          thisMonth: monthlyCollection.thisMonth,
          paidThisMonth: monthlyCollection.paid,
          pendingThisMonth: monthlyCollection.pending
        },
        subscriptionAlerts: {
          expiringSoon: expiringSoonCount,
          expired: expiredCount,
          paused: pausedCount,
          total: totalAlerts
        },
        serviceLeads: {
          total: totalLeads,
          new: newLeads
        },
        accessRequests: {
          pending: pendingRequests
        },
        revenue: {
          thisMonth: monthlyRevenue
        },
        collection: {
          today: todayCollection,
          pending: totalPendingAmount
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get expiring subscriptions
// @route   GET /api/admin/expiring-subscriptions
// @access  Private (Owner only)
exports.getExpiringSubscriptions = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const today = moment().startOf('day').toDate();
    const futureDate = moment().add(parseInt(days), 'days').endOf('day').toDate();

    const subscriptions = await Subscription.find({
      status: 'active',
      endDate: { $gte: today, $lte: futureDate }
    })
      .populate('user', 'name mobile userId')
      .sort({ endDate: 1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get expiring subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring subscriptions',
      error: error.message
    });
  }
};

// @desc    Create customer with subscription
// @route   POST /api/admin/create-customer
// @access  Private (Owner only)
exports.createCustomerWithSubscription = async (req, res) => {
  try {
    const {
      name,
      mobile,
      address,
      planType,
      startDate,
      amount,
      mealPreferences
    } = req.body;

    // Check if mobile already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile already exists'
      });
    }

    // Generate user ID and password
    const userCount = await User.countDocuments({ role: 'customer' });
    const userId = `CUST${String(userCount + 1).padStart(4, '0')}`;
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();

    // Create user
    const user = await User.create({
      userId,
      password: tempPassword,
      name,
      mobile,
      address,
      role: 'customer',
      isActive: true,
      isPasswordChanged: false,
      createdBy: req.user._id
    });

    // Create subscription if plan type provided
    let subscription = null;
    if (planType && startDate && amount) {
      const start = moment(startDate);
      let end, totalDays;

      switch (planType) {
        case 'daily':
          end = moment(startDate);
          totalDays = 1;
          break;
        case 'weekly':
          end = moment(startDate).add(6, 'days');
          totalDays = 7;
          break;
        case 'monthly':
          end = moment(startDate).add(1, 'month').subtract(1, 'day');
          totalDays = end.diff(start, 'days') + 1;
          break;
      }

      subscription = await Subscription.create({
        user: user._id,
        planType,
        startDate: start.toDate(),
        endDate: end.toDate(),
        totalDays,
        remainingDays: totalDays,
        amount,
        mealPreferences: mealPreferences || { includesLunch: true, includesDinner: true },
        createdBy: req.user._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        user,
        subscription,
        credentials: {
          userId,
          tempPassword
        }
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

// @desc    Get extra tiffin requests
// @route   GET /api/admin/extra-tiffins
// @access  Private (Owner only)
exports.getExtraTiffinRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const requests = await ExtraTiffin.find(filter)
      .populate('user', 'name mobile userId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get extra tiffin requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching extra tiffin requests',
      error: error.message
    });
  }
};

// @desc    Approve extra tiffin request
// @route   POST /api/admin/extra-tiffins/:id/approve
// @access  Private (Owner only)
exports.approveExtraTiffin = async (req, res) => {
  try {
    const extraTiffin = await ExtraTiffin.findById(req.params.id);

    if (!extraTiffin) {
      return res.status(404).json({
        success: false,
        message: 'Extra tiffin request not found'
      });
    }

    extraTiffin.status = 'approved';
    extraTiffin.approvedBy = req.user._id;
    extraTiffin.approvedAt = new Date();
    await extraTiffin.save();

    res.status(200).json({
      success: true,
      message: 'Extra tiffin request approved',
      data: extraTiffin
    });
  } catch (error) {
    console.error('Approve extra tiffin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving extra tiffin request',
      error: error.message
    });
  }
};

// @desc    Get pause requests
// @route   GET /api/admin/pause-requests
// @access  Private (Owner only)
exports.getPauseRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const requests = await Pause.find(filter)
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get pause requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pause requests',
      error: error.message
    });
  }
};

// @desc    Approve pause request
// @route   POST /api/admin/pause-requests/:id/approve
// @access  Private (Owner only)
exports.approvePauseRequest = async (req, res) => {
  try {
    const pauseRequest = await Pause.findById(req.params.id).populate('subscription');

    if (!pauseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Pause request not found'
      });
    }

    pauseRequest.status = 'approved';
    pauseRequest.approvedBy = req.user._id;
    pauseRequest.approvedAt = new Date();
    await pauseRequest.save();

    // Update subscription status if pause is currently active
    if (pauseRequest.isActive()) {
      const subscription = pauseRequest.subscription;
      subscription.status = 'paused';
      await subscription.save();
    }

    res.status(200).json({
      success: true,
      message: 'Pause request approved',
      data: pauseRequest
    });
  } catch (error) {
    console.error('Approve pause request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving pause request',
      error: error.message
    });
  }
};
