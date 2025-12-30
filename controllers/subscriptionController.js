const Subscription = require('../models/Subscription');
const User = require('../models/User');
const moment = require('moment');

// @desc    Get available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    // Check if user has used trial (only if authenticated)
    let hasUsedTrial = true; // Default to true for unauthenticated requests
    
    if (req.user) {
      const user = await User.findById(req.user._id);
      hasUsedTrial = user?.hasUsedTrial || false;
    }

    const plans = {};
    
    if (!hasUsedTrial) {
      // New users see trial option (3 days free)
      plans.trial = { days: 3, price: 0, description: '3-Day Free Trial' };
    }
    
    // All users see weekly and monthly
    plans.weekly = { days: 7, price: 500, description: '7 Days' };
    plans.monthly = { days: 30, price: 2000, description: '30 Days' };

    res.status(200).json({
      success: true,
      data: plans,
      hasUsedTrial
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plans',
      error: error.message
    });
  }
};

// @desc    User selects/creates subscription
// @route   POST /api/subscriptions/select
// @access  Private (Customer only)
exports.selectPlan = async (req, res) => {
  try {
    const { type, startDate } = req.body;

    if (!type || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide plan type and start date'
      });
    }

    // Validate plan type
    if (!['trial', 'daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // Check if user is trying to use trial when already used
    if (type === 'trial') {
      const user = await User.findById(req.user._id);
      if (user.hasUsedTrial) {
        return res.status(400).json({
          success: false,
          message: 'Trial period already used. Please select a regular plan.'
        });
      }
    }

    // Calculate dates and pricing
    const start = moment(startDate);
    let end, totalDays, amount;

    switch (type) {
      case 'trial':
        end = moment(startDate).add(2, 'days');
        totalDays = 3;
        amount = 0; // Free trial
        break;
      case 'daily':
        end = moment(startDate);
        totalDays = 1;
        amount = 80;
        break;
      case 'weekly':
        end = moment(startDate).add(6, 'days');
        totalDays = 7;
        amount = 500;
        break;
      case 'monthly':
        end = moment(startDate).add(29, 'days');
        totalDays = 30;
        amount = 2000;
        break;
    }

    // Expire any existing active subscriptions
    await Subscription.updateMany(
      { user: req.user._id, status: { $in: ['active', 'pending'] } },
      { status: 'expired' }
    );

    // For trial plans, mark user as having used trial and auto-activate
    if (type === 'trial') {
      await User.findByIdAndUpdate(req.user._id, { hasUsedTrial: true });
    }

    // Create new subscription
    // Trial is auto-activated (free), others require payment
    const subscription = await Subscription.create({
      user: req.user._id,
      planType: type,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      remainingDays: totalDays,
      amount,
      mealPreferences: { includesLunch: true, includesDinner: true },
      status: type === 'trial' ? 'active' : 'pending', // Trial is free and auto-activated
      createdBy: req.user._id
    });

    const message = type === 'trial'
      ? 'Trial activated! Enjoy 3 days of free meals.'
      : 'Subscription created. Please complete payment to activate.';

    res.status(201).json({
      success: true,
      message,
      data: subscription
    });
  } catch (error) {
    console.error('Select plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// @desc    Update subscription status
// @route   PUT /api/subscriptions/:id/status
// @access  Private (Owner only)
exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'paused', 'expired', 'disabled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.status = status;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Subscription ${status}`,
      data: subscription
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription status',
      error: error.message
    });
  }
};

// @desc    Create subscription
// @route   POST /api/subscriptions
// @access  Private (Owner only)
exports.createSubscription = async (req, res) => {
  try {
    const { userId, planType, startDate, mealPreferences, amount } = req.body;

    if (!userId || !planType || !startDate || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate dates and days based on plan type
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
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid plan type'
        });
    }

    const subscription = await Subscription.create({
      user: userId,
      planType,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      remainingDays: totalDays,
      amount,
      mealPreferences: mealPreferences || { includesLunch: true, includesDinner: true },
      createdBy: req.user._id
    });

    // Enable user account
    user.isActive = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// @desc    Get user's subscriptions
// @route   GET /api/subscriptions/user/:userId
// @access  Private
exports.getUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.params.userId })
      .populate('user', 'name mobile userId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// @desc    Get active subscription for current user
// @route   GET /api/subscriptions/my-active
// @access  Private
exports.getMyActiveSubscription = async (req, res) => {
  try {
    // Find active or pending subscription
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'pending'] }
    })
      .populate('user', 'name mobile userId')
      .sort({ createdAt: -1 }); // Get most recent

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active or pending subscription found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Get active subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active subscription',
      error: error.message
    });
  }
};

// @desc    Get all subscriptions (admin)
// @route   GET /api/subscriptions
// @access  Private (Owner only)
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { status, planType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (planType) filter.planType = planType;

    const subscriptions = await Subscription.find(filter)
      .populate('user', 'name mobile userId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// @desc    Renew subscription
// @route   POST /api/subscriptions/:id/renew
// @access  Private (Owner only)
exports.renewSubscription = async (req, res) => {
  try {
    const { planType, startDate, amount } = req.body;

    const oldSubscription = await Subscription.findById(req.params.id);
    if (!oldSubscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Calculate new dates
    const start = moment(startDate || new Date());
    let end, totalDays;

    switch (planType || oldSubscription.planType) {
      case 'daily':
        end = moment(start);
        totalDays = 1;
        break;
      case 'weekly':
        end = moment(start).add(6, 'days');
        totalDays = 7;
        break;
      case 'monthly':
        end = moment(start).add(1, 'month').subtract(1, 'day');
        totalDays = end.diff(start, 'days') + 1;
        break;
    }

    // Create new subscription
    const newSubscription = await Subscription.create({
      user: oldSubscription.user,
      planType: planType || oldSubscription.planType,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      remainingDays: totalDays,
      amount: amount || oldSubscription.amount,
      mealPreferences: oldSubscription.mealPreferences,
      createdBy: req.user._id
    });

    // Mark old subscription as expired
    oldSubscription.status = 'expired';
    await oldSubscription.save();

    // Re-enable user account
    const user = await User.findById(oldSubscription.user);
    user.isActive = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: newSubscription
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error renewing subscription',
      error: error.message
    });
  }
};

// @desc    Pause/unpause subscription
// @route   PATCH /api/subscriptions/:id/toggle-pause
// @access  Private (Owner only)
exports.togglePauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.status = subscription.status === 'paused' ? 'active' : 'paused';
    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Subscription ${subscription.status}`,
      data: subscription
    });
  } catch (error) {
    console.error('Toggle pause error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling subscription pause',
      error: error.message
    });
  }
};

// @desc    Get subscription details
// @route   GET /api/subscriptions/:id
// @access  Private
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('user', 'name mobile userId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
};
