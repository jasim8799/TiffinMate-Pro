const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const MealOrder = require('./models/MealOrder');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function verifyDashboardFiltering() {
  try {
    console.log('\n🔍 DASHBOARD FILTERING VERIFICATION');
    console.log('='.repeat(60));
    
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    console.log('\n📅 Today:', moment().format('YYYY-MM-DD (dddd)'));
    console.log('   Start:', todayStart);
    console.log('   End:', todayEnd);
    
    // Get active user IDs
    const activeUserIds = await User.find({
      role: 'customer',
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    console.log('\n👥 Active Users:', activeUserIds.length);
    
    // 1. Get ALL meal orders created today
    const allTodayOrders = await MealOrder.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      user: { $in: activeUserIds }
    }).populate('user', 'name');
    
    console.log('\n📊 ALL Orders Created Today:', allTodayOrders.length);
    
    // 2. Get USER-SELECTED orders only (Dashboard query)
    const userSelectedOrders = await MealOrder.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      user: { $in: activeUserIds },
      $and: [
        {
          $or: [
            { 'selectedMeal.isDefault': { $exists: false } },
            { 'selectedMeal.isDefault': false }
          ]
        },
        {
          $or: [
            { createdBy: { $exists: false } },
            { createdBy: { $nin: ['system', 'system-kitchen'] } }
          ]
        }
      ]
    }).populate('user', 'name');
    
    console.log('📊 USER-SELECTED Orders (Dashboard Count):', userSelectedOrders.length);
    
    // 3. Breakdown
    const systemGenerated = allTodayOrders.filter(o => 
      o.selectedMeal?.isDefault === true || 
      o.createdBy === 'system' || 
      o.createdBy === 'system-kitchen'
    );
    
    console.log('\n📈 Breakdown:');
    console.log('   ─'.repeat(50));
    console.log(`   Total created today:           ${allTodayOrders.length}`);
    console.log(`   User-selected (Dashboard):     ${userSelectedOrders.length}`);
    console.log(`   System-generated (filtered):   ${systemGenerated.length}`);
    console.log('   ─'.repeat(50));
    
    // 4. Count by meal type (Dashboard)
    const lunchCount = userSelectedOrders.filter(o => o.mealType === 'lunch').length;
    const dinnerCount = userSelectedOrders.filter(o => o.mealType === 'dinner').length;
    
    console.log('\n🍽️  Dashboard "Today Order Status":');
    console.log(`   Lunch:  ${lunchCount}`);
    console.log(`   Dinner: ${dinnerCount}`);
    console.log(`   Total:  ${lunchCount + dinnerCount}`);
    
    // 5. Show sample orders
    if (userSelectedOrders.length > 0) {
      console.log('\n✅ User-Selected Orders (shown in Dashboard):');
      userSelectedOrders.slice(0, 5).forEach((order, i) => {
        console.log(`   [${i + 1}] ${order.user.name} - ${order.mealType}: ${order.selectedMeal?.name}`);
        console.log(`       isDefault: ${order.selectedMeal?.isDefault || 'N/A'}`);
        console.log(`       createdBy: ${order.createdBy || 'N/A'}`);
      });
    }
    
    if (systemGenerated.length > 0) {
      console.log('\n🔵 System-Generated Orders (filtered OUT from Dashboard):');
      systemGenerated.slice(0, 5).forEach((order, i) => {
        console.log(`   [${i + 1}] ${order.user.name} - ${order.mealType}: ${order.selectedMeal?.name}`);
        console.log(`       isDefault: ${order.selectedMeal?.isDefault || 'N/A'}`);
        console.log(`       createdBy: ${order.createdBy || 'N/A'}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 6. Validation
    if (userSelectedOrders.length + systemGenerated.length === allTodayOrders.length) {
      console.log('✅ VALIDATION PASSED - All orders accounted for');
    } else {
      console.log('⚠️  VALIDATION WARNING - Some orders unaccounted');
      console.log(`   Expected: ${allTodayOrders.length}`);
      console.log(`   Actual: ${userSelectedOrders.length + systemGenerated.length}`);
    }
    
    console.log('\n💡 Summary:');
    console.log('   Dashboard now shows ONLY user activity (user-selected meals)');
    console.log('   System-generated defaults are filtered OUT');
    console.log('   This prevents inflated counts from automatic meal creation');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification Complete');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

verifyDashboardFiltering();
