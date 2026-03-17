const express      = require('express');
const router       = express.Router();
const Blog         = require('../models/Blog');
const SitemapCache = require('../models/SitemapCache');

const SITE_URL = process.env.SITE_URL || 'https://tflixs.com';

const STATIC_PAGES = [
  { url: '/',           priority: '1.0', changefreq: 'weekly'  },
  { url: '/calculator', priority: '0.9', changefreq: 'monthly' },
  { url: '/blog',       priority: '0.8', changefreq: 'daily'   },
  { url: '/calendar',   priority: '0.7', changefreq: 'monthly' },
  { url: '/pest-guide', priority: '0.7', changefreq: 'monthly' },
  { url: '/about',      priority: '0.5', changefreq: 'monthly' },
  { url: '/contact',    priority: '0.5', changefreq: 'monthly' },
];

const formatDate  = (d) => new Date(d).toISOString().split('T')[0];
const escapeXml   = (s) => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/**
 * Build the sitemap XML and cache it in MongoDB.
 * This means the frontend (Firebase) can fetch /api/sitemap/urls
 * to get the latest URL list, keeping Firebase in sync with Vercel.
 */
const buildAndCacheSitemap = async () => {
  const today = formatDate(new Date());
  const blogs = await Blog.find({ published: true })
    .select('slug updatedAt createdAt')
    .sort({ updatedAt: -1 });

  // Build URL list
  const urls = [
    ...STATIC_PAGES.map(p => ({
      loc:        `${SITE_URL}${p.url}`,
      lastmod:    today,
      changefreq: p.changefreq,
      priority:   p.priority,
    })),
    ...blogs.map(b => ({
      loc:        `${SITE_URL}/blog/${escapeXml(b.slug)}`,
      lastmod:    formatDate(b.updatedAt || b.createdAt),
      changefreq: 'monthly',
      priority:   '0.7',
    }))
  ];

  // Build full XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const u of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${u.loc}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  xml += `</urlset>`;

  // Save to MongoDB (upsert)
  await SitemapCache.findOneAndUpdate(
    { key: 'main' },
    { key: 'main', urls, fullXml: xml, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return { xml, urls };
};

/**
 * GET /sitemap.xml
 * Serves dynamic XML sitemap — also refreshes the MongoDB cache.
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const { xml } = await buildAndCacheSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /api/sitemap/urls
 * Public JSON endpoint — returns the cached list of sitemap URLs.
 * Firebase frontend uses this to stay in sync with Vercel's sitemap.
 * Auto-rebuilds cache if older than 6 hours.
 */
router.get('/api/sitemap/urls', async (req, res) => {
  try {
    let cache = await SitemapCache.findOne({ key: 'main' });
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Rebuild if cache is stale or missing
    if (!cache || cache.updatedAt < sixHoursAgo) {
      const { urls } = await buildAndCacheSitemap();
      return res.json({ success: true, urls, cached: false, total: urls.length });
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({
      success:   true,
      urls:      cache.urls,
      cached:    true,
      updatedAt: cache.updatedAt,
      total:     cache.urls.length
    });
  } catch (err) {
    console.error('Sitemap URLs error:', err);
    res.status(500).json({ success: false, message: 'Error fetching sitemap URLs' });
  }
});

/**
 * GET /robots.txt
 */
router.get('/robots.txt', (req, res) => {
  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(content);
});

module.exports = router;
