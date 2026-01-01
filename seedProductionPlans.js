/**
 * PRODUCTION Seed Script for Subscription Plans
 * 
 * This script seeds subscription plans into the PRODUCTION MongoDB database
 * 
 * Usage:
 * 1. Local with production DB: MONGODB_URI="your_prod_uri" node seedProductionPlans.js
 * 2. On Render: node seedProductionPlans.js (uses env vars automatically)
 */

const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('./models/SubscriptionPlan');

// Color codes for console output
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

// Real production-ready subscription plans with YOUR ACTUAL BUSINESS PRICING
const productionPlans = [
  // ============================================
  // 1. CLASSIC MENU (₹2999/month) - Your Main Product
  // ============================================
  {
    name: 'classic-monthly-both',
    displayName: 'Classic Menu (Monthly)',
    description: '30 days Mix Veg & Non-Veg with weekly rotating menu - Best Value!',
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
      'Sunday: Chicken Biryani',
      'Wednesday: Chicken Curry',
      'Saturday: Chhole Puri + Sweets',
      'Weekly rotating menu',
      'Home delivery'
    ],
    isActive: true,
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
    features: ['Both Lunch & Dinner', 'Mix Veg & Non-Veg', 'Chicken included', 'Home delivery'],
    isActive: true,
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
    features: ['Both Lunch & Dinner', 'Mix Veg & Non-Veg', 'Home delivery'],
    isActive: true,
    sortOrder: 3
  },

  // ============================================
  // 2. PREMIUM VEG MENU (₹3999/month)
  // ============================================
  {
    name: 'premium-veg-monthly-both',
    displayName: 'Premium Veg Menu (Monthly)',
    description: '30 days Pure Vegetarian premium meals',
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
      '100% Pure Vegetarian',
      'Premium ingredients',
      'Paneer dishes 3 days/week',
      'Special sweets & desserts',
      'More items per meal',
      'Dal, Rice, Roti combo',
      'Home delivery'
    ],
    isActive: true,
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
    features: ['Both Lunch & Dinner', '100% Pure Veg', 'Premium quality', 'Home delivery'],
    isActive: true,
    sortOrder: 5
  },

  // ============================================
  // 3. PREMIUM NON-VEG MENU (₹3999/month)
  // ============================================
  {
    name: 'premium-non-veg-monthly-both',
    displayName: 'Premium Non-Veg Menu (Monthly)',
    description: '30 days Premium non-vegetarian delights',
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
      'Premium Non-Veg',
      'Chicken/Egg 5 days/week',
      'Biryani on weekends',
      'Special preparations',
      'More items per meal',
      'Home delivery'
    ],
    isActive: true,
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
    features: ['Both Lunch & Dinner', 'Premium Non-Veg', 'Chicken/Egg items', 'Home delivery'],
    isActive: true,
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
    features: ['Lunch only', 'Mix Veg & Non-Veg', 'Best value', 'Home delivery'],
    isActive: true,
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
    features: ['Lunch only', 'Mix Veg & Non-Veg', 'Home delivery'],
    isActive: true,
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
    features: [
      'FREE Trial',
      'Both meals',
      'Classic menu',
      'No payment required',
      'Try before you buy'
    ],
    isActive: true,
    sortOrder: 10
  }
];

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set');
    }

    log.info(`Connecting to MongoDB...`);
    log.warn(`Database: ${mongoUri.includes('localhost') ? 'LOCAL' : 'PRODUCTION'}`);
    
    await mongoose.connect(mongoUri);
    log.success('Connected to MongoDB successfully');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function seedProductionPlans() {
  log.section('SEEDING PRODUCTION SUBSCRIPTION PLANS');

  try {
    // Check existing plans
    const existingCount = await SubscriptionPlan.countDocuments();
    log.info(`Current plans in database: ${existingCount}`);

    // Clear existing plans
    const deleteResult = await SubscriptionPlan.deleteMany({});
    log.warn(`Cleared ${deleteResult.deletedCount} existing plans`);

    // Insert new plans
    const insertedPlans = await SubscriptionPlan.insertMany(productionPlans);
    log.success(`Inserted ${insertedPlans.length} subscription plans`);

    // Display summary
    log.section('PLANS SUMMARY');
    
    log.info('📅 DAILY PLANS:');
    const dailyPlans = insertedPlans.filter(p => p.durationType === 'daily');
    dailyPlans.forEach(p => {
      log.success(`  ${p.displayName}: ₹${p.totalPrice} (${p.mealTypes.lunch && p.mealTypes.dinner ? 'Both' : p.mealTypes.lunch ? 'Lunch' : 'Dinner'})`);
    });

    log.info('\n📅 WEEKLY PLANS:');
    const weeklyPlans = insertedPlans.filter(p => p.durationType === 'weekly');
    weeklyPlans.forEach(p => {
      log.success(`  ${p.displayName}: ₹${p.totalPrice} (₹${p.pricePerDay}/day)`);
    });

    log.info('\n📅 MONTHLY PLANS:');
    const monthlyPlans = insertedPlans.filter(p => p.durationType === 'monthly');
    monthlyPlans.forEach(p => {
      log.success(`  ${p.displayName}: ₹${p.totalPrice} (₹${p.pricePerDay}/day)`);
    });

    log.info('\n🎁 TRIAL PLAN:');
    const trialPlan = insertedPlans.find(p => p.planCategory === 'trial');
    log.success(`  ${trialPlan.displayName}: ₹${trialPlan.totalPrice} (FREE)`);

    log.section('NEXT STEPS');
    log.info('1. Test API: GET /api/subscription-plans');
    log.info('2. Flutter should now load plans successfully');
    log.info('3. Verify Owner can create customers with subscriptions');
    
    log.success('\n✅ PRODUCTION subscription plans seeded successfully!');
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  log.section('PRODUCTION DATABASE SEED SCRIPT');
  log.info('This will REPLACE all subscription plans in the database');
  log.warn('Make sure you are connected to the correct database!');
  
  await connectDB();
  await seedProductionPlans();
  
  await mongoose.connection.close();
  log.success('Database connection closed');
  
  log.section('SEED COMPLETE');
  process.exit(0);
}

// Run the seeding process
main();
