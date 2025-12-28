const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserActive,
  getCustomers,
  createCustomer
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Create customer (Owner only)
router.post('/create', protect, authorize('owner'), createCustomer);

router.get('/', protect, authorize('owner'), getAllUsers);
router.get('/customers', protect, authorize('owner'), getCustomers);
router.get('/:id', protect, getUserById);
router.patch('/:id', protect, updateUser);
router.patch('/:id/toggle-active', protect, authorize('owner'), toggleUserActive);

module.exports = router;
