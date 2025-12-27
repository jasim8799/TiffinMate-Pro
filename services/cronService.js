const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const smsService = require('./smsService');
const moment = require('moment');

class CronService {
  // Check for subscriptions expiring in 2 days
  checkExpiringSubscriptions() {
    return cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running expiring subscriptions check...');
      
      try {
        const twoDaysFromNow = moment().add(2, 'days').endOf('day').toDate();
        const today = moment().startOf('day').toDate();

        const expiringSubscriptions = await Subscription.find({
          status: 'active',
          endDate: { $gte: today, $lte: twoDaysFromNow },
          expiryReminderSent: false
        }).populate('user');

        for (const subscription of expiringSubscriptions) {
          const user = subscription.user;
          const daysRemaining = Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));

          await smsService.sendSubscriptionReminder(
            user.mobile,
            user.name,
            daysRemaining,
            user._id
          );

          subscription.expiryReminderSent = true;
          await subscription.save();
        }

        console.log(`✅ Sent ${expiringSubscriptions.length} expiry reminders`);
      } catch (error) {
        console.error('❌ Error in expiring subscriptions check:', error);
      }
    });
  }

  // Check for expired subscriptions
  checkExpiredSubscriptions() {
    return cron.schedule('0 10 * * *', async () => {
      console.log('🔔 Running expired subscriptions check...');
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredSubscriptions = await Subscription.find({
          status: 'active',
          endDate: { $lt: today },
          expiryWarningSent: false
        }).populate('user');

        for (const subscription of expiredSubscriptions) {
          const user = subscription.user;

          await smsService.sendSubscriptionExpiry(
            user.mobile,
            user.name,
            user._id
          );

          subscription.status = 'expired';
          subscription.expiryWarningSent = true;
          await subscription.save();
        }

        console.log(`✅ Marked ${expiredSubscriptions.length} subscriptions as expired`);
      } catch (error) {
        console.error('❌ Error in expired subscriptions check:', error);
      }
    });
  }

  // Auto-disable service 1 day after expiry
  autoDisableExpiredSubscriptions() {
    return cron.schedule('0 11 * * *', async () => {
      console.log('🔔 Running auto-disable check...');
      
      try {
        const oneDayAgo = moment().subtract(1, 'day').endOf('day').toDate();

        const subscriptionsToDisable = await Subscription.find({
          status: 'expired',
          endDate: { $lt: oneDayAgo },
          disableReminderSent: false
        }).populate('user');

        for (const subscription of subscriptionsToDisable) {
          const user = subscription.user;

          // Disable user account
          user.isActive = false;
          await user.save();

          // Send SMS notification
          await smsService.sendServiceDisabled(
            user.mobile,
            user.name,
            user._id
          );

          subscription.status = 'disabled';
          subscription.disableReminderSent = true;
          await subscription.save();
        }

        console.log(`✅ Disabled ${subscriptionsToDisable.length} services`);
      } catch (error) {
        console.error('❌ Error in auto-disable check:', error);
      }
    });
  }

  // Check for overdue payments
  checkOverduePayments() {
    return cron.schedule('0 12 * * *', async () => {
      console.log('🔔 Running overdue payments check...');
      
      try {
        const today = new Date();
        
        const overduePayments = await Payment.find({
          paymentStatus: { $in: ['pending', 'partial'] },
          dueDate: { $lt: today }
        }).populate('user');

        for (const payment of overduePayments) {
          const user = payment.user;
          
          // Send reminder if not sent today
          const lastReminder = payment.lastReminderDate;
          if (!lastReminder || moment(lastReminder).isBefore(moment(), 'day')) {
            await smsService.sendPaymentOverdue(
              user.mobile,
              user.name,
              payment.pendingAmount,
              user._id
            );

            payment.paymentStatus = 'overdue';
            payment.reminderSent = true;
            payment.reminderCount += 1;
            payment.lastReminderDate = new Date();
            await payment.save();
          }
        }

        console.log(`✅ Sent ${overduePayments.length} overdue payment reminders`);
      } catch (error) {
        console.error('❌ Error in overdue payments check:', error);
      }
    });
  }

  // Start all cron jobs
  startAllJobs() {
    console.log('⏰ Starting cron jobs...');
    
    this.checkExpiringSubscriptions();
    this.checkExpiredSubscriptions();
    this.autoDisableExpiredSubscriptions();
    this.checkOverduePayments();
    
    console.log('✅ All cron jobs started');
  }
}

module.exports = new CronService();
