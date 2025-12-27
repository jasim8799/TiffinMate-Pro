const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getExpiringSubscriptions,
  createCustomerWithSubscription,
  getExtraTiffinRequests,
  approveExtraTiffin,
  getPauseRequests,
  approvePauseRequest
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('owner'), getDashboardStats);
router.get('/expiring-subscriptions', protect, authorize('owner'), getExpiringSubscriptions);
router.post('/create-customer', protect, authorize('owner'), createCustomerWithSubscription);
router.get('/extra-tiffins', protect, authorize('owner'), getExtraTiffinRequests);
router.post('/extra-tiffins/:id/approve', protect, authorize('owner'), approveExtraTiffin);
router.get('/pause-requests', protect, authorize('owner'), getPauseRequests);
router.post('/pause-requests/:id/approve', protect, authorize('owner'), approvePauseRequest);

module.exports = router;
