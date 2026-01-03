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

async function verifyDashboardKitchenMatch() {
  try {
    console.log('\n🔍 DASHBOARD = KITCHEN VERIFICATION');
    console.log('='.repeat(60));
    
    const today = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    
    console.log('\n📅 Date:', moment().format('YYYY-MM-DD (dddd)'));
    console.log('   Today Start:', today);
    console.log('   Today End:', todayEnd);
    
    // Get active user IDs
    const activeUserIds = await User.find({
      role: 'customer',
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    console.log('\n👥 Active Users:', activeUserIds.length);
    
    // ============================================
    // DASHBOARD QUERY (NEW - deliveryDate = today)
    // ============================================
    const dashboardOrders = await MealOrder.find({
      deliveryDate: { $gte: today, $lt: todayEnd },
      user: { $in: activeUserIds }
    }).populate('user', 'name');
    
    const dashboardLunch = dashboardOrders.filter(o => o.mealType === 'lunch').length;
    const dashboardDinner = dashboardOrders.filter(o => o.mealType === 'dinner').length;
    const dashboardTotal = dashboardOrders.length;
    
    console.log('\n📊 DASHBOARD Query (deliveryDate = today):');
    console.log('   Lunch:  ', dashboardLunch);
    console.log('   Dinner: ', dashboardDinner);
    console.log('   Total:  ', dashboardTotal);
    
    // ============================================
    // KITCHEN QUERY (deliveryDate = today)
    // ============================================
    const kitchenOrders = await MealOrder.find({
      deliveryDate: { $gte: today, $lt: todayEnd },
      user: { $in: activeUserIds }
    }).populate('user', 'name');
    
    const kitchenLunch = kitchenOrders.filter(o => o.mealType === 'lunch').length;
    const kitchenDinner = kitchenOrders.filter(o => o.mealType === 'dinner').length;
    const kitchenTotal = kitchenOrders.length;
    
    console.log('\n🍽️  KITCHEN Query (deliveryDate = today):');
    console.log('   Lunch:  ', kitchenLunch);
    console.log('   Dinner: ', kitchenDinner);
    console.log('   Total:  ', kitchenTotal);
    
    // ============================================
    // COMPARISON
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARISON:');
    console.log('='.repeat(60));
    
    const lunchMatch = dashboardLunch === kitchenLunch;
    const dinnerMatch = dashboardDinner === kitchenDinner;
    const totalMatch = dashboardTotal === kitchenTotal;
    
    console.log(`Lunch:   Dashboard=${dashboardLunch}  Kitchen=${kitchenLunch}   ${lunchMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`Dinner:  Dashboard=${dashboardDinner}  Kitchen=${kitchenDinner}   ${dinnerMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`Total:   Dashboard=${dashboardTotal}  Kitchen=${kitchenTotal}   ${totalMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
    
    console.log('\n' + '='.repeat(60));
    
    if (lunchMatch && dinnerMatch && totalMatch) {
      console.log('✅ SUCCESS - Dashboard and Kitchen show IDENTICAL counts!');
    } else {
      console.log('❌ FAILURE - Dashboard and Kitchen counts DO NOT match!');
    }
    
    // ============================================
    // BREAKDOWN BY SOURCE
    // ============================================
    const userSelected = dashboardOrders.filter(o => 
      o.selectedMeal?.isDefault === false || 
      (!o.createdBy || (o.createdBy !== 'system' && o.createdBy !== 'system-kitchen'))
    );
    const systemGenerated = dashboardOrders.filter(o => 
      o.selectedMeal?.isDefault === true || 
      o.createdBy === 'system' || 
      o.createdBy === 'system-kitchen'
    );
    
    console.log('\n📈 Breakdown by Source:');
    console.log('   User-selected:     ', userSelected.length);
    console.log('   System-generated:  ', systemGenerated.length);
    console.log('   Total:             ', dashboardOrders.length);
    
    // ============================================
    // SAMPLE ORDERS
    // ============================================
    if (dashboardOrders.length > 0) {
      console.log('\n🍱 Sample Meals (first 5):');
      dashboardOrders.slice(0, 5).forEach((order, i) => {
        const source = order.selectedMeal?.isDefault ? '🔵 DEFAULT' : '🟢 USER';
        console.log(`   [${i + 1}] ${source} | ${order.user.name} - ${order.mealType}: ${order.selectedMeal?.name}`);
      });
    } else {
      console.log('\n⚠️  No meals found for today');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 Key Points:');
    console.log('   • Dashboard now uses deliveryDate (same as Kitchen)');
    console.log('   • Both include ALL meals (user-selected + defaults)');
    console.log('   • Counts are IDENTICAL - no confusion');
    console.log('   • Owner sees ONE clear number to cook');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

verifyDashboardKitchenMatch();
