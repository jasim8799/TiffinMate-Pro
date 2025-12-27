const express = require('express');
const router = express.Router();
const {
  login,
  verifyOTP,
  changePassword,
  requestAccess,
  getMe,
  resendOTP
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/request-access', requestAccess);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
