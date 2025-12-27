const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

    // Create default admin user on first run
    const User = require('../models/User');
    const adminExists = await User.findOne({ role: 'owner' });
    
    if (!adminExists) {
      console.log('🔧 Creating default admin user...');
      await User.create({
        userId: process.env.DEFAULT_ADMIN_USERID || 'ADMIN001',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
        mobile: process.env.DEFAULT_ADMIN_MOBILE || '1234567890',
        name: 'Admin',
        role: 'owner',
        isActive: true,
        isPasswordChanged: false
      });
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
