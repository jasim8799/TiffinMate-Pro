#!/usr/bin/env node

/**
 * Payment Verification Script
 * 
 * Run this to check if payments are being created correctly
 * Usage: node verify_payments.js
 */

const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Payment = require('./models/Payment');
const Subscription = require('./models/Subscription');
const User = require('./models/User');

async function verifyPayments() {
  try {
    console.log('\n🔍 === PAYMENT VERIFICATION START ===\n');
    
    // 1. Check total payments
    const totalPayments = await Payment.countDocuments({});
    console.log(`Total Payments in Database: ${totalPayments}`);
    
    // 2. Check payments this month
    const monthStart = moment().startOf('month').toDate();
    const monthEnd = moment().endOf('month').toDate();
    console.log(`\nCurrent Month Range: ${monthStart} to ${monthEnd}`);
    
    const thisMonthPayments = await Payment.find({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).populate('user', 'name').populate('subscription', 'planType amount');
    
    console.log(`\nPayments This Month: ${thisMonthPayments.length}`);
    
    if (thisMonthPayments.length > 0) {
      console.log('\n📄 Payment Details:');
      thisMonthPayments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Payment ID: ${payment._id}`);
        console.log(`   User: ${payment.user?.name || 'N/A'}`);
        console.log(`   Amount: ₹${payment.amount}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Method: ${payment.paymentMethod}`);
        console.log(`   Created: ${payment.createdAt}`);
        console.log(`   Subscription: ${payment.subscription?._id || 'N/A'}`);
        console.log(`   Subscription Plan: ${payment.subscription?.planType || 'N/A'}`);
      });
      
      // Calculate monthly collection
      const totalAmount = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingAmount = thisMonthPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidAmount = thisMonthPayments
        .filter(p => p.status === 'paid' || p.status === 'verified')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      console.log('\n💰 Monthly Collection Summary:');
      console.log(`   Total: ₹${totalAmount}`);
      console.log(`   Pending: ₹${pendingAmount}`);
      console.log(`   Paid: ₹${paidAmount}`);
    }
    
    // 3. Check active subscriptions
    const activeSubscriptions = await Subscription.find({ 
      status: 'active' 
    }).populate('user', 'name');
    
    console.log(`\n\n📋 Active Subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      console.log('\n🔗 Checking Payment Links:');
      for (const sub of activeSubscriptions) {
        const payment = await Payment.findOne({
          subscription: sub._id,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        });
        
        const hasPayment = payment ? '✅' : '❌';
        console.log(`${hasPayment} Subscription ${sub._id} (${sub.planType}, ₹${sub.amount})`);
        console.log(`   User: ${sub.user?.name || 'N/A'}`);
        if (payment) {
          console.log(`   Payment: ${payment._id} (₹${payment.amount}, ${payment.status})`);
        } else {
          console.log(`   ⚠️ WARNING: No payment found for this month!`);
        }
      }
    }
    
    // 4. Check for subscriptions without payments
    const subsWithoutPayments = activeSubscriptions.filter(async (sub) => {
      const payment = await Payment.findOne({
        subscription: sub._id,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      return !payment;
    });
    
    if (subsWithoutPayments.length > 0) {
      console.log(`\n\n⚠️ ISSUE FOUND: ${subsWithoutPayments.length} active subscriptions without payments this month!`);
      console.log('This will cause Monthly Collection to show 0 or incorrect amount.');
    } else {
      console.log('\n\n✅ All active subscriptions have payment records for this month!');
    }
    
    console.log('\n=== PAYMENT VERIFICATION END ===\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run verification
verifyPayments();
