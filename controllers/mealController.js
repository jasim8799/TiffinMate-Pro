const MealOrder = require('../models/MealOrder');
const DefaultMeal = require('../models/DefaultMeal');
const Delivery = require('../models/Delivery');
const WeeklyMenu = require('../models/WeeklyMenu');
const Subscription = require('../models/Subscription');
const moment = require('moment');

// @desc    Select meal for specific date
// @route   POST /api/meals/select
// @access  Private (Customer)
exports.selectMeal = async (req, res) => {
  try {
    const { deliveryDate, lunch, dinner } = req.body;

    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide delivery date'
      });
    }

    // Get user's subscription to check dietary preference
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    const dietaryPreference = subscription?.mealPreferences?.dietaryPreference || 'both';

    // Helper function to check if meal contains non-veg items
    const nonVegKeywords = ['CHICKEN', 'EGG', 'MUTTON', 'FISH', 'KEEMA', 'TANDOORI', 'BIRYANI', 'KORMA', 'BUTTER CHICKEN', 'HYDRABADI', 'MURADABADI'];
    const isNonVeg = (mealName) => {
      if (!mealName) return false;
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
    const lunchCutoff = deliveryMoment.clone().subtract(1, 'day').hour(23).minute(0).second(0);
    const dinnerCutoff = deliveryMoment.clone().hour(11).minute(0).second(0);
    const now = moment();

    // Check cutoff times
    const canSelectLunch = now.isBefore(lunchCutoff);
    const canSelectDinner = now.isBefore(dinnerCutoff);

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

      // Check if it's a default order (cannot be changed)
      if (existingLunch && existingLunch.selectedMeal?.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Lunch has been auto-assigned with default menu. Cannot be changed.'
        });
      }

      if (existingLunch) {
        existingLunch.selectedMeal = lunch;
        await existingLunch.save();
      } else {
        await MealOrder.create({
          user: req.user._id,
          orderDate: new Date(),
          deliveryDate: deliveryMoment.toDate(),
          mealType: 'lunch',
          selectedMeal: lunch,
          cutoffTime: lunchCutoff.toDate(),
          isAfterCutoff: false,
          status: 'confirmed'
        });
      }
    }

    // Handle dinner selection
    if (dinner) {
      const existingDinner = await MealOrder.findOne({
        user: req.user._id,
        deliveryDate: deliveryMoment.toDate(),
        mealType: 'dinner'
      });

      // Check if it's a default order (cannot be changed)
      if (existingDinner && existingDinner.selectedMeal?.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Dinner has been auto-assigned with default menu. Cannot be changed.'
        });
      }

      if (existingDinner) {
        existingDinner.selectedMeal = dinner;
        await existingDinner.save();
      } else {
        await MealOrder.create({
          user: req.user._id,
          orderDate: new Date(),
          deliveryDate: deliveryMoment.toDate(),
          mealType: 'dinner',
          selectedMeal: dinner,
          cutoffTime: dinnerCutoff.toDate(),
          isAfterCutoff: false,
          status: 'confirmed'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Meal selection saved successfully'
    });
  } catch (error) {
    console.error('Select meal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error selecting meal',
      error: error.message
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
    
    // Find meal orders for this date
    const mealOrders = await MealOrder.find({
      user: req.user._id,
      deliveryDate: deliveryMoment.toDate()
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

    // Check if locked (either past cutoff or default assigned)
    const lunchLocked = now.isAfter(lunchCutoff) || lunchIsDefault;
    const dinnerLocked = now.isAfter(dinnerCutoff) || dinnerIsDefault;

    // Get default meals
    const defaultMeals = await DefaultMeal.find({ isActive: true });

    // Get user's dietary preference
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    const dietaryPreference = subscription?.mealPreferences?.dietaryPreference || 'both';

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
        dietaryPreference: dietaryPreference
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
    const { deliveryDate } = req.query;
    const filter = {};

    if (deliveryDate) {
      filter.deliveryDate = new Date(deliveryDate);
    }

    const mealOrders = await MealOrder.find(filter)
      .populate('user', 'name mobile userId')
      .sort({ deliveryDate: -1, createdAt: -1 });

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
