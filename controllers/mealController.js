const MealOrder = require('../models/MealOrder');
const DefaultMeal = require('../models/DefaultMeal');
const Delivery = require('../models/Delivery');
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

    // Get selected meals
    let lunchMeal = null;
    let dinnerMeal = null;
    
    mealOrders.forEach(order => {
      if (order.mealType === 'lunch') {
        lunchMeal = order.selectedMeal;
      } else if (order.mealType === 'dinner') {
        dinnerMeal = order.selectedMeal;
      }
    });

    // Check if locked
    const lunchLocked = now.isAfter(lunchCutoff);
    const dinnerLocked = now.isAfter(dinnerCutoff);

    // Get default meals
    const defaultMeals = await DefaultMeal.find({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        lunch: lunchMeal,
        dinner: dinnerMeal,
        lunchLocked: lunchLocked,
        dinnerLocked: dinnerLocked,
        lunchCutoff: lunchCutoff.toISOString(),
        dinnerCutoff: dinnerCutoff.toISOString(),
        defaultMeals: defaultMeals
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
