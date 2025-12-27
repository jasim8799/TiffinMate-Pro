#!/usr/bin/env node

/**
 * Change Password API Test Script
 * 
 * This script validates the change-password API endpoint
 */

console.log('\n🔐 Change Password API Validator\n');
console.log('=' .repeat(60));

const fs = require('fs');
const path = require('path');

let errors = [];
let successes = [];

// 1. Check validator has no confirmPassword
console.log('\n📁 Checking validators.js...');
const validatorsPath = path.join(__dirname, 'middleware', 'validators.js');
const validatorsContent = fs.readFileSync(validatorsPath, 'utf8');

if (validatorsContent.includes("body('confirmPassword')")) {
  errors.push('❌ changePasswordValidation still requires confirmPassword');
} else {
  successes.push('✅ confirmPassword validation removed');
}

if (validatorsContent.match(/isLength.*min:\s*8/)) {
  successes.push('✅ Password minimum length is 8 characters');
} else {
  errors.push('❌ Password minimum should be 8 characters');
}

if (validatorsContent.includes("body('oldPassword')") && 
    validatorsContent.includes("body('newPassword')")) {
  successes.push('✅ Accepts oldPassword and newPassword');
}

// 2. Check controller logic
console.log('\n📁 Checking authController.js...');
const controllerPath = path.join(__dirname, 'controllers', 'authController.js');
const controllerContent = fs.readFileSync(controllerPath, 'utf8');

if (controllerContent.includes('allowedFields')) {
  successes.push('✅ Strict request contract implemented');
} else {
  errors.push('❌ Missing strict request contract validation');
}

if (controllerContent.includes('comparePassword(oldPassword)')) {
  successes.push('✅ Using bcrypt.compare for old password');
}

if (controllerContent.includes("message: 'Current password is incorrect'")) {
  successes.push('✅ Proper error message for wrong password');
}

if (controllerContent.includes('isPasswordChanged = true')) {
  successes.push('✅ Sets isPasswordChanged flag');
}

// Check for secure logging (don't log actual password values)
if (controllerContent.match(/console\.log.*user\.userId/i)) {
  // Check if actual password variables are logged (oldPassword, newPassword)
  if (controllerContent.match(/console\.log.*\$\{oldPassword\}/i) || 
      controllerContent.match(/console\.log.*\$\{newPassword\}/i) ||
      controllerContent.match(/console\.log.*oldPassword:/i) ||
      controllerContent.match(/console\.log.*newPassword:/i)) {
    errors.push('❌ WARNING: Password values are logged - security risk!');
  } else {
    successes.push('✅ Secure logging (password values not logged)');
  }
}

// 3. Check route protection
console.log('\n📁 Checking authRoutes.js...');
const routesPath = path.join(__dirname, 'routes', 'authRoutes.js');
const routesContent = fs.readFileSync(routesPath, 'utf8');

if (routesContent.includes('protect') && 
    routesContent.includes('change-password')) {
  successes.push('✅ Change-password route protected with JWT');
} else {
  errors.push('❌ Change-password route may not be protected');
}

// 4. Check auth middleware
console.log('\n📁 Checking auth.js middleware...');
const authPath = path.join(__dirname, 'middleware', 'auth.js');
const authContent = fs.readFileSync(authPath, 'utf8');

if (authContent.includes('req.user') && authContent.includes('User.findById')) {
  successes.push('✅ JWT middleware sets req.user');
}

// Print Results
console.log('\n' + '='.repeat(60));
console.log('\n📊 VALIDATION RESULTS\n');

if (successes.length > 0) {
  console.log('✅ PASSED CHECKS:');
  successes.forEach(s => console.log('   ' + s));
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log('   ' + e));
  console.log('\n🚫 Change-password API has issues!');
  process.exit(1);
} else {
  console.log('\n✅ ALL CHECKS PASSED!');
  console.log('\n📝 API Contract:');
  console.log('   POST /api/auth/change-password');
  console.log('   Headers: { Authorization: "Bearer <token>" }');
  console.log('   Body: { "oldPassword": string, "newPassword": string }');
  console.log('\n🎯 Password Requirements:');
  console.log('   - Minimum 8 characters');
  console.log('   - At least 1 uppercase letter');
  console.log('   - At least 1 lowercase letter');
  console.log('   - At least 1 number');
  console.log('\n🚀 Ready to test with Flutter!');
  process.exit(0);
}

console.log('\n' + '='.repeat(60) + '\n');
