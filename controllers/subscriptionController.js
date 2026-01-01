const Subscription = require('../models/Subscription');
const User = require('../models/User');
const AppNotification = require('../models/AppNotification');
const moment = require('moment');
const socketService = require('../services/socketService');

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
      plans.trial = { 
        days: 3, 
        price: 0, 
        description: '3-Day Free Trial',
        category: 'trial',
        menuAccess: 'classic'
      };
    }
    
    // All users see Classic and Premium plans
    plans.classic = { 
      days: 30, 
      price: 2999, 
      description: 'Classic Menu - Monthly',
      category: 'classic',
      menuAccess: 'classic'
    };
    plans['premium-veg'] = { 
      days: 30, 
      price: 3999, 
      description: 'Premium VEG Menu - Monthly',
      category: 'premium',
      menuAccess: 'premium-veg'
    };
    plans['premium-non-veg'] = { 
      days: 30, 
      price: 3999, 
      description: 'Premium NON-VEG Menu - Monthly',
      category: 'premium',
      menuAccess: 'premium-non-veg'
    };

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
    const { type, startDate, dietaryPreference } = req.body;

    if (!type || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide plan type and start date'
      });
    }

    if (!dietaryPreference || !['veg', 'non-veg', 'both'].includes(dietaryPreference)) {
      return res.status(400).json({
        success: false,
        message: 'Please select dietary preference (veg, non-veg, or both)'
      });
    }

    // Validate plan type
    if (!['trial', 'classic', 'premium-veg', 'premium-non-veg'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    // ========== CRITICAL: ONE ACTIVE SUBSCRIPTION RULE ==========
    // Check if user already has an active or pending subscription
    const existingActiveSubscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'pending'] }
    });

    if (existingActiveSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please wait for it to expire or cancel it first.',
        existingSubscription: {
          planType: existingActiveSubscription.planType,
          status: existingActiveSubscription.status,
          endDate: existingActiveSubscription.endDate
        }
      });
    }

    // ========== TRIAL PERIOD VALIDATION ==========
    // Check if user is trying to use trial when already used
    if (type === 'trial') {
      const user = await User.findById(req.user._id);
      if (user.hasUsedTrial) {
        return res.status(400).json({
          success: false,
          message: 'Trial period already used (maximum 3 days). Please select a regular plan.'
        });
      }
    }

    // Calculate dates and pricing
    const start = moment(startDate);
    let end, totalDays, amount, planCategory;

    switch (type) {
      case 'trial':
        end = moment(startDate).add(2, 'days'); // 3 days total (day 0, 1, 2)
        totalDays = 3;
        amount = 0; // Free trial
        planCategory = 'trial';
        break;
      case 'classic':
        end = moment(startDate).add(29, 'days');
        totalDays = 30;
        amount = 2999;
        planCategory = 'classic';
        break;
      case 'premium-veg':
        end = moment(startDate).add(29, 'days');
        totalDays = 30;
        amount = 3999;
        planCategory = 'premium';
        break;
      case 'premium-non-veg':
        end = moment(startDate).add(29, 'days');
        totalDays = 30;
        amount = 3999;
        planCategory = 'premium';
        break;
    }

    // NO LONGER EXPIRE EXISTING SUBSCRIPTIONS AUTOMATICALLY
    // User must have NO active/pending subscription (checked above)
    
    // For trial plans, mark user as having used trial
    if (type === 'trial') {
      await User.findByIdAndUpdate(req.user._id, { hasUsedTrial: true });
    }

    // Create new subscription
    // ALL plans require payment now (including trial for food cost)
    const subscription = await Subscription.create({
      user: req.user._id,
      planType: type,
      planCategory: planCategory,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      remainingDays: totalDays,
      amount,
      mealPreferences: { 
        includesLunch: true, 
        includesDinner: true,
        dietaryPreference: dietaryPreference 
      },
      status: 'pending', // All plans require payment
      createdBy: req.user._id
    });

    const message = type === 'trial'
      ? 'Trial subscription created. Please complete payment to activate (₹0 for trial, but food cost applies).'
      : 'Subscription created. Please complete payment to activate.';

    // Create AppNotification for owner
    try {
      const user = await User.findById(req.user._id);
      await AppNotification.createNotification({
        type: 'subscription_requested',
        title: 'New Subscription Request',
        message: `${user.name} requested ${type.toUpperCase()} plan (${dietaryPreference})`,
        relatedUser: req.user._id,
        relatedModel: 'Subscription',
        relatedId: subscription._id,
        priority: 'high',
        metadata: {
          planType: type,
          dietaryPreference: dietaryPreference,
          amount: subscription.amount,
          startDate: subscription.startDate
        }
      });

      // Emit notification event
      socketService.emitNotification({
        type: 'subscription_requested',
        title: 'New Subscription Request',
        message: `${user.name} requested ${type} plan`,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to create subscription notification:', notifError);
    }

    // Emit real-time subscription created event
    socketService.emitSubscriptionCreated({
      _id: subscription._id,
      user: subscription.user,
      planType: subscription.planType,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      amount: subscription.amount
    });

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

    console.log('📝 Update Status Request:', {
      subscriptionId: req.params.id,
      requestedStatus: status,
      userId: req.user._id
    });

    if (!status || !['pending', 'active', 'paused', 'expired', 'disabled'].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Must be one of: pending, active, paused, expired, disabled`
      });
    }

    // Use findByIdAndUpdate to directly update status without triggering full validation
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { 
        new: true, // Return updated document
        runValidators: false, // Skip validation to avoid issues with legacy data
        populate: 'user' // Populate user for consistent response
      }
    );

    if (!subscription) {
      console.log('❌ Subscription not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    console.log('✅ Status updated successfully:', {
      id: subscription._id,
      newStatus: subscription.status
    });

    // Create AppNotification when subscription is activated
    if (status === 'active') {
      try {
        await AppNotification.createNotification({
          type: 'subscription_activated',
          title: 'Subscription Activated',
          message: `${subscription.user.name}'s ${subscription.planType} subscription is now active`,
          relatedUser: subscription.user._id,
          relatedModel: 'Subscription',
          relatedId: subscription._id,
          priority: 'medium',
          metadata: {
            planType: subscription.planType,
            startDate: subscription.startDate,
            endDate: subscription.endDate
          }
        });
      } catch (notifError) {
        console.error('Failed to create activation notification:', notifError);
      }
    }

    // Emit real-time subscription update event
    socketService.emitSubscriptionUpdated({
      _id: subscription._id,
      user: subscription.user._id,
      planType: subscription.planType,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      remainingDays: subscription.remainingDays
    });

    res.status(200).json({
      success: true,
      message: `Subscription ${status}`,
      data: subscription
    });
  } catch (error) {
    console.error('❌ Update status error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
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

    // BUSINESS RULE: One Active Subscription Only
    const existingActiveSubscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });

    if (existingActiveSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription. Only one active subscription is allowed.',
        data: {
          existingSubscription: {
            id: existingActiveSubscription._id,
            planType: existingActiveSubscription.planType,
            startDate: existingActiveSubscription.startDate,
            endDate: existingActiveSubscription.endDate,
            status: existingActiveSubscription.status
          }
        }
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

    // Get active users only
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    filter.user = { $in: activeUserIds };

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
