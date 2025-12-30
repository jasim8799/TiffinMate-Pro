const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const upload = require('../middleware/upload');

// @desc    Create payment record
// @route   POST /api/payments
// @access  Private (Owner only)
exports.createPayment = async (req, res) => {
  try {
    const {
      userId,
      subscriptionId,
      amount,
      paymentType,
      paymentMethod,
      dueDate,
      notes
    } = req.body;

    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const payment = await Payment.create({
      user: userId,
      subscription: subscriptionId,
      amount,
      paymentType: paymentType || 'subscription',
      paymentMethod,
      dueDate: dueDate || new Date(),
      notes,
      markedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: payment
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

// @desc    Mark payment as paid
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

// @desc    Upload UPI screenshot
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
    payment.paymentStatus = 'pending'; // Awaiting verification
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

// @desc    Get user's payments
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

// @desc    Get my payments
// @route   GET /api/payments/my
// @access  Private (Customer)
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('subscription', 'planType startDate endDate')
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

// @desc    Get all payments (admin)
// @route   GET /api/payments
// @access  Private (Owner only)
exports.getAllPayments = async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const filter = {};

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    const payments = await Payment.find(filter)
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType')
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

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name mobile userId address')
      .populate('subscription', 'planType startDate endDate');

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
