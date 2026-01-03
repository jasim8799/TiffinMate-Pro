const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Subscription = require('./models/Subscription');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function verifySubscriptionAlerts() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚨 SUBSCRIPTION ALERTS VERIFICATION');
    console.log('='.repeat(70));
    
    const todayDate = moment().startOf('day').toDate();
    const warningDate = moment().add(3, 'days').endOf('day').toDate();
    
    console.log('\n📅 Dates:');
    console.log(`   Today: ${moment(todayDate).format('YYYY-MM-DD')}`);
    console.log(`   Warning Date (+3 days): ${moment(warningDate).format('YYYY-MM-DD')}`);
    
    // Get active users
    const activeUserIds = await User.find({
      role: 'customer',
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    console.log(`\n👥 Active Users: ${activeUserIds.length}`);
    
    // 1️⃣ EXPIRING SOON (within 3 days)
    const expiringSoon = await Subscription.find({
      status: 'active',
      user: { $in: activeUserIds },
      endDate: { $gte: todayDate, $lte: warningDate }
    }).populate('user', 'name');
    
    console.log('\n1️⃣ EXPIRING SOON (within 3 days):');
    console.log(`   Count: ${expiringSoon.length}`);
    if (expiringSoon.length > 0) {
      expiringSoon.forEach(sub => {
        const daysLeft = moment(sub.endDate).diff(moment(), 'days');
        console.log(`   - ${sub.user?.name}: ends ${moment(sub.endDate).format('YYYY-MM-DD')} (${daysLeft} days left)`);
      });
    } else {
      console.log('   ✅ No subscriptions expiring soon');
    }
    
    // 2️⃣ EXPIRED (endDate < today)
    const expired = await Subscription.find({
      user: { $in: activeUserIds },
      endDate: { $lt: todayDate }
    }).populate('user', 'name');
    
    console.log('\n2️⃣ EXPIRED (past end date):');
    console.log(`   Count: ${expired.length}`);
    if (expired.length > 0) {
      expired.forEach(sub => {
        const daysAgo = moment().diff(moment(sub.endDate), 'days');
        console.log(`   - ${sub.user?.name}: expired ${moment(sub.endDate).format('YYYY-MM-DD')} (${daysAgo} days ago) - Status: ${sub.status}`);
      });
    } else {
      console.log('   ✅ No expired subscriptions');
    }
    
    // 3️⃣ PAUSED
    const paused = await Subscription.find({
      status: 'paused',
      user: { $in: activeUserIds }
    }).populate('user', 'name');
    
    console.log('\n3️⃣ PAUSED:');
    console.log(`   Count: ${paused.length}`);
    if (paused.length > 0) {
      paused.forEach(sub => {
        console.log(`   - ${sub.user?.name}: ${moment(sub.startDate).format('YYYY-MM-DD')} to ${moment(sub.endDate).format('YYYY-MM-DD')}`);
      });
    } else {
      console.log('   ✅ No paused subscriptions');
    }
    
    // TOTAL
    const totalAlerts = expiringSoon.length + expired.length + paused.length;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Expiring Soon: ${expiringSoon.length}`);
    console.log(`   Expired:       ${expired.length}`);
    console.log(`   Paused:        ${paused.length}`);
    console.log(`   Total Alerts:  ${totalAlerts}`);
    console.log('='.repeat(70));
    
    if (totalAlerts === 0) {
      console.log('\n✅ ✅ ✅ ALL SUBSCRIPTIONS HEALTHY! ✅ ✅ ✅');
    } else {
      console.log(`\n🚨 ${totalAlerts} SUBSCRIPTION ALERT${totalAlerts > 1 ? 'S' : ''} NEED ATTENTION`);
    }
    
    // Show what API will return
    console.log('\n📡 API RESPONSE:');
    console.log(JSON.stringify({
      subscriptionAlerts: {
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        paused: paused.length,
        total: totalAlerts
      }
    }, null, 2));
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

verifySubscriptionAlerts();
