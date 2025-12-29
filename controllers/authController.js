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

    // ROLE-BASED AUTHENTICATION FLOW
    // OWNER: Requires OTP verification
    // CUSTOMER: Direct login with JWT token (NO OTP)
    
    if (user.role === 'owner') {
      // ===== OWNER FLOW: Send OTP =====
      console.log(`🔑 OWNER LOGIN: ${user.userId} - OTP flow initiated`);
      
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

      // Generate random 6-digit OTP (now async - returns plain OTP to send)
      const otp = await user.generateOTP();
      await user.save();
      
      console.log(`🔐 OTP GENERATED for ${user.userId}: ${otp}`);
      console.log(`📱 Sending OTP to mobile: ${user.mobile}`);
      console.log(`⏰ OTP expires at: ${user.otp.expiry}`);

      // Send OTP via Fast2SMS Quick Transactional Route
      const smsResult = await smsService.sendOTP(user.mobile, otp, user._id);
      
      console.log(`📨 SMS Result:`, smsResult);
      
      if (!smsResult.success) {
        console.error(`❌ Failed to send OTP for user ${user.userId}:`, smsResult.error);
        
        // Clear OTP from user since SMS failed
        user.otp = undefined;
        await user.save();
        
        // Return HTTP 503 (Service Unavailable) for SMS failures
        return res.status(503).json({
          success: false,
          message: 'OTP service unavailable. Please try again later.',
          debug: process.env.NODE_ENV === 'development' ? smsResult : undefined
        });
      }
      
      console.log(`✅ OTP sent successfully to ${user.mobile}`);

      // Mask mobile number for security (show only last 4 digits)
      const maskedMobile = user.mobile.replace(/^(\d{6})(\d{4})$/, '******$2');

      res.status(200).json({
        success: true,
        requiresOtp: true,
        role: 'owner',
        message: `OTP sent successfully to ${maskedMobile}`,
        data: {
          userId: user.userId,
          mobile: maskedMobile,
          otpExpiry: user.otp.expiry,
          requiresPasswordChange: !user.isPasswordChanged
        }
      });
    } else {
      // ===== CUSTOMER FLOW: Direct login (NO OTP) =====
      console.log(`👤 CUSTOMER LOGIN: ${user.userId} - Direct login (no OTP)`);
      
      // Generate JWT token directly
      const token = generateToken(user._id);

      res.status(200).json({
        success: true,
        requiresOtp: false,
        token: token,
        data: {
          userId: user.userId,
          name: user.name,
          mobile: user.mobile,
          role: user.role,
          requiresPasswordChange: !user.isPasswordChanged
        }
      });
    }
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
// @access  Public (OWNER ONLY)
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

    // SECURITY: Verify OTP is only for OWNER role
    if (user.role !== 'owner') {
      console.warn(`⚠️ Unauthorized OTP verification attempt for ${user.role}: ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'OTP verification is only available for owner accounts'
      });
    }

    // Verify OTP (now async - uses bcrypt.compare)
    const verification = await user.verifyOTP(otp);

    if (!verification.success) {
      await user.save(); // Save updated attempt count
      return res.status(400).json({
        success: false,
        message: verification.message,
        attemptsRemaining: user.otp ? Math.max(0, 3 - user.otp.attempts) : 0
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

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private (JWT required)
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Strict contract validation - reject extra fields
    const allowedFields = ['oldPassword', 'newPassword'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.log(`Change password request with extra fields: ${extraFields.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: `Unexpected fields: ${extraFields.join(', ')}. Only 'oldPassword' and 'newPassword' are accepted.`
      });
    }

    // Validate required fields (backup validation)
    if (!oldPassword) {
      console.log(`Change password failed: missing oldPassword for user ${req.user._id}`);
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }

    if (!newPassword) {
      console.log(`Change password failed: missing newPassword for user ${req.user._id}`);
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Password strength validation (simple & realistic)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      console.log(`Change password failed: weak password for user ${req.user._id}`);
      
      // Provide specific feedback
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter'
        });
      }
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one lowercase letter'
        });
      }
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one number'
        });
      }
      
      // Fallback generic message
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      });
    }

    // Fetch user from database with password field
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      console.error(`Change password failed: user not found with ID ${req.user._id}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password using bcrypt.compare
    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      console.log(`Change password failed: incorrect old password for user ${user.userId}`);
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (bcrypt hash handled by User model pre-save hook)
    user.password = newPassword;
    user.isPasswordChanged = true;
    await user.save();

    console.log(`Password changed successfully for user ${user.userId}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error changing password. Please try again.'
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

    // Generate new OTP (now async)
    const otp = await user.generateOTP();
    await user.save();

    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(user.mobile, otp, user._id);
    
    if (!smsResult.success) {
      user.otp = undefined;
      await user.save();
      
      return res.status(503).json({
        success: false,
        message: 'OTP service unavailable. Please try again later.'
      });
    }

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
