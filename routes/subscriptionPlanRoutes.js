const express = require('express');
const router = express.Router();
const {
  getSubscriptionPlans,
  getAllPlansForOwner,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan
} = require('../controllers/subscriptionPlanController');
const auth = require('../middleware/auth');
const ownerOnly = require('../middleware/ownerOnly');

// Public route - Get active plans (used during Add Customer)
router.get('/', getSubscriptionPlans);

// Protected routes - Owner only
router.get('/all', auth, ownerOnly, getAllPlansForOwner);
router.get('/:id', auth, ownerOnly, getPlanById);
router.post('/', auth, ownerOnly, createPlan);
router.put('/:id', auth, ownerOnly, updatePlan);
router.patch('/:id/status', auth, ownerOnly, togglePlanStatus);
router.delete('/:id', auth, ownerOnly, deletePlan);

module.exports = router;
