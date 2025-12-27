const MealOrder = require('../models/MealOrder');
const DefaultMeal = require('../models/DefaultMeal');
const Delivery = require('../models/Delivery');
const moment = require('moment');

// @desc    Select meal for specific date
// @route   POST /api/meals/select
// @access  Private (Customer)
exports.selectMeal = async (req, res) => {
  try {
    const { deliveryDate, mealType, selectedMeal } = req.body;

    if (!deliveryDate || !mealType || !selectedMeal) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Calculate cutoff time (8 hours before delivery)
    const cutoffHours = parseInt(process.env.MEAL_CUTOFF_HOURS) || 8;
    const deliveryMoment = moment(deliveryDate);
    const cutoffTime = deliveryMoment.clone().subtract(cutoffHours, 'hours');

    // Check if current time is before cutoff
    if (moment().isAfter(cutoffTime)) {
      return res.status(400).json({
        success: false,
        message: `Meal selection closed. Cutoff time was ${cutoffTime.format('DD MMM YYYY, hh:mm A')}`
      });
    }

    // Check if meal order already exists
    const existingOrder = await MealOrder.findOne({
      user: req.user._id,
      deliveryDate,
      mealType
    });

    if (existingOrder) {
      // Update existing order
      existingOrder.selectedMeal = selectedMeal;
      existingOrder.isAfterCutoff = false;
      await existingOrder.save();

      return res.status(200).json({
        success: true,
        message: 'Meal selection updated successfully',
        data: existingOrder
      });
    }

    // Create new meal order
    const mealOrder = await MealOrder.create({
      user: req.user._id,
      orderDate: new Date(),
      deliveryDate,
      mealType,
      selectedMeal,
      cutoffTime: cutoffTime.toDate(),
      isAfterCutoff: false,
      status: 'confirmed'
    });

    res.status(201).json({
      success: true,
      message: 'Meal selected successfully',
      data: mealOrder
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

    const mealOrders = await MealOrder.find({
      user: req.user._id,
      deliveryDate: new Date(deliveryDate)
    });

    // Get default meals
    const defaultMeals = await DefaultMeal.find({ isActive: true });

    // Calculate cutoff time
    const cutoffHours = parseInt(process.env.MEAL_CUTOFF_HOURS) || 8;
    const deliveryMoment = moment(deliveryDate);
    const cutoffTime = deliveryMoment.clone().subtract(cutoffHours, 'hours');
    const isAfterCutoff = moment().isAfter(cutoffTime);

    res.status(200).json({
      success: true,
      data: {
        mealOrders,
        defaultMeals,
        cutoffTime: cutoffTime.toDate(),
        isAfterCutoff,
        canSelect: !isAfterCutoff
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
