const nodemailer = require('nodemailer');

// ── Create transporter ────────────────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not regular password)
    },
  });
};

// ── Verify connection on startup ──────────────────────────────────────────────
const verifyEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️  Email notifications disabled — EMAIL_USER or EMAIL_PASS not set');
    return;
  }
  const transporter = createTransporter();
  transporter.verify((error) => {
    if (error) {
      console.log('❌ Email config failed:', error.message);
    } else {
      console.log('✅ Email server is ready! Notifications will be sent to:', process.env.ADMIN_EMAIL);
    }
  });
};

// ── Base HTML email template ──────────────────────────────────────────────────
const baseTemplate = (title, content, actionUrl = null, actionLabel = null) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0faf2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%);padding:28px 36px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">🌿</div>
              <div style="color:#ffffff;font-size:1.4rem;font-weight:700;letter-spacing:0.5px;">Tflixs</div>
              <div style="color:rgba(255,255,255,0.75);font-size:0.85rem;margin-top:4px;">Admin Notification</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 16px;color:#1b4332;font-size:1.3rem;">${title}</h2>
              ${content}
              ${actionUrl ? `
              <div style="text-align:center;margin-top:28px;">
                <a href="${actionUrl}"
                   style="display:inline-block;background:#2d6a4f;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">
                  ${actionLabel || 'View Details →'}
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faf8;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#718096;font-size:0.78rem;">
                This is an automated notification from
                <a href="${process.env.SITE_URL || 'https://tflixs.com'}" style="color:#2d6a4f;">Tflixs</a>.
                You are receiving this because you are the site administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Send email to admin ────────────────────────────────────────────────────────
const sendEmailToAdmin = async ({ subject, htmlContent }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
    console.log('📧 Email skipped — email credentials not configured');
    return;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from:    `"Tflixs Notifications" <${process.env.EMAIL_USER}>`,
      to:      process.env.ADMIN_EMAIL,
      subject: `[Tflixs] ${subject}`,
      html:    htmlContent,
    });
    console.log(`✅ Admin notification sent: ${subject}`);
  } catch (error) {
    // Non-fatal — log but don't crash the server
    console.error('❌ Email send failed:', error.message);
  }
};

// ── Email Templates ───────────────────────────────────────────────────────────

/**
 * New contact message notification
 */
const newContactEmail = ({ name, email, subject, message }) => {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:10px 0;">
          <p style="margin:0 0 16px;color:#4a5568;font-size:0.95rem;">
            You have received a new contact message on Tflixs.
          </p>
          <table width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr style="background:#f0faf2;">
              <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;width:120px;">From</td>
              <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">Email</td>
              <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;border-top:1px solid #e2e8f0;">
                <a href="mailto:${email}" style="color:#2d6a4f;">${email}</a>
              </td>
            </tr>
            <tr style="background:#f0faf2;">
              <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">Subject</td>
              <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;border-top:1px solid #e2e8f0;">${subject}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;vertical-align:top;">Message</td>
              <td style="padding:10px 16px;color:#4a5568;font-size:0.9rem;border-top:1px solid #e2e8f0;line-height:1.6;">${message.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#718096;font-size:0.82rem;">
            Reply directly to <a href="mailto:${email}" style="color:#2d6a4f;">${email}</a> to respond.
          </p>
        </td>
      </tr>
    </table>
  `;
  return baseTemplate(
    `📬 New Message: ${subject}`,
    content,
    `${process.env.SITE_URL || 'https://tflixs.com'}/admin/contacts`,
    'View in Admin Panel'
  );
};

/**
 * New newsletter subscriber notification
 */
const newSubscriberEmail = ({ name, email }) => {
  const content = `
    <p style="color:#4a5568;font-size:0.95rem;margin:0 0 16px;">
      A new user just subscribed to the Tflixs newsletter.
    </p>
    <table width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr style="background:#f0faf2;">
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;width:120px;">Name</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;">${name || '(not provided)'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">Email</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;border-top:1px solid #e2e8f0;">${email}</td>
      </tr>
      <tr style="background:#f0faf2;">
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">Time</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;border-top:1px solid #e2e8f0;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
  `;
  return baseTemplate(
    '📧 New Newsletter Subscriber',
    content,
    `${process.env.SITE_URL || 'https://tflixs.com'}/admin/newsletter`,
    'View Subscribers'
  );
};

/**
 * New blog post published notification (self-notification)
 */
const blogPublishedEmail = ({ title, slug }) => {
  const url = `${process.env.SITE_URL || 'https://tflixs.com'}/blog/${slug}`;
  const content = `
    <p style="color:#4a5568;font-size:0.95rem;margin:0 0 16px;">
      A blog post has been published on Tflixs.
    </p>
    <table width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr style="background:#f0faf2;">
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;width:120px;">Title</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;">${title}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">URL</td>
        <td style="padding:10px 16px;font-size:0.9rem;border-top:1px solid #e2e8f0;">
          <a href="${url}" style="color:#2d6a4f;">${url}</a>
        </td>
      </tr>
      <tr style="background:#f0faf2;">
        <td style="padding:10px 16px;font-weight:600;color:#2d6a4f;font-size:0.85rem;border-top:1px solid #e2e8f0;">Published</td>
        <td style="padding:10px 16px;color:#1a1a2e;font-size:0.9rem;border-top:1px solid #e2e8f0;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p style="margin:16px 0 0;color:#718096;font-size:0.82rem;">
      The sitemap has been automatically updated to include this post.
    </p>
  `;
  return baseTemplate(
    `✅ Blog Post Published: ${title}`,
    content,
    url,
    'View Live Post'
  );
};

/**
 * Newsletter broadcast email template — sent to subscribers when a blog is published
 */
const newsletterBlogEmail = ({ subscriberName, title, slug, excerpt, category }) => {
  const postUrl  = `${process.env.SITE_URL || 'https://tflixs.com'}/blog/${slug}`;
  const calcUrl  = `${process.env.SITE_URL || 'https://tflixs.com'}/calculator`;
  const unsubUrl = `${process.env.SITE_URL || 'https://tflixs.com'}/unsubscribe`;

  const greeting = subscriberName ? `Hi ${subscriberName},` : 'Hello Farmer,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0faf2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%);padding:32px 36px;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="font-size:1.8rem;margin-bottom:6px;">🌿</div>
                    <div style="color:#ffffff;font-size:1.3rem;font-weight:700;">Tflixs Newsletter</div>
                    <div style="color:rgba(255,255,255,0.7);font-size:0.82rem;margin-top:2px;">Smart Farming Tips</div>
                  </td>
                  <td align="right">
                    <span style="background:rgba(255,255,255,0.15);color:#fff;padding:4px 12px;border-radius:99px;font-size:0.75rem;font-weight:600;">
                      ${category || 'Farming Guide'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 36px 0;">
              <p style="margin:0 0 8px;color:#4a5568;font-size:0.95rem;">${greeting}</p>
              <p style="margin:0 0 24px;color:#4a5568;font-size:0.95rem;line-height:1.6;">
                We just published a new farming guide for you. Here's what's new on Tflixs this week:
              </p>
            </td>
          </tr>

          <!-- Blog Post Card -->
          <tr>
            <td style="padding:0 36px;">
              <table width="100%" style="background:#f8faf8;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:24px;">
                    <div style="background:#d1fae5;color:#065f46;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:3px 10px;border-radius:99px;display:inline-block;margin-bottom:12px;">
                      ${category || 'New Article'}
                    </div>
                    <h2 style="margin:0 0 12px;color:#1b4332;font-size:1.25rem;line-height:1.3;">${title}</h2>
                    <p style="margin:0 0 20px;color:#4a5568;font-size:0.92rem;line-height:1.7;">${excerpt}</p>
                    <a href="${postUrl}"
                       style="display:inline-block;background:#2d6a4f;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem;">
                      Read Full Article →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 36px;">
              <table width="100%" style="background:linear-gradient(135deg,#f0faf2,#d1fae5);border-radius:12px;border:1px solid #a7f3d0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-weight:700;color:#1b4332;font-size:0.95rem;">
                      🧮 Need fertilizer recommendations?
                    </p>
                    <p style="margin:0 0 14px;color:#4a5568;font-size:0.85rem;">
                      Use our free NPK calculator for your crops — no registration needed.
                    </p>
                    <a href="${calcUrl}"
                       style="display:inline-block;background:#1b4332;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.85rem;">
                      Open Calculator
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faf8;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;color:#718096;font-size:0.75rem;">
                You are receiving this because you subscribed to Tflixs farming tips.
              </p>
              <p style="margin:0;font-size:0.75rem;">
                <a href="${unsubUrl}" style="color:#a0aec0;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${process.env.SITE_URL || 'https://tflixs.com'}" style="color:#2d6a4f;text-decoration:none;">Visit Tflixs</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Send blog post to ALL active newsletter subscribers.
 * Called after a blog post is published.
 * Sends in batches of 10 to avoid rate limits.
 */
const sendNewsletterBroadcast = async ({ title, slug, excerpt, category, subscribers }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('📧 Newsletter broadcast skipped — email not configured');
    return { sent: 0, failed: 0 };
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('📧 Newsletter broadcast skipped — no subscribers');
    return { sent: 0, failed: 0 };
  }

  const transporter = createTransporter();
  let sent = 0;
  let failed = 0;

  // Send in batches of 10 with a small delay between batches
  const BATCH_SIZE  = 10;
  const BATCH_DELAY = 1000; // 1 second between batches

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (subscriber) => {
        try {
          await transporter.sendMail({
            from:    `"Tflixs Newsletter" <${process.env.EMAIL_USER}>`,
            to:      subscriber.email,
            subject: `🌿 New Article: ${title}`,
            html:    newsletterBlogEmail({
              subscriberName: subscriber.name || '',
              title,
              slug,
              excerpt,
              category,
            }),
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${subscriber.email}:`, err.message);
          failed++;
        }
      })
    );

    // Delay between batches (except after the last one)
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(`📧 Newsletter broadcast: ${sent} sent, ${failed} failed`);
  return { sent, failed };
};

module.exports = {
  verifyEmailConfig,
  sendEmailToAdmin,
  newContactEmail,
  newSubscriberEmail,
  blogPublishedEmail,
  sendNewsletterBroadcast,
};
