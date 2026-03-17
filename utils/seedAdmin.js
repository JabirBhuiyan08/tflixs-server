const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        email: process.env.ADMIN_EMAIL || 'admin@tflixs.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        name: 'Admin',
        role: 'admin'
      });
      console.log('✅ Admin user created');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@tflixs.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
    }
  } catch (err) {
    console.error('Seed admin error:', err.message);
  }
};

module.exports = seedAdmin;
