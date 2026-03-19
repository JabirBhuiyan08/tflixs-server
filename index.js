const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

// Verify email configuration on startup
const { verifyEmailConfig } = require('./utils/email');
verifyEmailConfig();

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Strict limiter for sensitive write endpoints (auth, contact, AI)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max:      isDev ? 500 : 50,         // relaxed in dev, strict in prod
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please wait and try again.' },
  skip: (req) => isDev && req.method === 'GET', // never limit GET in dev
});

// Relaxed limiter for read-only public endpoints
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,           // 1 minute window
  max:      isDev ? 1000 : 300,       // very relaxed — these are just data reads
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://tflixs.com',
  'https://www.tflixs.com',
  'https://t-flix-cc606.web.app',
  'https://t-flix-cc606.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman, curl, mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes (with appropriate rate limiters) ───────────────────────────────────

// Read-only public data — relaxed limit
app.use('/api/seo',        readLimiter, require('./routes/seo'));
app.use('/api/adsense',    readLimiter, require('./routes/adsense'));
app.use('/api/blogs',      readLimiter, require('./routes/blogs'));
app.use('/api/calculator', readLimiter, require('./routes/calculator'));
app.use('/api/location',   readLimiter, require('./routes/location'));

// Auth & write operations — strict limit
app.use('/api/auth',       strictLimiter, require('./routes/auth'));
app.use('/api/contact',    strictLimiter, require('./routes/contact'));
app.use('/api/ai',         strictLimiter, require('./routes/ai'));
app.use('/api/newsletter', strictLimiter, require('./routes/newsletter'));

// Sitemap & robots — no rate limit needed (Google crawlers hit these)
app.use('/', require('./routes/sitemap'));

// Pages — strict limit for privacy-policy and terms-of-service
app.use('/api/pages', strictLimiter, require('./routes/pages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tflixs API is running ✅', env: process.env.NODE_ENV || 'development' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// ── DB + Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tflixs')
  .then(() => {
    console.log('✅ MongoDB connected');
    if (process.env.VERCEL !== '1') {
      app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
    }
    require('./utils/seedAdmin');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
