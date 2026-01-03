const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

const MealOrder = require('./models/MealOrder');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function cleanupDuplicateMealOrders() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧹 CLEANUP: DUPLICATE MEALORDERS');
    console.log('='.repeat(80));
    
    // Get all meal orders
    const allMealOrders = await MealOrder.find({}).populate('user', 'name');
    console.log(`\n📊 Total MealOrders in database: ${allMealOrders.length}`);
    
    // Group by user + deliveryDate + mealType
    const groups = new Map();
    
    allMealOrders.forEach(order => {
      const key = `${order.user._id}_${moment(order.deliveryDate).format('YYYY-MM-DD')}_${order.mealType}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(order);
    });
    
    console.log(`\n📊 Total unique (user + date + mealType) combinations: ${groups.size}`);
    
    // Find duplicates
    let duplicateGroups = 0;
    let duplicateDocuments = 0;
    const toDelete = [];
    
    groups.forEach((orders, key) => {
      if (orders.length > 1) {
        duplicateGroups++;
        duplicateDocuments += orders.length - 1; // All but one
        
        const [userId, date, mealType] = key.split('_');
        const userName = orders[0].user?.name || 'Unknown';
        
        console.log(`\n❌ DUPLICATE FOUND:`);
        console.log(`   User: ${userName}`);
        console.log(`   Date: ${date}`);
        console.log(`   MealType: ${mealType}`);
        console.log(`   Count: ${orders.length} documents`);
        
        // Sort to keep the best one
        // Priority: user-selected (not default) > default > empty
        orders.sort((a, b) => {
          // Prefer user-selected (isDefault = false)
          const aIsUserSelected = a.selectedMeal?.isDefault === false;
          const bIsUserSelected = b.selectedMeal?.isDefault === false;
          
          if (aIsUserSelected && !bIsUserSelected) return -1;
          if (!aIsUserSelected && bIsUserSelected) return 1;
          
          // Prefer has meal name over empty
          const aHasMeal = a.selectedMeal?.name ? 1 : 0;
          const bHasMeal = b.selectedMeal?.name ? 1 : 0;
          
          if (aHasMeal > bHasMeal) return -1;
          if (aHasMeal < bHasMeal) return 1;
          
          // Prefer newer (by createdAt)
          return b.createdAt - a.createdAt;
        });
        
        // Keep the first one (best), delete the rest
        const toKeep = orders[0];
        const toDeleteInGroup = orders.slice(1);
        
        console.log(`   ✅ KEEPING: ${toKeep._id} (${toKeep.selectedMeal?.isDefault ? 'DEFAULT' : 'USER-SELECTED'})`);
        console.log(`   ❌ DELETING: ${toDeleteInGroup.length} duplicate(s)`);
        
        toDeleteInGroup.forEach(order => {
          console.log(`      - ${order._id} (${order.selectedMeal?.isDefault ? 'DEFAULT' : 'USER-SELECTED'})`);
          toDelete.push(order._id);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total MealOrders:        ${allMealOrders.length}`);
    console.log(`Unique combinations:     ${groups.size}`);
    console.log(`Duplicate groups found:  ${duplicateGroups}`);
    console.log(`Documents to delete:     ${duplicateDocuments}`);
    console.log('='.repeat(80));
    
    if (toDelete.length === 0) {
      console.log('\n✅ No duplicates found! Database is clean.');
      return;
    }
    
    // Confirm deletion
    console.log(`\n⚠️  About to DELETE ${toDelete.length} duplicate MealOrders`);
    console.log('This action is IRREVERSIBLE!');
    
    // Auto-proceed (for script automation)
    // In production, you might want to add a confirmation prompt
    
    console.log('\n🗑️  Deleting duplicates...');
    const deleteResult = await MealOrder.deleteMany({
      _id: { $in: toDelete }
    });
    
    console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} duplicate MealOrders`);
    
    // Verify cleanup
    const remainingCount = await MealOrder.countDocuments({});
    console.log(`\n📊 Final count: ${remainingCount} MealOrders`);
    console.log(`📊 Expected: ${groups.size} (one per user+date+mealType)`);
    
    if (remainingCount === groups.size) {
      console.log('\n✅ ✅ ✅ CLEANUP SUCCESSFUL! ✅ ✅ ✅');
    } else {
      console.log('\n⚠️  Warning: Final count does not match expected. Please verify manually.');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

cleanupDuplicateMealOrders();
