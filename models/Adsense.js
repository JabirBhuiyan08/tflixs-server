const mongoose = require('mongoose');

const AdsenseSchema = new mongoose.Schema({
  publisherId: { type: String, default: '' },   // ca-pub-XXXXXXXXXXXXXXXX
  enabled: { type: Boolean, default: false },
  autoAds: { type: Boolean, default: false },
  adUnits: {
    header: { adSlot: String, enabled: { type: Boolean, default: false } },
    sidebar: { adSlot: String, enabled: { type: Boolean, default: false } },
    inArticle: { adSlot: String, enabled: { type: Boolean, default: false } },
    belowCalculator: { adSlot: String, enabled: { type: Boolean, default: false } },
    footer: { adSlot: String, enabled: { type: Boolean, default: false } }
  }
}, { timestamps: true });

module.exports = mongoose.model('Adsense', AdsenseSchema);
