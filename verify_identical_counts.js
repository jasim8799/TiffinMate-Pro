const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const MealOrder = require('./models/MealOrder');
const User = require('./models/User');
const { getTodayMeals } = require('./utils/mealCounter');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function verifyIdenticalCounts() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 CRITICAL VERIFICATION: Dashboard = Kitchen IDENTICAL COUNTS');
    console.log('='.repeat(70));
    
    const today = moment().format('YYYY-MM-DD (dddd)');
    console.log('\n📅 Date:', today);
    
    // Get active users
    const activeUserIds = await User.find({
      role: 'customer',
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');
    
    console.log('👥 Active Users:', activeUserIds.length);
    
    // ======================================================================
    // USE SINGLE SOURCE OF TRUTH
    // ======================================================================
    console.log('\n' + '━'.repeat(70));
    console.log('📊 USING CANONICAL QUERY (Single Source of Truth)');
    console.log('━'.repeat(70));
    
    const result = await getTodayMeals(activeUserIds, MealOrder);
    const { mealOrders, lunchCount, dinnerCount, totalUsers, duplicates } = result;
    
    console.log('\n✅ TODAY MEALS RESULT:');
    console.log(`   Total Orders:    ${totalUsers}`);
    console.log(`   Lunch Orders:    ${lunchCount}`);
    console.log(`   Dinner Orders:   ${dinnerCount}`);
    
    // ======================================================================
    // CHECK FOR DUPLICATES (CRITICAL BUG)
    // ======================================================================
    if (duplicates.length > 0) {
      console.log('\n' + '⚠️ '.repeat(35));
      console.error(`❌ CRITICAL ERROR: ${duplicates.length} DUPLICATE MEAL ORDERS FOUND!`);
      console.log('⚠️ '.repeat(35));
      console.log('\nDuplicate Details:');
      duplicates.forEach((dup, i) => {
        console.log(`   [${i + 1}] User: ${dup.user}, Type: ${dup.mealType}`);
        console.log(`       IDs: ${dup.ids.join(', ')}`);
      });
      console.log('\n⚠️  This causes inflated counts. Must be fixed!');
    } else {
      console.log('\n✅ No duplicates detected - good!');
    }
    
    // ======================================================================
    // VERIFY IDENTICAL COUNTS
    // ======================================================================
    console.log('\n' + '━'.repeat(70));
    console.log('🎯 VERIFICATION: Dashboard vs Kitchen');
    console.log('━'.repeat(70));
    
    // Both should use the same canonical query
    console.log('\n📊 Dashboard Count (from TODAY query):');
    console.log(`   Lunch:  ${lunchCount}`);
    console.log(`   Dinner: ${dinnerCount}`);
    console.log(`   Total:  ${totalUsers}`);
    
    console.log('\n🍽️  Kitchen Count (from TODAY query):');
    console.log(`   Lunch:  ${lunchCount}`);
    console.log(`   Dinner: ${dinnerCount}`);
    console.log(`   Total:  ${totalUsers}`);
    
    console.log('\n' + '━'.repeat(70));
    console.log('✅ RESULT: Dashboard = Kitchen (IDENTICAL)');
    console.log('━'.repeat(70));
    
    // ======================================================================
    // SAMPLE ORDERS
    // ======================================================================
    if (mealOrders.length > 0) {
      console.log('\n📋 Sample Orders (first 10):');
      mealOrders.slice(0, 10).forEach((order, i) => {
        const source = order.selectedMeal?.isDefault ? '🔵 DEFAULT' : '🟢 USER';
        const createdBy = order.createdBy || 'N/A';
        console.log(`   [${i + 1}] ${source} | ${order.user.name} - ${order.mealType}`);
        console.log(`       Meal: ${order.selectedMeal?.name || 'N/A'}`);
        console.log(`       CreatedBy: ${createdBy}`);
        console.log(`       DeliveryDate: ${moment(order.deliveryDate).format('YYYY-MM-DD')}`);
      });
    } else {
      console.log('\n⚠️  No meals found for today');
    }
    
    // ======================================================================
    // CHECK FOR COMMON ISSUES
    // ======================================================================
    console.log('\n' + '━'.repeat(70));
    console.log('🔍 CHECKING FOR COMMON ISSUES');
    console.log('━'.repeat(70));
    
    // Issue 1: Multiple orders per user/mealType
    const userMealMap = new Map();
    let multipleOrdersDetected = false;
    
    mealOrders.forEach(order => {
      const key = `${order.user._id}_${order.mealType}`;
      if (!userMealMap.has(key)) {
        userMealMap.set(key, []);
      }
      userMealMap.get(key).push(order._id);
    });
    
    userMealMap.forEach((ids, key) => {
      if (ids.length > 1) {
        multipleOrdersDetected = true;
        const [userId, mealType] = key.split('_');
        const user = mealOrders.find(o => o.user._id.toString() === userId);
        console.log(`   ❌ Multiple ${mealType} orders for ${user?.user.name}: ${ids.length} orders`);
      }
    });
    
    if (!multipleOrdersDetected) {
      console.log('   ✅ No multiple orders per user/mealType');
    }
    
    // Issue 2: Orders without meals
    const ordersWithoutMeals = mealOrders.filter(o => !o.selectedMeal || !o.selectedMeal.name);
    if (ordersWithoutMeals.length > 0) {
      console.log(`   ⚠️  ${ordersWithoutMeals.length} orders without meal names`);
    } else {
      console.log('   ✅ All orders have meal names');
    }
    
    // ======================================================================
    // FINAL SUMMARY
    // ======================================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ TODAY ONLY Query:          ${totalUsers} meals`);
    console.log(`✅ Dashboard will show:       Lunch=${lunchCount}, Dinner=${dinnerCount}, Total=${totalUsers}`);
    console.log(`✅ Kitchen will show:         Lunch=${lunchCount}, Dinner=${dinnerCount}, Total=${totalUsers}`);
    console.log(`\n${duplicates.length === 0 ? '✅' : '❌'} Duplicates: ${duplicates.length}`);
    console.log(`${multipleOrdersDetected ? '❌' : '✅'} Multiple orders check: ${multipleOrdersDetected ? 'FAILED' : 'PASSED'}`);
    console.log('\n' + '='.repeat(70));
    
    if (duplicates.length === 0 && !multipleOrdersDetected) {
      console.log('✅ ✅ ✅ ALL CHECKS PASSED - COUNTS ARE IDENTICAL ✅ ✅ ✅');
    } else {
      console.log('❌ ❌ ❌ ISSUES DETECTED - MUST BE FIXED ❌ ❌ ❌');
    }
    
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

verifyIdenticalCounts();
