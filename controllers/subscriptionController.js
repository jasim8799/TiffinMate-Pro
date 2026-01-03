const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const WeeklyMenu = require('../models/WeeklyMenu');
const User = require('../models/User');
const AppNotification = require('../models/AppNotification');
const Payment = require('../models/Payment');
const moment = require('moment');
const socketService = require('../services/socketService');

// @desc    Get available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    const { durationType, mealType } = req.query;
    
    const filter = { isActive: true };
    
    if (durationType) {
      filter.durationType = durationType;
    }
    
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1 });
    
    // If mealType filter is provided, filter plans
    let filteredPlans = plans;
    if (mealType) {
      filteredPlans = plans.filter(plan => {
        if (mealType === 'lunch') return plan.mealTypes.lunch;
        if (mealType === 'dinner') return plan.mealTypes.dinner;
        if (mealType === 'both') return plan.mealTypes.lunch && plan.mealTypes.dinner;
        return true;
      });
    }
    
    res.status(200).json({
      success: true,
      count: filteredPlans.length,
      data: filteredPlans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans',
      error: error.message
    });
  }
};

// @desc    Get duration types (daily/weekly/monthly)
// @route   GET /api/subscriptions/duration-types
// @access  Public
exports.getDurationTypes = async (req, res) => {
  try {
    const durationTypes = await SubscriptionPlan.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: '$durationType',
          minPrice: { $min: '$totalPrice' },
          maxPrice: { $max: '$totalPrice' },
          durationDays: { $first: '$durationDays' }
        } 
      },
      { $sort: { durationDays: 1 } }
    ]);
    
    const types = durationTypes.map(dt => ({
      type: dt._id,
      durationDays: dt.durationDays,
      priceRange: {
        min: dt.minPrice,
        max: dt.maxPrice
      }
    }));
    
    res.status(200).json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Get duration types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching duration types',
      error: error.message
    });
  }
};

// @desc    Get subscription plans with their weekly menus
// @route   GET /api/subscriptions/plans-with-menus
// @access  Public
exports.getPlansWithMenus = async (req, res) => {
  try {
    const { durationType, type } = req.query;
    
    const filter = { isActive: true };
    
    if (durationType) {
      filter.durationType = durationType;
    }
    
    if (type) {
      filter.type = type; // VEG, NON_VEG, or MIX
    }
    
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1 });
    
    // For each plan, fetch its weekly menu
    const plansWithMenus = await Promise.all(plans.map(async (plan) => {
      const weeklyMenu = await WeeklyMenu.find({
        planCategory: plan.menuCategory,
        isActive: true
      }).sort({ dayOfWeek: 1, mealType: 1 });
      
      // Organize menu by day
      const menuByDay = {
        sunday: { lunch: null, dinner: null },
        monday: { lunch: null, dinner: null },
        tuesday: { lunch: null, dinner: null },
        wednesday: { lunch: null, dinner: null },
        thursday: { lunch: null, dinner: null },
        friday: { lunch: null, dinner: null },
        saturday: { lunch: null, dinner: null }
      };
      
      weeklyMenu.forEach(menu => {
        if (menuByDay[menu.dayOfWeek]) {
          menuByDay[menu.dayOfWeek][menu.mealType] = {
            items: menu.items,
            description: menu.description
          };
        }
      });
      
      return {
        _id: plan._id,
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        durationType: plan.durationType,
        durationDays: plan.durationDays,
        pricePerDay: plan.pricePerDay,
        totalPrice: plan.totalPrice,
        planCategory: plan.planCategory,
        type: plan.type,
        menuCategory: plan.menuCategory,
        mealTypes: plan.mealTypes,
        features: plan.features,
        weeklyMenu: menuByDay
      };
    }));
    
    res.status(200).json({
      success: true,
      count: plansWithMenus.length,
      data: plansWithMenus
    });
  } catch (error) {
    console.error('Get plans with menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans with menus',
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
      .populate('plan', 'name displayName price durationDays')
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
      .populate('plan') // 🔑 Populate plan for Flutter UI
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
      .populate('plan', 'name displayName price durationDays')
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
      .populate('user', 'name mobile userId')
      .populate('plan', 'name displayName price durationDays');

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

// @desc    User requests a subscription (pending approval)
// @route   POST /api/subscriptions/request
// @access  Private (Customer)
exports.requestSubscription = async (req, res) => {
  try {
    // Validate JWT user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required'
      });
    }

    const { planId, paymentMode } = req.body;
    const userId = req.user._id;

    // Validate planId
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a subscription plan'
      });
    }

    // Check if plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This subscription plan is not available'
      });
    }

    // TRIAL PLAN: Check if user has already used trial
    if (plan.planCategory === 'trial') {
      const previousTrial = await Subscription.findOne({
        user: userId,
        planCategory: 'trial'
      });

      if (previousTrial) {
        return res.status(400).json({
          success: false,
          message: 'Trial can be used only once. Please choose a weekly or monthly plan.',
          data: {
            trialAlreadyUsed: true,
            previousTrialId: previousTrial._id
          }
        });
      }
    }

    // Check for existing pending or active subscriptions
    const existingSubscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['pending_approval', 'active', 'pending'] }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: existingSubscription.status === 'active' 
          ? 'You already have an active subscription' 
          : 'You already have a pending subscription request',
        data: {
          existingSubscription: {
            id: existingSubscription._id,
            planType: existingSubscription.planType,
            status: existingSubscription.status,
            startDate: existingSubscription.startDate,
            endDate: existingSubscription.endDate
          }
        }
      });
    }

    // Create subscription request with pending_approval status
    const startDate = moment().startOf('day');
    let endDate, totalDays;

    switch (plan.durationType) {
      case 'daily':
        endDate = moment(startDate);
        totalDays = 1;
        break;
      case 'weekly':
        endDate = moment(startDate).add(6, 'days');
        totalDays = 7;
        break;
      case 'monthly':
        endDate = moment(startDate).add(1, 'month').subtract(1, 'day');
        totalDays = endDate.diff(startDate, 'days') + 1;
        break;
      default:
        totalDays = plan.durationDays;
        endDate = moment(startDate).add(totalDays - 1, 'days');
    }

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id, // 🔑 Save plan reference
      planType: plan.menuCategory, // Map menuCategory → planType (classic/premium-veg/premium-non-veg)
      planCategory: plan.planCategory, // Copy planCategory (trial/classic/premium)
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      totalDays,
      remainingDays: totalDays,
      amount: plan.totalPrice,
      paymentMode: paymentMode || 'cash',
      status: 'pending_approval',
      mealPreferences: {
        includesLunch: plan.mealTypes.lunch,
        includesDinner: plan.mealTypes.dinner
      },
      planDetails: {
        planId: plan._id,
        planName: plan.name,
        planType: plan.type
      }
    });

    // Find owner to send notification
    const owner = await User.findOne({ role: 'owner' });
    
    if (!owner) {
      console.warn('⚠️ No owner found to send notification');
    } else {
      // Create notification for owner with all required fields
      try {
        await AppNotification.create({
          type: 'subscription_requested', // ✅ Valid enum value
          title: 'New Subscription Request',
          message: `${req.user.name} has requested a ${plan.name} subscription`,
          relatedUser: userId, // ✅ User who made the request
          relatedModel: 'Subscription', // ✅ Required field
          relatedId: subscription._id, // ✅ Required field
          priority: 'high',
          isRead: false,
          metadata: {
            subscriptionId: subscription._id,
            userId: userId,
            userName: req.user.name,
            planName: plan.name,
            planPrice: plan.totalPrice
          }
        });
      } catch (notificationError) {
        console.error('⚠️ Failed to create notification:', notificationError);
        // Don't fail the entire request if notification fails
      }
    }

    // Emit socket event to owner
    socketService.emitToOwner('subscription_request', {
      subscriptionId: subscription._id,
      userId: userId,
      userName: req.user.name,
      planName: plan.name,
      amount: plan.totalPrice
    });

    // Populate plan before returning
    await subscription.populate('plan');

    res.status(201).json({
      success: true,
      message: 'Subscription request sent successfully. Waiting for owner approval.',
      data: subscription
    });
  } catch (error) {
    console.error('❌ Request subscription error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + error.message
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating subscription request',
      error: error.message
    });
  }
};

// @desc    Owner approves a subscription request
// @route   PATCH /api/subscriptions/:id/approve
// @access  Private (Owner)
exports.approveSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate } = req.body; // Optional: owner can change start date

    const subscription = await Subscription.findById(id).populate('user');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve subscription with status: ${subscription.status}`
      });
    }

    // Update start and end dates if owner provided new start date
    if (startDate) {
      const start = moment(startDate);
      let end;
      
      switch (subscription.planType) {
        case 'daily':
          end = moment(startDate);
          break;
        case 'weekly':
          end = moment(startDate).add(6, 'days');
          break;
        case 'monthly':
          end = moment(startDate).add(1, 'month').subtract(1, 'day');
          break;
        default:
          end = moment(startDate).add(subscription.totalDays - 1, 'days');
      }
      
      subscription.startDate = start.toDate();
      subscription.endDate = end.toDate();
    }

    subscription.status = 'active';
    subscription.approvedBy = req.user._id;
    subscription.approvedAt = new Date();
    await subscription.save();

    // Enable user account
    const user = await User.findById(subscription.user._id);
    if (user) {
      user.isActive = true;
      await user.save();
    }

    // ✅ AUTO-CREATE PAYMENT RECORD (CRITICAL FOR MONTHLY COLLECTION)
    // This ensures Monthly Collection shows correct revenue
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       💰 PAYMENT AUTO-CREATION START                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`📅 Timestamp: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`📋 Subscription ID: ${subscription._id}`);
    console.log(`👤 User ID: ${subscription.user._id}`);
    console.log(`📦 Plan Type: ${subscription.planType}`);
    console.log(`💰 Subscription Amount: ₹${subscription.amount}`);
    console.log(`💳 Payment Mode: ${subscription.paymentMode}`);
    console.log(`📊 Subscription Status: ${subscription.status}`);
    console.log('');
    
    // Check if payment already exists for this subscription in current month
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();
    
    console.log(`Checking for existing payment (${monthStart} to ${monthEnd})...`);
    
    const existingPayment = await Payment.findOne({
      subscription: subscription._id,
      user: subscription.user._id,
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd
      }
    });

    if (existingPayment) {
      console.log(`ℹ️ Payment already exists: ${existingPayment._id}`);
      console.log(`   Amount: ₹${existingPayment.amount}`);
      console.log(`   Status: ${existingPayment.status}`);
      console.log(`   Created: ${existingPayment.createdAt}`);
      console.log('=== PAYMENT AUTO-CREATION END ===\n');
    } else {
      console.log('No existing payment found. Creating new payment...');
      
      // Get the subscription amount
      const paymentAmount = subscription.amount || 0;
      
      console.log(`📊 Payment Amount Breakdown:`);
      console.log(`   subscription.amount = ${subscription.amount}`);
      console.log(`   paymentAmount (final) = ${paymentAmount}`);
      
      if (paymentAmount <= 0) {
        console.error('❌ CRITICAL ERROR: Cannot create payment with amount 0!');
        console.error('   Subscription Details:');
        console.error(`   - ID: ${subscription._id}`);
        console.error(`   - Plan Type: ${subscription.planType}`);
        console.error(`   - Amount Field: ${subscription.amount}`);
        console.error(`   - Status: ${subscription.status}`);
        console.error('   SKIPPING PAYMENT CREATION - Fix subscription amount first!');
        console.log('=== PAYMENT AUTO-CREATION END (SKIPPED - ZERO AMOUNT) ===\n');
        
        // Don't create payment if amount is 0
        // This prevents Monthly Collection from showing 0
      } else {
        try {
          // Create payment record automatically with status = pending
          const now = new Date();
          const payment = await Payment.create({
            user: subscription.user._id,
            subscription: subscription._id,
            amount: paymentAmount,
            paymentMethod: subscription.paymentMode === 'online' ? 'upi' : 'cash',
            status: 'pending',
            paymentStatus: 'pending', // Also set legacy field
            paymentType: 'subscription',
            referenceNote: `Payment for ${subscription.planType} subscription (auto-created on approval)`,
            paymentDate: now,
            createdAt: now // Explicitly set for monthly filtering
          });

          console.log('✅ PAYMENT CREATED SUCCESSFULLY!');
          console.log(`   Payment ID: ${payment._id}`);
          console.log(`   Amount: ₹${payment.amount}`);
          console.log(`   Status: ${payment.status}`);
          console.log(`   Payment Method: ${payment.paymentMethod}`);
          console.log(`   Created At: ${payment.createdAt}`);
          console.log(`   Payment Date: ${payment.paymentDate}`);
          console.log(`   User ID: ${payment.user}`);
          console.log(`   Subscription ID: ${payment.subscription}`);
          
          // Verify payment was saved correctly
          const verifyPayment = await Payment.findById(payment._id);
          if (verifyPayment) {
            console.log('✅ Payment verified in database');
            console.log(`   Verify Amount: ₹${verifyPayment.amount}`);
            console.log(`   Verify Status: ${verifyPayment.status}`);
            console.log(`   Verify Created At: ${verifyPayment.createdAt}`);
            
            // Double-check it's in current month
            const isCurrentMonth = moment(verifyPayment.createdAt).isSame(moment(), 'month');
            console.log(`   Is Current Month: ${isCurrentMonth ? '✅ YES' : '❌ NO'}`);
          } else {
            console.error('⚠️ WARNING: Payment not found after creation!');
          }

          // Create notification for owner about pending payment
          try {
            await AppNotification.createNotification({
              type: 'payment_created',
              title: 'Payment Pending',
              message: `${user?.name || 'Customer'} has pending payment of ₹${paymentAmount}`,
              relatedUser: subscription.user._id,
              relatedModel: 'Payment',
              relatedId: payment._id,
              priority: 'high',
              metadata: {
                amount: paymentAmount,
                subscriptionId: subscription._id,
                paymentMethod: payment.paymentMethod
              }
            });
            console.log('✅ Payment notification created');
          } catch (notifError) {
            console.error('❌ Failed to create payment notification:', notifError);
          }
          
          console.log('=== PAYMENT AUTO-CREATION END ===\n');
        } catch (paymentError) {
          console.error('❌ CRITICAL ERROR: Failed to create payment!');
          console.error('   Error:', paymentError.message);
          console.error('   Stack:', paymentError.stack);
          console.error('   Payment Data Attempted:');
          console.error(`   - User: ${subscription.user._id}`);
          console.error(`   - Subscription: ${subscription._id}`);
          console.error(`   - Amount: ${paymentAmount}`);
          console.log('=== PAYMENT AUTO-CREATION END (FAILED) ===\n');
          // Don't throw - let subscription approval succeed even if payment creation fails
        }
      }
    }

    // Create notification for customer
    await AppNotification.create({
      recipient: subscription.user._id,
      recipientRole: 'customer',
      type: 'subscription_approved',
      title: 'Subscription Approved!',
      message: `Your subscription has been approved and is now active`,
      data: {
        subscriptionId: subscription._id,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });

    // Emit socket event to customer
    socketService.emitToUser(subscription.user._id.toString(), 'subscription_approved', {
      subscriptionId: subscription._id,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: 'active'
    });

    // Populate plan before returning
    await subscription.populate('plan');

    res.status(200).json({
      success: true,
      message: 'Subscription approved successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Approve subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving subscription',
      error: error.message
    });
  }
};

// @desc    Owner rejects a subscription request
// @route   PATCH /api/subscriptions/:id/reject
// @access  Private (Owner)
exports.rejectSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional rejection reason

    const subscription = await Subscription.findById(id).populate('user');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject subscription with status: ${subscription.status}`
      });
    }

    subscription.status = 'rejected';
    subscription.rejectedBy = req.user._id;
    subscription.rejectedAt = new Date();
    subscription.rejectionReason = reason || 'No reason provided';
    await subscription.save();

    // Create notification for customer
    await AppNotification.create({
      recipient: subscription.user._id,
      recipientRole: 'customer',
      type: 'subscription_rejected',
      title: 'Subscription Request Rejected',
      message: reason || 'Your subscription request was rejected',
      data: {
        subscriptionId: subscription._id,
        reason: reason
      }
    });

    // Emit socket event to customer
    socketService.emitToUser(subscription.user._id.toString(), 'subscription_rejected', {
      subscriptionId: subscription._id,
      reason: reason || 'No reason provided'
    });

    res.status(200).json({
      success: true,
      message: 'Subscription rejected',
      data: subscription
    });
  } catch (error) {
    console.error('Reject subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting subscription',
      error: error.message
    });
  }
};

// @desc    Check if user has used trial plan
// @route   GET /api/subscriptions/check-trial-usage
// @access  Private (Customer)
exports.checkTrialUsage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user has ever had a trial subscription
    const trialSubscription = await Subscription.findOne({
      user: userId,
      planCategory: 'trial'
    });

    res.status(200).json({
      success: true,
      data: {
        hasUsedTrial: !!trialSubscription,
        trialSubscriptionId: trialSubscription?._id || null
      }
    });
  } catch (error) {
    console.error('Check trial usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking trial usage',
      error: error.message
    });
  }
};

// @desc    Get pending subscription requests (for owner)
// @route   GET /api/subscriptions/pending
// @access  Private (Owner)
exports.getPendingSubscriptions = async (req, res) => {
  try {
    const pendingSubscriptions = await Subscription.find({
      status: 'pending_approval'
    })
      .populate('user', 'name mobile email address')
      .populate('plan', 'name displayName price durationDays')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingSubscriptions.length,
      data: pendingSubscriptions
    });
  } catch (error) {
    console.error('Get pending subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending subscriptions',
      error: error.message
    });
  }
};
