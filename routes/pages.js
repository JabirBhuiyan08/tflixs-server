const express = require('express');
const router = express.Router();
const Seo = require('../models/Seo');

// GET /api/pages/:page - Get page content (including privacy-policy and terms-of-service)
router.get('/:page', async (req, res) => {
  try {
    const { page } = req.params;
    
    // Validate page is allowed
    const allowedPages = ['privacy-policy', 'terms-of-service'];
    if (!allowedPages.includes(page)) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    // Get SEO data for this page
    const seoData = await Seo.findOne({ page });
    
    if (!seoData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Page content not found',
        page
      });
    }

    res.json({
      success: true,
      page: seoData.page,
      metaTitle: seoData.metaTitle,
      metaDescription: seoData.metaDescription,
      metaKeywords: seoData.metaKeywords,
      ogTitle: seoData.ogTitle,
      ogDescription: seoData.ogDescription,
      ogImage: seoData.ogImage,
      twitterCard: seoData.twitterCard,
      canonicalUrl: seoData.canonicalUrl,
      robotsMeta: seoData.robotsMeta,
      schemaMarkup: seoData.schemaMarkup
    });
  } catch (error) {
    console.error('Page error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
