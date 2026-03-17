const express = require('express');
const router  = express.Router();

/**
 * All external API calls are proxied through this server route.
 * This avoids CORS issues when calling from the browser in production.
 *
 * Routes:
 *   GET /api/geo/detect          — detect country/city from IP
 *   GET /api/geo/rates           — get USD exchange rates
 *   GET /api/geo/weather?lat=&lon= — get weather for coordinates
 *   GET /api/geo/reverse?lat=&lon= — reverse geocode coordinates
 */

// Simple in-memory cache to avoid hammering external APIs
const cache = new Map();
const CACHE_TTL = {
  geo:     10 * 60 * 1000,   // 10 minutes — IP location doesn't change often
  rates:   60 * 60 * 1000,   // 1 hour — exchange rates update hourly
  weather:  30 * 60 * 1000,  // 30 minutes — weather updates every 30min
  reverse: 24 * 60 * 60 * 1000, // 24 hours — city names don't change
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) { cache.delete(key); return null; }
  return item.data;
};
const setCache = (key, data, ttl) => {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
};

// ── GET /api/geo/detect ──────────────────────────────────────────────────────
// Detect country/city from the requester's IP address
router.get('/detect', async (req, res) => {
  try {
    // Get real IP (works behind Vercel/proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || '';

    // Don't look up localhost IPs in development
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
      return res.json({
        success:      true,
        country_code: 'US',
        country_name: 'United States',
        city:         'Local Development',
        latitude:     40.7128,
        longitude:   -74.0060,
        dev:          true
      });
    }

    const cacheKey = `geo_${ip}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });

    // Try ipapi.co (server-to-server — no CORS issues)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'Tflixs/1.0 (tflixs.com)' }
    });

    if (!response.ok) throw new Error(`ipapi.co returned ${response.status}`);
    const data = await response.json();

    if (data.error) throw new Error(data.reason || 'IP lookup failed');

    const result = {
      country_code: data.country_code || 'US',
      country_name: data.country_name || 'Unknown',
      city:         data.city         || '',
      region:       data.region        || '',
      latitude:     data.latitude      || 0,
      longitude:    data.longitude     || 0,
      timezone:     data.timezone      || 'UTC',
      currency:     data.currency      || 'USD',
    };

    setCache(cacheKey, result, CACHE_TTL.geo);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Geo detect error:', err.message);
    // Return US defaults on failure — never break the site
    res.json({
      success:      true,
      country_code: 'US',
      country_name: 'United States',
      city:         '',
      latitude:     40.7128,
      longitude:   -74.0060,
      fallback:     true
    });
  }
});

// ── GET /api/geo/rates ───────────────────────────────────────────────────────
// Get latest USD exchange rates
router.get('/rates', async (req, res) => {
  try {
    const cached = getCache('exchange_rates');
    if (cached) return res.json({ success: true, rates: cached, cached: true });

    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Exchange rate API failed');

    const data = await response.json();
    if (data.result !== 'success') throw new Error('Invalid exchange rate response');

    setCache('exchange_rates', data.rates, CACHE_TTL.rates);
    res.json({ success: true, rates: data.rates });
  } catch (err) {
    console.error('Exchange rates error:', err.message);
    // Return hardcoded fallback rates
    res.json({
      success:  true,
      rates:    FALLBACK_RATES,
      fallback: true
    });
  }
});

// ── GET /api/geo/weather?lat=&lon= ───────────────────────────────────────────
// Get weather forecast for coordinates
router.get('/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon are required' });
    }

    const cacheKey = `weather_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
    const cached   = getCache(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });

    const url = `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&timezone=auto&forecast_days=5`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');

    const data = await response.json();
    setCache(cacheKey, data, CACHE_TTL.weather);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Weather error:', err.message);
    res.status(502).json({ success: false, message: 'Weather data unavailable' });
  }
});

// ── GET /api/geo/reverse?lat=&lon= ──────────────────────────────────────────
// Reverse geocode coordinates to city name
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon are required' });
    }

    const cacheKey = `reverse_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
    const cached   = getCache(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'User-Agent': 'Tflixs/1.0 (tflixs.com)' } }
    );

    if (!response.ok) throw new Error('Reverse geocode failed');
    const data = await response.json();

    const result = {
      city:    data.address?.city || data.address?.town || data.address?.village || 'Your Location',
      country: data.address?.country || '',
      display: data.display_name || ''
    };

    setCache(cacheKey, result, CACHE_TTL.reverse);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    res.json({ success: true, city: 'Your Location', country: '', fallback: true });
  }
});

// Fallback exchange rates (used if API is down)
const FALLBACK_RATES = {
  USD:1,    EUR:0.92, GBP:0.79, INR:83.5, BDT:110,  PKR:278,
  NPR:133,  IDR:15700,PHP:57,   THB:35,   VND:24500, MYR:4.7,
  LKR:325,  CNY:7.2,  JPY:149,  KRW:1320, NGN:1550,  GHS:14,
  KES:130,  EGP:31,   SAR:3.75, BRL:5.0,  MXN:17,    AUD:1.53,
  ETB:56,   ARS:900,  NZD:1.63,
};

module.exports = router;
