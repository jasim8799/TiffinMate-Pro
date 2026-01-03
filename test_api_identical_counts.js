const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// You'll need a valid owner token - get this from your app or database
const OWNER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZhMmFiM2Y1ZTZiYWUyYTcwYjk4ZjYiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3MzU4NzYzNzQsImV4cCI6MTczNjQ4MTE3NH0.aP4jtNZ43O3CY9Aq3D-q04AiPJNBSd43Y0wJOtMZ4_o';

async function testAPIs() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING ACTUAL API ENDPOINTS');
    console.log('='.repeat(70));
    console.log('\n📡 Base URL:', BASE_URL);
    console.log('🔑 Using Owner Token\n');
    
    // ======================================================================
    // TEST 1: Dashboard API
    // ======================================================================
    console.log('━'.repeat(70));
    console.log('📊 TEST 1: DASHBOARD API');
    console.log('━'.repeat(70));
    
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${OWNER_TOKEN}` }
      });
      
      const dashboard = dashboardResponse.data.data;
      console.log('\n✅ Dashboard Response:');
      console.log(`   Status: ${dashboardResponse.status}`);
      console.log(`   Today Orders: ${JSON.stringify(dashboard.todayOrders)}`);
      console.log(`   - Lunch:  ${dashboard.todayOrders.lunch}`);
      console.log(`   - Dinner: ${dashboard.todayOrders.dinner}`);
      console.log(`   - Total:  ${dashboard.todayOrders.total}`);
      
      // Store for comparison
      global.dashboardCounts = dashboard.todayOrders;
      
    } catch (error) {
      console.error('❌ Dashboard API Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.error('⚠️  Token expired or invalid. Please update OWNER_TOKEN.');
      }
    }
    
    // ======================================================================
    // TEST 2: Kitchen API
    // ======================================================================
    console.log('\n' + '━'.repeat(70));
    console.log('🍽️  TEST 2: KITCHEN API');
    console.log('━'.repeat(70));
    
    try {
      const kitchenResponse = await axios.get(`${BASE_URL}/meals/owner/aggregated`, {
        headers: { Authorization: `Bearer ${OWNER_TOKEN}` }
      });
      
      const kitchen = kitchenResponse.data;
      console.log('\n✅ Kitchen Response:');
      console.log(`   Status: ${kitchenResponse.status}`);
      console.log(`   Order Summary: ${JSON.stringify(kitchen.orderSummary)}`);
      console.log(`   - Lunch:  ${kitchen.orderSummary.Lunch}`);
      console.log(`   - Dinner: ${kitchen.orderSummary.Dinner}`);
      console.log(`   - Total:  ${kitchen.orderSummary.Total}`);
      
      // Store for comparison
      global.kitchenCounts = kitchen.orderSummary;
      
    } catch (error) {
      console.error('❌ Kitchen API Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.error('⚠️  Token expired or invalid. Please update OWNER_TOKEN.');
      }
    }
    
    // ======================================================================
    // VERIFICATION: Compare Counts
    // ======================================================================
    if (global.dashboardCounts && global.kitchenCounts) {
      console.log('\n' + '='.repeat(70));
      console.log('🎯 FINAL VERIFICATION: Dashboard vs Kitchen');
      console.log('='.repeat(70));
      
      const dashboard = global.dashboardCounts;
      const kitchen = global.kitchenCounts;
      
      console.log('\n📊 Dashboard:');
      console.log(`   Lunch:  ${dashboard.lunch}`);
      console.log(`   Dinner: ${dashboard.dinner}`);
      console.log(`   Total:  ${dashboard.total}`);
      
      console.log('\n🍽️  Kitchen:');
      console.log(`   Lunch:  ${kitchen.Lunch}`);
      console.log(`   Dinner: ${kitchen.Dinner}`);
      console.log(`   Total:  ${kitchen.Total}`);
      
      // Check if identical
      const lunchMatch = dashboard.lunch === kitchen.Lunch;
      const dinnerMatch = dashboard.dinner === kitchen.Dinner;
      const totalMatch = dashboard.total === kitchen.Total;
      
      console.log('\n' + '━'.repeat(70));
      console.log('COMPARISON RESULTS:');
      console.log('━'.repeat(70));
      console.log(`   ${lunchMatch ? '✅' : '❌'} Lunch:  Dashboard=${dashboard.lunch} vs Kitchen=${kitchen.Lunch}`);
      console.log(`   ${dinnerMatch ? '✅' : '❌'} Dinner: Dashboard=${dashboard.dinner} vs Kitchen=${kitchen.Dinner}`);
      console.log(`   ${totalMatch ? '✅' : '❌'} Total:  Dashboard=${dashboard.total} vs Kitchen=${kitchen.Total}`);
      
      console.log('\n' + '='.repeat(70));
      if (lunchMatch && dinnerMatch && totalMatch) {
        console.log('✅ ✅ ✅ SUCCESS: COUNTS ARE IDENTICAL! ✅ ✅ ✅');
        console.log('Dashboard and Kitchen now show the SAME data!');
      } else {
        console.log('❌ ❌ ❌ FAILURE: COUNTS DO NOT MATCH! ❌ ❌ ❌');
        console.log('This should NOT happen with single source of truth!');
      }
      console.log('='.repeat(70));
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

testAPIs();
