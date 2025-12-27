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
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');
const {
  loginValidation,
  otpValidation,
  changePasswordValidation,
  accessRequestValidation,
  validate
} = require('../middleware/validators');

// Apply rate limiting and validation to sensitive endpoints
router.post('/login', loginLimiter, loginValidation, validate, login);
router.post('/verify-otp', otpLimiter, otpValidation, validate, verifyOTP);
router.post('/resend-otp', otpLimiter, validate, resendOTP);
router.post('/request-access', accessRequestValidation, validate, requestAccess);
router.post('/change-password', protect, changePasswordValidation, validate, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
