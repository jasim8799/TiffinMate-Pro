const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  role: {
    type: String,
    enum: ['owner', 'customer', 'delivery'],
    default: 'customer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPasswordChanged: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiry: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiry: new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || 2) * 60 * 1000),
    attempts: 0
  };
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otp.code) {
    return { success: false, message: 'No OTP generated' };
  }
  
  if (this.otp.attempts >= parseInt(process.env.OTP_MAX_ATTEMPTS || 3)) {
    return { success: false, message: 'Maximum OTP attempts exceeded' };
  }
  
  if (new Date() > this.otp.expiry) {
    return { success: false, message: 'OTP expired' };
  }
  
  this.otp.attempts += 1;
  
  if (this.otp.code === candidateOTP) {
    this.otp = undefined; // Clear OTP after successful verification
    return { success: true, message: 'OTP verified successfully' };
  }
  
  return { success: false, message: 'Invalid OTP' };
};

module.exports = mongoose.model('User', userSchema);
