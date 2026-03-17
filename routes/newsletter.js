const express    = require('express');
const router     = express.Router();
const Newsletter = require('../models/Newsletter');
const { protect } = require('../middleware/auth');
const { sendEmailToAdmin, newSubscriberEmail } = require('../utils/email');

// POST /api/newsletter/subscribe — Public
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active';
        await existing.save();
        return res.json({ success: true, message: "Welcome back! You've been re-subscribed." });
      }
      return res.json({ success: true, message: "You're already subscribed!" });
    }

    await Newsletter.create({ email, name: name || '' });

    // Notify admin (non-blocking)
    sendEmailToAdmin({
      subject:     'New Newsletter Subscriber',
      htmlContent: newSubscriberEmail({ name: name || '', email }),
    });

    res.status(201).json({ success: true, message: '🎉 Subscribed successfully! Welcome to Tflixs.' });
  } catch {
    res.status(500).json({ success: false, message: 'Subscription failed. Please try again.' });
  }
});

// GET /api/newsletter — Admin: get all subscribers
router.get('/', protect, async (req, res) => {
  try {
    const subscribers = await Newsletter.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json({ success: true, subscribers, total: subscribers.length });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/newsletter/:id — Admin: unsubscribe
router.delete('/:id', protect, async (req, res) => {
  try {
    await Newsletter.findByIdAndUpdate(req.params.id, { status: 'unsubscribed' });
    res.json({ success: true, message: 'Unsubscribed' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

// POST /api/newsletter/unsubscribe — Public (from email link)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
    await Newsletter.findOneAndUpdate(
      { email: email.toLowerCase() },
      { status: 'unsubscribed' }
    );
    res.json({ success: true, message: 'You have been unsubscribed successfully.' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
