const mongoose = require('mongoose');

/**
 * Stores the most recently generated sitemap URLs in MongoDB.
 * This allows the frontend (Firebase) to fetch the latest sitemap
 * from the API without knowing about Vercel's dynamic generation.
 */
const SitemapCacheSchema = new mongoose.Schema({
  key:       { type: String, default: 'main', unique: true },
  urls:      [{ loc: String, lastmod: String, changefreq: String, priority: String }],
  fullXml:   { type: String, default: '' },  // Full XML string cached
  updatedAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('SitemapCache', SitemapCacheSchema);
