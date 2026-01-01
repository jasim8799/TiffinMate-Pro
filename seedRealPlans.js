/**
 * Seed Real Subscription Plans with Weekly Menus
 * 
 * Run: node seedRealPlans.js
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
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.cyan}═══ ${msg} ═══${COLORS.reset}\n`),
};

// REAL subscription plans matching WeeklyMenu categories
const realPlans = [
  // ============================================
  // CLASSIC PLAN - Mix Veg & Non-Veg (₹2999)
  // ============================================
  {
    name: 'classic-monthly',
    displayName: 'Classic (Monthly)',
    description: 'Mix of Veg and Non-Veg meals - Best value for 30 days',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 100,
    totalPrice: 2999,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      'Mix Veg & Non-Veg',
      'Chicken 3 days/week',
      'Weekly menu variety',
      'Customizable preferences',
      'Home delivery'
    ],
    isActive: true,
    sortOrder: 1
  },

  // ============================================
  // PREMIUM VEG - Pure Vegetarian (₹3999)
  // ============================================
  {
    name: 'premium-veg-monthly',
    displayName: 'Premium Veg (Monthly)',
    description: 'Pure vegetarian premium meals for 30 days',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 133,
    totalPrice: 3999,
    planCategory: 'premium',
    type: 'VEG',
    menuCategory: 'premium-veg',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      '100% Pure Veg',
      'Premium ingredients',
      'More items per meal',
      'Special sweets & desserts',
      'Paneer 3 days/week',
      'Dal, Rice, Roti combo'
    ],
    isActive: true,
    sortOrder: 2
  },

  // ============================================
  // PREMIUM NON-VEG (₹3999)
  // ============================================
  {
    name: 'premium-non-veg-monthly',
    displayName: 'Premium Non-Veg (Monthly)',
    description: 'Premium non-vegetarian delights for 30 days',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 133,
    totalPrice: 3999,
    planCategory: 'premium',
    type: 'NON_VEG',
    menuCategory: 'premium-non-veg',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      'Chicken/Egg daily',
      'Special Biryani varieties',
      'Tandoori specials',
      'Premium non-veg items',
      'Authentic Bihari style',
      'Hyderabadi & Muradabadi Biryani'
    ],
    isActive: true,
    sortOrder: 3
  },

  // ============================================
  // WEEKLY PLANS (Trial for 7 days)
  // ============================================
  {
    name: 'classic-weekly',
    displayName: 'Classic (Weekly)',
    description: 'Try for a week - Mix meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 110,
    totalPrice: 770,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      'Mix Veg & Non-Veg',
      'Perfect for trial',
      'No long commitment',
      'Same classic menu'
    ],
    isActive: true,
    sortOrder: 4
  },

  {
    name: 'premium-veg-weekly',
    displayName: 'Premium Veg (Weekly)',
    description: 'Try premium veg for a week',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 143,
    totalPrice: 1000,
    planCategory: 'premium',
    type: 'VEG',
    menuCategory: 'premium-veg',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      '100% Pure Veg',
      'Premium experience',
      'Weekly trial',
      'Same premium veg menu'
    ],
    isActive: true,
    sortOrder: 5
  },

  {
    name: 'premium-non-veg-weekly',
    displayName: 'Premium Non-Veg (Weekly)',
    description: 'Try premium non-veg for a week',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 143,
    totalPrice: 1000,
    planCategory: 'premium',
    type: 'NON_VEG',
    menuCategory: 'premium-non-veg',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Both Lunch & Dinner',
      'Daily non-veg items',
      'Premium varieties',
      'Weekly trial',
      'Same premium non-veg menu'
    ],
    isActive: true,
    sortOrder: 6
  },

  // ============================================
  // TRIAL PLAN (Free)
  // ============================================
  {
    name: 'trial-3day',
    displayName: '3-Day Trial',
    description: 'Try our classic menu for free',
    durationType: 'daily',
    durationDays: 3,
    pricePerDay: 0,
    totalPrice: 0,
    planCategory: 'trial',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Free trial',
      'Both meals',
      'Classic menu',
      'No payment required',
      'Try before you buy'
    ],
    isActive: true,
    sortOrder: 7
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

async function seedRealPlans() {
  log.section('Seeding REAL Subscription Plans with Weekly Menus');

  try {
    // Clear existing plans
    const deleteResult = await SubscriptionPlan.deleteMany({});
    log.info(`Cleared ${deleteResult.deletedCount} existing plans`);

    // Insert new plans
    const insertedPlans = await SubscriptionPlan.insertMany(realPlans);
    log.success(`Inserted ${insertedPlans.length} subscription plans`);

    // Display summary
    log.section('Plans Summary');
    
    log.info('CLASSIC PLAN (MIX - Veg & Non-Veg):');
    const classic = insertedPlans.find(p => p.name === 'classic-monthly');
    log.success(`  Monthly: ${classic.displayName} - ₹${classic.totalPrice} (₹${classic.pricePerDay}/day)`);
    log.info(`  Menu: ${classic.menuCategory}`);
    log.info(`  Type: ${classic.type}`);

    log.info('\nPREMIUM VEG PLAN:');
    const premiumVeg = insertedPlans.find(p => p.name === 'premium-veg-monthly');
    log.success(`  Monthly: ${premiumVeg.displayName} - ₹${premiumVeg.totalPrice} (₹${premiumVeg.pricePerDay}/day)`);
    log.info(`  Menu: ${premiumVeg.menuCategory}`);
    log.info(`  Type: ${premiumVeg.type}`);

    log.info('\nPREMIUM NON-VEG PLAN:');
    const premiumNonVeg = insertedPlans.find(p => p.name === 'premium-non-veg-monthly');
    log.success(`  Monthly: ${premiumNonVeg.displayName} - ₹${premiumNonVeg.totalPrice} (₹${premiumNonVeg.pricePerDay}/day)`);
    log.info(`  Menu: ${premiumNonVeg.menuCategory}`);
    log.info(`  Type: ${premiumNonVeg.type}`);

    log.info('\nWEEKLY PLANS:');
    const weeklyPlans = insertedPlans.filter(p => p.durationType === 'weekly');
    weeklyPlans.forEach(p => {
      log.success(`  ${p.displayName}: ₹${p.totalPrice} (${p.type})`);
    });

    log.info('\nTRIAL PLAN:');
    const trial = insertedPlans.find(p => p.planCategory === 'trial');
    log.success(`  ${trial.displayName}: ₹${trial.totalPrice} (FREE)`);

    log.section('Menu Categories Mapping');
    log.info('classic → WeeklyMenu.planCategory: "classic"');
    log.info('premium-veg → WeeklyMenu.planCategory: "premium-veg"');
    log.info('premium-non-veg → WeeklyMenu.planCategory: "premium-non-veg"');

    log.success('\n✅ REAL Subscription plans seeded successfully!');
    log.info('\nNext steps:');
    log.info('1. Run: node seedMenu.js (to seed weekly menus)');
    log.info('2. Test API: GET /api/subscriptions/plans');
    log.info('3. Test API: GET /api/meals/weekly-menu');
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await seedRealPlans();
  await mongoose.connection.close();
  log.success('Database connection closed');
  process.exit(0);
}

main();
