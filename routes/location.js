const express = require('express');
const router  = express.Router();
const https   = require('https');

/**
 * GET /api/location
 * Server-side proxy for IP geolocation.
 * Calling ipapi.co directly from the browser fails on production
 * due to CORS restrictions on their free tier.
 * This route calls ipapi.co server-to-server (no CORS issue)
 * and returns the result to the frontend.
 */
router.get('/', (req, res) => {
  // Get the real client IP (Vercel passes it via headers)
  const clientIP =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    '';

  // Don't look up localhost IPs
  const isLocal = !clientIP ||
    clientIP === '127.0.0.1' ||
    clientIP === '::1' ||
    clientIP.startsWith('192.168.') ||
    clientIP.startsWith('10.');

  if (isLocal) {
    // Return a default for local development
    return res.json({
      success: true,
      country_code: 'US',
      country_name: 'United States',
      city: 'Local Dev',
      latitude: 40.7128,
      longitude: -74.0060,
      isLocal: true,
    });
  }

  // Call ipapi.co server-to-server — no CORS issues here
  const url = `https://ipapi.co/${clientIP}/json/`;

  https.get(url, { headers: { 'User-Agent': 'Tflixs/1.0' } }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          // ipapi.co rate limited or invalid IP — return safe default
          return res.json({ success: true, country_code: 'US', country_name: 'United States', isDefault: true });
        }
        res.json({
          success:      true,
          country_code: parsed.country_code || 'US',
          country_name: parsed.country_name || 'United States',
          city:         parsed.city || '',
          latitude:     parsed.latitude,
          longitude:    parsed.longitude,
        });
      } catch {
        res.json({ success: true, country_code: 'US', country_name: 'United States', isDefault: true });
      }
    });
  }).on('error', () => {
    res.json({ success: true, country_code: 'US', country_name: 'United States', isDefault: true });
  });
});

module.exports = router;
