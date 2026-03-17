const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Crop Nutrition', 'Soil Health', 'Fertilizer Tips', 'Farming Guides', 'News', 'Other'],
    default: 'Other'
  },
  tags: [{ type: String }],
  featuredImage: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'Admin'
  },
  published: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  // SEO Meta
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  metaKeywords: { type: String, default: '' },
  canonicalUrl: { type: String, default: '' },
  ogImage: { type: String, default: '' }
}, { timestamps: true });

// Auto-generate slug from title
BlogSchema.pre('validate', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

module.exports = mongoose.model('Blog', BlogSchema);
