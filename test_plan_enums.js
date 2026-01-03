const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const SubscriptionPlan = require('./models/SubscriptionPlan');

async function testPlanCreation() {
  try {
    console.log('🧪 ======================================');
    console.log('🧪 SUBSCRIPTION PLAN ENUM TEST');
    console.log('🧪 ======================================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Valid plan with correct enums
    console.log('📝 TEST 1: Creating plan with VALID enums');
    const validPlan = {
      name: 'test_valid_plan_' + Date.now(),
      displayName: 'Test Valid Plan',
      description: 'Test plan with correct enum values',
      durationType: 'monthly',
      durationDays: 30,
      pricePerDay: 100,
      totalPrice: 3000,
      planCategory: 'classic',  // ✅ Valid: trial, classic, premium
      type: 'MIX',              // ✅ Valid: VEG, NON_VEG, MIX
      menuCategory: 'classic',  // ✅ Valid: classic, premium-veg, premium-non-veg
      mealTypes: {
        lunch: true,
        dinner: true
      },
      weeklyMenu: {
        sunday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        monday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        tuesday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        wednesday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        thursday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        friday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' },
        saturday: { lunch: 'Rice, Dal', dinner: 'Roti, Veg' }
      },
      isActive: true
    };

    try {
      const createdPlan = await SubscriptionPlan.create(validPlan);
      console.log('✅ SUCCESS: Plan created with ID:', createdPlan._id);
      console.log('   - planCategory:', createdPlan.planCategory);
      console.log('   - menuCategory:', createdPlan.menuCategory);
      console.log('   - type:', createdPlan.type);
      console.log('   - mealTypes:', JSON.stringify(createdPlan.mealTypes));
      
      // Clean up
      await SubscriptionPlan.findByIdAndDelete(createdPlan._id);
      console.log('🗑️  Cleaned up test plan\n');
    } catch (error) {
      console.log('❌ FAILED:', error.message);
      console.log('');
    }

    // Test 2: Invalid planCategory
    console.log('📝 TEST 2: Creating plan with INVALID planCategory');
    const invalidPlanCategory = {
      ...validPlan,
      name: 'test_invalid_category_' + Date.now(),
      planCategory: 'STANDARD'  // ❌ Invalid (should be: trial, classic, premium)
    };

    try {
      await SubscriptionPlan.create(invalidPlanCategory);
      console.log('❌ UNEXPECTED: Plan should have failed but was created!');
    } catch (error) {
      console.log('✅ EXPECTED ERROR:', error.message);
      console.log('');
    }

    // Test 3: Invalid menuCategory
    console.log('📝 TEST 3: Creating plan with INVALID menuCategory');
    const invalidMenuCategory = {
      ...validPlan,
      name: 'test_invalid_menu_' + Date.now(),
      menuCategory: 'VEG'  // ❌ Invalid (should be: classic, premium-veg, premium-non-veg)
    };

    try {
      await SubscriptionPlan.create(invalidMenuCategory);
      console.log('❌ UNEXPECTED: Plan should have failed but was created!');
    } catch (error) {
      console.log('✅ EXPECTED ERROR:', error.message);
      console.log('');
    }

    // Test 4: Invalid type
    console.log('📝 TEST 4: Creating plan with INVALID type');
    const invalidType = {
      ...validPlan,
      name: 'test_invalid_type_' + Date.now(),
      type: 'BOTH'  // ❌ Invalid (should be: VEG, NON_VEG, MIX)
    };

    try {
      await SubscriptionPlan.create(invalidType);
      console.log('❌ UNEXPECTED: Plan should have failed but was created!');
    } catch (error) {
      console.log('✅ EXPECTED ERROR:', error.message);
      console.log('');
    }

    // Test 5: Array mealTypes (old format)
    console.log('📝 TEST 5: Creating plan with ARRAY mealTypes (should fail or convert)');
    const arrayMealTypes = {
      ...validPlan,
      name: 'test_array_meals_' + Date.now(),
      mealTypes: ['LUNCH', 'DINNER']  // ❌ Wrong format (should be object)
    };

    try {
      const plan = await SubscriptionPlan.create(arrayMealTypes);
      console.log('⚠️  Plan created, mealTypes:', JSON.stringify(plan.mealTypes));
      await SubscriptionPlan.findByIdAndDelete(plan._id);
      console.log('');
    } catch (error) {
      console.log('✅ EXPECTED ERROR:', error.message);
      console.log('');
    }

    // Display valid enum values
    console.log('📋 ======================================');
    console.log('📋 VALID ENUM VALUES (Backend Schema)');
    console.log('📋 ======================================\n');
    
    console.log('planCategory:');
    console.log('  ✅ "trial"');
    console.log('  ✅ "classic"');
    console.log('  ✅ "premium"\n');
    
    console.log('menuCategory:');
    console.log('  ✅ "classic"');
    console.log('  ✅ "premium-veg"');
    console.log('  ✅ "premium-non-veg"\n');
    
    console.log('type:');
    console.log('  ✅ "VEG"');
    console.log('  ✅ "NON_VEG"');
    console.log('  ✅ "MIX"\n');
    
    console.log('durationType:');
    console.log('  ✅ "daily"');
    console.log('  ✅ "weekly"');
    console.log('  ✅ "monthly"\n');
    
    console.log('mealTypes (object format):');
    console.log('  ✅ { lunch: true, dinner: true }');
    console.log('  ✅ { lunch: true, dinner: false }');
    console.log('  ✅ { lunch: false, dinner: true }\n');

    console.log('✅ ENUM TEST COMPLETE\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run test
testPlanCreation();
