/**
 * Verify Default Meals in Kitchen
 * Run: node verify_kitchen_meals.js
 */

const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));

const MealOrder = require('./models/MealOrder');
const User = require('./models/User');

async function verifyKitchenMeals() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║       KITCHEN MEAL VERIFICATION                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Query for TOMORROW (same as kitchen does)
  const targetDate = moment().add(1, 'day').startOf('day');
  const deliveryDateStart = targetDate.toDate();
  const deliveryDateEnd = targetDate.clone().add(1, 'day').toDate();

  console.log(`📅 Checking meals for: ${targetDate.format('YYYY-MM-DD')} (TOMORROW)`);
  console.log(`   Date range: ${deliveryDateStart} to ${deliveryDateEnd}\n`);

  // Get active users
  const activeUserIds = await User.find({ 
    role: 'customer', 
    isActive: true,
    deletedAt: { $exists: false }
  }).distinct('_id');

  console.log(`👥 Active users: ${activeUserIds.length}\n`);

  // Get all meal orders (same query as kitchen)
  const mealOrders = await MealOrder.find({
    deliveryDate: { $gte: deliveryDateStart, $lt: deliveryDateEnd },
    user: { $in: activeUserIds }
  })
  .populate('user', 'name userId')
  .sort({ mealType: 1, createdAt: 1 });

  console.log(`📊 Total Meal Orders: ${mealOrders.length}\n`);

  // Categorize
  const defaultMeals = mealOrders.filter(o => o.selectedMeal?.isDefault === true);
  const userSelected = mealOrders.filter(o => o.selectedMeal?.isDefault === false || o.selectedMeal?.isDefault === undefined);
  const noSelection = mealOrders.filter(o => !o.selectedMeal?.name || o.selectedMeal?.name === 'Not Selected');

  console.log('📋 Breakdown:');
  console.log(`   🔵 Default meals: ${defaultMeals.length}`);
  console.log(`   🟢 User-selected: ${userSelected.length}`);
  console.log(`   ⚪ No selection: ${noSelection.length}\n`);

  // Count by meal type
  const lunchOrders = mealOrders.filter(o => o.mealType === 'lunch');
  const dinnerOrders = mealOrders.filter(o => o.mealType === 'dinner');

  console.log('🍽️  Meal Type Breakdown:');
  console.log(`   Lunch: ${lunchOrders.length}`);
  console.log(`   Dinner: ${dinnerOrders.length}\n`);

  // Show samples
  if (defaultMeals.length > 0) {
    console.log('🔵 Sample DEFAULT meals:');
    defaultMeals.slice(0, 3).forEach((meal, i) => {
      console.log(`   ${i+1}. ${meal.user?.name} (${meal.user?.userId})`);
      console.log(`      Meal Type: ${meal.mealType}`);
      console.log(`      Selected: ${meal.selectedMeal?.name}`);
      console.log(`      Created: ${moment(meal.createdAt).format('YYYY-MM-DD HH:mm')}`);
      console.log(`      Delivery: ${moment(meal.deliveryDate).format('YYYY-MM-DD')}\n`);
    });
  }

  if (userSelected.length > 0) {
    console.log('🟢 Sample USER-SELECTED meals:');
    userSelected.slice(0, 3).forEach((meal, i) => {
      console.log(`   ${i+1}. ${meal.user?.name} (${meal.user?.userId})`);
      console.log(`      Meal Type: ${meal.mealType}`);
      console.log(`      Selected: ${meal.selectedMeal?.name}`);
      console.log(`      Created: ${moment(meal.createdAt).format('YYYY-MM-DD HH:mm')}`);
      console.log(`      Delivery: ${moment(meal.deliveryDate).format('YYYY-MM-DD')}\n`);
    });
  }

  // Verification
  console.log('✅ VERIFICATION:');
  if (defaultMeals.length > 0) {
    console.log(`   ✅ Default meals ARE being saved (${defaultMeals.length} found)`);
  } else {
    console.log(`   ⚠️  No default meals found - check cron job or default meal assignment`);
  }

  if (mealOrders.length === lunchOrders.length + dinnerOrders.length) {
    console.log(`   ✅ All meals properly categorized`);
  }

  console.log(`\n🔍 Kitchen should show ${mealOrders.length} total orders`);
  console.log(`   (${lunchOrders.length} lunch + ${dinnerOrders.length} dinner)\n`);

  mongoose.connection.close();
}

verifyKitchenMeals().catch(console.error);
