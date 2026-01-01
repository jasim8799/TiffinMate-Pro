const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  durationType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  durationDays: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  planCategory: {
    type: String,
    enum: ['trial', 'classic', 'premium'],
    default: 'classic'
  },
  type: {
    type: String,
    enum: ['VEG', 'NON_VEG', 'MIX'],
    required: true,
    default: 'MIX'
  },
  menuCategory: {
    type: String,
    enum: ['classic', 'premium-veg', 'premium-non-veg'],
    required: true
  },
  mealTypes: {
    lunch: {
      type: Boolean,
      default: true
    },
    dinner: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  features: [String],
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
subscriptionPlanSchema.index({ durationType: 1, isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
