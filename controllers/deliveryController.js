const Delivery = require('../models/Delivery');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const smsService = require('../services/smsService');
const moment = require('moment');

// @desc    Create delivery
// @route   POST /api/deliveries
// @access  Private (Owner only)
exports.createDelivery = async (req, res) => {
  try {
    const { userId, subscriptionId, deliveryDate, mealType, meals } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const delivery = await Delivery.create({
      user: userId,
      subscription: subscriptionId,
      deliveryDate,
      mealType,
      meals,
      status: 'preparing'
    });

    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      data: delivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating delivery',
      error: error.message
    });
  }
};

// @desc    Update delivery status
// @route   PATCH /api/deliveries/:id/status
// @access  Private (Owner, Delivery)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const delivery = await Delivery.findById(req.params.id).populate('user subscription');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Update status
    await delivery.updateStatus(status);

    const user = delivery.user;

    // Send SMS notification based on status
    switch (status) {
      case 'preparing':
        await smsService.sendDeliveryPreparing(user.mobile, user.name, user._id);
        break;
      case 'on-the-way':
        await smsService.sendDeliveryOnWay(user.mobile, user.name, user._id);
        if (req.body.deliveryBoyId) {
          delivery.deliveryBoy = req.body.deliveryBoyId;
          await delivery.save();
        }
        break;
      case 'delivered':
        await smsService.sendDeliveryDelivered(user.mobile, user.name, user._id);
        // Mark day as used in subscription
        const subscription = delivery.subscription;
        await subscription.markDayUsed();
        break;
    }

    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      data: delivery
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating delivery status',
      error: error.message
    });
  }
};

// @desc    Get today's deliveries
// @route   GET /api/deliveries/today
// @access  Private (Owner, Delivery)
exports.getTodaysDeliveries = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();

    const deliveries = await Delivery.find({
      deliveryDate: { $gte: today, $lt: tomorrow }
    })
      .populate('user', 'name mobile address')
      .populate('deliveryBoy', 'name mobile')
      .sort({ status: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('Get today deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error.message
    });
  }
};

// @desc    Get user's deliveries (calendar)
// @route   GET /api/deliveries/user/:userId
// @access  Private
exports.getUserDeliveries = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.params.userId };

    if (startDate && endDate) {
      filter.deliveryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const deliveries = await Delivery.find(filter)
      .populate('deliveryBoy', 'name mobile')
      .sort({ deliveryDate: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('Get user deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error.message
    });
  }
};

// @desc    Get my deliveries
// @route   GET /api/deliveries/my
// @access  Private (Customer)
exports.getMyDeliveries = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (startDate && endDate) {
      filter.deliveryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const deliveries = await Delivery.find(filter)
      .populate('deliveryBoy', 'name mobile')
      .sort({ deliveryDate: -1 });

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('Get my deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: error.message
    });
  }
};

// @desc    Get today's delivery for current user
// @route   GET /api/deliveries/my-today
// @access  Private (Customer)
exports.getMyTodayDelivery = async (req, res) => {
  try {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();

    const delivery = await Delivery.findOne({
      user: req.user._id,
      deliveryDate: { $gte: today, $lt: tomorrow }
    }).populate('deliveryBoy', 'name mobile');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'No delivery scheduled for today'
      });
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get today delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s delivery',
      error: error.message
    });
  }
};

// @desc    Get kitchen summary (meal-wise count)
// @route   GET /api/deliveries/kitchen-summary
// @access  Private (Owner)
exports.getKitchenSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? moment(date) : moment();
    const startOfDay = targetDate.startOf('day').toDate();
    const endOfDay = targetDate.endOf('day').toDate();

    const deliveries = await Delivery.find({
      deliveryDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'disabled' }
    }).populate('user', 'name mobile');

    // Calculate summary
    const summary = {
      totalDeliveries: deliveries.length,
      lunchCount: 0,
      dinnerCount: 0,
      bothCount: 0,
      statusCounts: {
        preparing: 0,
        'on-the-way': 0,
        delivered: 0,
        paused: 0
      },
      deliveries: deliveries
    };

    deliveries.forEach(delivery => {
      if (delivery.mealType === 'lunch') summary.lunchCount++;
      else if (delivery.mealType === 'dinner') summary.dinnerCount++;
      else if (delivery.mealType === 'both') summary.bothCount++;

      summary.statusCounts[delivery.status]++;
    });

    res.status(200).json({
      success: true,
      date: targetDate.format('YYYY-MM-DD'),
      data: summary
    });
  } catch (error) {
    console.error('Get kitchen summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching kitchen summary',
      error: error.message
    });
  }
};

// @desc    Get delivery details
// @route   GET /api/deliveries/:id
// @access  Private
exports.getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('user', 'name mobile address')
      .populate('deliveryBoy', 'name mobile');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery',
      error: error.message
    });
  }
};
