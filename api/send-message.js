// Serverless function (Vercel style: put this repo's /api folder on Vercel, or copy the body to a Netlify / Cloudflare function).
// The chat on the site POSTs { name, contact, message } here; this forwards it to YOUR WhatsApp, so visitors never see your number.
//
// Environment variables (set them in the hosting dashboard, never in the page):
//   CALLMEBOT_PHONE   your WhatsApp number with country code, digits only, e.g. 447123456789
//   CALLMEBOT_KEY     the key CallMeBot sends you after you activate it (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
//   ALLOWED_ORIGIN    your site address, e.g. https://viraa.me  (optional but recommended)
//
// Want the official route instead? Replace the fetch below with a call to the WhatsApp Cloud API (graph.facebook.com/v20.0/<PHONE_ID>/messages)
// using WA_TOKEN / WA_PHONE_ID / OWNER_NUMBER; the rest stays the same.

const hits = new Map();                     // tiny in-memory rate limit: 5 messages per IP per hour

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown', now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: 'rate' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
  const name = clean(body.name, 80), contact = clean(body.contact, 120), message = clean(body.message, 800);
  if (body.website) return res.status(200).json({ ok: true });            // honeypot field: bots fill it in, people never see it
  if (!message || !contact) return res.status(400).json({ ok: false, error: 'missing' });

  const text = `New message from your website\nName: ${name || '—'}\nReply to: ${contact}\n\n${message}`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(process.env.CALLMEBOT_PHONE || '')}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_KEY || '')}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ ok: false, error: 'upstream' });
    recent.push(now); hits.set(ip, recent);
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false, error: 'upstream' }); }
}
