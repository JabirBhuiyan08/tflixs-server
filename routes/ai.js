const express = require('express');
const router  = express.Router();
const https   = require('https');

const SYSTEM_PROMPT = `You are Flexi, a friendly and expert AI farming assistant for Tflixs (tflixs.com) — a free fertilizer calculator website.

Your expertise includes:
- Fertilizer recommendations (NPK, organic, micronutrients)
- Soil health and soil testing
- Crop nutrition for rice, wheat, maize, vegetables, fruits
- Pest and disease identification and treatment
- Irrigation and water management
- Organic and sustainable agriculture
- Crop calendar and seasonal farming advice

Guidelines:
- Keep answers concise and practical
- Use simple language — farmers are not always technical
- Suggest the Tflixs calculator at tflixs.com/calculator when relevant
- Use bullet points for lists
- Be encouraging and supportive
- Respond in the same language the user writes in (Bengali, Hindi, Arabic, etc.)`;

// ── Per-IP rate limiting ───────────────────────────────────────────────────
const ipCounts = new Map();
const checkRate = (ip) => {
  const now  = Date.now();
  const d    = ipCounts.get(ip) || { count: 0, reset: now + 3600000 };
  if (now > d.reset) { d.count = 0; d.reset = now + 3600000; }
  d.count++;
  ipCounts.set(ip, d);
  return d.count <= 20;
};

// ── Call Gemini API ────────────────────────────────────────────────────────
const callGemini = (apiKey, contents) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents,
      generationConfig: {
        temperature:     0.7,
        maxOutputTokens: 600,
        topP:            0.9,
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path:     `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Invalid JSON from Gemini')); }
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(new Error('Gemini timeout')); });
    req.write(payload);
    req.end();
  });
};

// ── GET /api/ai/models — list available models (debug) ────────────────────
router.get('/models', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, message: 'GEMINI_API_KEY not set' });
  try {
    const result = await new Promise((resolve, reject) => {
      const r = https.request(
        { hostname: 'generativelanguage.googleapis.com', path: `/v1beta/models?key=${apiKey}`, method: 'GET' },
        (res2) => {
          let d = '';
          res2.on('data', c => { d += c; });
          res2.on('end', () => resolve(JSON.parse(d)));
        }
      );
      r.on('error', reject);
      r.end();
    });
    const models = result.models
      ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map(m => m.name);
    res.json({ success: true, models });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── POST /api/ai/chat ──────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (!checkRate(ip)) {
      return res.status(429).json({ success: false, message: 'Too many questions. Please wait an hour.' });
    }

    const { message, history = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    if (message.length > 500) {
      return res.status(400).json({ success: false, message: 'Message too long (max 500 characters).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'AI not configured. Add GEMINI_API_KEY to your .env file.'
      });
    }

    // Build contents array
    // For gemini-2.0-flash we inject system prompt as first user message
    // then alternate user/model turns
    const contents = [];

    // System context as first user/model exchange
    contents.push({
      role:  'user',
      parts: [{ text: `[System: ${SYSTEM_PROMPT}]\n\nAcknowledge you are ready.` }]
    });
    contents.push({
      role:  'model',
      parts: [{ text: "I'm Flexi, your AI farming assistant! I'm ready to help with fertilizers, crops, soil health, and farming advice. What would you like to know?" }]
    });

    // Add conversation history (last 6 messages)
    const recent = history.slice(-6);
    for (const msg of recent) {
      contents.push({
        role:  msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Add current message
    contents.push({
      role:  'user',
      parts: [{ text: message }]
    });

    const { status, body } = await callGemini(apiKey, contents);

    if (status !== 200) {
      const errMsg = body?.error?.message || JSON.stringify(body?.error || body);
      console.error(`Gemini ${status}:`, errMsg);

      if (status === 401 || status === 403) {
        return res.status(502).json({ success: false, message: 'Invalid API key. Check GEMINI_API_KEY in .env' });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, message: 'Gemini rate limit reached. Try again in a minute.' });
      }
      return res.status(502).json({ success: false, message: `AI error (${status}): ${errMsg}` });
    }

    const reply = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('No reply from Gemini. Body:', JSON.stringify(body));
      return res.status(502).json({ success: false, message: 'No response from AI. Please try again.' });
    }

    res.json({ success: true, reply: reply.trim() });

  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

module.exports = router;