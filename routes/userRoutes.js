const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserActive,
  getCustomers,
  createCustomer,
  getMyProfile,
  updateMyProfile,
  uploadProfileImage
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Profile routes (logged-in user)
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.post('/upload-profile-image', protect, uploadSingle('profileImage'), uploadProfileImage);

// Create customer (Owner only)
router.post('/create', protect, authorize('owner'), createCustomer);

router.get('/', protect, authorize('owner'), getAllUsers);
router.get('/customers', protect, authorize('owner'), getCustomers);
router.get('/:id', protect, getUserById);
router.patch('/:id', protect, authorize('owner'), updateUser);
router.patch('/:id/toggle-active', protect, authorize('owner'), toggleUserActive);

module.exports = router;
