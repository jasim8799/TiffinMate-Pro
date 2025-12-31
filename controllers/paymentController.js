const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const moment = require('moment');
const { createNotification } = require('./notificationController');

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
    const { subscriptionId, amount, referenceNote } = req.body;

    if (!subscriptionId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and amount are required'
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
      paymentMethod: 'upi',
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

    // Generate UPI payment link
    const upiLink = `upi://pay?pa=${UPI_CONFIG.upiId}&pn=${encodeURIComponent(UPI_CONFIG.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(referenceNote || 'Payment for meal subscription')}`;

    res.status(201).json({
      success: true,
      message: 'Payment created successfully. Please complete the UPI payment.',
      data: {
        paymentId: payment._id,
        upiId: UPI_CONFIG.upiId,
        name: UPI_CONFIG.name,
        amount,
        upiLink: upiLink,
        qrString: upiLink
      }
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
      await createNotification(
        'PAYMENT_VERIFIED',
        `Payment of ₹${payment.amount} verified for ${populatedPayment.user?.name || 'customer'}`,
        payment._id,
        'Payment',
        {
          amount: payment.amount,
          customerName: populatedPayment.user?.name,
          customerId: populatedPayment.user?.userId
        }
      );
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
