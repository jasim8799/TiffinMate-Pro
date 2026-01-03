const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config();

// Models
const Lead = require('./models/Lead');

async function verifyServiceLeads() {
  try {
    console.log('📋 ======================================');
    console.log('📋 SERVICE LEADS VERIFICATION');
    console.log('📋 ======================================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Count all leads
    const totalLeads = await Lead.countDocuments({});
    console.log('📊 TOTAL LEADS:', totalLeads);

    // 2. Count by status
    const newLeads = await Lead.countDocuments({ status: 'new' });
    const contactedLeads = await Lead.countDocuments({ status: 'contacted' });
    const convertedLeads = await Lead.countDocuments({ status: 'converted' });
    const notInterestedLeads = await Lead.countDocuments({ status: 'not-interested' });
    const closedLeads = await Lead.countDocuments({ status: 'closed' });

    console.log('\n📊 LEADS BY STATUS:');
    console.log('   ├─ New:', newLeads);
    console.log('   ├─ Contacted:', contactedLeads);
    console.log('   ├─ Converted:', convertedLeads);
    console.log('   ├─ Not Interested:', notInterestedLeads);
    console.log('   └─ Closed:', closedLeads);

    // 3. Count by source
    const sources = await Lead.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 LEADS BY SOURCE:');
    sources.forEach(src => {
      console.log(`   ├─ ${src._id || 'undefined'}:`, src.count);
    });

    // 4. Count location-based vs general inquiries
    const locationBasedLeads = await Lead.countDocuments({
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });
    const generalInquiries = totalLeads - locationBasedLeads;

    console.log('\n📊 LEADS BY TYPE:');
    console.log('   ├─ Location-Based (Out-of-Service):', locationBasedLeads);
    console.log('   └─ General Inquiries:', generalInquiries);

    // 5. Recent leads (last 10)
    console.log('\n📋 RECENT LEADS (Last 10):');
    const recentLeads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name phone status source area location.distance createdAt');

    if (recentLeads.length === 0) {
      console.log('   ⚠️  No leads found\n');
      console.log('💡 TIP: You can create a test lead by calling:');
      console.log('   POST /api/leads');
      console.log('   Body: { "name": "Test User", "phone": "9876543210", "area": "Test Area", "message": "Interested in service", "source": "app" }');
    } else {
      recentLeads.forEach((lead, index) => {
        const hasLocation = lead.location && lead.location.distance;
        const location = hasLocation 
          ? `${lead.location.distance.toFixed(1)} km away`
          : lead.area || 'No location';
        
        console.log(`   ${index + 1}. ${lead.name} (${lead.phone})`);
        console.log(`      Status: ${lead.status} | Source: ${lead.source || 'app'} | ${location}`);
        console.log(`      Created: ${moment(lead.createdAt).format('DD MMM YYYY, hh:mm A')}`);
      });
    }

    // 6. Dashboard data (what API returns)
    console.log('\n📊 DASHBOARD API DATA:');
    console.log('   {');
    console.log(`     serviceLeads: {`);
    console.log(`       total: ${totalLeads},`);
    console.log(`       new: ${newLeads}`);
    console.log(`     }`);
    console.log('   }');

    console.log('\n✅ SERVICE LEADS VERIFICATION COMPLETE\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyServiceLeads();
