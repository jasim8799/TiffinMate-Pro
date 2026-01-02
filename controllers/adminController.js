const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const Payment = require('../models/Payment');
const AccessRequest = require('../models/AccessRequest');
const ExtraTiffin = require('../models/ExtraTiffin');
const Pause = require('../models/Pause');
const MealOrder = require('../models/MealOrder');
const moment = require('moment');

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

    // Today's deliveries - exclude deleted users
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();
    
    // Get active users first
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    const todayDeliveries = await Delivery.countDocuments({
      deliveryDate: { $gte: today, $lt: tomorrow },
      user: { $in: activeUserIds }
    });

    // Today's meal orders - exclude deleted users
    const todayMealOrders = await MealOrder.countDocuments({
      deliveryDate: { $gte: today, $lt: tomorrow },
      user: { $in: activeUserIds }
    });

    console.log('📊 Dashboard Stats - Meal Orders:');
    console.log('   Date range:', today, 'to', tomorrow);
    console.log('   Active users count:', activeUserIds.length);
    console.log('   Today meal orders count:', todayMealOrders);

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
      endDate: { $gte: today, $lte: sevenDaysFromNow }
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
          today: todayMealOrders
        },
        payments: {
          pending: pendingPayments,
          overdue: overduePayments
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
