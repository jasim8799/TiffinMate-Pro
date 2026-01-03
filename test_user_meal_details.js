/**
 * Test Script: User-Wise Meal Details in Kitchen API
 * 
 * This tests the new userMealDetails field added to the Kitchen API response.
 * 
 * Expected Output:
 * - userMealDetails array with user info, meal type, menu, ingredients, and source
 * - Ingredients extracted from menu items (comma-separated)
 * - Source marked as USER or DEFAULT based on isDefault flag
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  ownerPhone: '1111111111', // Default owner from seed data
  ownerOtp: '123456'
};

async function testUserMealDetails() {
  console.log('🧪 Testing User-Wise Meal Details in Kitchen API\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Login as Owner
    console.log('\n📱 Step 1: Login as Owner');
    console.log('Phone:', TEST_CONFIG.ownerPhone);
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobile: TEST_CONFIG.ownerPhone,
      otp: TEST_CONFIG.ownerOtp
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Fetch Kitchen Data (Aggregated)
    console.log('\n🍽️ Step 2: Fetch Kitchen Aggregated Data');
    
    const kitchenResponse = await axios.get(`${BASE_URL}/meals/owner/aggregated`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!kitchenResponse.data.success) {
      console.error('❌ Kitchen API failed:', kitchenResponse.data.message);
      return;
    }

    const data = kitchenResponse.data.data;
    console.log('✅ Kitchen data fetched successfully\n');

    // Step 3: Display Summary
    console.log('📊 SUMMARY:');
    console.log('-'.repeat(60));
    console.log('Total Orders:', data.totalOrders);
    console.log('Lunch Orders:', data.totalLunch);
    console.log('Dinner Orders:', data.totalDinner);
    
    // Step 4: Display User Meal Details
    console.log('\n👥 USER-WISE MEAL DETAILS:');
    console.log('='.repeat(60));
    
    const userMealDetails = data.userMealDetails || [];
    
    if (userMealDetails.length === 0) {
      console.log('⚠️  No user meal details found');
      console.log('   This might mean:');
      console.log('   - No active subscriptions for today');
      console.log('   - No meal orders created yet');
      console.log('   - Default meals not auto-created');
      return;
    }

    console.log(`Found ${userMealDetails.length} meal orders\n`);

    // Create a formatted table
    userMealDetails.forEach((detail, index) => {
      console.log(`[${index + 1}] ${detail.userName}`);
      console.log(`    Meal Type:   ${detail.mealType}`);
      console.log(`    Menu:        ${detail.menu}`);
      console.log(`    Ingredients: ${detail.ingredients.join(', ') || 'None'}`);
      console.log(`    Source:      ${detail.source === 'DEFAULT' ? '🔵 DEFAULT' : '🟢 USER'}`);
      console.log('-'.repeat(60));
    });

    // Step 5: Validate Data Structure
    console.log('\n✅ VALIDATION:');
    console.log('-'.repeat(60));
    
    let validCount = 0;
    let invalidCount = 0;
    
    userMealDetails.forEach((detail) => {
      const hasUserName = detail.userName && detail.userName !== 'Unknown User';
      const hasMealType = ['Lunch', 'Dinner'].includes(detail.mealType);
      const hasMenu = detail.menu && detail.menu !== 'Not Selected';
      const hasIngredients = Array.isArray(detail.ingredients);
      const hasSource = ['USER', 'DEFAULT'].includes(detail.source);
      
      if (hasUserName && hasMealType && hasMenu && hasIngredients && hasSource) {
        validCount++;
      } else {
        invalidCount++;
        console.warn('⚠️  Invalid detail:', detail);
      }
    });
    
    console.log(`Valid Records:   ${validCount}`);
    console.log(`Invalid Records: ${invalidCount}`);
    
    if (invalidCount === 0) {
      console.log('\n✅ All user meal details are valid!');
    } else {
      console.log('\n⚠️  Some user meal details have issues');
    }

    // Step 6: Check Ingredient Extraction
    console.log('\n🥘 INGREDIENT EXTRACTION CHECK:');
    console.log('-'.repeat(60));
    
    const ingredientExtractionCheck = userMealDetails.filter(detail => {
      const menuItems = detail.menu.split(',').length;
      const extractedIngredients = detail.ingredients.length;
      return menuItems === extractedIngredients && menuItems > 0;
    });
    
    console.log(`Menu items correctly extracted: ${ingredientExtractionCheck.length}/${userMealDetails.length}`);

    console.log('\n✅ Test completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message || error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testUserMealDetails();
