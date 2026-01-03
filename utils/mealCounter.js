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
 * Get meals to cook TODAY ONLY
 * ❌ NO TOMORROW
 * ❌ NO FUTURE
 * ❌ NO PAST
 * ✅ TODAY ONLY
 * 
 * @param {Array} activeUserIds - Array of active user IDs to include
 * @param {Object} MealOrder - Mongoose model
 * @returns {Promise<Object>} { mealOrders, lunchCount, dinnerCount, totalUsers }
 */
async function getTodayMeals(activeUserIds, MealOrder) {
  // Get TODAY date range
  const today = moment();
  const start = moment(today).startOf('day').toDate();
  const end = moment(today).endOf('day').toDate();

  console.log('🍳 COOKING TODAY ONLY - Query Range:', {
    date: today.format('YYYY-MM-DD (dddd)'),
    start,
    end,
    activeUsers: activeUserIds.length
  });

  // STRICT TODAY-ONLY QUERY
  // ❌ NO tomorrow logic
  // ❌ NO createdAt
  // ✅ deliveryDate ONLY
  const mealsToday = await MealOrder.find({
    deliveryDate: { $gte: start, $lte: end },
    user: { $in: activeUserIds }
  }).populate('user', 'name mobile userId address');

  // Count by meal type
  let lunchCount = 0;
  let dinnerCount = 0;

  mealsToday.forEach(order => {
    if (order.mealType === 'lunch') {
      lunchCount++;
    } else if (order.mealType === 'dinner') {
      dinnerCount++;
    }
  });

  const totalUsers = mealsToday.length;

  // Safety log
  console.log('🍳 COOKING TODAY ONLY', {
    date: today.format('YYYY-MM-DD'),
    users: totalUsers,
    lunch: lunchCount,
    dinner: dinnerCount
  });

  // Check for duplicates
  const userMealKeys = new Map();
  const duplicates = [];

  mealsToday.forEach(order => {
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
    console.error('❌ DUPLICATE MEALS DETECTED:', duplicates.length);
  }

  return {
    mealOrders: mealsToday,
    lunchCount,
    dinnerCount,
    totalUsers,
    duplicates
  };
}

module.exports = {
  getTodayMeals
};
