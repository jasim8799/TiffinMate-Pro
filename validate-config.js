#!/usr/bin/env node

/**
 * Fast2SMS Configuration Validator
 * 
 * This script validates that TiffinMate backend is configured correctly
 * to use Fast2SMS Quick Transactional Route ('q') - same as school project
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Fast2SMS Configuration Validator\n');
console.log('=' .repeat(60));

let errors = [];
let warnings = [];
let successes = [];

// 1. Check smsService.js for correct route
console.log('\n📁 Checking smsService.js...');
const smsServicePath = path.join(__dirname, 'services', 'smsService.js');
const smsServiceContent = fs.readFileSync(smsServicePath, 'utf8');

if (smsServiceContent.includes("route: 'q'")) {
  successes.push('✅ Using Quick Transactional Route (route: \'q\')');
} else {
  errors.push('❌ Not using route \'q\' in smsService.js');
}

if (smsServiceContent.includes("route: 'otp'")) {
  errors.push('❌ Still using OTP Message API (route: \'otp\') - REMOVE THIS!');
}

if (smsServiceContent.includes('variables_values')) {
  errors.push('❌ Still using variables_values - REMOVE THIS!');
}

if (smsServiceContent.includes("language: 'english'")) {
  successes.push('✅ Language set to \'english\'');
} else {
  errors.push('❌ Missing language field in payload');
}

if (smsServiceContent.includes('numbers: cleanMobile')) {
  successes.push('✅ Using 10-digit phone number (no country code)');
}

if (smsServiceContent.includes('91${cleanMobile}')) {
  warnings.push('⚠️  Found country code concatenation (91) - ensure it\'s not in sendOTP()');
}

// 2. Check User.js for bcrypt OTP
console.log('\n📁 Checking User.js...');
const userModelPath = path.join(__dirname, 'models', 'User.js');
const userModelContent = fs.readFileSync(userModelPath, 'utf8');

if (userModelContent.includes('bcrypt.hash(otp, salt)')) {
  successes.push('✅ OTP is hashed with bcrypt');
} else {
  errors.push('❌ OTP not hashed - security risk!');
}

if (userModelContent.includes('bcrypt.compare(candidateOTP')) {
  successes.push('✅ OTP verification uses bcrypt.compare()');
} else {
  errors.push('❌ OTP verification not using bcrypt');
}

if (userModelContent.includes('this.otp.code === candidateOTP')) {
  errors.push('❌ Still using plain text OTP comparison - security risk!');
}

// 3. Check authController.js
console.log('\n📁 Checking authController.js...');
const authControllerPath = path.join(__dirname, 'controllers', 'authController.js');
const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');

if (authControllerContent.includes('await user.generateOTP()')) {
  successes.push('✅ generateOTP() is awaited (async)');
} else {
  errors.push('❌ generateOTP() not awaited - will fail!');
}

if (authControllerContent.includes('await user.verifyOTP(otp)')) {
  successes.push('✅ verifyOTP() is awaited (async)');
} else {
  errors.push('❌ verifyOTP() not awaited - will fail!');
}

if (authControllerContent.includes('status(503)')) {
  successes.push('✅ HTTP 503 returned on SMS failure');
} else {
  warnings.push('⚠️  Consider using HTTP 503 for SMS service failures');
}

// 4. Check .env.example
console.log('\n📁 Checking .env.example...');
const envExamplePath = path.join(__dirname, '.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

if (envExampleContent.includes('FAST2SMS_API_KEY')) {
  successes.push('✅ FAST2SMS_API_KEY in .env.example');
} else {
  errors.push('❌ FAST2SMS_API_KEY missing from .env.example');
}

if (envExampleContent.includes('OTP_EXPIRY_MINUTES')) {
  warnings.push('⚠️  OTP_EXPIRY_MINUTES in .env.example (should be hardcoded to 5 minutes)');
}

if (envExampleContent.includes('OTP_MAX_ATTEMPTS')) {
  warnings.push('⚠️  OTP_MAX_ATTEMPTS in .env.example (should be hardcoded to 3)');
}

// 5. Check for actual .env file
console.log('\n📁 Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('FAST2SMS_API_KEY=') && !envContent.includes('FAST2SMS_API_KEY=your_')) {
    successes.push('✅ FAST2SMS_API_KEY configured in .env');
  } else {
    warnings.push('⚠️  FAST2SMS_API_KEY not set in .env - required for SMS!');
  }
} else {
  warnings.push('⚠️  .env file not found - copy from .env.example');
}

// Print Results
console.log('\n' + '='.repeat(60));
console.log('\n📊 VALIDATION RESULTS\n');

if (successes.length > 0) {
  console.log('✅ PASSED CHECKS:');
  successes.forEach(s => console.log('   ' + s));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(w => console.log('   ' + w));
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS (MUST FIX):');
  errors.forEach(e => console.log('   ' + e));
  console.log('\n🚫 Configuration is NOT ready for production!');
  process.exit(1);
} else {
  console.log('\n✅ ALL CHECKS PASSED! Configuration matches school project.');
  console.log('🚀 Ready for deployment!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Ensure FAST2SMS_API_KEY is set in .env');
  console.log('   2. Use the SAME API key as your school project');
  console.log('   3. Test with: npm start');
  console.log('   4. Try login with a test user');
  console.log('   5. Check SMS delivery within 30 seconds');
  process.exit(0);
}

console.log('\n' + '='.repeat(60) + '\n');
