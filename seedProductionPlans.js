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

// Real production-ready subscription plans
const productionPlans = [
  // ============================================
  // DAILY PLANS
  // ============================================
  {
    name: 'daily-lunch',
    displayName: 'Daily Lunch',
    description: 'Single day lunch meal',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 100,
    totalPrice: 100,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    features: ['Lunch only', 'Mix Veg & Non-Veg', 'Dal + Rice + Roti + Sabzi'],
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'daily-dinner',
    displayName: 'Daily Dinner',
    description: 'Single day dinner meal',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 120,
    totalPrice: 120,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    features: ['Dinner only', 'Mix Veg & Non-Veg', 'Dal + Rice + Roti + Sabzi'],
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'daily-both',
    displayName: 'Daily Both Meals',
    description: 'Single day lunch and dinner',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 180,
    totalPrice: 180,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: ['Lunch & Dinner', 'Mix Veg & Non-Veg', 'Full meals'],
    isActive: true,
    sortOrder: 3
  },

  // ============================================
  // WEEKLY PLANS
  // ============================================
  {
    name: 'weekly-lunch',
    displayName: 'Weekly Lunch',
    description: '7 days lunch meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 90,
    totalPrice: 630,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    features: ['Lunch only', '7 days', 'Mix Veg & Non-Veg', 'Weekly variety'],
    isActive: true,
    sortOrder: 4
  },
  {
    name: 'weekly-dinner',
    displayName: 'Weekly Dinner',
    description: '7 days dinner meals',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 110,
    totalPrice: 770,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    features: ['Dinner only', '7 days', 'Mix Veg & Non-Veg', 'Weekly variety'],
    isActive: true,
    sortOrder: 5
  },
  {
    name: 'weekly-both',
    displayName: 'Weekly Both Meals',
    description: '7 days lunch and dinner',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 170,
    totalPrice: 1190,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: ['Lunch & Dinner', '7 days', 'Mix Veg & Non-Veg', 'Best value'],
    isActive: true,
    sortOrder: 6
  },

  // ============================================
  // MONTHLY PLANS
  // ============================================
  {
    name: 'monthly-lunch',
    displayName: 'Monthly Lunch',
    description: '30 days lunch meals - Best value',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 80,
    totalPrice: 2400,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    features: ['Lunch only', '30 days', 'Mix Veg & Non-Veg', 'Maximum savings', 'Chicken 3 days/week'],
    isActive: true,
    sortOrder: 7
  },
  {
    name: 'monthly-dinner',
    displayName: 'Monthly Dinner',
    description: '30 days dinner meals - Best value',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 100,
    totalPrice: 3000,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    features: ['Dinner only', '30 days', 'Mix Veg & Non-Veg', 'Maximum savings', 'Chicken 3 days/week'],
    isActive: true,
    sortOrder: 8
  },
  {
    name: 'monthly-both',
    displayName: 'Monthly Both Meals',
    description: '30 days lunch and dinner - Ultimate value',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 150,
    totalPrice: 4500,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    features: [
      'Lunch & Dinner',
      '30 days',
      'Mix Veg & Non-Veg',
      'Ultimate savings',
      'Chicken 3 days/week',
      'Weekly menu variety',
      'Home delivery'
    ],
    isActive: true,
    sortOrder: 9
  },

  // ============================================
  // TRIAL PLAN (FREE)
  // ============================================
  {
    name: 'trial-1day',
    displayName: 'Free Trial (1 Day)',
    description: 'Try our service free for 1 day',
    durationType: 'daily',
    durationDays: 1,
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
