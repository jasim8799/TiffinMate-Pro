const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const AppNotification = require('../models/AppNotification');
const moment = require('moment');
const { createNotification } = require('./notificationController');
const socketService = require('../services/socketService');

// UPI Configuration
const UPI_CONFIG = {
  upiId: process.env.UPI_ID || 'thehomekitchen@upi',
  name: process.env.UPI_NAME || 'The Home Kitchen'
};

// ====================================
// USER ENDPOINTS (Customer)
// ====================================

// @desc    Create payment (User initiates payment)
// @route   POST /api/payments/create
// @access  Private (Customer only)
exports.createPayment = async (req, res) => {
  try {
    const { subscriptionId, amount, referenceNote, paymentMethod = 'cash' } = req.body;

    if (!subscriptionId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and amount are required'
      });
    }

    // Validate payment method
    if (!['cash', 'upi', 'other'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be: cash, upi, or other'
      });
    }

    // Validate subscription exists and belongs to user
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: req.user._id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      subscription: subscriptionId,
      amount,
      paymentMethod: paymentMethod,
      status: 'pending',
      referenceNote: referenceNote || '',
      paymentDate: new Date()
    });

    // Create notification for owner
    const user = await User.findById(req.user._id);
    await createNotification(
      'PAYMENT_RECEIVED',
      `New payment of ₹${amount} received from ${user?.name || 'customer'}`,
      payment._id,
      'Payment',
      {
        amount: amount,
        customerName: user?.name,
        customerId: user?.userId,
        status: 'pending'
      }
    );

    // Create AppNotification for owner
    try {
      const paymentMethodLabel = paymentMethod === 'cash' ? 'CASH' : paymentMethod.toUpperCase();
      await AppNotification.createNotification({
        type: 'payment_created',
        title: `New ${paymentMethodLabel} Payment`,
        message: `${user?.name} paid ₹${amount} via ${paymentMethodLabel}`,
        relatedUser: req.user._id,
        relatedModel: 'Payment',
        relatedId: payment._id,
        priority: 'high',
        metadata: {
          amount: amount,
          subscriptionId: subscriptionId,
          paymentMethod: paymentMethod
        }
      });

      // Emit notification event
      socketService.emitNotification({
        type: 'payment_created',
        title: 'New Payment',
        message: `₹${amount} from ${user?.name}`,
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Failed to create payment notification:', notifError);
    }

    // Emit real-time payment created event to owner
    socketService.emitPaymentCreated({
      _id: payment._id,
      user: req.user._id,
      subscription: subscriptionId,
      amount: amount,
      status: payment.status,
      customerName: user?.name,
      customerId: user?.userId
    });

    // Response based on payment method
    const responseData = {
      paymentId: payment._id,
      amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status
    };

    let message = 'Payment request created successfully.';

    // Add UPI data only for UPI payments
    if (paymentMethod === 'upi') {
      const upiLink = `upi://pay?pa=${UPI_CONFIG.upiId}&pn=${encodeURIComponent(UPI_CONFIG.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(referenceNote || 'Payment for meal subscription')}`;
      responseData.upiId = UPI_CONFIG.upiId;
      responseData.name = UPI_CONFIG.name;
      responseData.upiLink = upiLink;
      responseData.qrString = upiLink;
      message = 'Payment created successfully. Please complete the UPI payment.';
    } else if (paymentMethod === 'cash') {
      message = 'Cash payment request submitted. Owner will verify once cash is received.';
    }

    res.status(201).json({
      success: true,
      message,
      data: responseData
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
};

// @desc    Get my payments (User's payment history)
// @route   GET /api/payments/my
// @access  Private (Customer only)
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('subscription', 'planType startDate endDate totalDays')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// ====================================
// OWNER ENDPOINTS
// ====================================

// @desc    Get pending payments (Awaiting verification)
// @route   GET /api/payments/pending
// @access  Private (Owner only)
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payments',
      error: error.message
    });
  }
};

// @desc    Mark payment as received (for CASH payments)
// @route   PUT /api/payments/:id/receive
// @access  Private (Owner only)
exports.receivePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name mobile userId')
      .populate('subscription');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment is already paid
    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been marked as received'
      });
    }

    // Check if payment is pending
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending payments can be marked as received'
      });
    }

    // Update payment status to PAID
    payment.status = 'paid';
    payment.receivedAt = new Date();
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    // AUTO-ACTIVATE SUBSCRIPTION (CRITICAL)
    if (payment.subscription) {
      const subscription = payment.subscription;
      
      // Check if subscription is already active
      if (subscription.status === 'active') {
        // Subscription already active - extend it
        const currentEndDate = subscription.endDate;
        const isExpired = moment().isAfter(currentEndDate);

        if (isExpired) {
          // Subscription expired - start fresh from today
          subscription.startDate = moment().startOf('day').toDate();
          subscription.endDate = moment()
            .add(subscription.totalDays - 1, 'days')
            .endOf('day')
            .toDate();
          subscription.remainingDays = subscription.totalDays;
        } else {
          // Subscription still active - extend from current end date
          subscription.endDate = moment(currentEndDate)
            .add(subscription.totalDays, 'days')
            .endOf('day')
            .toDate();
          subscription.remainingDays = moment(subscription.endDate).diff(moment().startOf('day'), 'days') + 1;
        }
      } else {
        // Subscription not active (pending/expired) - activate it
        subscription.status = 'active';
        subscription.startDate = moment().startOf('day').toDate();
        subscription.endDate = moment()
          .add(subscription.totalDays - 1, 'days')
          .endOf('day')
          .toDate();
        subscription.remainingDays = subscription.totalDays;
      }

      // Link payment to subscription activation
      subscription.activatedViaPaymentId = payment._id;
      await subscription.save();

      // Create subscription activated notification
      try {
        await AppNotification.createNotification({
          type: 'subscription_activated',
          title: 'Subscription Activated',
          message: `${payment.user.name}'s subscription is now active until ${moment(subscription.endDate).format('DD MMM YYYY')}`,
          relatedUser: payment.user._id,
          relatedModel: 'Subscription',
          relatedId: subscription._id,
          priority: 'high',
          metadata: {
            subscriptionId: subscription._id,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            paymentId: payment._id
          }
        });
      } catch (notifError) {
        console.error('Failed to create subscription notification:', notifError);
      }

      // Emit subscription activated event to user
      socketService.emitSubscriptionUpdated({
        _id: subscription._id,
        user: payment.user._id,
        planType: subscription.planType,
        status: 'active',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        remainingDays: subscription.remainingDays
      });

      // Emit notification to user
      socketService.emitNotification({
        userId: payment.user._id,
        type: 'subscription_activated',
        title: 'Subscription Activated!',
        message: `Your subscription is now active. You can start ordering meals.`,
        priority: 'high'
      });
    }

    // Create payment received notification
    const paymentMethodLabel = payment.paymentMethod === 'cash' ? 'CASH' : payment.paymentMethod.toUpperCase();
    
    try {
      await AppNotification.createNotification({
        type: 'payment_received',
        title: 'Payment Received',
        message: `${paymentMethodLabel} payment of ₹${payment.amount} received from ${payment.user.name}`,
        relatedUser: payment.user._id,
        relatedModel: 'Payment',
        relatedId: payment._id,
        priority: 'medium',
        metadata: {
          amount: payment.amount,
          paymentMethod: payment.paymentMethod
        }
      });
    } catch (notifError) {
      console.error('Failed to create payment notification:', notifError);
    }

    // Emit payment received event
    socketService.emitPaymentReceived({
      _id: payment._id,
      user: payment.user._id,
      amount: payment.amount,
      status: 'paid',
      paymentMethod: payment.paymentMethod,
      receivedAt: payment.receivedAt
    });

    // Emit notification to user about payment received
    socketService.emitNotification({
      userId: payment.user._id,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Your ${paymentMethodLabel} payment of ₹${payment.amount} has been received`,
      priority: 'medium'
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType startDate endDate status remainingDays')
      .populate('verifiedBy', 'name');

    res.status(200).json({
      success: true,
      message: 'Payment marked as received and subscription activated',
      data: {
        payment: populatedPayment,
        subscription: populatedPayment.subscription
      }
    });
  } catch (error) {
    console.error('Receive payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

// @desc    Verify or reject payment
// @route   PUT /api/payments/:id/verify
// @access  Private (Owner only)
exports.verifyPayment = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "verified" or "rejected"'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('subscription');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been processed'
      });
    }

    // Update payment status
    payment.status = status;
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    // If verified, activate or extend subscription
    if (status === 'verified' && payment.subscription) {
      const subscription = payment.subscription;

      if (subscription.status === 'pending') {
        // First payment - activate subscription
        subscription.status = 'active';
        subscription.startDate = moment().startOf('day').toDate();
        subscription.endDate = moment()
          .add(subscription.totalDays - 1, 'days')
          .endOf('day')
          .toDate();
      } else if (subscription.status === 'active' || subscription.status === 'expired') {
        // Renewal - extend subscription
        const currentEndDate = subscription.endDate;
        const isExpired = moment().isAfter(currentEndDate);

        if (isExpired) {
          // Start fresh from today
          subscription.startDate = moment().startOf('day').toDate();
          subscription.endDate = moment()
            .add(subscription.totalDays - 1, 'days')
            .endOf('day')
            .toDate();
          subscription.status = 'active';
        } else {
          // Extend from current end date
          subscription.endDate = moment(currentEndDate)
            .add(subscription.totalDays, 'days')
            .endOf('day')
            .toDate();
        }
      }

      await subscription.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType startDate endDate status')
      .populate('verifiedBy', 'name');

    // Create notification for owner
    if (status === 'verified') {
      const user = populatedPayment.user;
      const paymentMethodLabel = payment.paymentMethod === 'cash' ? 'CASH' : payment.paymentMethod.toUpperCase();
      
      await createNotification(
        'PAYMENT_VERIFIED',
        `${paymentMethodLabel} payment of ₹${payment.amount} verified for ${user?.name || 'customer'}`,
        payment._id,
        'Payment',
        {
          amount: payment.amount,
          customerName: user?.name,
          customerId: user?.userId,
          paymentMethod: payment.paymentMethod
        }
      );
      
      // Create AppNotification
      try {
        await AppNotification.createNotification({
          type: 'payment_verified',
          title: 'Payment Verified',
          message: `${user?.name} - ₹${payment.amount} ${paymentMethodLabel} payment confirmed`,
          relatedUser: user?._id,
          relatedModel: 'Payment',
          relatedId: payment._id,
          priority: 'medium',
          metadata: {
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            subscriptionId: populatedPayment.subscription?._id
          }
        });
      } catch (notifError) {
        console.error('Failed to create payment verified notification:', notifError);
      }
      
      // Emit real-time payment verification event
      socketService.emitPaymentVerified({
        _id: payment._id,
        user: user?._id,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        subscription: populatedPayment.subscription
      });
      
      // If subscription was activated, emit subscription event
      if (populatedPayment.subscription && populatedPayment.subscription.status === 'active') {
        socketService.emitSubscriptionUpdated({
          _id: populatedPayment.subscription._id,
          user: user?._id,
          planType: populatedPayment.subscription.planType,
          status: 'active',
          startDate: populatedPayment.subscription.startDate,
          endDate: populatedPayment.subscription.endDate
        });
        
        // Emit notification about subscription activation
        socketService.emitNotification({
          type: 'subscription_activated',
          title: 'Subscription Activated',
          message: `${user?.name}'s subscription is now active`,
          priority: 'high'
        });
      }
    } else {
      // Emit payment status update for rejection
      socketService.emitPaymentStatusUpdated({
        _id: payment._id,
        user: populatedPayment.user?._id,
        amount: payment.amount,
        status: payment.status
      });
    }

    res.status(200).json({
      success: true,
      message: status === 'verified' 
        ? 'Payment verified and subscription updated successfully'
        : 'Payment rejected',
      data: populatedPayment
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// @desc    Get all payments (Owner view with filters)
// @route   GET /api/payments/all
// @access  Private (Owner only)
exports.getAllPayments = async (req, res) => {
  try {
    const { status, userId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.user = userId;
    }

    const payments = await Payment.find(filter)
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType startDate endDate')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// ====================================
// LEGACY ENDPOINTS (For backward compatibility)
// ====================================

// @desc    Mark payment as paid (Legacy - Owner creates payment record)
// @route   PATCH /api/payments/:id/mark-paid
// @access  Private (Owner only)
exports.markPaymentPaid = async (req, res) => {
  try {
    const { paidAmount, paymentDate, transactionId } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.paidAmount = paidAmount || payment.amount;
    payment.paymentDate = paymentDate || new Date();
    payment.transactionId = transactionId;
    payment.markedBy = req.user._id;
    payment.paymentStatus = 'paid';

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment marked as paid',
      data: payment
    });
  } catch (error) {
    console.error('Mark payment paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking payment',
      error: error.message
    });
  }
};

// @desc    Upload UPI screenshot (Legacy)
// @route   POST /api/payments/:id/upload-screenshot
// @access  Private (Customer)
exports.uploadUPIScreenshot = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a screenshot'
      });
    }

    payment.upiScreenshot = req.file.path;
    payment.paymentStatus = 'pending';
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Screenshot uploaded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Upload screenshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading screenshot',
      error: error.message
    });
  }
};

// @desc    Get user's payments (Legacy - by userId)
// @route   GET /api/payments/user/:userId
// @access  Private
exports.getUserPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.params.userId })
      .populate('subscription', 'planType startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name mobile userId address')
      .populate('subscription', 'planType startDate endDate')
      .populate('verifiedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};
