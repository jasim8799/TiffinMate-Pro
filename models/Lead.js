const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    distance: {
      type: Number,
      required: true,
      comment: 'Distance from restaurant in km'
    },
    address: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'not-interested'],
    default: 'new'
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for searching
leadSchema.index({ phone: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
