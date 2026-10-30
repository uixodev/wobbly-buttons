// A visitor's message → your WhatsApp (Meta WhatsApp Business Cloud API). Visitors never see your number.
// Two-way chat: the message is remembered per visitor (sid), and the WhatsApp message id is stored so your reply can be matched back (see whatsapp-webhook.js).
//
// Environment variables (hosting dashboard, never the page):
//   WA_TOKEN, WA_PHONE_ID, OWNER_NUMBER   WhatsApp Cloud API token, the Phone number ID you send FROM, and YOUR WhatsApp number (country code + digits)
//   WA_TEMPLATE, WA_TEMPLATE_LANG         approved template with 3 body variables {{1}} name {{2}} reply-to {{3}} message (recommended)
//   ALLOWED_ORIGIN                        your site address (optional)
//   + the Upstash Redis variables (see _lib.js) for the two-way part

import { redis, redisReady, cors, validSid, TTL } from './_lib.js';

const hits = new Map();                     // tiny in-memory rate limit: 20 messages per IP per hour

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown', now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 20) return res.status(429).json({ ok: false, error: 'rate' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
  const anon = body.anon === true;                                         // anonymous live chat: no name, no email
  const name = anon ? 'Anonymous' : clean(body.name, 80), contact = anon ? 'Anonymous (answer in the chat)' : clean(body.contact, 120), message = clean(body.message, 800), sid = body.sid;
  if (body.website) return res.status(200).json({ ok: true });            // honeypot field: bots fill it in, people never see it
  if (!message || (!anon && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact))) return res.status(400).json({ ok: false, error: 'missing' });      // a normal message needs an email to reply to

  const token = String(process.env.WA_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
  const phoneId = String(process.env.WA_PHONE_ID || '').replace(/\D/g, ''), owner = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
  const missing = [!token && 'WA_TOKEN', !phoneId && 'WA_PHONE_ID', !owner && 'OWNER_NUMBER'].filter(Boolean);
  if (missing.length) { console.error('Missing environment variables (set them for Production, then redeploy):', missing.join(', ')); return res.status(500).json({ ok: false, error: 'config' }); }
  if (!/^EA/.test(token)) console.error('WA_TOKEN does not look like a Meta access token (they start with EA...).');

  const one = (v) => v.replace(/\s+/g, ' ');
  const tag = validSid(sid) ? ` [#${sid.slice(0, 4)}]` : '';
  const payload = process.env.WA_TEMPLATE
    ? { messaging_product: 'whatsapp', to: owner, type: 'template', template: { name: process.env.WA_TEMPLATE, language: { code: process.env.WA_TEMPLATE_LANG || 'en_US' }, components: [{ type: 'body', parameters: [(name || 'Someone') + tag, contact, message].map((t) => ({ type: 'text', text: one(t) || '-' })) }] } }
    : { messaging_product: 'whatsapp', to: owner, type: 'text', text: { body: anon ? `New LIVE anonymous message${tag}\n\n${message}\n\n(They are waiting in the chat: use WhatsApp's Reply on this message to answer there.)` : `New message from your website${tag}\nName: ${name || '—'}\nReply by email: ${contact}\n\n${message}\n\n(They expect an email reply. WhatsApp's Reply on this message also shows your answer in their chat.)` } };
  try {
    const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) { console.error('WhatsApp API error', r.status, await r.text()); return res.status(502).json({ ok: false, error: 'upstream' }); }
    recent.push(now); hits.set(ip, recent);
    // two-way: remember the conversation and which WhatsApp message belongs to which visitor
    if (redisReady() && validSid(sid)) {
      try {
        const j = await r.json(), wamid = j?.messages?.[0]?.id;
        await redis('RPUSH', `chat:${sid}`, JSON.stringify({ from: 'visitor', text: message, t: now }));
        await redis('EXPIRE', `chat:${sid}`, TTL);
        if (wamid) await redis('SET', `wa:${wamid}`, sid, 'EX', TTL);
        await redis('SET', 'last-sid', sid, 'EX', TTL);                // replies not sent with "Reply" go to the most recent visitor
      } catch (e) { console.error('Redis error (message was still delivered):', e.message); }
    }
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false, error: 'upstream' }); }
}
