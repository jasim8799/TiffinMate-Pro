const express = require('express');
const router = express.Router();
const { getSubscriptionPlans } = require('../controllers/subscriptionPlanController');

// GET /api/subscription-plans - Public endpoint for fetching all active plans
// Used by Owner during customer creation
router.get('/', getSubscriptionPlans);

module.exports = router;
