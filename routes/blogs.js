const express  = require('express');
const router   = express.Router();
const Blog     = require('../models/Blog');
const Newsletter = require('../models/Newsletter');
const { protect } = require('../middleware/auth');
const { sendEmailToAdmin, blogPublishedEmail, sendNewsletterBroadcast } = require('../utils/email');
// GET /api/blogs - Public: get all published blogs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;
    const query = { published: true };
    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-content');
    res.json({ success: true, blogs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/blogs/admin - Admin: get all blogs
router.get('/admin', protect, async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).select('-content');
    res.json({ success: true, blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/blogs/:slug - Public: get single blog
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    blog.views += 1;
    await blog.save();
    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/blogs - Admin: create blog
router.post('/', protect, async (req, res) => {
  try {
    const { title, excerpt, content, category, tags, featuredImage, published,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, ogImage } = req.body;
    
    // Generate unique slug
    let slug = title.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim('-');
    const existing = await Blog.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const blog = await Blog.create({
      title, slug, excerpt, content, category,
      tags: tags || [], featuredImage, published,
      metaTitle, metaDescription, metaKeywords, canonicalUrl, ogImage
    });

    // Notify admin when post is published
    if (published) {
      // Admin notification
      sendEmailToAdmin({
        subject:     `Blog Post Published: ${title}`,
        htmlContent: blogPublishedEmail({ title, slug }),
      });

      // Broadcast to newsletter subscribers (non-blocking)
      Newsletter.find({ status: 'active' }).then(subscribers => {
        if (subscribers.length > 0) {
          sendNewsletterBroadcast({ title, slug, excerpt, category, subscribers })
            .then(({ sent, failed }) => {
              console.log(`📧 Newsletter sent to ${sent} subscribers (${failed} failed) for: ${title}`);
            });
        }
      }).catch(err => console.error('Newsletter fetch error:', err.message));
    }

    res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/blogs/:id - Admin: update blog
router.put('/:id', protect, async (req, res) => {
  try {
    const existingBlog = await Blog.findById(req.params.id);
    const wasUnpublished = existingBlog && !existingBlog.published;
    const nowPublished   = req.body.published === true;

    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    // Notify admin only when a draft is newly published (not on every save)
    if (wasUnpublished && nowPublished) {
      // Admin notification
      sendEmailToAdmin({
        subject:     `Blog Post Published: ${blog.title}`,
        htmlContent: blogPublishedEmail({ title: blog.title, slug: blog.slug }),
      });

      // Broadcast to newsletter subscribers (non-blocking)
      Newsletter.find({ status: 'active' }).then(subscribers => {
        if (subscribers.length > 0) {
          sendNewsletterBroadcast({
            title:      blog.title,
            slug:       blog.slug,
            excerpt:    blog.excerpt,
            category:   blog.category,
            subscribers
          }).then(({ sent, failed }) => {
            console.log(`📧 Newsletter sent to ${sent} subscribers (${failed} failed) for: ${blog.title}`);
          });
        }
      }).catch(err => console.error('Newsletter fetch error:', err.message));
    }

    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/blogs/:id - Admin: delete blog
router.delete('/:id', protect, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
