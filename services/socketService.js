const socketIO = require('socket.io');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle user authentication and registration
      socket.on('authenticate', (data) => {
        const { userId, role } = data;
        if (userId) {
          this.connectedClients.set(userId, socket.id);
          socket.userId = userId;
          socket.role = role;
          
          // Join role-specific rooms
          socket.join(role); // 'customer' or 'owner'
          socket.join(`user_${userId}`); // Personal room
          
          console.log(`✅ User authenticated: ${userId} (${role})`);
          socket.emit('authenticated', { success: true, userId });
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedClients.delete(socket.userId);
          console.log(`❌ User disconnected: ${socket.userId}`);
        } else {
          console.log(`❌ Client disconnected: ${socket.id}`);
        }
      });
    });

    console.log('🚀 Socket.IO initialized');
    return this.io;
  }

  // ========== USER & SUBSCRIPTION EVENTS ==========

  emitUserCreated(userData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: user_created', userData._id);
    
    // Notify all owners
    this.io.to('owner').emit('user_created', {
      user: userData,
      timestamp: new Date()
    });
  }

  emitUserUpdated(userData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: user_updated', userData._id);
    
    // Notify the specific user
    this.io.to(`user_${userData._id}`).emit('user_updated', {
      user: userData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('user_updated', {
      user: userData,
      timestamp: new Date()
    });
  }

  emitUserDeleted(userId) {
    if (!this.io) return;
    console.log('📢 Broadcasting: user_deleted', userId);
    
    // Notify the specific user (for logout)
    this.io.to(`user_${userId}`).emit('user_deleted', {
      userId,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('user_deleted', {
      userId,
      timestamp: new Date()
    });
  }

  emitSubscriptionCreated(subscriptionData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: subscription_created', subscriptionData._id);
    
    // Notify the specific user
    this.io.to(`user_${subscriptionData.user}`).emit('subscription_created', {
      subscription: subscriptionData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('subscription_created', {
      subscription: subscriptionData,
      timestamp: new Date()
    });
  }

  emitSubscriptionUpdated(subscriptionData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: subscription_updated', subscriptionData._id);
    
    // Notify the specific user
    this.io.to(`user_${subscriptionData.user}`).emit('subscription_updated', {
      subscription: subscriptionData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('subscription_updated', {
      subscription: subscriptionData,
      timestamp: new Date()
    });
  }

  // ========== MEAL EVENTS ==========

  emitMealSelected(mealOrderData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: meal_selected', mealOrderData._id);
    
    // Notify all owners
    this.io.to('owner').emit('meal_selected', {
      mealOrder: mealOrderData,
      timestamp: new Date()
    });
  }

  emitMealUpdated(mealOrderData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: meal_updated', mealOrderData._id);
    
    // Notify the specific user
    this.io.to(`user_${mealOrderData.user}`).emit('meal_updated', {
      mealOrder: mealOrderData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('meal_updated', {
      mealOrder: mealOrderData,
      timestamp: new Date()
    });
  }

  // ========== COOKING & DELIVERY EVENTS ==========

  emitCookingStarted(deliveryData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: cooking_started', deliveryData._id);
    
    // Notify the specific user
    this.io.to(`user_${deliveryData.user}`).emit('cooking_started', {
      delivery: deliveryData,
      timestamp: new Date()
    });
  }

  emitOutForDelivery(deliveryData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: out_for_delivery', deliveryData._id);
    
    // Notify the specific user
    this.io.to(`user_${deliveryData.user}`).emit('out_for_delivery', {
      delivery: deliveryData,
      timestamp: new Date()
    });
  }

  emitDelivered(deliveryData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: delivered', deliveryData._id);
    
    // Notify the specific user
    this.io.to(`user_${deliveryData.user}`).emit('delivered', {
      delivery: deliveryData,
      timestamp: new Date()
    });
    
    // Notify all owners (for tracking)
    this.io.to('owner').emit('delivered', {
      delivery: deliveryData,
      timestamp: new Date()
    });
  }

  emitDeliveryStatusUpdated(deliveryData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: delivery_status_updated', deliveryData._id);
    
    // Notify the specific user
    this.io.to(`user_${deliveryData.user}`).emit('delivery_status_updated', {
      delivery: deliveryData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('delivery_status_updated', {
      delivery: deliveryData,
      timestamp: new Date()
    });
  }

  // ========== PAYMENT EVENTS ==========

  emitPaymentCreated(paymentData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: payment_created', paymentData._id);
    
    // Notify all owners
    this.io.to('owner').emit('payment_created', {
      payment: paymentData,
      timestamp: new Date()
    });
  }

  emitPaymentVerified(paymentData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: payment_verified', paymentData._id);
    
    // Notify the specific user
    this.io.to(`user_${paymentData.user}`).emit('payment_verified', {
      payment: paymentData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('payment_verified', {
      payment: paymentData,
      timestamp: new Date()
    });
  }

  emitPaymentReceived(paymentData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: payment_received', paymentData._id);
    
    // Notify the specific user
    this.io.to(`user_${paymentData.user}`).emit('payment_received', {
      payment: paymentData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('payment_received', {
      payment: paymentData,
      timestamp: new Date()
    });
  }

  emitPaymentStatusUpdated(paymentData) {
    if (!this.io) return;
    console.log('📢 Broadcasting: payment_status_updated', paymentData._id);
    
    // Notify the specific user
    this.io.to(`user_${paymentData.user}`).emit('payment_status_updated', {
      payment: paymentData,
      timestamp: new Date()
    });
    
    // Notify all owners
    this.io.to('owner').emit('payment_status_updated', {
      payment: paymentData,
      timestamp: new Date()
    });
  }

  // ========== NOTIFICATION EVENTS ==========

  emitNotification(notificationData) {
    if (!this.io) return;
    console.log('📢 Broadcasting notification to owners:', notificationData.type);
    
    // Notify all owners
    this.io.to('owner').emit('notification', {
      notification: notificationData,
      timestamp: new Date()
    });
  }

  emitNotificationToUser(userId, notification) {
    if (!this.io) return;
    console.log('📢 Sending notification to user:', userId);
    
    this.io.to(`user_${userId}`).emit('notification', {
      notification,
      timestamp: new Date()
    });
  }

  emitBroadcastNotification(notification) {
    if (!this.io) return;
    console.log('📢 Broadcasting notification to all users');
    
    this.io.emit('notification', {
      notification,
      timestamp: new Date()
    });
  }

  // ========== UTILITY METHODS ==========

  getConnectedClients() {
    return Array.from(this.connectedClients.keys());
  }

  isUserConnected(userId) {
    return this.connectedClients.has(userId);
  }
}

// Export singleton instance
module.exports = new SocketService();
