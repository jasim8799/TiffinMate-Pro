const mongoose = require('mongoose');

const mealOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  orderDate: {
    type: Date,
    required: true
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  mealType: {
    type: String,
    enum: ['lunch', 'dinner'],
    required: true
  },
  selectedMeal: {
    name: String,
    items: [String],
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  cutoffTime: {
    type: Date,
    required: true
  },
  isAfterCutoff: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for efficient querying
mealOrderSchema.index({ deliveryDate: 1, status: 1 });

// ========================================
// CRITICAL: UNIQUE COMPOUND INDEX
// ========================================
// This prevents duplicate MealOrders for the same user + date + mealType
// Enforces: ONE MealOrder per (user + deliveryDate + mealType)
mealOrderSchema.index(
  { user: 1, deliveryDate: 1, mealType: 1 },
  { unique: true, name: 'unique_user_date_mealtype' }
);

// Method to check if order is after cutoff
mealOrderSchema.methods.checkCutoff = function() {
  this.isAfterCutoff = new Date() > this.cutoffTime;
  return this.isAfterCutoff;
};

module.exports = mongoose.model('MealOrder', mealOrderSchema);
