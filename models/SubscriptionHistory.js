const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'activated',
      'paused',
      'resumed',
      'cancelled',
      'expired',
      'payment_completed',
      'payment_failed',
      'status_changed',
      'plan_changed',
      'renewed'
    ]
  },
  previousStatus: {
    type: String,
    enum: ['pending', 'active', 'paused', 'cancelled', 'expired']
  },
  newStatus: {
    type: String,
    enum: ['pending', 'active', 'paused', 'cancelled', 'expired']
  },
  previousPlan: {
    type: String
  },
  newPlan: {
    type: String
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
subscriptionHistorySchema.index({ subscription: 1, createdAt: -1 });
subscriptionHistorySchema.index({ user: 1, createdAt: -1 });
subscriptionHistorySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
