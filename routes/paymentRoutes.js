const express = require('express');
const router = express.Router();
const {
  createPayment,
  markPaymentPaid,
  uploadUPIScreenshot,
  getUserPayments,
  getMyPayments,
  getPendingPayments,
  verifyPayment,
  getAllPayments,
  getPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ====================================
// USER ROUTES (Customer)
// ====================================
router.post('/create', protect, authorize('customer'), createPayment);
router.get('/my', protect, authorize('customer'), getMyPayments);

// ====================================
// OWNER ROUTES
// ====================================
router.get('/pending', protect, authorize('owner'), getPendingPayments);
router.put('/:id/verify', protect, authorize('owner'), verifyPayment);
router.get('/all', protect, authorize('owner'), getAllPayments);

// ====================================
// LEGACY ROUTES (Backward compatibility)
// ====================================
router.post('/', protect, authorize('owner'), createPayment);
router.get('/', protect, authorize('owner'), getAllPayments);
router.get('/user/:userId', protect, getUserPayments);
router.get('/:id', protect, getPayment);
router.patch('/:id/mark-paid', protect, authorize('owner'), markPaymentPaid);
router.post('/:id/upload-screenshot', protect, authorize('customer'), upload.single('screenshot'), uploadUPIScreenshot);

module.exports = router;
