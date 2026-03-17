const mongoose = require('mongoose');

const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:  { type: String, default: '', trim: true },
  status:{ type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  source:{ type: String, default: 'website' },
}, { timestamps: true });

module.exports = mongoose.model('Newsletter', NewsletterSchema);
