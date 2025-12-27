const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  amount: {
    type: Number,
    required: true
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'extra-tiffin', 'other'],
    default: 'subscription'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'other'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending', 'overdue'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: 0
  },
  paymentDate: Date,
  dueDate: Date,
  upiScreenshot: String,
  transactionId: String,
  notes: String,
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  lastReminderDate: Date,
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Update pending amount before saving
paymentSchema.pre('save', function(next) {
  this.pendingAmount = this.amount - this.paidAmount;
  
  if (this.paidAmount >= this.amount) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  }
  
  // Check if overdue
  if (this.dueDate && new Date() > this.dueDate && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }
  
  next();
});

// Method to check if payment is overdue
paymentSchema.methods.isOverdue = function() {
  return this.dueDate && 
         new Date() > this.dueDate && 
         this.paymentStatus !== 'paid';
};

module.exports = mongoose.model('Payment', paymentSchema);
