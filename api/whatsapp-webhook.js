// Meta calls this when you reply on WhatsApp. It finds the visitor the reply belongs to and stores it so the website chat can show it.
// Set up in Meta → WhatsApp → Configuration → Webhook:  Callback URL = https://YOUR-SITE/api/whatsapp-webhook   Verify token = the same text you put in WA_VERIFY_TOKEN
//   then subscribe to the "messages" field.
// Environment variables: WA_VERIFY_TOKEN (any long random text you invent), WA_APP_SECRET (App settings → Basic → App secret; used to check the call really came from Meta),
//   OWNER_NUMBER, and the Upstash Redis variables.

import crypto from 'node:crypto';
import { redis, redisReady, validSid, TTL } from './_lib.js';

export const config = { api: { bodyParser: false } };               // we need the raw body to check Meta's signature

const raw = (req) => new Promise((resolve, reject) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); req.on('error', reject); });

export default async function handler(req, res) {
  if (req.method === 'GET') {                                       // Meta's one-time check when you save the webhook
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q['hub.mode'] === 'subscribe' && process.env.WA_VERIFY_TOKEN && q['hub.verify_token'] === process.env.WA_VERIFY_TOKEN) return res.status(200).send(q['hub.challenge']);
    return res.status(403).send('forbidden');
  }
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await raw(req);
  const secret = process.env.WA_APP_SECRET;
  if (secret) {
    const sig = String(req.headers['x-hub-signature-256'] || ''), want = 'sha256=' + crypto.createHmac('sha256', secret).update(buf).digest('hex');
    if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) { console.error('Webhook signature mismatch'); return res.status(401).end(); }
  } else console.error('WA_APP_SECRET is not set: webhook calls are not being verified');

  let data; try { data = JSON.parse(buf.toString('utf8') || '{}'); } catch (e) { return res.status(400).end(); }
  const owner = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
  try {
    if (redisReady()) for (const entry of data.entry || []) for (const ch of entry.changes || []) for (const m of ch.value?.messages || []) {
      if (String(m.from) !== owner) continue;                       // only YOUR replies are relayed to visitors
      const text = m.type === 'text' ? m.text?.body : '';
      if (!text) continue;
      let sid = m.context?.id ? await redis('GET', `wa:${m.context.id}`) : null;      // you used WhatsApp's "Reply" on a forwarded message
      if (!sid) sid = await redis('GET', 'last-sid');                                // otherwise: the most recent visitor
      if (!validSid(sid)) continue;
      await redis('RPUSH', `chat:${sid}`, JSON.stringify({ from: 'vira', text: String(text).slice(0, 1000), t: Date.now() }));
      await redis('EXPIRE', `chat:${sid}`, TTL);
    }
  } catch (e) { console.error('Webhook error:', e.message); }
  return res.status(200).end();                                      // always answer 200 so Meta does not retry
}
