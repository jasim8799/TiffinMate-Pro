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

// Copy of ensureDefaultMealsExist from mealController
const ensureDefaultMealsExist = async (deliveryDate, mealType = null) => {
  try {
    console.log('🔧 [KITCHEN READINESS] Ensuring default meals exist...');
    console.log('   Delivery Date:', moment(deliveryDate).format('YYYY-MM-DD'));
    console.log('   Meal Type:', mealType || 'BOTH (lunch + dinner)');

    const activeSubscriptions = await Subscription.find({
      status: 'active',
      startDate: { $lte: deliveryDate },
      endDate: { $gte: deliveryDate }
    }).populate('user');

    console.log('   Active subscriptions:', activeSubscriptions.length);

    const existingOrdersQuery = {
      deliveryDate: deliveryDate
    };
    if (mealType) {
      existingOrdersQuery.mealType = mealType;
    }
    
    const existingOrders = await MealOrder.find(existingOrdersQuery);
    const existingOrdersMap = new Map();
    
    existingOrders.forEach(order => {
      const key = `${order.user}_${order.mealType}`;
      existingOrdersMap.set(key, true);
    });

    console.log('   Existing meal orders:', existingOrders.length);

    const mealTypes = mealType ? [mealType] : ['lunch', 'dinner'];
    
    let createdCount = 0;
    const defaultMealsToCreate = [];

    for (const subscription of activeSubscriptions) {
      for (const type of mealTypes) {
        const orderKey = `${subscription.user._id}_${type}`;
        
        if (!existingOrdersMap.has(orderKey)) {
          const defaultMeal = getDefaultMealForSubscription(subscription, deliveryDate, type);
          
          const deliveryMoment = moment(deliveryDate);
          const cutoffTime = type === 'lunch'
            ? deliveryMoment.clone().subtract(1, 'day').hour(23).minute(0).second(0)
            : deliveryMoment.clone().hour(11).minute(0).second(0);

          defaultMealsToCreate.push({
            user: subscription.user._id,
            subscription: subscription._id,
            orderDate: new Date(),
            deliveryDate: deliveryDate,
            mealType: type,
            selectedMeal: {
              name: defaultMeal,
              items: [],
              isDefault: true
            },
            cutoffTime: cutoffTime.toDate(),
            isAfterCutoff: false,
            status: 'confirmed',
            createdBy: 'system-kitchen'
          });
        }
      }
    }

    if (defaultMealsToCreate.length > 0) {
      await MealOrder.insertMany(defaultMealsToCreate);
      createdCount = defaultMealsToCreate.length;
      
      console.log(`   ✅ Created ${createdCount} default meals on-demand`);
      defaultMealsToCreate.forEach((meal, i) => {
        console.log(`   [${i + 1}] ${meal.mealType}: ${meal.selectedMeal.name}`);
      });
    } else {
      console.log('   ℹ️  No default meals needed - all subscriptions have orders');
    }

    console.log('   ✅ Kitchen readiness check complete');
    return createdCount;
  } catch (error) {
    console.error('❌ Error ensuring default meals:', error);
    throw error;
  }
};

const getDefaultMealForSubscription = (subscription, deliveryDate, mealType) => {
  const dayOfWeek = moment(deliveryDate).day();
  const planType = subscription.planType || 'classic';

  const mealsByDay = {
    'premium-veg': {
      lunch: [
        'MIX-VEG, DAL, JEERA RICE, ROTI & SALAD',
        'AALOO SOYABEEN, DAL, FRIED RICE, ROTI & KHEER',
        'RAJMA, AALOO BHUJIYA, JEERA RICE, ROTI & RAITA',
        'MUTAR MUSHROOM, DAL, SOYA RICE, ROTI & SALAD',
        'VEGITABLE, DAL, RICE, ROTI & SALAD',
        'PANEER MASALA, PLAIN PARATHA & HALWA',
        'KHICHDI, AALOO CHOKHA / PICKLE'
      ],
      dinner: [
        'VEG BIRYANI, SALAD & RAITA',
        'SEASONAL VEG, DAL, RICE, ROTI & SALAD',
        'KADAI PANEER, LACHHA PARATHA & SALAD',
        'DAL FRY, ROTI & KHEER',
        'MIX-VEG, DAL, FRIED RICE, ROTI & SALAD',
        'BESAN GATTA, JEERA RICE, ROTI & SALAD',
        'CHHOLE MASALA, PURI & SWEETS'
      ]
    },
    'premium-non-veg': {
      lunch: [
        'CHICKEN CURRY (BIHARI STYLE), JEERA RICE, ROTI & SALAD',
        'EGG CURRY, FRIED RICE, ROTI & KHEER',
        'N/A',
        'CHICKEN MASALA, DAL, SOYA RICE, ROTI & SALAD',
        'EGG AALOO DUM, RICE, ROTI & SALAD',
        'HYDRABADI BIRYANI, RAITA & HALWA',
        'KEEMA, DAL, RICE, ROTI & SALAD'
      ],
      dinner: [
        'CHICKEN BIRYANI, RAITA & SALAD',
        'TANDOORI CHICKEN, PARATHA (PLAIN) & HALWA',
        'N/A',
        'MURADABADI BIRYANI, CHUTNEY & KHEER',
        'CHICKEN KORMA, LACHHA PARATHA & SALAD',
        'EGG BHURJI, DAL, JEERA RICE, ROTI & SALAD',
        'BUTTER CHICKEN, SATTU PARATHA, SWEETS'
      ]
    },
    'classic': {
      lunch: [
        'MIX-VEG, DAL, RICE & SALAD',
        'AALOO SOYABEEN, RICE & SALAD',
        'RAJMA, RICE & RAITA',
        'CHICKEN CURRY, RICE & SALAD',
        'VEGITABLE, RICE & SALAD',
        'CHHOLE MASALA, RICE & SALAD',
        'KHICHDI, AALOO CHOKHA / PICKLE'
      ],
      dinner: [
        'CHICKEN BIRYANI, SALAD & RAITA',
        'SEASONAL VEG, ROTI & SALAD',
        'KADAI PANEER, ROTI & HALWA',
        'DAL FRY, ROTI & SALAD',
        'MIX-VEG, ROTI & SALAD',
        'EGG CURRY, ROTI & SALAD',
        'CHHOLE MASALA, PURI & SWEETS'
      ]
    }
  };

  const plan = mealsByDay[planType] || mealsByDay['classic'];
  const meals = plan[mealType] || plan['lunch'];
  
  return meals[dayOfWeek] || 'Dal Rice';
};

async function testKitchenReadiness() {
  try {
    console.log('\n🧪 TESTING KITCHEN READINESS');
    console.log('='.repeat(60));
    
    const tomorrow = moment().add(1, 'day').startOf('day').toDate();
    
    console.log('\n📅 Testing for:', moment(tomorrow).format('YYYY-MM-DD (dddd)'));
    console.log('\n🚀 Simulating Kitchen Open...');
    console.log('');
    
    // Call the on-demand creation
    const created = await ensureDefaultMealsExist(tomorrow);
    
    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Test Complete - Created ${created} default meals`);
    console.log('='.repeat(60));
    
    // Verify final state
    console.log('\n🔍 Verification:');
    const finalCount = await MealOrder.countDocuments({
      deliveryDate: tomorrow
    });
    
    const activeSubscriptions = await Subscription.countDocuments({
      status: 'active',
      startDate: { $lte: tomorrow },
      endDate: { $gte: tomorrow }
    });
    
    const expectedTotal = activeSubscriptions * 2;
    
    console.log(`   Active subscriptions: ${activeSubscriptions}`);
    console.log(`   Expected meal orders: ${expectedTotal}`);
    console.log(`   Actual meal orders:   ${finalCount}`);
    
    if (finalCount === expectedTotal) {
      console.log('   ✅ SUCCESS - Kitchen is now COMPLETE!');
    } else {
      console.log(`   ⚠️  Gap still exists: ${expectedTotal - finalCount} missing`);
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testKitchenReadiness();
