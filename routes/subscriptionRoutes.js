const express = require('express');
const router = express.Router();
const {
  createSubscription,
  getUserSubscriptions,
  getMyActiveSubscription,
  getAllSubscriptions,
  renewSubscription,
  togglePauseSubscription,
  getSubscription
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('owner'), createSubscription);
router.get('/', protect, authorize('owner'), getAllSubscriptions);
router.get('/my-active', protect, getMyActiveSubscription);
router.get('/user/:userId', protect, getUserSubscriptions);
router.get('/:id', protect, getSubscription);
router.post('/:id/renew', protect, authorize('owner'), renewSubscription);
router.patch('/:id/toggle-pause', protect, authorize('owner'), togglePauseSubscription);

module.exports = router;
