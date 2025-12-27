const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const smsService = require('./smsService');
const logger = require('../utils/logger');
const moment = require('moment');

class CronService {
  constructor() {
    this.jobs = [];
  }

  // Check for subscriptions expiring in 2 days
  checkExpiringSubscriptions() {
    const job = cron.schedule('0 9 * * *', async () => {
      const jobName = 'Check Expiring Subscriptions';
      logger.info(`Running: ${jobName}`);
      
      try {
        const twoDaysFromNow = moment().add(2, 'days').endOf('day').toDate();
        const today = moment().startOf('day').toDate();

        const expiringSubscriptions = await Subscription.find({
          status: 'active',
          endDate: { $gte: today, $lte: twoDaysFromNow },
          expiryReminderSent: false
        }).populate('user');

        let sentCount = 0;
        for (const subscription of expiringSubscriptions) {
          try {
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
            sentCount++;
          } catch (err) {
            logger.error(`Failed to send reminder for subscription ${subscription._id}`, err);
          }
        }

        logger.success(`${jobName} completed: ${sentCount}/${expiringSubscriptions.length} reminders sent`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: 'checkExpiringSubscriptions', job });
    return job;
  }

  // Check for expired subscriptions
  checkExpiredSubscriptions() {
    const job = cron.schedule('0 10 * * *', async () => {
      const jobName = 'Check Expired Subscriptions';
      logger.info(`Running: ${jobName}`);
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredSubscriptions = await Subscription.find({
          status: 'active',
          endDate: { $lt: today },
          expiryWarningSent: false
        }).populate('user');

        let markedCount = 0;
        for (const subscription of expiredSubscriptions) {
          try {
            const user = subscription.user;

            await smsService.sendSubscriptionExpiry(
              user.mobile,
              user.name,
              user._id
            );

            subscription.status = 'expired';
            subscription.expiryWarningSent = true;
            await subscription.save();
            markedCount++;
          } catch (err) {
            logger.error(`Failed to mark subscription ${subscription._id} as expired`, err);
          }
        }

        logger.success(`${jobName} completed: ${markedCount}/${expiredSubscriptions.length} subscriptions marked as expired`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: 'checkExpiredSubscriptions', job });
    return job;
  }

  // Auto-disable service 1 day after expiry
  autoDisableExpiredSubscriptions() {
    const job = cron.schedule('0 11 * * *', async () => {
      const jobName = 'Auto-Disable Expired Subscriptions';
      logger.info(`Running: ${jobName}`);
      
      try {
        const oneDayAgo = moment().subtract(1, 'day').endOf('day').toDate();

        const subscriptionsToDisable = await Subscription.find({
          status: 'expired',
          endDate: { $lt: oneDayAgo },
          disableReminderSent: false
        }).populate('user');

        let disabledCount = 0;
        for (const subscription of subscriptionsToDisable) {
          try {
            const user = subscription.user;

            // Disable user account
            user.isActive = false;
            await user.save();

            await smsService.sendServiceDisabled(
              user.mobile,
              user.name,
              user._id
            );

            subscription.status = 'disabled';
            subscription.disableReminderSent = true;
            await subscription.save();
            disabledCount++;
          } catch (err) {
            logger.error(`Failed to disable subscription ${subscription._id}`, err);
          }
        }

        logger.success(`${jobName} completed: ${disabledCount}/${subscriptionsToDisable.length} accounts disabled`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: 'autoDisableExpiredSubscriptions', job });
    return job;
  }

  // Check for overdue payments
  checkOverduePayments() {
    const job = cron.schedule('0 12 * * *', async () => {
      const jobName = 'Check Overdue Payments';
      logger.info(`Running: ${jobName}`);
      
      try {
        const today = new Date();
        
        const overduePayments = await Payment.find({
          paymentStatus: { $in: ['pending', 'partial'] },
          dueDate: { $lt: today }
        }).populate('user');

        let reminderCount = 0;
        for (const payment of overduePayments) {
          try {
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
              reminderCount++;
            }
          } catch (err) {
            logger.error(`Failed to send overdue reminder for payment ${payment._id}`, err);
          }
        }

        logger.success(`${jobName} completed: ${reminderCount} overdue payment reminders sent`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: 'checkOverduePayments', job });
    return job;
  }

  // Start all cron jobs
  startAllJobs() {
    logger.info('Starting all cron jobs...');
    
    this.checkExpiringSubscriptions();
    this.checkExpiredSubscriptions();
    this.autoDisableExpiredSubscriptions();
    this.checkOverduePayments();
    
    logger.success(`All ${this.jobs.length} cron jobs started successfully`);
  }

  // Stop all cron jobs (for graceful shutdown)
  stopAllJobs() {
    logger.info('Stopping all cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`Stopped: ${name}`);
    });
    this.jobs = [];
  }
}

module.exports = new CronService();
