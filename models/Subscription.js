const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: ['trial', 'classic', 'premium-veg', 'premium-non-veg'],
    required: true
  },
  planCategory: {
    type: String,
    enum: ['trial', 'classic', 'premium'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  usedDays: {
    type: Number,
    default: 0
  },
  remainingDays: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'disabled', 'paused'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: true
  },
  mealPreferences: {
    includesLunch: {
      type: Boolean,
      default: true
    },
    includesDinner: {
      type: Boolean,
      default: true
    },
    dietaryPreference: {
      type: String,
      enum: ['veg', 'non-veg', 'both'],
      default: 'both'
    }
  },
  expiryReminderSent: {
    type: Boolean,
    default: false
  },
  expiryWarningSent: {
    type: Boolean,
    default: false
  },
  disableReminderSent: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Update remaining days before saving
subscriptionSchema.pre('save', function(next) {
  this.remainingDays = this.totalDays - this.usedDays;
  next();
});

// Method to check if subscription is about to expire
subscriptionSchema.methods.isNearExpiry = function(days = 2) {
  const daysUntilExpiry = Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
};

// Method to check if subscription has expired
subscriptionSchema.methods.hasExpired = function() {
  return new Date() > this.endDate;
};

// Method to increment used days
subscriptionSchema.methods.markDayUsed = async function() {
  this.usedDays += 1;
  this.remainingDays = this.totalDays - this.usedDays;
  
  if (this.remainingDays <= 0 || this.hasExpired()) {
    this.status = 'expired';
  }
  
  await this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
