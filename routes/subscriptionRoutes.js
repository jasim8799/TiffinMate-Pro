const express = require('express');
const router = express.Router();
const {
  getPlans,
  selectPlan,
  updateSubscriptionStatus,
  createSubscription,
  getUserSubscriptions,
  getMyActiveSubscription,
  getAllSubscriptions,
  renewSubscription,
  togglePauseSubscription,
  getSubscription
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/plans', getPlans);

// Customer routes
router.post('/select', protect, authorize('customer'), selectPlan);
router.get('/my-active', protect, getMyActiveSubscription);

// Owner routes
router.post('/', protect, authorize('owner'), createSubscription);
router.get('/', protect, authorize('owner'), getAllSubscriptions);
router.put('/:id/status', protect, authorize('owner'), updateSubscriptionStatus);
router.get('/user/:userId', protect, getUserSubscriptions);
router.get('/:id', protect, getSubscription);
router.post('/:id/renew', protect, authorize('owner'), renewSubscription);
router.patch('/:id/toggle-pause', protect, authorize('owner'), togglePauseSubscription);

module.exports = router;
