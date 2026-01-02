const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');

mongoose.connect('mongodb+srv://aarnavpatel1512:Aarnav1512@cluster0.piopjzx.mongodb.net/tiffin-service?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  
  const activeCount = await Subscription.countDocuments({ status: 'active' });
  console.log('📊 Active subscriptions count:', activeCount);
  
  const allSubscriptions = await Subscription.find({}).select('status user planType startDate endDate');
  console.log('\n📋 All subscriptions:');
  allSubscriptions.forEach(sub => {
    console.log(`- ID: ${sub._id}, Status: ${sub.status}, User: ${sub.user}, Plan: ${sub.planType}, End: ${sub.endDate}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
