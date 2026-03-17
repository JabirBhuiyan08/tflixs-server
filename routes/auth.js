const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const admin   = require('firebase-admin');
const Admin   = require('../models/Admin');
const { protect } = require('../middleware/auth');

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Lazily initialise Firebase Admin SDK (only once)
const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin;

  const serviceAccount = {
    type:                        'service_account',
    project_id:                  process.env.FIREBASE_PROJECT_ID,
    private_key_id:              process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key:                 (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email:                process.env.FIREBASE_CLIENT_EMAIL,
    client_id:                   process.env.FIREBASE_CLIENT_ID,
    auth_uri:                    'https://accounts.google.com/o/oauth2/auth',
    token_uri:                   'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:        process.env.FIREBASE_CLIENT_CERT_URL,
  };

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
};

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/firebase-login
 * Accepts a Firebase ID token from the frontend, verifies it with Firebase Admin SDK,
 * enforces single-admin policy, then issues a backend JWT for all /api/* calls.
 */
router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required.' });
    }

    // Verify the Firebase ID token
    const firebaseAdmin = getFirebaseAdmin();
    let decoded;
    try {
      decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token.' });
    }

    const { email, uid, name: displayName } = decoded;

    // ── Single-admin enforcement ──────────────────────────────────────────
    const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (allowedEmail && email.toLowerCase() !== allowedEmail) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not authorised.' });
    }

    // ── Upsert the admin record in MongoDB ───────────────────────────────
    let adminDoc = await Admin.findOne({ email: email.toLowerCase() });
    if (!adminDoc) {
      // Create a placeholder admin (no password needed — auth is via Firebase)
      adminDoc = await Admin.create({
        email:    email.toLowerCase(),
        name:     displayName || 'Admin',
        password: uid,          // unused — Firebase handles auth
        role:     'admin',
      });
      console.log(`✅ Admin record auto-created for ${email}`);
    }

    const token = generateToken(adminDoc._id);
    res.json({
      success: true,
      token,
      admin: { id: adminDoc._id, email: adminDoc.email, name: adminDoc.name, role: adminDoc.role },
    });
  } catch (error) {
    console.error('firebase-login error:', error);
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
});

/**
 * GET /api/auth/me  (JWT-protected)
 */
router.get('/me', protect, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

/**
 * POST /api/auth/login  (legacy email/password — kept for dev/testing)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });

    const adminDoc = await Admin.findOne({ email: email.toLowerCase() });
    if (!adminDoc || !(await adminDoc.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const token = generateToken(adminDoc._id);
    res.json({
      success: true, token,
      admin: { id: adminDoc._id, email: adminDoc.email, name: adminDoc.name, role: adminDoc.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
