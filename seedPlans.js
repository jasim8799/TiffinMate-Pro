/**
 * Seed REAL Subscription Plans with Weekly Menus
 * 
 * Run: node seedPlans.js
 * 
 * This seeds the ACTUAL business plans with real pricing and menus
 */

const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('./models/SubscriptionPlan');

// Color codes
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.cyan}${COLORS.bold}═══ ${msg} ═══${COLORS.reset}\n`),
};

// ============================================
// REAL BUSINESS PLANS (YOUR ACTUAL MENU)
// ============================================
const defaultPlans = [
  // ============================================
  // 1. CLASSIC MENU (₹2999/month) - Mix Veg & Non-Veg
  // ============================================
  {
    name: 'classic-monthly-both',
    displayName: 'Classic Menu',
    description: '30 days Mix Veg & Non-Veg with weekly rotating menu - Best Value!',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 100,
    totalPrice: 2999,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'MIX-VEG, DAL, RICE & SALAD',
        dinner: 'CHICKEN BIRYANI, SALAD & RAITA'
      },
      monday: {
        lunch: 'AALOO SOYABEEN, RICE & SALAD',
        dinner: 'SEASONAL VEG, ROTI & SALAD'
      },
      tuesday: {
        lunch: 'RAJMA, RICE & RAITA',
        dinner: 'KADAI PANEER, ROTI & HALWA'
      },
      wednesday: {
        lunch: 'CHICKEN CURRY, RICE & SALAD',
        dinner: 'DAL FRY, ROTI & SALAD'
      },
      thursday: {
        lunch: 'VEGETABLE, RICE & SALAD',
        dinner: 'MIX-VEG, ROTI & SALAD'
      },
      friday: {
        lunch: 'CHHOLE MASALA, RICE & SALAD',
        dinner: 'EGG CURRY, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KHICHDI, AALOO CHOKHA / PICKLE',
        dinner: 'CHHOLE MASALA, PURI & SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      'Mix Veg & Non-Veg',
      'Chicken 3 days/week',
      'Weekly rotating menu',
      'Sunday: Chicken Biryani',
      'Wednesday: Chicken Curry',
      'Saturday: Chhole Puri & Sweets',
      'Home delivery'
    ],
    sortOrder: 1
  },
  {
    name: 'classic-weekly-both',
    displayName: 'Classic Menu (Weekly)',
    description: '7 days Mix Veg & Non-Veg meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 140,
    totalPrice: 980,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'MIX-VEG, DAL, RICE & SALAD',
        dinner: 'CHICKEN BIRYANI, SALAD & RAITA'
      },
      monday: {
        lunch: 'AALOO SOYABEEN, RICE & SALAD',
        dinner: 'SEASONAL VEG, ROTI & SALAD'
      },
      tuesday: {
        lunch: 'RAJMA, RICE & RAITA',
        dinner: 'KADAI PANEER, ROTI & HALWA'
      },
      wednesday: {
        lunch: 'CHICKEN CURRY, RICE & SALAD',
        dinner: 'DAL FRY, ROTI & SALAD'
      },
      thursday: {
        lunch: 'VEGETABLE, RICE & SALAD',
        dinner: 'MIX-VEG, ROTI & SALAD'
      },
      friday: {
        lunch: 'CHHOLE MASALA, RICE & SALAD',
        dinner: 'EGG CURRY, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KHICHDI, AALOO CHOKHA / PICKLE',
        dinner: 'CHHOLE MASALA, PURI & SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      'Mix Veg & Non-Veg',
      'Chicken 3 days',
      'Weekly variety',
      'Home delivery'
    ],
    sortOrder: 2
  },
  {
    name: 'classic-daily-both',
    displayName: 'Classic Menu (Daily)',
    description: 'Single day Mix Veg & Non-Veg meals',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 180,
    totalPrice: 180,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'MIX-VEG, DAL, RICE & SALAD',
        dinner: 'CHICKEN BIRYANI, SALAD & RAITA'
      },
      monday: {
        lunch: 'AALOO SOYABEEN, RICE & SALAD',
        dinner: 'SEASONAL VEG, ROTI & SALAD'
      },
      tuesday: {
        lunch: 'RAJMA, RICE & RAITA',
        dinner: 'KADAI PANEER, ROTI & HALWA'
      },
      wednesday: {
        lunch: 'CHICKEN CURRY, RICE & SALAD',
        dinner: 'DAL FRY, ROTI & SALAD'
      },
      thursday: {
        lunch: 'VEGETABLE, RICE & SALAD',
        dinner: 'MIX-VEG, ROTI & SALAD'
      },
      friday: {
        lunch: 'CHHOLE MASALA, RICE & SALAD',
        dinner: 'EGG CURRY, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KHICHDI, AALOO CHOKHA / PICKLE',
        dinner: 'CHHOLE MASALA, PURI & SWEETS'
      }
    },
    isActive: true,
    features: ['Both Lunch & Dinner', 'Mix Veg & Non-Veg', 'Home delivery'],
    sortOrder: 3
  },

  // ============================================
  // 2. PREMIUM VEG (₹3999/month) - Pure Vegetarian
  // ============================================
  {
    name: 'premium-veg-monthly-both',
    displayName: 'Premium Menu (VEG)',
    description: '30 days Pure Vegetarian premium meals',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 133,
    totalPrice: 3999,
    planCategory: 'premium',
    type: 'VEG',
    menuCategory: 'premium-veg',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'MIX-VEG, DAL, JEERA RICE, ROTI & SALAD',
        dinner: 'VEG BIRYANI, SALAD & RAITA'
      },
      monday: {
        lunch: 'AALOO SOYABEEN, DAL, FRIED RICE, ROTI & KHEER',
        dinner: 'SEASONAL VEG, DAL, RICE, ROTI & SALAD'
      },
      tuesday: {
        lunch: 'RAJMA, AALOO BHUJIYA, JEERA RICE, ROTI & RAITA',
        dinner: 'KADAI PANEER, LACHHA PARATHA & SALAD'
      },
      wednesday: {
        lunch: 'MUTAR MUSHROOM, DAL, SOYA RICE, ROTI & SALAD',
        dinner: 'DAL FRY, ROTI & KHEER'
      },
      thursday: {
        lunch: 'VEGETABLE, DAL, RICE, ROTI & SALAD',
        dinner: 'MIX-VEG, DAL, FRIED RICE, ROTI & SALAD'
      },
      friday: {
        lunch: 'PANEER MASALA, PLAIN PARATHA & HALWA',
        dinner: 'BESAN GATTA, JEERA RICE, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KHICHDI, AALOO CHOKHA / PICKLE',
        dinner: 'CHHOLE MASALA, PURI & SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      '100% Pure Vegetarian',
      'Premium ingredients',
      'Paneer dishes 3 days/week',
      'Special sweets & desserts',
      'More items per meal',
      'Dal, Rice, Roti combo',
      'Home delivery'
    ],
    sortOrder: 4
  },
  {
    name: 'premium-veg-weekly-both',
    displayName: 'Premium Veg Menu (Weekly)',
    description: '7 days Pure Vegetarian premium meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 180,
    totalPrice: 1260,
    planCategory: 'premium',
    type: 'VEG',
    menuCategory: 'premium-veg',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'MIX-VEG, DAL, JEERA RICE, ROTI & SALAD',
        dinner: 'VEG BIRYANI, SALAD & RAITA'
      },
      monday: {
        lunch: 'AALOO SOYABEEN, DAL, FRIED RICE, ROTI & KHEER',
        dinner: 'SEASONAL VEG, DAL, RICE, ROTI & SALAD'
      },
      tuesday: {
        lunch: 'RAJMA, AALOO BHUJIYA, JEERA RICE, ROTI & RAITA',
        dinner: 'KADAI PANEER, LACHHA PARATHA & SALAD'
      },
      wednesday: {
        lunch: 'MUTAR MUSHROOM, DAL, SOYA RICE, ROTI & SALAD',
        dinner: 'DAL FRY, ROTI & KHEER'
      },
      thursday: {
        lunch: 'VEGETABLE, DAL, RICE, ROTI & SALAD',
        dinner: 'MIX-VEG, DAL, FRIED RICE, ROTI & SALAD'
      },
      friday: {
        lunch: 'PANEER MASALA, PLAIN PARATHA & HALWA',
        dinner: 'BESAN GATTA, JEERA RICE, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KHICHDI, AALOO CHOKHA / PICKLE',
        dinner: 'CHHOLE MASALA, PURI & SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      '100% Pure Veg',
      'Premium quality',
      'Paneer dishes',
      'Home delivery'
    ],
    sortOrder: 5
  },

  // ============================================
  // 3. PREMIUM NON-VEG (₹3999/month)
  // ============================================
  {
    name: 'premium-non-veg-monthly-both',
    displayName: 'Premium Menu (NON-VEG)',
    description: '30 days Premium non-vegetarian delights',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 133,
    totalPrice: 3999,
    planCategory: 'premium',
    type: 'NON_VEG',
    menuCategory: 'premium-non-veg',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'CHICKEN CURRY (BIHARI STYLE), JEERA RICE, ROTI & SALAD',
        dinner: 'CHICKEN BIRYANI, RAITA & SALAD'
      },
      monday: {
        lunch: 'EGG CURRY, FRIED RICE, ROTI & KHEER',
        dinner: 'TANDOORI CHICKEN, PARATHA (PLAIN) & HALWA'
      },
      tuesday: {
        lunch: 'N/A',
        dinner: 'N/A'
      },
      wednesday: {
        lunch: 'CHICKEN MASALA, DAL, SOYA RICE, ROTI & SALAD',
        dinner: 'MURADABADI BIRYANI, CHUTNEY & KHEER'
      },
      thursday: {
        lunch: 'EGG AALOO DUM, RICE, ROTI & SALAD',
        dinner: 'CHICKEN KORMA, LACHHA PARATHA & SALAD'
      },
      friday: {
        lunch: 'HYDRABADI BIRYANI, RAITA & HALWA',
        dinner: 'EGG BHURJI, DAL, JEERA RICE, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KEEMA, DAL, RICE, ROTI & SALAD',
        dinner: 'BUTTER CHICKEN, SATTU PARATHA, SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      'Premium Non-Veg',
      'Chicken/Egg 5 days/week',
      'Biryani on weekends',
      'Special preparations',
      'More items per meal',
      'Dal, Rice, Roti combo',
      'Home delivery'
    ],
    sortOrder: 6
  },
  {
    name: 'premium-non-veg-weekly-both',
    displayName: 'Premium Non-Veg Menu (Weekly)',
    description: '7 days Premium non-vegetarian meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 180,
    totalPrice: 1260,
    planCategory: 'premium',
    type: 'NON_VEG',
    menuCategory: 'premium-non-veg',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: {
        lunch: 'CHICKEN CURRY (BIHARI STYLE), JEERA RICE, ROTI & SALAD',
        dinner: 'CHICKEN BIRYANI, RAITA & SALAD'
      },
      monday: {
        lunch: 'EGG CURRY, FRIED RICE, ROTI & KHEER',
        dinner: 'TANDOORI CHICKEN, PARATHA (PLAIN) & HALWA'
      },
      tuesday: {
        lunch: 'N/A',
        dinner: 'N/A'
      },
      wednesday: {
        lunch: 'CHICKEN MASALA, DAL, SOYA RICE, ROTI & SALAD',
        dinner: 'MURADABADI BIRYANI, CHUTNEY & KHEER'
      },
      thursday: {
        lunch: 'EGG AALOO DUM, RICE, ROTI & SALAD',
        dinner: 'CHICKEN KORMA, LACHHA PARATHA & SALAD'
      },
      friday: {
        lunch: 'HYDRABADI BIRYANI, RAITA & HALWA',
        dinner: 'EGG BHURJI, DAL, JEERA RICE, ROTI & SALAD'
      },
      saturday: {
        lunch: 'KEEMA, DAL, RICE, ROTI & SALAD',
        dinner: 'BUTTER CHICKEN, SATTU PARATHA, SWEETS'
      }
    },
    isActive: true,
    features: [
      'Both Lunch & Dinner',
      'Premium Non-Veg',
      'Chicken/Egg items',
      'Special items',
      'Home delivery'
    ],
    sortOrder: 7
  },

  // ============================================
  // LUNCH ONLY PLANS
  // ============================================
  {
    name: 'classic-monthly-lunch',
    displayName: 'Classic Lunch Only (Monthly)',
    description: '30 days lunch meals with Mix Veg & Non-Veg',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 80,
    totalPrice: 2400,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    weeklyMenu: {
      sunday: { lunch: 'MIX-VEG, DAL, RICE & SALAD', dinner: '' },
      monday: { lunch: 'AALOO SOYABEEN, RICE & SALAD', dinner: '' },
      tuesday: { lunch: 'RAJMA, RICE & RAITA', dinner: '' },
      wednesday: { lunch: 'CHICKEN CURRY, RICE & SALAD', dinner: '' },
      thursday: { lunch: 'VEGETABLE, RICE & SALAD', dinner: '' },
      friday: { lunch: 'CHHOLE MASALA, RICE & SALAD', dinner: '' },
      saturday: { lunch: 'KHICHDI, AALOO CHOKHA / PICKLE', dinner: '' }
    },
    isActive: true,
    features: ['Lunch only', 'Mix Veg & Non-Veg', 'Best value', 'Home delivery'],
    sortOrder: 8
  },
  {
    name: 'classic-weekly-lunch',
    displayName: 'Classic Lunch Only (Weekly)',
    description: '7 days lunch meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 90,
    totalPrice: 630,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    weeklyMenu: {
      sunday: { lunch: 'MIX-VEG, DAL, RICE & SALAD', dinner: '' },
      monday: { lunch: 'AALOO SOYABEEN, RICE & SALAD', dinner: '' },
      tuesday: { lunch: 'RAJMA, RICE & RAITA', dinner: '' },
      wednesday: { lunch: 'CHICKEN CURRY, RICE & SALAD', dinner: '' },
      thursday: { lunch: 'VEGETABLE, RICE & SALAD', dinner: '' },
      friday: { lunch: 'CHHOLE MASALA, RICE & SALAD', dinner: '' },
      saturday: { lunch: 'KHICHDI, AALOO CHOKHA / PICKLE', dinner: '' }
    },
    isActive: true,
    features: ['Lunch only', 'Mix Veg & Non-Veg', 'Home delivery'],
    sortOrder: 9
  },

  // ============================================
  // TRIAL PLAN (FREE)
  // ============================================
  {
    name: 'trial-1day-free',
    displayName: 'Free Trial (1 Day)',
    description: 'Try our Classic menu free for 1 day',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 0,
    totalPrice: 0,
    planCategory: 'trial',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    weeklyMenu: {
      sunday: { lunch: 'MIX-VEG, DAL, RICE & SALAD', dinner: 'CHICKEN BIRYANI, SALAD & RAITA' },
      monday: { lunch: 'AALOO SOYABEEN, RICE & SALAD', dinner: 'SEASONAL VEG, ROTI & SALAD' },
      tuesday: { lunch: 'RAJMA, RICE & RAITA', dinner: 'KADAI PANEER, ROTI & HALWA' },
      wednesday: { lunch: 'CHICKEN CURRY, RICE & SALAD', dinner: 'DAL FRY, ROTI & SALAD' },
      thursday: { lunch: 'VEGETABLE, RICE & SALAD', dinner: 'MIX-VEG, ROTI & SALAD' },
      friday: { lunch: 'CHHOLE MASALA, RICE & SALAD', dinner: 'EGG CURRY, ROTI & SALAD' },
      saturday: { lunch: 'KHICHDI, AALOO CHOKHA / PICKLE', dinner: 'CHHOLE MASALA, PURI & SWEETS' }
    },
    isActive: true,
    features: [
      'FREE Trial',
      'Both meals',
      'Classic menu',
      'No payment required',
      'Try before you buy'
    ],
    sortOrder: 0
  }
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function seedPlans() {
  log.section('Seeding Subscription Plans');

  try {
    // Clear existing plans
    const deleteResult = await SubscriptionPlan.deleteMany({});
    log.info(`Cleared ${deleteResult.deletedCount} existing plans`);

    // Insert new plans
    const insertedPlans = await SubscriptionPlan.insertMany(defaultPlans);
    log.success(`Inserted ${insertedPlans.length} subscription plans`);

    // Display summary
    log.section('Plans Summary');
    
    const dailyPlans = insertedPlans.filter(p => p.durationType === 'daily');
    const weeklyPlans = insertedPlans.filter(p => p.durationType === 'weekly');
    const monthlyPlans = insertedPlans.filter(p => p.durationType === 'monthly');
    const trialPlans = insertedPlans.filter(p => p.durationType === 'trial');

    log.info(`Daily plans: ${dailyPlans.length}`);
    dailyPlans.forEach(p => {
      log.info(`  - ${p.displayName}: ₹${p.totalPrice}`);
    });

    log.info(`\nWeekly plans: ${weeklyPlans.length}`);
    weeklyPlans.forEach(p => {
      log.info(`  - ${p.displayName}: ₹${p.totalPrice} (₹${p.pricePerDay}/day)`);
    });

    log.info(`\nMonthly plans: ${monthlyPlans.length}`);
    monthlyPlans.forEach(p => {
      log.info(`  - ${p.displayName}: ₹${p.totalPrice} (₹${p.pricePerDay}/day)`);
    });

    log.info(`\nTrial plans: ${trialPlans.length}`);
    trialPlans.forEach(p => {
      log.info(`  - ${p.displayName}: ₹${p.totalPrice}`);
    });

    log.success('\n✅ Subscription plans seeded successfully!');
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await seedPlans();
  await mongoose.connection.close();
  log.success('Database connection closed');
  process.exit(0);
}

main();
