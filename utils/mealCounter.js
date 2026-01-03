const moment = require('moment');

/**
 * ======================================================================
 * SINGLE SOURCE OF TRUTH - Meal Counting Logic
 * ======================================================================
 * This module defines THE ONLY canonical way to count meals.
 * Both Dashboard and Kitchen MUST use these functions.
 * NO other counting logic is allowed anywhere in the system.
 * ======================================================================
 */

/**
 * Get meals to cook for a specific date
 * This is the ONE TRUE QUERY that defines "meals to cook"
 * 
 * @param {Date} date - The delivery date to query for
 * @param {Array} activeUserIds - Array of active user IDs to include
 * @returns {Promise<Object>} { mealOrders, lunchCount, dinnerCount, total, breakdown }
 */
async function getMealsForDate(date, activeUserIds, MealOrder) {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).clone().add(1, 'day').toDate();

  console.log('🔍 [CANONICAL QUERY] Getting meals for date:', {
    date: moment(date).format('YYYY-MM-DD'),
    startOfDay,
    endOfDay,
    activeUsers: activeUserIds.length
  });

  // THE ONLY VALID QUERY - No variations allowed
  const mealOrders = await MealOrder.find({
    deliveryDate: { $gte: startOfDay, $lt: endOfDay },
    user: { $in: activeUserIds }
  }).populate('user', 'name mobile userId');

  // Count by meal type
  let lunchCount = 0;
  let dinnerCount = 0;

  mealOrders.forEach(order => {
    if (order.mealType === 'lunch') {
      lunchCount++;
    } else if (order.mealType === 'dinner') {
      dinnerCount++;
    }
  });

  const total = mealOrders.length;

  // Breakdown by source (for debugging)
  const userSelected = mealOrders.filter(o => 
    o.selectedMeal?.isDefault === false || 
    (!o.createdBy || (o.createdBy !== 'system' && o.createdBy !== 'system-kitchen'))
  );
  const systemGenerated = mealOrders.filter(o => 
    o.selectedMeal?.isDefault === true || 
    o.createdBy === 'system' || 
    o.createdBy === 'system-kitchen'
  );

  const breakdown = {
    userSelected: userSelected.length,
    systemGenerated: systemGenerated.length,
    total: total
  };

  // Check for duplicates (critical bug detection)
  const userMealKeys = new Map();
  const duplicates = [];

  mealOrders.forEach(order => {
    const key = `${order.user._id}_${order.mealType}`;
    if (userMealKeys.has(key)) {
      duplicates.push({
        user: order.user.name,
        mealType: order.mealType,
        ids: [userMealKeys.get(key), order._id]
      });
    } else {
      userMealKeys.set(key, order._id);
    }
  });

  if (duplicates.length > 0) {
    console.error('❌ [CRITICAL] DUPLICATE MEAL ORDERS DETECTED:', {
      count: duplicates.length,
      duplicates: duplicates.slice(0, 5) // Show first 5
    });
  }

  // LOG EXACTLY (for debugging)
  console.log('✅ [CANONICAL QUERY] Results:', {
    date: moment(date).format('YYYY-MM-DD'),
    totalDocuments: total,
    lunchCount,
    dinnerCount,
    userSelected: userSelected.length,
    systemGenerated: systemGenerated.length,
    duplicates: duplicates.length,
    users: mealOrders.map(m => ({ 
      user: m.user.name, 
      type: m.mealType,
      isDefault: m.selectedMeal?.isDefault || false 
    }))
  });

  return {
    mealOrders,
    lunchCount,
    dinnerCount,
    total,
    breakdown,
    duplicates
  };
}

/**
 * Get meals to cook TODAY
 * Dashboard and Kitchen should BOTH use this for "today's meals"
 */
async function getTodayMeals(activeUserIds, MealOrder) {
  const today = moment().startOf('day').toDate();
  return getMealsForDate(today, activeUserIds, MealOrder);
}

/**
 * Get meals to cook TOMORROW
 * Use this ONLY when explicitly showing "tomorrow's" data
 */
async function getTomorrowMeals(activeUserIds, MealOrder) {
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();
  return getMealsForDate(tomorrow, activeUserIds, MealOrder);
}

module.exports = {
  getMealsForDate,
  getTodayMeals,
  getTomorrowMeals
};
