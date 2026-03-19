const Admin = require('../models/Admin');
const Seo = require('../models/Seo');

const defaultSeoData = {
  'privacy-policy': {
    page: 'privacy-policy',
    metaTitle: 'Privacy Policy | Tflixs',
    metaDescription: 'Read our Privacy Policy to understand how we collect, use, and protect your personal information.',
    metaKeywords: 'privacy policy, data protection, personal information',
    ogTitle: 'Privacy Policy | Tflixs',
    ogDescription: 'Read our Privacy Policy to understand how we collect, use, and protect your personal information.',
    robotsMeta: 'index, follow'
  },
  'terms-of-service': {
    page: 'terms-of-service',
    metaTitle: 'Terms of Service | Tflixs',
    metaDescription: 'Read our Terms of Service to understand the terms and conditions governing your use of Tflixs.',
    metaKeywords: 'terms of service, terms and conditions, user agreement',
    ogTitle: 'Terms of Service | Tflixs',
    ogDescription: 'Read our Terms of Service to understand the terms and conditions governing your use of Tflixs.',
    robotsMeta: 'index, follow'
  }
};

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

    // Seed SEO data for privacy-policy and terms-of-service
    for (const [page, data] of Object.entries(defaultSeoData)) {
      await Seo.findOneAndUpdate(
        { page },
        data,
        { upsert: true, new: true }
      );
      console.log(`✅ SEO data seeded for ${page}`);
    }
  } catch (err) {
    console.error('Seed admin error:', err.message);
  }
};

module.exports = seedAdmin;
