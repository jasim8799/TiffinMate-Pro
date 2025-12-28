// Test script for Customer Creation API
// Run this to test the backend endpoint

const axios = require('axios');

// Configuration
const BASE_URL = 'https://tiffinmate-pro.onrender.com/api'; // Update if different
const OWNER_JWT_TOKEN = 'YOUR_OWNER_JWT_TOKEN_HERE'; // Get from login

// Test data
const testCustomer = {
  name: 'Test Customer',
  mobile: '9876543210', // Use a valid test mobile number
  address: '123 Test Street, Surat',
  landmark: 'Near Test Mall',
  plan: 'Monthly',
  mealType: 'Lunch',
  duration: '30'
};

// Test function
async function testCreateCustomer() {
  try {
    console.log('🧪 Testing Customer Creation API...\n');
    console.log('📋 Test Data:', testCustomer);
    console.log('\n🔄 Sending request...\n');

    const response = await axios.post(
      `${BASE_URL}/users/create`,
      testCustomer,
      {
        headers: {
          'Authorization': `Bearer ${OWNER_JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS!\n');
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      console.log('\n🎉 Customer Created:');
      console.log(`   User ID: ${response.data.data.userId}`);
      console.log(`   Temp Password: ${response.data.data.tempPassword}`);
      console.log(`   Name: ${response.data.data.name}`);
      console.log(`   Mobile: ${response.data.data.mobile}`);
    }

  } catch (error) {
    console.error('❌ ERROR!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response from server');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Instructions
console.log(`
╔══════════════════════════════════════════════════════════════╗
║          TiffinMate Customer Creation API Test               ║
╚══════════════════════════════════════════════════════════════╝

📝 SETUP INSTRUCTIONS:

1. Get Owner JWT Token:
   - Login as owner via API or Flutter app
   - Copy the JWT token
   - Paste it in OWNER_JWT_TOKEN variable above

2. Update Test Data:
   - Change mobile number to a valid test number
   - Update name, address as needed

3. Run Test:
   node backend/test-create-customer.js

4. Check Results:
   - Console will show userId and tempPassword
   - Check MongoDB for new user
   - Check mobile for SMS (if Fast2SMS configured)

═══════════════════════════════════════════════════════════════

`);

// Run test if token is provided
if (OWNER_JWT_TOKEN !== 'YOUR_OWNER_JWT_TOKEN_HERE') {
  testCreateCustomer();
} else {
  console.log('⚠️  Please update OWNER_JWT_TOKEN before running test\n');
}
