const mongoose = require('mongoose');

const SeoSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    unique: true,
    enum: ['home', 'calculator', 'blog', 'contact', 'about', 'global']
  },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  metaKeywords: { type: String, default: '' },
  ogTitle: { type: String, default: '' },
  ogDescription: { type: String, default: '' },
  ogImage: { type: String, default: '' },
  twitterCard: { type: String, default: 'summary_large_image' },
  canonicalUrl: { type: String, default: '' },
  robotsMeta: { type: String, default: 'index, follow' },
  schemaMarkup: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Seo', SeoSchema);
