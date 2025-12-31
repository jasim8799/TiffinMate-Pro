const mongoose = require('mongoose');
const dotenv = require('dotenv');
const moment = require('moment');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tiffinmate')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Import models
const Subscription = require('./models/Subscription');
const MealOrder = require('./models/MealOrder');
const Delivery = require('./models/Delivery');
const User = require('./models/User');

async function testDeliveries() {
  try {
    const today = moment().startOf('day').toDate();
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();

    console.log('\n🔍 Checking Today\'s Data...\n');
    console.log(`📅 Date: ${moment().format('DD MMM YYYY')}`);
    console.log('='.repeat(50));

    // Check active subscriptions
    const activeSubscriptions = await Subscription.find({
      status: 'active',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('user', 'name mobile');

    console.log(`\n📦 Active Subscriptions: ${activeSubscriptions.length}`);
    if (activeSubscriptions.length > 0) {
      activeSubscriptions.forEach((sub, i) => {
        console.log(`   ${i + 1}. ${sub.user?.name || 'Unknown'} - ${sub.mealType}`);
      });
    } else {
      console.log('   ⚠️  No active subscriptions found!');
    }

    // Check meal orders for today
    const mealOrders = await MealOrder.find({
      deliveryDate: { $gte: today, $lt: tomorrow },
      status: 'confirmed'
    }).populate('user', 'name mobile');

    console.log(`\n🍱 Meal Orders for Today: ${mealOrders.length}`);
    if (mealOrders.length > 0) {
      mealOrders.forEach((order, i) => {
        console.log(`   ${i + 1}. ${order.user?.name || 'Unknown'} - ${order.mealType} - ${order.selectedMeal?.name || 'No meal'}`);
      });
    } else {
      console.log('   ⚠️  No meal orders found for today!');
    }

    // Check existing deliveries
    const deliveries = await Delivery.find({
      deliveryDate: { $gte: today, $lt: tomorrow }
    }).populate('user', 'name mobile');

    console.log(`\n🚚 Existing Deliveries: ${deliveries.length}`);
    if (deliveries.length > 0) {
      deliveries.forEach((del, i) => {
        console.log(`   ${i + 1}. ${del.user?.name || 'Unknown'} - ${del.mealType} - Status: ${del.status}`);
      });
    } else {
      console.log('   ℹ️  No deliveries created yet');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   Active Subscriptions: ${activeSubscriptions.length}`);
    console.log(`   Meal Orders Today: ${mealOrders.length}`);
    console.log(`   Deliveries Today: ${deliveries.length}`);
    
    if (activeSubscriptions.length === 0) {
      console.log('\n⚠️  ACTION REQUIRED: Create subscriptions first!');
      console.log('   Go to Owner Dashboard → Customers → Add Subscription');
    } else if (mealOrders.length === 0) {
      console.log('\n⚠️  ACTION REQUIRED: Meal orders not created yet!');
      console.log('   Run the cron job or wait for midnight auto-assignment');
    } else if (deliveries.length === 0) {
      console.log('\n✅ Ready to create deliveries!');
      console.log('   Click "Create Deliveries" button in the app');
    } else {
      console.log('\n✅ Everything looks good!');
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
testDeliveries();
