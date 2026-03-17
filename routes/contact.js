const express  = require('express');
const router   = express.Router();
const Contact  = require('../models/Contact');
const { protect } = require('../middleware/auth');
const { sendEmailToAdmin, newContactEmail } = require('../utils/email');

// POST /api/contact — Public
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Save to database
    await Contact.create({
      name, email, subject, message,
      ip: req.ip || req.connection?.remoteAddress || ''
    });

    // Send email notification to admin (non-blocking)
    sendEmailToAdmin({
      subject:     `New Message: ${subject}`,
      htmlContent: newContactEmail({ name, email, subject, message }),
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon."
    });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

// GET /api/contact — Admin only
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/contact/:id/status — Admin only
router.put('/:id/status', protect, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, contact });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/contact/:id — Admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
