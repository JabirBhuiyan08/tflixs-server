const express = require('express');
const router = express.Router();
const Seo = require('../models/Seo');
const { protect } = require('../middleware/auth');

// GET /api/seo/:page - Public
router.get('/:page', async (req, res) => {
  try {
    const seo = await Seo.findOne({ page: req.params.page });
    res.json({ success: true, seo: seo || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/seo - Admin: get all pages
router.get('/', protect, async (req, res) => {
  try {
    const pages = ['home', 'calculator', 'blog', 'contact', 'about', 'global', 'privacy-policy', 'terms-of-service'];
    const seoData = {};
    for (const page of pages) {
      const seo = await Seo.findOne({ page });
      seoData[page] = seo || { page };
    }
    res.json({ success: true, seoData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/seo/:page - Admin: upsert SEO for a page
router.put('/:page', protect, async (req, res) => {
  try {
    const seo = await Seo.findOneAndUpdate(
      { page: req.params.page },
      { ...req.body, page: req.params.page },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, seo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
