const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const smsService = require('../services/smsService');
const { generateToken } = require('../middleware/auth');

// @desc    Login - Step 1: Verify credentials and send OTP
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and password'
      });
    }

    // Find user
    const user = await User.findOne({ userId }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Validate mobile number exists
    if (!user.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registered mobile number. Please contact admin.'
      });
    }

    // Validate Indian mobile number format (10 digits, starts with 6-9)
    if (!/^[6-9]\d{9}$/.test(user.mobile)) {
      console.error(`User ${user.userId} has invalid mobile format`);
      return res.status(400).json({
        success: false,
        message: 'Invalid registered mobile number. Please contact admin.'
      });
    }

    // TEMPORARY: Dev OTP for OWNER role testing (bypass SMS)
    // This allows admin testing without Fast2SMS costs
    // Customers and delivery agents still use real SMS OTP
    const isDevOTPEnabled = process.env.DEV_OTP_ENABLED === 'true';
    const isOwner = user.role.toLowerCase() === 'owner';
    
    let otp;
    let skipSMS = false;

    if (isDevOTPEnabled && isOwner) {
      // Use fixed dev OTP for admin testing (no SMS sent)
      otp = user.generateDevOTP();
      skipSMS = true;
      console.log(`DEV OTP mode: Fixed OTP generated for admin user ${user.userId}`);
    } else {
      // Generate random OTP for customers/delivery or when dev mode disabled
      otp = user.generateOTP();
    }

    await user.save();

    // Send OTP via SMS (skip for admin in dev mode)
    if (!skipSMS) {
      const smsResult = await smsService.sendOTP(user.mobile, otp, user._id);
      
      if (!smsResult.success) {
        console.error(`Failed to send OTP for user ${user.userId}:`, smsResult.error);
        return res.status(500).json({
          success: false,
          message: 'Unable to send OTP at this time. Please try again in a moment.'
        });
      }
    }

    // Mask mobile number for security (show only last 4 digits)
    const maskedMobile = user.mobile.replace(/^(\d{6})(\d{4})$/, '******$2');

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${maskedMobile}`,
      data: {
        userId: user.userId,
        mobile: maskedMobile,
        otpExpiry: user.otp.expiry,
        requiresPasswordChange: !user.isPasswordChanged
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// @desc    Login - Step 2: Verify OTP and complete login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and OTP'
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TEMPORARY: Dev OTP verification for admin testing
    // Accept dev OTP (111111) ONLY for OWNER role when DEV_OTP_ENABLED=true
    // Reject dev OTP for customers/delivery to ensure they use real SMS
    const isDevOTPEnabled = process.env.DEV_OTP_ENABLED === 'true';
    const isOwner = user.role.toLowerCase() === 'owner';
    const isDevOTP = otp === '111111';

    if (isDevOTP) {
      // Dev OTP submitted - check if allowed
      if (!isDevOTPEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }
      
      if (!isOwner) {
        // Reject dev OTP for non-admin users
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }
      
      // Dev OTP is valid for admin in dev mode
      console.log(`DEV OTP mode: Dev OTP accepted for admin user ${user.userId}`);
    }

    // Verify OTP (handles both dev and real OTP)
    const verification = user.verifyOTP(otp);

    if (!verification.success) {
      await user.save(); // Save updated attempt count
      return res.status(400).json({
        success: false,
        message: verification.message,
        attemptsRemaining: 3 - user.otp.attempts
      });
    }

    await user.save(); // Clear OTP after successful verification

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      data: {
        userId: user.userId,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        requiresPasswordChange: !user.isPasswordChanged
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during OTP verification',
      error: error.message
    });
  }
};

// @desc    Change password (required on first login)
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    console.log('Change password request received');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('User ID from JWT:', req.user?._id);

    const { oldPassword, newPassword } = req.body;

    // Validate required fields
    if (!oldPassword) {
      console.log('Validation failed: oldPassword missing');
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    if (!newPassword) {
      console.log('Validation failed: newPassword missing');
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      console.log('Validation failed: password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      console.log('Validation failed: no uppercase letter');
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter'
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      console.log('Validation failed: no lowercase letter');
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one lowercase letter'
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      console.log('Validation failed: no number');
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one number'
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      console.log('Validation failed: no special character');
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one special character (!@#$%^&*...)'
      });
    }

    // Fetch user from database
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found, verifying old password');

    // Verify old password using bcrypt
    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      console.log('Old password verification failed');
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    console.log('Old password verified, updating to new password');

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.isPasswordChanged = true;
    await user.save();

    console.log('Password changed successfully for user:', user.userId);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error changing password. Please try again.',
      error: error.message
    });
  }
};
      message: 'Error changing password',
      error: error.message
    });
  }
};

// @desc    Request access (for new users)
// @route   POST /api/auth/request-access
// @access  Public
exports.requestAccess = async (req, res) => {
  try {
    const { name, mobile, address, preferredPlan, mealPreferences, message } = req.body;

    if (!name || !mobile || !preferredPlan) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, mobile, and preferred plan'
      });
    }

    // Check if mobile already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile number already exists'
      });
    }

    // Check if request already exists
    const existingRequest = await AccessRequest.findOne({ mobile, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Access request already submitted. Please wait for approval.'
      });
    }

    // Create access request
    const accessRequest = await AccessRequest.create({
      name,
      mobile,
      address,
      preferredPlan,
      mealPreferences,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Access request submitted successfully. You will receive credentials via SMS once approved.',
      data: accessRequest
    });
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting access request',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID'
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP via SMS
    await smsService.sendOTP(user.mobile, otp, user._id);

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpExpiry: user.otp.expiry
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
      error: error.message
    });
  }
};
