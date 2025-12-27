const mongoose = require('mongoose');

const mealOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
mealOrderSchema.index({ user: 1, deliveryDate: 1 });
mealOrderSchema.index({ deliveryDate: 1, status: 1 });

// Method to check if order is after cutoff
mealOrderSchema.methods.checkCutoff = function() {
  this.isAfterCutoff = new Date() > this.cutoffTime;
  return this.isAfterCutoff;
};

module.exports = mongoose.model('MealOrder', mealOrderSchema);
