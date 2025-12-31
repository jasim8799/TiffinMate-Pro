const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const MealOrder = require('../models/MealOrder');
const Delivery = require('../models/Delivery');
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

  // Auto-assign default meals at cutoff times
  // Lunch cutoff: 11 PM (23:00) night before
  // Dinner cutoff: 11 AM (11:00) same day
  autoAssignDefaultMeals() {
    // Run at 11:05 PM every night for next day's lunch
    const lunchJob = cron.schedule('5 23 * * *', async () => {
      const jobName = 'Auto-assign Default Lunch';
      logger.info(`Running: ${jobName}`);
      
      try {
        const tomorrow = moment().add(1, 'day').startOf('day');
        await this.assignDefaultMealsForType(tomorrow.toDate(), 'lunch');
        logger.success(`${jobName} completed`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    // Run at 11:05 AM every day for today's dinner
    const dinnerJob = cron.schedule('5 11 * * *', async () => {
      const jobName = 'Auto-assign Default Dinner';
      logger.info(`Running: ${jobName}`);
      
      try {
        const today = moment().startOf('day');
        await this.assignDefaultMealsForType(today.toDate(), 'dinner');
        logger.success(`${jobName} completed`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: 'autoAssignLunch', job: lunchJob });
    this.jobs.push({ name: 'autoAssignDinner', job: dinnerJob });
    return { lunchJob, dinnerJob };
  }

  // Helper method to assign default meals
  async assignDefaultMealsForType(deliveryDate, mealType) {
    try {
      // Get all active subscriptions
      const subscriptions = await Subscription.find({
        status: 'active',
        startDate: { $lte: deliveryDate },
        endDate: { $gte: deliveryDate }
      }).populate('user');

      let assignedCount = 0;

      for (const subscription of subscriptions) {
        try {
          // Check if user already has a meal order for this date and type
          const existingOrder = await MealOrder.findOne({
            user: subscription.user._id,
            deliveryDate: deliveryDate,
            mealType: mealType
          });

          if (existingOrder) {
            // User already selected, skip
            continue;
          }

          // Get dietary preference
          const dietaryPreference = subscription.mealPreferences?.dietaryPreference || 'both';

          // Determine default meal based on preference
          let defaultMealName;
          if (dietaryPreference === 'veg') {
            defaultMealName = mealType === 'lunch' ? 'Dal Rice with Seasonal Veg' : 'Roti Sabzi with Dal';
          } else if (dietaryPreference === 'non-veg') {
            defaultMealName = mealType === 'lunch' ? 'Chicken Curry with Rice' : 'Egg Curry with Roti';
          } else {
            // 'both' - default to veg option
            defaultMealName = mealType === 'lunch' ? 'Dal Rice with Seasonal Veg' : 'Roti Sabzi with Dal';
          }

          // Calculate cutoff time
          const deliveryMoment = moment(deliveryDate);
          const cutoffTime = mealType === 'lunch'
            ? deliveryMoment.clone().subtract(1, 'day').hour(23).minute(0).second(0)
            : deliveryMoment.clone().hour(11).minute(0).second(0);

          // Create default meal order
          await MealOrder.create({
            user: subscription.user._id,
            orderDate: new Date(),
            deliveryDate: deliveryDate,
            mealType: mealType,
            selectedMeal: {
              name: defaultMealName,
              items: [],
              isDefault: true
            },
            cutoffTime: cutoffTime.toDate(),
            isAfterCutoff: true,
            status: 'confirmed'
          });

          assignedCount++;
          logger.info(`Assigned default ${mealType} for user ${subscription.user.name}`);
        } catch (err) {
          logger.error(`Failed to assign default meal for user ${subscription.user._id}`, err);
        }
      }

      logger.success(`Auto-assigned ${assignedCount} default ${mealType} meals for ${moment(deliveryDate).format('DD MMM YYYY')}`);
      return assignedCount;
    } catch (error) {
      logger.error('Error in assignDefaultMealsForType', error);
      throw error;
    }
  }

  // Auto-mark deliveries as delivered after 1 hour
  autoMarkDelivered() {
    const jobName = 'Auto Mark Delivered';
    
    // Run every 10 minutes to check for overdue deliveries
    const job = cron.schedule('*/10 * * * *', async () => {
      logger.info(`Running: ${jobName}`);
      
      try {
        const oneHourAgo = moment().subtract(1, 'hour').toDate();

        // Find deliveries that are "on-the-way" for more than 1 hour
        const overdueDeliveries = await Delivery.find({
          status: 'on-the-way',
          outForDeliveryTime: { $lte: oneHourAgo }
        }).populate('user subscription');

        let markedCount = 0;
        for (const delivery of overdueDeliveries) {
          try {
            // Auto-mark as delivered
            await delivery.updateStatus('delivered');
            
            // Send SMS notification
            const user = delivery.user;
            await smsService.sendDeliveryDelivered(user.mobile, user.name, user._id);
            
            // Mark day as used in subscription
            const subscription = delivery.subscription;
            if (subscription) {
              await subscription.markDayUsed();
            }

            markedCount++;
            logger.info(`Auto-marked delivery ${delivery._id} as delivered for user ${user.name}`);
          } catch (err) {
            logger.error(`Failed to auto-mark delivery ${delivery._id}`, err);
          }
        }

        if (markedCount > 0) {
          logger.success(`Auto-marked ${markedCount} deliveries as delivered`);
        }
      } catch (error) {
        logger.error('Error in autoMarkDelivered', error);
      }
    });

    this.jobs.push({ name: jobName, job });
    logger.info(`Scheduled: ${jobName} - Every 10 minutes`);
  }

  // Create deliveries from meal orders (runs at 5 AM daily)
  autoCreateDeliveries() {
    const jobName = 'Auto Create Deliveries';
    
    // Run at 5:00 AM every day to create deliveries for today
    const job = cron.schedule('0 5 * * *', async () => {
      logger.info(`Running: ${jobName}`);
      
      try {
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();

        // Get all confirmed meal orders for today that don't have deliveries yet
        const mealOrders = await MealOrder.find({
          deliveryDate: { $gte: today, $lt: tomorrow },
          status: 'confirmed'
        }).populate('user');

        let createdCount = 0;

        for (const mealOrder of mealOrders) {
          try {
            // Check if delivery already exists
            const existingDelivery = await Delivery.findOne({
              user: mealOrder.user._id,
              deliveryDate: mealOrder.deliveryDate,
              mealType: mealOrder.mealType
            });

            if (existingDelivery) {
              continue; // Skip if delivery already exists
            }

            // Get user's active subscription
            const subscription = await Subscription.findOne({
              user: mealOrder.user._id,
              status: 'active',
              startDate: { $lte: mealOrder.deliveryDate },
              endDate: { $gte: mealOrder.deliveryDate }
            });

            if (!subscription) {
              logger.warn(`No active subscription for user ${mealOrder.user.name}`);
              continue;
            }

            // Create delivery
            const meals = {};
            if (mealOrder.mealType === 'lunch' || mealOrder.mealType === 'both') {
              meals.lunch = {
                name: mealOrder.selectedMeal.name,
                items: mealOrder.selectedMeal.items || []
              };
            }
            if (mealOrder.mealType === 'dinner' || mealOrder.mealType === 'both') {
              meals.dinner = {
                name: mealOrder.selectedMeal.name,
                items: mealOrder.selectedMeal.items || []
              };
            }

            await Delivery.create({
              user: mealOrder.user._id,
              subscription: subscription._id,
              deliveryDate: mealOrder.deliveryDate,
              mealType: mealOrder.mealType,
              meals: meals,
              status: 'preparing',
              notes: mealOrder.notes
            });

            createdCount++;
            logger.info(`Created delivery for ${mealOrder.user.name} - ${mealOrder.mealType}`);
          } catch (err) {
            logger.error(`Failed to create delivery for order ${mealOrder._id}`, err);
          }
        }

        logger.success(`${jobName} completed: ${createdCount} deliveries created`);
      } catch (error) {
        logger.error(`${jobName} failed`, error);
      }
    });

    this.jobs.push({ name: jobName, job });
    logger.info(`Scheduled: ${jobName} - Daily at 5:00 AM`);
  }

  // Start all cron jobs
  startAllJobs() {
    logger.info('Starting all cron jobs...');
    
    this.checkExpiringSubscriptions();
    this.checkExpiredSubscriptions();
    this.autoDisableExpiredSubscriptions();
    this.checkOverduePayments();
    this.autoAssignDefaultMeals();
    this.autoMarkDelivered();
    this.autoCreateDeliveries();
    
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
