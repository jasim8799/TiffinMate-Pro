/**
 * Quick Payment Check Script
 * Run: node check_payments_quick.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));

const Payment = require('./models/Payment');
const Subscription = require('./models/Subscription');

async function quickCheck() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  console.log(`\nChecking payments for ${month}/${year}...\n`);

  // Count total payments
  const total = await Payment.countDocuments({});
  console.log(`Total payments in DB: ${total}`);

  // Count this month (using month/year)
  const thisMonth = await Payment.countDocuments({ month, year });
  console.log(`Payments this month (month/year): ${thisMonth}`);

  // Count active subscriptions
  const activeSubs = await Subscription.countDocuments({ status: 'active' });
  console.log(`Active subscriptions: ${activeSubs}`);

  // Show recent payments
  const recent = await Payment.find({}).sort({ createdAt: -1 }).limit(3)
    .select('amount status month year createdAt');
  
  console.log('\nRecent payments:');
  recent.forEach(p => {
    console.log(`  - ₹${p.amount}, Status: ${p.status}, Month/Year: ${p.month}/${p.year}, Created: ${p.createdAt}`);
  });

  // Check for payments without month/year
  const noMonthYear = await Payment.countDocuments({
    $or: [{ month: { $exists: false } }, { year: { $exists: false } }]
  });
  console.log(`\nPayments without month/year: ${noMonthYear}`);

  mongoose.connection.close();
}

quickCheck().catch(console.error);
