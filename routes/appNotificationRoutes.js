const express = require('express');
const router = express.Router();
const appNotificationController = require('../controllers/appNotificationController');
const { protect, ownerOnly } = require('../middleware/auth');

// All routes require authentication and owner role
router.use(protect);
router.use(ownerOnly);

// Get all notifications with filters and pagination
router.get('/', appNotificationController.getAllNotifications);

// Get unread count
router.get('/unread-count', appNotificationController.getUnreadCount);

// Get notification statistics
router.get('/stats', appNotificationController.getNotificationStats);

// Get notifications by type
router.get('/type/:type', appNotificationController.getNotificationsByType);

// Mark specific notification as read
router.put('/:id/read', appNotificationController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', appNotificationController.markAllAsRead);

// Delete old notifications (cleanup)
router.delete('/cleanup', appNotificationController.deleteOldNotifications);

module.exports = router;
