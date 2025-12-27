const express = require('express');
const router = express.Router();
const {
  selectMeal,
  getMyMealSelection,
  getDefaultMeals,
  setDefaultMeal,
  getAllMealOrders
} = require('../controllers/mealController');
const { protect, authorize } = require('../middleware/auth');

router.post('/select', protect, authorize('customer'), selectMeal);
router.get('/my-selection', protect, authorize('customer'), getMyMealSelection);
router.get('/defaults', protect, getDefaultMeals);
router.post('/defaults', protect, authorize('owner'), setDefaultMeal);
router.get('/orders', protect, authorize('owner'), getAllMealOrders);

module.exports = router;
