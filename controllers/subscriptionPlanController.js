const SubscriptionPlan = require('../models/SubscriptionPlan');

// @desc    Get all active subscription plans
// @route   GET /api/subscription-plans
// @access  Public (used by Owner during customer creation)
exports.getSubscriptionPlans = async (req, res) => {
  try {
    console.log('📡 Fetching subscription plans...');
    
    const { durationType, mealType } = req.query;
    
    const filter = { isActive: true };
    
    if (durationType) {
      filter.durationType = durationType;
    }
    
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, durationDays: 1 });
    
    console.log(`✅ Found ${plans.length} active subscription plans`);
    
    // If mealType filter is provided, filter plans
    let filteredPlans = plans;
    if (mealType) {
      filteredPlans = plans.filter(plan => {
        if (mealType === 'lunch') return plan.mealTypes.lunch;
        if (mealType === 'dinner') return plan.mealTypes.dinner;
        if (mealType === 'both') return plan.mealTypes.lunch && plan.mealTypes.dinner;
        return true;
      });
      console.log(`🔍 Filtered to ${filteredPlans.length} plans for mealType: ${mealType}`);
    }
    
    // Return with 'plans' key (Flutter expects this)
    res.status(200).json({
      success: true,
      count: filteredPlans.length,
      plans: filteredPlans
    });
  } catch (error) {
    console.error('❌ Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans',
      error: error.message
    });
  }
};
