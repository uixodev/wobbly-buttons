// Serverless function (Vercel style: put this repo's /api folder on Vercel, or copy the body to a Netlify / Cloudflare function).
// The chat on the site POSTs { name, contact, message } here; this forwards it to YOUR WhatsApp with Meta's official WhatsApp Business Cloud API,
// so visitors never see your number.
//
// Environment variables (set them in the hosting dashboard, never in the page):
//   WA_TOKEN          permanent access token of your Meta system user (or the temporary one while testing)
//   WA_PHONE_ID       the "Phone number ID" of the WhatsApp Business number you send FROM (Meta dashboard → WhatsApp → API setup)
//   OWNER_NUMBER      YOUR own WhatsApp number, country code + digits only, e.g. 447123456789 (messages arrive here)
//   WA_TEMPLATE       name of an approved message template with 3 body variables: {{1}} name, {{2}} reply-to, {{3}} message (recommended; see README)
//   WA_TEMPLATE_LANG  language code of that template, default en_US
//   ALLOWED_ORIGIN    your site address, e.g. https://viraa.me  (optional but recommended)
// Without WA_TEMPLATE it sends a plain text message, which WhatsApp only delivers if you have messaged the business number in the last 24 hours.

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

  // tidy the settings people most often paste wrongly: stray spaces / quotes / a leading "Bearer " on the token, "+" or spaces in the numbers
  const token = String(process.env.WA_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
  const phoneId = String(process.env.WA_PHONE_ID || '').replace(/\D/g, ''), owner = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
  const missing = [!token && 'WA_TOKEN', !phoneId && 'WA_PHONE_ID', !owner && 'OWNER_NUMBER'].filter(Boolean);
  if (missing.length) { console.error('Missing environment variables (set them for Production, then redeploy):', missing.join(', ')); return res.status(500).json({ ok: false, error: 'config' }); }
  if (!/^EA/.test(token)) console.error('WA_TOKEN does not look like a Meta access token (they start with EA...). Check you pasted the token, not the phone number ID.');
  const one = (v) => v.replace(/\s+/g, ' ');                                   // template variables cannot contain line breaks
  const payload = process.env.WA_TEMPLATE
    ? { messaging_product: 'whatsapp', to: owner, type: 'template', template: { name: process.env.WA_TEMPLATE, language: { code: process.env.WA_TEMPLATE_LANG || 'en_US' }, components: [{ type: 'body', parameters: [name || 'Someone', contact, message].map((t) => ({ type: 'text', text: one(t) || '-' })) }] } }
    : { messaging_product: 'whatsapp', to: owner, type: 'text', text: { body: `New message from your website\nName: ${name || '—'}\nReply to: ${contact}\n\n${message}` } };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) { console.error('WhatsApp API error', r.status, await r.text()); return res.status(502).json({ ok: false, error: 'upstream' }); }
    recent.push(now); hits.set(ip, recent);
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false, error: 'upstream' }); }
}
