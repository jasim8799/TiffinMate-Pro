const MealOrder = require('../models/MealOrder');
const DefaultMeal = require('../models/DefaultMeal');
const Delivery = require('../models/Delivery');
const WeeklyMenu = require('../models/WeeklyMenu');
const Subscription = require('../models/Subscription');
const AppNotification = require('../models/AppNotification');
const socketService = require('../services/socketService');
const moment = require('moment');
const { createNotification } = require('./notificationController');
const User = require('../models/User');

// @desc    Select meal for specific date
// @route   POST /api/meals/select
// @access  Private (Customer)
exports.selectMeal = async (req, res) => {
  try {
    const { deliveryDate, lunch, dinner } = req.body;

    console.log('📥 Received meal selection request:');
    console.log('   User:', req.user._id);
    console.log('   Date:', deliveryDate);
    console.log('   Lunch:', JSON.stringify(lunch));
    console.log('   Dinner:', JSON.stringify(dinner));

    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide delivery date'
      });
    }

    // Validate that at least one meal is selected
    if (!lunch && !dinner) {
      console.log('⚠️ No meals selected - both lunch and dinner are null/undefined');
      return res.status(400).json({
        success: false,
        message: 'Please select at least one meal (lunch or dinner)'
      });
    }

    // ========== SUBSCRIPTION & TRIAL VALIDATION ==========
    // Get user's active subscription
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please select a subscription plan first.'
      });
    }

    // Check if subscription is expired
    const currentTime = moment();
    if (moment(subscription.endDate).isBefore(currentTime)) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue ordering meals.'
      });
    }

    // ========== TRIAL PERIOD ENFORCEMENT ==========
    if (subscription.planType === 'trial') {
      // Check if trial days are exhausted
      const trialDaysUsed = subscription.daysUsed || 0;
      const trialDaysLimit = 3;
      
      if (trialDaysUsed >= trialDaysLimit) {
        return res.status(403).json({
          success: false,
          message: 'Your 3-day trial period has ended. Please purchase a subscription to continue ordering meals.',
          trialExpired: true
        });
      }

      // Warn user if on last trial day
      if (trialDaysUsed === trialDaysLimit - 1) {
        console.log(`⚠️ User ${req.user._id} is on their last trial day`);
      }
    }

    const dietaryPreference = subscription?.mealPreferences?.dietaryPreference || 'both';

    // Helper function to check if meal contains non-veg items
    const nonVegKeywords = ['CHICKEN', 'EGG', 'MUTTON', 'FISH', 'KEEMA', 'TANDOORI', 'BIRYANI', 'KORMA', 'BUTTER CHICKEN', 'HYDRABADI', 'MURADABADI'];
    const isNonVeg = (meal) => {
      if (!meal) return false;
      // Handle both string and object formats
      const mealName = typeof meal === 'string' ? meal : (meal.name || '');
      const upperMeal = mealName.toUpperCase();
      return nonVegKeywords.some(keyword => upperMeal.includes(keyword));
    };

    // Validate lunch selection based on dietary preference
    if (lunch) {
      const lunchIsNonVeg = isNonVeg(lunch);
      
      if (dietaryPreference === 'veg' && lunchIsNonVeg) {
        return res.status(400).json({
          success: false,
          message: 'You have a VEG-only subscription. Cannot select non-veg meals.'
        });
      }
      
      if (dietaryPreference === 'non-veg' && !lunchIsNonVeg) {
        return res.status(400).json({
          success: false,
          message: 'You have a NON-VEG only subscription. Cannot select veg meals.'
        });
      }
    }

    // Validate dinner selection based on dietary preference
    if (dinner) {
      const dinnerIsNonVeg = isNonVeg(dinner);
      
      if (dietaryPreference === 'veg' && dinnerIsNonVeg) {
        return res.status(400).json({
          success: false,
          message: 'You have a VEG-only subscription. Cannot select non-veg meals.'
        });
      }
      
      if (dietaryPreference === 'non-veg' && !dinnerIsNonVeg) {
        return res.status(400).json({
          success: false,
          message: 'You have a NON-VEG only subscription. Cannot select veg meals.'
        });
      }
    }

    // For 'both' preference, ensure user doesn't mix veg and non-veg in same order
    if (dietaryPreference === 'both' && lunch && dinner) {
      const lunchIsNonVeg = isNonVeg(lunch);
      const dinnerIsNonVeg = isNonVeg(dinner);
      
      if (lunchIsNonVeg !== dinnerIsNonVeg) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mix VEG and NON-VEG meals in the same day. Please select either all VEG or all NON-VEG.'
        });
      }
    }

    // Calculate cutoff time (previous night 11 PM for lunch, same day 11 AM for dinner)
    const deliveryMoment = moment(deliveryDate).startOf('day');
    
    console.log('📅 Date handling:');
    console.log('   Input deliveryDate:', deliveryDate);
    console.log('   Parsed moment:', deliveryMoment.toISOString());
    console.log('   Formatted:', deliveryMoment.format('YYYY-MM-DD'));
    console.log('   As Date object:', deliveryMoment.toDate());
    
    const lunchCutoff = deliveryMoment.clone().subtract(1, 'day').hour(23).minute(0).second(0);
    const dinnerCutoff = deliveryMoment.clone().hour(11).minute(0).second(0);
    const currentMoment = moment();

    // Check cutoff times
    const canSelectLunch = currentMoment.isBefore(lunchCutoff);
    const canSelectDinner = currentMoment.isBefore(dinnerCutoff);

    if (lunch && !canSelectLunch) {
      return res.status(400).json({
        success: false,
        message: `Lunch selection closed. Cutoff time was ${lunchCutoff.format('DD MMM YYYY, hh:mm A')}`
      });
    }

    if (dinner && !canSelectDinner) {
      return res.status(400).json({
        success: false,
        message: `Dinner selection closed. Cutoff time was ${dinnerCutoff.format('DD MMM YYYY, hh:mm A')}`
      });
    }

    // Handle lunch selection
    if (lunch) {
      const existingLunch = await MealOrder.findOne({
        user: req.user._id,
        deliveryDate: deliveryMoment.toDate(),
        mealType: 'lunch'
      });

      // Allow changing default meals - user can override default selection
      if (existingLunch) {
        existingLunch.selectedMeal = lunch;
        existingLunch.status = 'confirmed';
        existingLunch.subscription = subscription._id;
        // Remove isDefault flag when user manually selects a meal
        if (existingLunch.selectedMeal) {
          existingLunch.selectedMeal.isDefault = false;
        }
        await existingLunch.save();
        console.log('✅ Updated existing lunch order:', existingLunch._id);
      } else {
        const newLunch = await MealOrder.create({
          user: req.user._id,
          subscription: subscription._id,
          orderDate: new Date(),
          deliveryDate: deliveryMoment.toDate(),
          mealType: 'lunch',
          selectedMeal: lunch,
          cutoffTime: lunchCutoff.toDate(),
          isAfterCutoff: false,
          status: 'confirmed'
        });
        console.log('✅ Created new lunch order:', newLunch._id);
        console.log('   Saved with deliveryDate:', newLunch.deliveryDate);
        console.log('   Linked to subscription:', subscription._id);
      }
    }

    // Handle dinner selection
    if (dinner) {
      const existingDinner = await MealOrder.findOne({
        user: req.user._id,
        deliveryDate: deliveryMoment.toDate(),
        mealType: 'dinner'
      });

      // Allow changing default meals - user can override default selection
      if (existingDinner) {
        existingDinner.selectedMeal = dinner;
        existingDinner.status = 'confirmed';
        existingDinner.subscription = subscription._id;
        // Remove isDefault flag when user manually selects a meal
        if (existingDinner.selectedMeal) {
          existingDinner.selectedMeal.isDefault = false;
        }
        await existingDinner.save();
        console.log('✅ Updated existing dinner order:', existingDinner._id);
      } else {
        const newDinner = await MealOrder.create({
          user: req.user._id,
          subscription: subscription._id,
          orderDate: new Date(),
          deliveryDate: deliveryMoment.toDate(),
          mealType: 'dinner',
          selectedMeal: dinner,
          cutoffTime: dinnerCutoff.toDate(),
          isAfterCutoff: false,
          status: 'confirmed'
        });
        console.log('✅ Created new dinner order:', newDinner._id);
        console.log('   Saved with deliveryDate:', newDinner.deliveryDate);
        console.log('   Linked to subscription:', subscription._id);
      }
    }

    // Create notification for owner
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const mealNames = [];
    if (lunch) mealNames.push(`Lunch: ${lunch.name}`);
    if (dinner) mealNames.push(`Dinner: ${dinner.name}`);
    
    await createNotification(
      'MEAL_ORDERED',
      `${user?.name || 'Customer'} ordered meals for ${deliveryMoment.format('DD MMM')} - ${mealNames.join(', ')}`,
      null,
      null,
      {
        customerName: user?.name,
        customerId: user?.userId,
        deliveryDate: deliveryMoment.format('YYYY-MM-DD'),
        meals: mealNames
      }
    );

    // Create AppNotification for owner
    try {
      const mealDesc = [];
      if (lunch) mealDesc.push(`L: ${lunch.name}`);
      if (dinner) mealDesc.push(`D: ${dinner.name}`);
      
      await AppNotification.createNotification({
        type: 'meal_selected',
        title: 'New Meal Order',
        message: `${user?.name} selected meals for ${deliveryMoment.format('MMM DD')} - ${mealDesc.join(', ')}`,
        relatedUser: req.user._id,
        relatedModel: 'Meal',
        relatedId: mealOrder._id,
        priority: 'medium',
        metadata: {
          deliveryDate: deliveryMoment.format('YYYY-MM-DD'),
          hasLunch: !!lunch,
          hasDinner: !!dinner,
          lunchName: lunch?.name,
          dinnerName: dinner?.name
        }
      });

      // Emit notification event
      socketService.emitNotification({
        type: 'meal_selected',
        title: 'New Meal Order',
        message: `${user?.name} ordered for ${deliveryMoment.format('MMM DD')}`,
        priority: 'medium'
      });
    } catch (notifError) {
      console.error('Failed to create meal notification:', notifError);
    }

    // Emit real-time meal selection event to owner
    socketService.emitMealSelected({
      user: req.user._id,
      deliveryDate: deliveryMoment.toDate(),
      lunch: lunch,
      dinner: dinner,
      customerName: user?.name,
      customerId: user?.userId
    });

    console.log(`✅ Meal saved for user ${req.user._id} on ${deliveryMoment.format('YYYY-MM-DD')}:`);
    console.log(`   Lunch: ${lunch?.name || 'Not selected'} (saved to DB)`);
    console.log(`   Dinner: ${dinner?.name || 'Not selected'} (saved to DB)`);

    // Verify meals were saved by querying DB
    const verifyMeals = await MealOrder.find({
      user: req.user._id,
      deliveryDate: { $gte: deliveryMoment.startOf('day').toDate(), $lt: deliveryMoment.clone().add(1, 'day').startOf('day').toDate() }
    });
    console.log(`   DB Verification: Found ${verifyMeals.length} meal orders in DB for this date`);
    verifyMeals.forEach(m => {
      console.log(`   - ${m.mealType}: ${m.selectedMeal?.name}, status: ${m.status}, subscription: ${m.subscription}`);
    });

    res.status(200).json({
      success: true,
      message: 'Meal selection saved successfully'
    });
  } catch (error) {
    console.error('❌ Select meal error:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error selecting meal',
      errorDetails: error.name
    });
  }
};

// @desc    Get meal selection for specific date
// @route   GET /api/meals/my-selection
// @access  Private (Customer)
exports.getMyMealSelection = async (req, res) => {
  try {
    const { deliveryDate } = req.query;

    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide delivery date'
      });
    }

    const deliveryMoment = moment(deliveryDate).startOf('day');
    
    console.log('🔍 Fetching meals:');
    console.log('   Input deliveryDate:', deliveryDate);
    console.log('   Parsed moment:', deliveryMoment.toISOString());
    console.log('   Query Date object:', deliveryMoment.toDate());
    
    // Also check all meal orders for this user (for debugging)
    const allUserMeals = await MealOrder.find({ user: req.user._id }).sort({ deliveryDate: -1 }).limit(10);
    console.log(`   Total meal orders for user: ${allUserMeals.length} (showing last 10)`);
    allUserMeals.forEach((order, i) => {
      console.log(`   [ALL ${i}] ${order.mealType} on ${order.deliveryDate} - ${order.selectedMeal?.name}`);
    });
    
    // Find meal orders for this date
    // Use date range to handle potential timezone issues
    const startOfDay = deliveryMoment.clone().startOf('day').toDate();
    const endOfDay = deliveryMoment.clone().endOf('day').toDate();
    
    const mealOrders = await MealOrder.find({
      user: req.user._id,
      deliveryDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    console.log(`   Found ${mealOrders.length} meal orders for ${deliveryDate}`);
    mealOrders.forEach((order, i) => {
      console.log(`   [${i}] Type: ${order.mealType}, Meal: ${order.selectedMeal?.name}, Date: ${order.deliveryDate}`);
    });

    // Calculate cutoff times
    const lunchCutoff = deliveryMoment.clone().subtract(1, 'day').hour(23).minute(0).second(0);
    const dinnerCutoff = deliveryMoment.clone().hour(11).minute(0).second(0);
    const now = moment();

    // Get selected meals and check if default
    let lunchMeal = null;
    let dinnerMeal = null;
    let lunchIsDefault = false;
    let dinnerIsDefault = false;
    
    mealOrders.forEach(order => {
      if (order.mealType === 'lunch') {
        lunchMeal = order.selectedMeal;
        lunchIsDefault = order.selectedMeal?.isDefault || false;
      } else if (order.mealType === 'dinner') {
        dinnerMeal = order.selectedMeal;
        dinnerIsDefault = order.selectedMeal?.isDefault || false;
      }
    });

    // Check if locked (past cutoff time only - default meals are editable)
    const lunchLocked = now.isAfter(lunchCutoff);
    const dinnerLocked = now.isAfter(dinnerCutoff);

    // Get default meals
    const defaultMeals = await DefaultMeal.find({ isActive: true });

    // Get user's dietary preference
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    const dietaryPreference = subscription?.mealPreferences?.dietaryPreference || 'both';
    const subscriptionPlanType = subscription?.planType || 'classic';

    console.log(`📊 Fetching meal for user ${req.user._id} on ${deliveryMoment.format('YYYY-MM-DD')}:`);
    console.log(`   Lunch: ${lunchMeal?.name || 'Not selected'}`);
    console.log(`   Dinner: ${dinnerMeal?.name || 'Not selected'}`);
    console.log(`   Subscription Plan: ${subscriptionPlanType}`);

    res.status(200).json({
      success: true,
      data: {
        lunch: lunchMeal,
        dinner: dinnerMeal,
        lunchLocked: lunchLocked,
        dinnerLocked: dinnerLocked,
        lunchIsDefault: lunchIsDefault,
        dinnerIsDefault: dinnerIsDefault,
        lunchCutoff: lunchCutoff.toISOString(),
        dinnerCutoff: dinnerCutoff.toISOString(),
        defaultMeals: defaultMeals,
        dietaryPreference: dietaryPreference,
        subscriptionPlanType: subscriptionPlanType
      }
    });
  } catch (error) {
    console.error('Get meal selection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meal selection',
      error: error.message
    });
  }
};

// @desc    Get default meals
// @route   GET /api/meals/defaults
// @access  Private
exports.getDefaultMeals = async (req, res) => {
  try {
    const defaultMeals = await DefaultMeal.find({ isActive: true });

    res.status(200).json({
      success: true,
      data: defaultMeals
    });
  } catch (error) {
    console.error('Get default meals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default meals',
      error: error.message
    });
  }
};

// @desc    Set/update default meal
// @route   POST /api/meals/defaults
// @access  Private (Owner only)
exports.setDefaultMeal = async (req, res) => {
  try {
    const { mealType, name, items } = req.body;

    if (!mealType || !name || !items) {
      return res.status(400).json({
        success: false,
        message: 'Please provide meal type, name, and items'
      });
    }

    let defaultMeal = await DefaultMeal.findOne({ mealType });

    if (defaultMeal) {
      // Update existing
      defaultMeal.name = name;
      defaultMeal.items = items;
      defaultMeal.updatedBy = req.user._id;
      await defaultMeal.save();
    } else {
      // Create new
      defaultMeal = await DefaultMeal.create({
        mealType,
        name,
        items,
        updatedBy: req.user._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Default meal set successfully',
      data: defaultMeal
    });
  } catch (error) {
    console.error('Set default meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default meal',
      error: error.message
    });
  }
};

// @desc    Get all meal orders (admin)
// @route   GET /api/meals/orders
// @access  Private (Owner only)
exports.getAllMealOrders = async (req, res) => {
  try {
    const { date, deliveryDate } = req.query;
    
    // Default to today if no date provided
    const targetDate = date || deliveryDate;
    const targetMoment = targetDate 
      ? moment(targetDate).startOf('day')
      : moment().startOf('day');
    
    const queryDateStart = targetMoment.toDate();
    const queryDateEnd = targetMoment.clone().add(1, 'day').toDate();
    
    // Get active users only
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');

    const filter = {
      deliveryDate: { $gte: queryDateStart, $lt: queryDateEnd },
      user: { $in: activeUserIds }
    };

    const mealOrders = await MealOrder.find(filter)
      .populate('user', 'name mobile userId')
      .sort({ mealType: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mealOrders.length,
      data: mealOrders
    });
  } catch (error) {
    console.error('Get all meal orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meal orders',
      error: error.message
    });
  }
};

// @desc    Get weekly menu based on user's subscription plan
// @route   GET /api/meals/weekly-menu
// @access  Private
exports.getWeeklyMenu = async (req, res) => {
  try {
    // Get user's active subscription to determine plan category
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    let allowedCategories = ['classic']; // Default to classic
    let dietaryPreference = 'both'; // Default to both

    if (subscription) {
      if (subscription.planCategory === 'trial') {
        allowedCategories = ['classic']; // Trial users get classic menu
      } else if (subscription.planCategory === 'premium') {
        // Premium users can see their specific menu
        allowedCategories = [subscription.planType]; // 'premium-veg' or 'premium-non-veg'
      } else if (subscription.planCategory === 'classic') {
        allowedCategories = ['classic'];
      }
      
      // Get dietary preference
      dietaryPreference = subscription.mealPreferences?.dietaryPreference || 'both';
    }

    // Fetch menu for allowed categories
    const weeklyMenu = await WeeklyMenu.find({
      planCategory: { $in: allowedCategories },
      isActive: true
    }).sort({ dayOfWeek: 1, mealType: 1 });

    // Filter menu items based on dietary preference
    const filterMenuItems = (items) => {
      if (!items || items.length === 0) return items;
      
      const nonVegKeywords = ['CHICKEN', 'EGG', 'MUTTON', 'FISH', 'KEEMA', 'TANDOORI', 'BIRYANI', 'KORMA', 'BUTTER CHICKEN', 'HYDRABADI', 'MURADABADI'];
      
      if (dietaryPreference === 'veg') {
        // Remove items with non-veg keywords
        return items.filter(item => {
          const upperItem = item.toUpperCase();
          return !nonVegKeywords.some(keyword => upperItem.includes(keyword));
        });
      } else if (dietaryPreference === 'non-veg') {
        // Keep only items with non-veg keywords
        return items.filter(item => {
          const upperItem = item.toUpperCase();
          return nonVegKeywords.some(keyword => upperItem.includes(keyword));
        });
      }
      // 'both' - return all items
      return items;
    };

    // Organize by day of week
    const menuByDay = {
      sunday: { lunch: null, dinner: null },
      monday: { lunch: null, dinner: null },
      tuesday: { lunch: null, dinner: null },
      wednesday: { lunch: null, dinner: null },
      thursday: { lunch: null, dinner: null },
      friday: { lunch: null, dinner: null },
      saturday: { lunch: null, dinner: null }
    };

    weeklyMenu.forEach(menu => {
      if (menuByDay[menu.dayOfWeek]) {
        const filteredItems = filterMenuItems(menu.items);
        
        // Only include meal if there are items after filtering
        if (filteredItems && filteredItems.length > 0) {
          menuByDay[menu.dayOfWeek][menu.mealType] = {
            items: filteredItems,
            description: menu.description,
            planCategory: menu.planCategory
          };
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        menu: menuByDay,
        userPlan: subscription ? {
          planType: subscription.planType,
          planCategory: subscription.planCategory,
          dietaryPreference: dietaryPreference
        } : null,
        allowedCategories,
        dietaryPreference
      }
    });
  } catch (error) {
    console.error('Get weekly menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly menu',
      error: error.message
    });
  }
};

// @desc    Get aggregated meal orders for owner (Kitchen view)
// @route   GET /api/meals/owner/aggregated
// @access  Private (Owner only)
exports.getAggregatedMealOrders = async (req, res) => {
  try {
    const { date } = req.query;
    
    // CRITICAL: Always use tomorrow's date for meal orders
    // Users select meals for TOMORROW, so we MUST query TOMORROW
    // Ignore date parameter to avoid mismatches - always query tomorrow
    const targetDate = moment().add(1, 'day').startOf('day');
    const deliveryDateStart = targetDate.toDate();
    const deliveryDateEnd = targetDate.clone().add(1, 'day').toDate();

    console.log('🍽️ Kitchen Aggregated Data:');
    console.log('   ⚠️  FIXED: Always querying TOMORROW (users order for next day)');
    console.log('   Query param date (IGNORED):', date || 'not provided');
    console.log('   Using TOMORROW date:', targetDate.format('YYYY-MM-DD'));
    console.log('   Date range START:', deliveryDateStart);
    console.log('   Date range END:', deliveryDateEnd);

    // Get active users only
    const activeUserIds = await User.find({ 
      role: 'customer', 
      isActive: true,
      deletedAt: { $exists: false }
    }).distinct('_id');

    // Get all meal orders for the specified date (using date range)
    const mealOrders = await MealOrder.find({
      deliveryDate: { $gte: deliveryDateStart, $lt: deliveryDateEnd },
      user: { $in: activeUserIds }
    })
    .populate('user', 'name mobile userId address')
    .sort({ mealType: 1, createdAt: 1 });

    console.log('   Active users count:', activeUserIds.length);
    console.log('   Found meal orders:', mealOrders.length);
    
    // Debug: Count default vs user-selected meals
    const defaultMealsCount = mealOrders.filter(o => o.selectedMeal?.isDefault === true).length;
    const userSelectedCount = mealOrders.filter(o => o.selectedMeal?.isDefault === false).length;
    const noSelectionCount = mealOrders.filter(o => !o.selectedMeal?.name || o.selectedMeal?.name === 'Not Selected').length;
    
    console.log('   📊 Meal Breakdown:');
    console.log(`      - Default meals: ${defaultMealsCount}`);
    console.log(`      - User-selected meals: ${userSelectedCount}`);
    console.log(`      - No selection: ${noSelectionCount}`);
    
    // Debug: Show first few meal orders
    if (mealOrders.length > 0) {
      console.log('   ✅ Sample meal orders:');
      mealOrders.slice(0, 5).forEach((order, i) => {
        const isDefaultFlag = order.selectedMeal?.isDefault ? '🔵 DEFAULT' : '🟢 USER-SELECTED';
        console.log(`   [${i}] ${isDefaultFlag} | ${order.user?.name} - ${order.mealType}: ${order.selectedMeal?.name}`);
        console.log(`       deliveryDate: ${moment(order.deliveryDate).format('YYYY-MM-DD HH:mm:ss')}`);
      });
    } else {
      console.log('   ⚠️ NO MEAL ORDERS FOUND! Debugging...');
      // Check if ANY meal orders exist
      const anyMeals = await MealOrder.countDocuments({});
      console.log(`   Total meal orders in DB: ${anyMeals}`);
      
      const todayAnyUser = await MealOrder.countDocuments({
        deliveryDate: { $gte: deliveryDateStart, $lt: deliveryDateEnd }
      });
      console.log(`   Meal orders for exact date range (any user): ${todayAnyUser}`);
      
      // Check sample dates in DB
      const sampleDates = await MealOrder.find({}).limit(5).select('deliveryDate mealType').sort({ deliveryDate: -1 });
      console.log('   Sample deliveryDates in DB:');
      sampleDates.forEach((order, i) => {
        console.log(`   [${i}] ${moment(order.deliveryDate).format('YYYY-MM-DD HH:mm:ss')} (${order.mealType})`);
      });
    }

    // Aggregate meal counts
    const lunchCounts = {};
    const dinnerCounts = {};
    const customerDetails = [];
    const ingredientCounts = {};
    let totalLunchOrders = 0;
    let totalDinnerOrders = 0;

    mealOrders.forEach(order => {
      const mealName = order.selectedMeal?.name || 'Not Selected';
      const mealType = order.mealType;
      const isDefaultMeal = order.selectedMeal?.isDefault || false;
      
      // Add to customer details
      customerDetails.push({
        customerId: order.user.userId,
        customerName: order.user.name,
        mobile: order.user.mobile,
        address: order.user.address,
        mealType: mealType,
        meal: mealName,
        isDefault: isDefaultMeal,
        orderId: order._id
      });

      // Aggregate counts (include both default and user-selected)
      if (mealType === 'lunch') {
        lunchCounts[mealName] = (lunchCounts[mealName] || 0) + 1;
        totalLunchOrders++;
      } else if (mealType === 'dinner') {
        dinnerCounts[mealName] = (dinnerCounts[mealName] || 0) + 1;
        totalDinnerOrders++;
      }

      // Aggregate ingredients by parsing meal name string
      // selectedMeal.name is a comma-separated string like "BUTTER CHICKEN, SATTU PARATHA, SWEETS"
      if (mealName && mealName !== 'Not Selected') {
        const items = mealName.split(',');
        items.forEach(item => {
          const ingredient = item.trim();
          if (ingredient) {
            ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
          }
        });
      }
    });

    // Convert to arrays for easier display
    const lunchSummary = Object.entries(lunchCounts).map(([meal, count]) => ({
      meal,
      count
    })).sort((a, b) => b.count - a.count);

    const dinnerSummary = Object.entries(dinnerCounts).map(([meal, count]) => ({
      meal,
      count
    })).sort((a, b) => b.count - a.count);

    // Create Order Summary
    const orderSummary = {
      Lunch: totalLunchOrders,
      Dinner: totalDinnerOrders,
      Total: totalLunchOrders + totalDinnerOrders
    };

    // Create Ingredient Summary (sorted by count descending)
    const ingredientSummary = Object.entries(ingredientCounts)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [ingredient, count]) => {
        obj[ingredient] = count;
        return obj;
      }, {});

    console.log('   📊 Order Summary:', orderSummary);
    console.log('   🥘 Ingredient Summary:', ingredientSummary);

    res.status(200).json({
      success: true,
      data: {
        date: deliveryDateStart,
        totalOrders: mealOrders.length,
        lunchSummary,
        dinnerSummary,
        totalLunch: totalLunchOrders,
        totalDinner: totalDinnerOrders,
        customerDetails,
        orderSummary,
        ingredientSummary
      }
    });
  } catch (error) {
    console.error('Get aggregated meal orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching aggregated meal orders',
      error: error.message
    });
  }
};
