const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const Subscription = require('./models/Subscription');
const MealOrder = require('./models/MealOrder');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function verifyKitchenReadiness() {
  try {
    console.log('\n🔍 KITCHEN READINESS VERIFICATION');
    console.log('='.repeat(60));
    
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();
    const tomorrowEnd = moment(tomorrow).add(1, 'day').toDate();
    
    console.log('\n📅 Target Date:', moment(tomorrow).format('YYYY-MM-DD (dddd)'));
    
    // 1. Get active subscriptions
    const activeSubscriptions = await Subscription.find({
      status: 'active',
      startDate: { $lte: tomorrow },
      endDate: { $gte: tomorrow }
    }).populate('user', 'name mobile');
    
    console.log('\n📊 Active Subscriptions:', activeSubscriptions.length);
    activeSubscriptions.forEach((sub, i) => {
      console.log(`   [${i + 1}] ${sub.user.name} (${sub.user.mobile}) - ${sub.planType}`);
    });
    
    // 2. Get existing meal orders for tomorrow
    const existingOrders = await MealOrder.find({
      deliveryDate: { $gte: tomorrow, $lt: tomorrowEnd }
    }).populate('user', 'name mobile');
    
    console.log('\n🍽️  Existing Meal Orders:', existingOrders.length);
    
    const lunchOrders = existingOrders.filter(o => o.mealType === 'lunch');
    const dinnerOrders = existingOrders.filter(o => o.mealType === 'dinner');
    
    console.log(`   Lunch: ${lunchOrders.length}`);
    console.log(`   Dinner: ${dinnerOrders.length}`);
    
    // 3. Check for defaults vs user-selected
    const defaultMeals = existingOrders.filter(o => o.selectedMeal?.isDefault === true);
    const userSelected = existingOrders.filter(o => o.selectedMeal?.isDefault === false);
    
    console.log('\n📈 Meal Breakdown:');
    console.log(`   🔵 Default meals: ${defaultMeals.length}`);
    console.log(`   🟢 User-selected: ${userSelected.length}`);
    
    // 4. Identify missing users
    const ordersMap = new Map();
    existingOrders.forEach(order => {
      const key = `${order.user._id}_${order.mealType}`;
      ordersMap.set(key, order);
    });
    
    const missingOrders = [];
    activeSubscriptions.forEach(sub => {
      const lunchKey = `${sub.user._id}_lunch`;
      const dinnerKey = `${sub.user._id}_dinner`;
      
      if (!ordersMap.has(lunchKey)) {
        missingOrders.push({
          user: sub.user.name,
          mealType: 'lunch',
          plan: sub.planType
        });
      }
      
      if (!ordersMap.has(dinnerKey)) {
        missingOrders.push({
          user: sub.user.name,
          mealType: 'dinner',
          plan: sub.planType
        });
      }
    });
    
    console.log('\n🔍 Missing Meal Orders:', missingOrders.length);
    if (missingOrders.length > 0) {
      missingOrders.forEach((missing, i) => {
        console.log(`   [${i + 1}] ${missing.user} - ${missing.mealType} (${missing.plan})`);
      });
      console.log('\n   ⚠️  Kitchen will auto-create these defaults when opened');
    } else {
      console.log('   ✅ All subscriptions have meal orders!');
    }
    
    // 5. Expected vs Actual
    const expectedTotal = activeSubscriptions.length * 2; // lunch + dinner
    const actualTotal = existingOrders.length;
    
    console.log('\n📊 Kitchen Readiness Summary:');
    console.log('   ' + '─'.repeat(50));
    console.log(`   Expected meal orders: ${expectedTotal}`);
    console.log(`   Actual meal orders:   ${actualTotal}`);
    console.log(`   Gap:                  ${expectedTotal - actualTotal}`);
    console.log('   ' + '─'.repeat(50));
    
    if (actualTotal === expectedTotal) {
      console.log('   ✅ Kitchen is READY - Complete cooking list!');
    } else {
      console.log('   ⚠️  Kitchen will auto-fill gaps when opened');
    }
    
    // 6. Sample meals
    console.log('\n🍱 Sample Meal Orders:');
    existingOrders.slice(0, 5).forEach((order, i) => {
      const flag = order.selectedMeal?.isDefault ? '🔵 DEFAULT' : '🟢 USER';
      console.log(`   [${i + 1}] ${flag} | ${order.user.name} - ${order.mealType}`);
      console.log(`       ${order.selectedMeal?.name || 'No meal'}`);
    });
    
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

// Run verification
verifyKitchenReadiness();
