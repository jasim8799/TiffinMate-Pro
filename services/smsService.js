const axios = require('axios');
const NotificationLog = require('../models/NotificationLog');

class Fast2SMSService {
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY;
    this.baseURL = 'https://www.fast2sms.com/dev/bulkV2';
  }

  async sendSMS(mobile, message, type = 'other', userId = null) {
    try {
      if (!this.apiKey) {
        throw new Error('Fast2SMS API key not configured');
      }

      const response = await axios.post(this.baseURL, {
        route: 'v3',
        sender_id: 'TIFFIN',
        message: message,
        language: 'english',
        flash: 0,
        numbers: mobile
      }, {
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Log notification
      if (userId) {
        await NotificationLog.create({
          user: userId,
          mobile: mobile,
          type: type,
          message: message,
          status: response.data.return ? 'sent' : 'failed',
          response: response.data,
          sentAt: new Date()
        });
      }

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Fast2SMS Error:', error.message);

      // Log failed notification
      if (userId) {
        await NotificationLog.create({
          user: userId,
          mobile: mobile,
          type: type,
          message: message,
          status: 'failed',
          errorMessage: error.message
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendOTP(mobile, otp, userId) {
    const message = `Your TiffinMate OTP is ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 2} minutes. Do not share with anyone.`;
    return await this.sendSMS(mobile, message, 'otp', userId);
  }

  async sendCredentials(mobile, userId, password) {
    const message = `Welcome to TiffinMate! Your User ID: ${userId}, Temporary Password: ${password}. Please change your password on first login.`;
    return await this.sendSMS(mobile, message, 'credentials');
  }

  async sendSubscriptionReminder(mobile, userName, daysRemaining, userId) {
    const message = `Hi ${userName}, your TiffinMate subscription will expire in ${daysRemaining} days. Please renew to continue enjoying our service.`;
    return await this.sendSMS(mobile, message, 'subscription-reminder', userId);
  }

  async sendSubscriptionExpiry(mobile, userName, userId) {
    const message = `Hi ${userName}, your TiffinMate subscription has expired. Please contact us to renew your service.`;
    return await this.sendSMS(mobile, message, 'subscription-expiry', userId);
  }

  async sendServiceDisabled(mobile, userName, userId) {
    const message = `Hi ${userName}, your TiffinMate service has been temporarily disabled due to subscription expiry. Please renew to resume service.`;
    return await this.sendSMS(mobile, message, 'subscription-disabled', userId);
  }

  async sendDeliveryPreparing(mobile, userName, userId) {
    const message = `Hi ${userName}, your food is being prepared. It will be delivered soon!`;
    return await this.sendSMS(mobile, message, 'delivery-preparing', userId);
  }

  async sendDeliveryOnWay(mobile, userName, userId) {
    const message = `Hi ${userName}, your food is on the way! We will deliver within 1 hour. Please stay at your delivery location.`;
    return await this.sendSMS(mobile, message, 'delivery-on-way', userId);
  }

  async sendDeliveryDelivered(mobile, userName, userId) {
    const message = `Hi ${userName}, your tiffin has been delivered. Enjoy your meal!`;
    return await this.sendSMS(mobile, message, 'delivery-delivered', userId);
  }

  async sendPaymentReminder(mobile, userName, amount, userId) {
    const message = `Hi ${userName}, reminder: Your payment of Rs.${amount} is pending. Please make the payment at your earliest convenience.`;
    return await this.sendSMS(mobile, message, 'payment-reminder', userId);
  }

  async sendPaymentOverdue(mobile, userName, amount, userId) {
    const message = `Hi ${userName}, your payment of Rs.${amount} is overdue. Please clear the dues to avoid service interruption.`;
    return await this.sendSMS(mobile, message, 'payment-overdue', userId);
  }

  async sendAccessApproved(mobile, userName, userId, password) {
    const message = `Hi ${userName}, your access request has been approved! User ID: ${userId}, Password: ${password}. Download TiffinMate app to login.`;
    return await this.sendSMS(mobile, message, 'access-approved');
  }

  async sendAccessRejected(mobile, userName, reason) {
    const message = `Hi ${userName}, we regret to inform you that your access request has been rejected. Reason: ${reason}. Please contact us for more details.`;
    return await this.sendSMS(mobile, message, 'access-rejected');
  }
}

module.exports = new Fast2SMSService();
