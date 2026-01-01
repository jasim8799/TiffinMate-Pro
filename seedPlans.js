/**
 * Seed Subscription Plans
 * 
 * Run: node seedPlans.js
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
};

const log = {
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.reset}✗ ${msg}`),
  section: (msg) => console.log(`\n${COLORS.cyan}═══ ${msg} ═══${COLORS.reset}\n`),
};

// Default subscription plans
const defaultPlans = [
  // DAILY PLANS
  {
    name: 'daily-classic-lunch',
    displayName: 'Daily Classic - Lunch Only',
    description: 'Single day subscription with lunch',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 100,
    totalPrice: 100,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    isActive: true,
    features: ['Classic menu', 'Lunch delivery', 'Home delivery'],
    sortOrder: 1
  },
  {
    name: 'daily-classic-dinner',
    displayName: 'Daily Classic - Dinner Only',
    description: 'Single day subscription with dinner',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 100,
    totalPrice: 100,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Dinner delivery', 'Home delivery'],
    sortOrder: 2
  },
  {
    name: 'daily-classic-both',
    displayName: 'Daily Classic - Both Meals',
    description: 'Single day subscription with lunch and dinner',
    durationType: 'daily',
    durationDays: 1,
    pricePerDay: 180,
    totalPrice: 180,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Lunch & dinner delivery', 'Home delivery'],
    sortOrder: 3
  },

  // WEEKLY PLANS
  {
    name: 'weekly-classic-lunch',
    displayName: 'Weekly Classic - Lunch Only',
    description: '7 days subscription with lunch',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 90,
    totalPrice: 630,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    isActive: true,
    features: ['Classic menu', 'Lunch delivery', 'Home delivery', 'Save ₹70'],
    sortOrder: 4
  },
  {
    name: 'weekly-classic-dinner',
    displayName: 'Weekly Classic - Dinner Only',
    description: '7 days subscription with dinner',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 90,
    totalPrice: 630,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Dinner delivery', 'Home delivery', 'Save ₹70'],
    sortOrder: 5
  },
  {
    name: 'weekly-classic-both',
    displayName: 'Weekly Classic - Both Meals',
    description: '7 days subscription with lunch and dinner',
    durationType: 'weekly',
    durationDays: 7,
    pricePerDay: 170,
    totalPrice: 1190,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Lunch & dinner delivery', 'Home delivery', 'Save ₹70'],
    sortOrder: 6
  },

  // MONTHLY PLANS
  {
    name: 'monthly-classic-lunch',
    displayName: 'Monthly Classic - Lunch Only',
    description: '30 days subscription with lunch',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 80,
    totalPrice: 2400,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: false },
    isActive: true,
    features: ['Classic menu', 'Lunch delivery', 'Home delivery', 'Save ₹600'],
    sortOrder: 7
  },
  {
    name: 'monthly-classic-dinner',
    displayName: 'Monthly Classic - Dinner Only',
    description: '30 days subscription with dinner',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 80,
    totalPrice: 2400,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: false, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Dinner delivery', 'Home delivery', 'Save ₹600'],
    sortOrder: 8
  },
  {
    name: 'monthly-classic-both',
    displayName: 'Monthly Classic - Both Meals',
    description: '30 days subscription with lunch and dinner',
    durationType: 'monthly',
    durationDays: 30,
    pricePerDay: 150,
    totalPrice: 4500,
    planCategory: 'classic',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    isActive: true,
    features: ['Classic menu', 'Lunch & dinner delivery', 'Home delivery', 'Save ₹900'],
    sortOrder: 9
  },

  // TRIAL PLAN
  {
    name: 'trial-both',
    displayName: 'Trial - Both Meals',
    description: '3 days free trial with lunch and dinner',
    durationType: 'trial',
    durationDays: 3,
    pricePerDay: 0,
    totalPrice: 0,
    planCategory: 'trial',
    type: 'MIX',
    menuCategory: 'classic',
    mealTypes: { lunch: true, dinner: true },
    isActive: true,
    features: ['Free trial', 'Classic menu', 'Lunch & dinner', 'Home delivery'],
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
