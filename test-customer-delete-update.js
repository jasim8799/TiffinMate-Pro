/**
 * Test Script: Customer Delete & Update Operations
 * 
 * This script tests the fixed delete and update endpoints
 * to ensure AppNotification is properly created and events are emitted.
 * 
 * Usage:
 *   node test-customer-delete-update.js
 */

const http = require('http');

// Configuration - UPDATE THESE VALUES
const BASE_URL = 'http://localhost:5000';
const OWNER_TOKEN = 'YOUR_OWNER_JWT_TOKEN_HERE'; // Get from login
const TEST_USER_ID = 'TEST_USER_ID_HERE'; // Get from /api/users/customers

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OWNER_TOKEN}`
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testUpdateUser() {
  console.log(`\n${colors.cyan}========== TEST: UPDATE USER ==========${colors.reset}`);
  
  try {
    const updateData = {
      name: 'Updated Test User',
      mobile: '9876543210',
      address: {
        street: '123 Test Street',
        landmark: 'Near Test Park'
      }
    };

    console.log(`${colors.blue}Updating user ${TEST_USER_ID}...${colors.reset}`);
    const result = await makeRequest('PATCH', `/api/users/${TEST_USER_ID}`, updateData);

    if (result.status === 200 && result.data.success) {
      console.log(`${colors.green}✅ UPDATE SUCCESS${colors.reset}`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      console.log(`${colors.yellow}⚠️  Check logs for:${colors.reset}`);
      console.log('   - "📢 Broadcasting notification to owners: user_updated"');
      console.log('   - AppNotification created in database');
      return true;
    } else {
      console.log(`${colors.red}❌ UPDATE FAILED${colors.reset}`);
      console.log('Status:', result.status);
      console.log('Response:', result.data);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testDeleteUser() {
  console.log(`\n${colors.cyan}========== TEST: DELETE USER ==========${colors.reset}`);
  
  try {
    console.log(`${colors.blue}Deleting user ${TEST_USER_ID}...${colors.reset}`);
    console.log(`${colors.yellow}⚠️  This is a SOFT delete (sets isActive=false)${colors.reset}`);
    
    const result = await makeRequest('DELETE', `/api/users/${TEST_USER_ID}`);

    if (result.status === 200 && result.data.success) {
      console.log(`${colors.green}✅ DELETE SUCCESS${colors.reset}`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
      console.log(`${colors.yellow}⚠️  Check logs for:${colors.reset}`);
      console.log('   - "📢 Broadcasting notification to owners: user_deleted"');
      console.log('   - "📢 Broadcasting: user_deleted"');
      console.log('   - AppNotification created in database');
      return true;
    } else {
      console.log(`${colors.red}❌ DELETE FAILED${colors.reset}`);
      console.log('Status:', result.status);
      console.log('Response:', result.data);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ERROR: ${error.message}${colors.reset}`);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║   TiffinMate - Customer Delete & Update Test Suite        ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Validate configuration
  if (OWNER_TOKEN === 'YOUR_OWNER_JWT_TOKEN_HERE') {
    console.log(`${colors.red}❌ ERROR: Please set OWNER_TOKEN in the script${colors.reset}`);
    console.log(`${colors.yellow}   1. Login as owner via /api/auth/login${colors.reset}`);
    console.log(`${colors.yellow}   2. Copy the token from response${colors.reset}`);
    console.log(`${colors.yellow}   3. Update OWNER_TOKEN variable in this script${colors.reset}`);
    process.exit(1);
  }

  if (TEST_USER_ID === 'TEST_USER_ID_HERE') {
    console.log(`${colors.red}❌ ERROR: Please set TEST_USER_ID in the script${colors.reset}`);
    console.log(`${colors.yellow}   1. Call GET /api/users/customers${colors.reset}`);
    console.log(`${colors.yellow}   2. Copy an _id from the response${colors.reset}`);
    console.log(`${colors.yellow}   3. Update TEST_USER_ID variable in this script${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  User ID:  ${TEST_USER_ID}`);
  console.log(`  Token:    ${OWNER_TOKEN.substring(0, 20)}...`);

  // Run tests
  const updateResult = await testUpdateUser();
  
  // Wait 2 seconds before delete test
  console.log(`\n${colors.yellow}Waiting 2 seconds before delete test...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const deleteResult = await testDeleteUser();

  // Summary
  console.log(`\n${colors.cyan}========== TEST SUMMARY ==========${colors.reset}`);
  console.log(`Update User: ${updateResult ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Delete User: ${deleteResult ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);

  if (updateResult && deleteResult) {
    console.log(`\n${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Next Steps:${colors.reset}`);
    console.log('   1. Check MongoDB for AppNotification records');
    console.log('   2. Test real-time updates in Flutter app');
    console.log('   3. Verify loader closes properly in UI');
  } else {
    console.log(`\n${colors.red}❌ SOME TESTS FAILED${colors.reset}`);
    console.log('Please check:');
    console.log('   1. Backend server is running');
    console.log('   2. MongoDB is connected');
    console.log('   3. Token is valid');
    console.log('   4. User ID exists');
  }

  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
