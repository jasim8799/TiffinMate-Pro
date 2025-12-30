/**
 * Role-Based Authentication Test Script
 * Tests the new owner/customer login flows
 */

const API_BASE = 'http://localhost:5000/api';

// Test credentials - UPDATE WITH YOUR ACTUAL TEST DATA
const TEST_OWNER = {
  userId: 'OWNER001',
  password: 'Owner@123'
};

const TEST_CUSTOMER = {
  userId: 'CUST001',
  password: 'Customer@123'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testOwnerLogin() {
  log('\n=================================', 'cyan');
  log('TEST 1: OWNER LOGIN (Should require OTP)', 'cyan');
  log('=================================', 'cyan');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_OWNER)
    });

    const data = await response.json();

    log('\nResponse Status: ' + response.status, 'yellow');
    log('Response Body:', 'yellow');
    console.log(JSON.stringify(data, null, 2));

    // Validate response
    if (data.success && data.requiresOtp === true && data.role === 'owner') {
      log('\n✅ PASS: Owner login correctly requires OTP', 'green');
      log(`   - requiresOtp: ${data.requiresOtp}`, 'green');
      log(`   - role: ${data.role}`, 'green');
      log(`   - mobile masked: ${data.data?.mobile}`, 'green');
      return true;
    } else {
      log('\n❌ FAIL: Owner login response incorrect', 'red');
      return false;
    }
  } catch (error) {
    log('\n❌ ERROR: ' + error.message, 'red');
    return false;
  }
}

async function testCustomerLogin() {
  log('\n=================================', 'cyan');
  log('TEST 2: CUSTOMER LOGIN (Should NOT require OTP)', 'cyan');
  log('=================================', 'cyan');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CUSTOMER)
    });

    const data = await response.json();

    log('\nResponse Status: ' + response.status, 'yellow');
    log('Response Body:', 'yellow');
    console.log(JSON.stringify(data, null, 2));

    // Validate response
    if (
      data.success &&
      data.requiresOtp === false &&
      data.token &&
      data.data?.role === 'customer'
    ) {
      log('\n✅ PASS: Customer login correctly bypasses OTP', 'green');
      log(`   - requiresOtp: ${data.requiresOtp}`, 'green');
      log(`   - token present: ${!!data.token}`, 'green');
      log(`   - role: ${data.data?.role}`, 'green');
      return true;
    } else {
      log('\n❌ FAIL: Customer login response incorrect', 'red');
      return false;
    }
  } catch (error) {
    log('\n❌ ERROR: ' + error.message, 'red');
    return false;
  }
}

async function testCustomerOTPVerificationBlocked() {
  log('\n=================================', 'cyan');
  log('TEST 3: CUSTOMER OTP VERIFICATION (Should be blocked)', 'cyan');
  log('=================================', 'cyan');

  try {
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_CUSTOMER.userId,
        otp: '123456'
      })
    });

    const data = await response.json();

    log('\nResponse Status: ' + response.status, 'yellow');
    log('Response Body:', 'yellow');
    console.log(JSON.stringify(data, null, 2));

    // Validate response
    if (response.status === 403 && !data.success) {
      log('\n✅ PASS: Customer OTP verification correctly blocked', 'green');
      log(`   - Status: ${response.status} (Forbidden)`, 'green');
      log(`   - Message: ${data.message}`, 'green');
      return true;
    } else {
      log('\n❌ FAIL: Customer should not be able to verify OTP', 'red');
      return false;
    }
  } catch (error) {
    log('\n❌ ERROR: ' + error.message, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║  ROLE-BASED OTP AUTHENTICATION TESTS  ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const results = {
    ownerLogin: await testOwnerLogin(),
    customerLogin: await testCustomerLogin(),
    customerOTPBlocked: await testCustomerOTPVerificationBlocked()
  };

  // Summary
  log('\n=================================', 'blue');
  log('TEST SUMMARY', 'blue');
  log('=================================', 'blue');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} - ${test}`, color);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'red');

  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! Role-based OTP is working correctly.', 'green');
  } else {
    log('\n⚠️  SOME TESTS FAILED. Please review the implementation.', 'red');
  }
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ FATAL ERROR: ' + error.message, 'red');
  console.error(error);
});
