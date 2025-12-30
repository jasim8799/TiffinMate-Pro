const mongoose = require('mongoose');
require('dotenv').config();

const WeeklyMenu = require('./models/WeeklyMenu');

const menuData = [
  // CLASSIC MENU (2999 Per month)
  // Sunday
  { dayOfWeek: 'sunday', mealType: 'lunch', planCategory: 'classic', items: ['MIX-VEG', 'DAL', 'RICE', 'SALAD'], description: 'Mix Veg with Dal, Rice & Salad' },
  { dayOfWeek: 'sunday', mealType: 'dinner', planCategory: 'classic', items: ['CHICKEN BIRYANI', 'SALAD', 'RAITA'], description: 'Chicken Biryani with Salad & Raita' },
  
  // Monday
  { dayOfWeek: 'monday', mealType: 'lunch', planCategory: 'classic', items: ['AALOO SOYABEEN', 'RICE', 'SALAD'], description: 'Aloo Soyabean with Rice & Salad' },
  { dayOfWeek: 'monday', mealType: 'dinner', planCategory: 'classic', items: ['SEASONAL VEG', 'ROTI', 'SALAD'], description: 'Seasonal Veg with Roti & Salad' },
  
  // Tuesday
  { dayOfWeek: 'tuesday', mealType: 'lunch', planCategory: 'classic', items: ['RAJMA', 'RICE', 'RAITA'], description: 'Rajma with Rice & Raita' },
  { dayOfWeek: 'tuesday', mealType: 'dinner', planCategory: 'classic', items: ['KADAI PANEER', 'ROTI', 'HALWA'], description: 'Kadai Paneer with Roti & Halwa' },
  
  // Wednesday
  { dayOfWeek: 'wednesday', mealType: 'lunch', planCategory: 'classic', items: ['CHICKEN CURRY', 'RICE', 'SALAD'], description: 'Chicken Curry with Rice & Salad' },
  { dayOfWeek: 'wednesday', mealType: 'dinner', planCategory: 'classic', items: ['DAL FRY', 'ROTI', 'SALAD'], description: 'Dal Fry with Roti & Salad' },
  
  // Thursday
  { dayOfWeek: 'thursday', mealType: 'lunch', planCategory: 'classic', items: ['VEGITABLE', 'RICE', 'SALAD'], description: 'Vegetable with Rice & Salad' },
  { dayOfWeek: 'thursday', mealType: 'dinner', planCategory: 'classic', items: ['MIX-VEG', 'ROTI', 'SALAD'], description: 'Mix Veg with Roti & Salad' },
  
  // Friday
  { dayOfWeek: 'friday', mealType: 'lunch', planCategory: 'classic', items: ['CHHOLE MASALA', 'RICE', 'SALAD'], description: 'Chhole Masala with Rice & Salad' },
  { dayOfWeek: 'friday', mealType: 'dinner', planCategory: 'classic', items: ['EGG CURRY', 'ROTI', 'SALAD'], description: 'Egg Curry with Roti & Salad' },
  
  // Saturday
  { dayOfWeek: 'saturday', mealType: 'lunch', planCategory: 'classic', items: ['KHICHDI', 'AALOO CHOKHA', 'PICKLE'], description: 'Khichdi with Aaloo Chokha & Pickle' },
  { dayOfWeek: 'saturday', mealType: 'dinner', planCategory: 'classic', items: ['CHHOLE MASALA', 'PURI', 'SWEETS'], description: 'Chhole Masala with Puri & Sweets' },

  // PREMIUM VEG MENU (3999 Per month)
  // Sunday
  { dayOfWeek: 'sunday', mealType: 'lunch', planCategory: 'premium-veg', items: ['MIX-VEG', 'DAL', 'JEERA RICE', 'ROTI', 'SALAD'], description: 'Mix Veg, Dal, Jeera Rice, Roti & Salad' },
  { dayOfWeek: 'sunday', mealType: 'dinner', planCategory: 'premium-veg', items: ['VEG BIRYANI', 'SALAD', 'RAITA'], description: 'Veg Biryani with Salad & Raita' },
  
  // Monday
  { dayOfWeek: 'monday', mealType: 'lunch', planCategory: 'premium-veg', items: ['AALOO SOYABEEN', 'DAL', 'FRIED RICE', 'ROTI', 'KHEER'], description: 'Aloo Soyabean, Dal, Fried Rice, Roti & Kheer' },
  { dayOfWeek: 'monday', mealType: 'dinner', planCategory: 'premium-veg', items: ['SEASONAL VEG', 'DAL', 'RICE', 'ROTI', 'SALAD'], description: 'Seasonal Veg, Dal, Rice, Roti & Salad' },
  
  // Tuesday
  { dayOfWeek: 'tuesday', mealType: 'lunch', planCategory: 'premium-veg', items: ['RAJMA', 'AALOO BHUJIYA', 'JEERA RICE', 'ROTI', 'RAITA'], description: 'Rajma, Aloo Bhujiya, Jeera Rice, Roti & Raita' },
  { dayOfWeek: 'tuesday', mealType: 'dinner', planCategory: 'premium-veg', items: ['KADAI PANEER', 'LACHHA PARATHA', 'SALAD'], description: 'Kadai Paneer with Lachha Paratha & Salad' },
  
  // Wednesday
  { dayOfWeek: 'wednesday', mealType: 'lunch', planCategory: 'premium-veg', items: ['MUTAR MUSHROOM', 'DAL', 'SOYA RICE', 'ROTI', 'SALAD'], description: 'Matar Mushroom, Dal, Soya Rice, Roti & Salad' },
  { dayOfWeek: 'wednesday', mealType: 'dinner', planCategory: 'premium-veg', items: ['DAL FRY', 'ROTI', 'KHEER'], description: 'Dal Fry with Roti & Kheer' },
  
  // Thursday
  { dayOfWeek: 'thursday', mealType: 'lunch', planCategory: 'premium-veg', items: ['VEGITABLE', 'DAL', 'RICE', 'ROTI', 'SALAD'], description: 'Vegetable, Dal, Rice, Roti & Salad' },
  { dayOfWeek: 'thursday', mealType: 'dinner', planCategory: 'premium-veg', items: ['MIX-VEG', 'DAL', 'FRIED RICE', 'ROTI', 'SALAD'], description: 'Mix Veg, Dal, Fried Rice, Roti & Salad' },
  
  // Friday
  { dayOfWeek: 'friday', mealType: 'lunch', planCategory: 'premium-veg', items: ['PANEER MASALA', 'PLAIN PARATHA', 'HALWA'], description: 'Paneer Masala with Plain Paratha & Halwa' },
  { dayOfWeek: 'friday', mealType: 'dinner', planCategory: 'premium-veg', items: ['BESAN GATTA', 'JEERA RICE', 'ROTI', 'SALAD'], description: 'Besan Gatta, Jeera Rice, Roti & Salad' },
  
  // Saturday
  { dayOfWeek: 'saturday', mealType: 'lunch', planCategory: 'premium-veg', items: ['KHICHDI', 'AALOO CHOKHA', 'PICKLE'], description: 'Khichdi with Aaloo Chokha & Pickle' },
  { dayOfWeek: 'saturday', mealType: 'dinner', planCategory: 'premium-veg', items: ['CHHOLE MASAL', 'PURI', 'SWEETS'], description: 'Chhole Masal with Puri & Sweets' },

  // PREMIUM NON-VEG MENU (3999 Per month)
  // Sunday
  { dayOfWeek: 'sunday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['CHICKEN CURRY (BIHARI STYLE)', 'JEERA RICE', 'ROTI'], description: 'Chicken Curry (Bihari Style), Jeera Rice & Roti' },
  { dayOfWeek: 'sunday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['CHICKEN BIRYANI', 'RAITA', 'SALAD'], description: 'Chicken Biryani with Raita & Salad' },
  
  // Monday
  { dayOfWeek: 'monday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['EGG CURRY', 'FRIED RICE', 'ROTI', 'KHEER'], description: 'Egg Curry, Fried Rice, Roti & Kheer' },
  { dayOfWeek: 'monday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['TANDOORI CHICKEN', 'PARATHA (PLAIN)', 'HALWA'], description: 'Tandoori Chicken, Paratha (Plain) & Halwa' },
  
  // Tuesday - N/A
  { dayOfWeek: 'tuesday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['N/A'], description: 'Not Available', isActive: false },
  { dayOfWeek: 'tuesday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['N/A'], description: 'Not Available', isActive: false },
  
  // Wednesday
  { dayOfWeek: 'wednesday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['CHICKEN MASALA', 'DAL', 'SOYA RICE', 'ROTI', 'SALAD'], description: 'Chicken Masala, Dal, Soya Rice, Roti & Salad' },
  { dayOfWeek: 'wednesday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['MURADABADI BIRYANI', 'CHUTNEY', 'KHEER'], description: 'Muradabadi Biryani with Chutney & Kheer' },
  
  // Thursday
  { dayOfWeek: 'thursday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['EGG AALOO DUM', 'RICE', 'ROTI', 'SALAD'], description: 'Egg Aloo Dum, Rice, Roti & Salad' },
  { dayOfWeek: 'thursday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['CHICKEN KORMA', 'LACHHA PARATHA', 'SALAD'], description: 'Chicken Korma with Lachha Paratha & Salad' },
  
  // Friday
  { dayOfWeek: 'friday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['HYDRABADI BIRYANI', 'RAITA', 'HALWA'], description: 'Hyderabadi Biryani with Raita & Halwa' },
  { dayOfWeek: 'friday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['EGG BHURJI', 'DAL', 'JEERA RICE', 'ROTI', 'SALAD'], description: 'Egg Bhurji, Dal, Jeera Rice, Roti & Salad' },
  
  // Saturday
  { dayOfWeek: 'saturday', mealType: 'lunch', planCategory: 'premium-non-veg', items: ['KEEMA', 'DAL', 'RICE', 'ROTI', 'SALAD'], description: 'Keema, Dal, Rice, Roti & Salad' },
  { dayOfWeek: 'saturday', mealType: 'dinner', planCategory: 'premium-non-veg', items: ['BUTTER CHICKEN', 'SATTU PARATHA', 'SWEETS'], description: 'Butter Chicken, Sattu Paratha & Sweets' },
];

async function seedMenu() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing menu data
    await WeeklyMenu.deleteMany({});
    console.log('Cleared existing menu data');

    // Insert new menu data
    await WeeklyMenu.insertMany(menuData);
    console.log('Menu data seeded successfully!');
    console.log(`Inserted ${menuData.length} menu items`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding menu:', error);
    process.exit(1);
  }
}

seedMenu();
