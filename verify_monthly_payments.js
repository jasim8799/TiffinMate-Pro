const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Payment = require('./models/Payment');
const Subscription = require('./models/Subscription');
const User = require('./models/User');

async function verifyMonthlyPayments() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║       MONTHLY PAYMENT VERIFICATION                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    console.log(`📅 Current Month/Year: ${currentMonth}/${currentYear}`);
    console.log(`📅 Date: ${now.toLocaleDateString()}\n`);

    // Check active subscriptions
    const activeSubscriptions = await Subscription.find({ status: 'active' })
      .populate('user', 'name mobile userId isActive')
      .select('user planType amount status startDate endDate');

    console.log('📋 ACTIVE SUBSCRIPTIONS:');
    console.log(`   Total: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      activeSubscriptions.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ${sub.user?.name || 'Unknown'}`);
        console.log(`      Plan: ${sub.planType}`);
        console.log(`      Amount: ₹${sub.amount || 0}`);
        console.log(`      User Active: ${sub.user?.isActive ? '✅' : '❌'}`);
      });
    }
    console.log('');

    // Check payments for current month (using month/year fields)
    const monthlyPayments = await Payment.find({
      month: currentMonth,
      year: currentYear
    })
      .populate('user', 'name mobile userId')
      .populate('subscription', 'planType')
      .sort({ createdAt: -1 });

    console.log('💰 PAYMENTS THIS MONTH (month/year filter):');
    console.log(`   Total Count: ${monthlyPayments.length}`);
    
    if (monthlyPayments.length > 0) {
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;

      monthlyPayments.forEach((payment, idx) => {
        console.log(`\n   ${idx + 1}. Payment ID: ${payment._id}`);
        console.log(`      User: ${payment.user?.name || 'Unknown'}`);
        console.log(`      Plan: ${payment.subscription?.planType || 'N/A'}`);
        console.log(`      Amount: ₹${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Month/Year: ${payment.month}/${payment.year}`);
        console.log(`      Created: ${payment.createdAt}`);
        console.log(`      Payment Method: ${payment.paymentMethod}`);

        totalAmount += payment.amount || 0;
        if (payment.status === 'paid' || payment.status === 'verified') {
          paidAmount += payment.amount || 0;
        } else if (payment.status === 'pending') {
          pendingAmount += payment.amount || 0;
        }
      });

      console.log('\n   📊 SUMMARY:');
      console.log(`      Total Amount: ₹${totalAmount}`);
      console.log(`      Paid: ₹${paidAmount}`);
      console.log(`      Pending: ₹${pendingAmount}`);
    } else {
      console.log('   ❌ No payments found for current month!');
    }
    console.log('');

    // Check for payments without month/year (old schema)
    const paymentsWithoutMonthYear = await Payment.countDocuments({
      $or: [
        { month: { $exists: false } },
        { year: { $exists: false } }
      ]
    });

    if (paymentsWithoutMonthYear > 0) {
      console.log('⚠️  WARNING: Found old payments without month/year fields');
      console.log(`   Count: ${paymentsWithoutMonthYear}`);
      console.log('   These payments need migration!\n');
    }

    // Compare: Active subscriptions vs Payments this month
    console.log('🔍 VERIFICATION:');
    console.log(`   Active Subscriptions: ${activeSubscriptions.length}`);
    console.log(`   Payments This Month: ${monthlyPayments.length}`);
    
    const activeCount = activeSubscriptions.filter(s => s.user?.isActive).length;
    console.log(`   Active Users with Subscriptions: ${activeCount}`);
    
    if (activeCount > monthlyPayments.length) {
      console.log(`   ⚠️  MISMATCH: ${activeCount - monthlyPayments.length} subscriptions without payments!`);
      console.log('   Action: Approve pending subscriptions or check payment creation logic\n');
    } else if (activeCount === monthlyPayments.length) {
      console.log('   ✅ MATCH: All active subscriptions have payments!\n');
    }

    // Check database indexes
    const indexes = await Payment.collection.getIndexes();
    console.log('📑 PAYMENT COLLECTION INDEXES:');
    Object.keys(indexes).forEach(key => {
      console.log(`   - ${key}: ${JSON.stringify(indexes[key])}`);
    });
    console.log('');

    console.log('✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run verification
verifyMonthlyPayments();
