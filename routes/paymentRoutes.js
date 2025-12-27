const express = require('express');
const router = express.Router();
const {
  createPayment,
  markPaymentPaid,
  uploadUPIScreenshot,
  getUserPayments,
  getMyPayments,
  getAllPayments,
  getPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, authorize('owner'), createPayment);
router.get('/', protect, authorize('owner'), getAllPayments);
router.get('/my', protect, authorize('customer'), getMyPayments);
router.get('/user/:userId', protect, getUserPayments);
router.get('/:id', protect, getPayment);
router.patch('/:id/mark-paid', protect, authorize('owner'), markPaymentPaid);
router.post('/:id/upload-screenshot', protect, authorize('customer'), upload.single('screenshot'), uploadUPIScreenshot);

module.exports = router;
