const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserActive,
  getCustomers
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('owner'), getAllUsers);
router.get('/customers', protect, authorize('owner'), getCustomers);
router.get('/:id', protect, getUserById);
router.patch('/:id', protect, updateUser);
router.patch('/:id/toggle-active', protect, authorize('owner'), toggleUserActive);

module.exports = router;
