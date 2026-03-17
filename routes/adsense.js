const express = require('express');
const router = express.Router();
const Adsense = require('../models/Adsense');
const { protect } = require('../middleware/auth');

// GET /api/adsense - Public: get adsense config
router.get('/', async (req, res) => {
  try {
    let config = await Adsense.findOne();
    if (!config) config = await Adsense.create({});
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/adsense - Admin: update adsense config
router.put('/', protect, async (req, res) => {
  try {
    let config = await Adsense.findOne();
    if (!config) {
      config = await Adsense.create(req.body);
    } else {
      Object.assign(config, req.body);
      await config.save();
    }
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
