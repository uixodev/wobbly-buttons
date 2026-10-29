// Open /api/status in a browser to see whether the two-way chat is set up. It shows only yes/no answers and times, never any secret or message text.
import { redis, redisReady, cors } from './_lib.js';

const set = (n) => !!String(process.env[n] || '').trim();

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const out = {
    settings: { WA_TOKEN: set('WA_TOKEN'), WA_PHONE_ID: set('WA_PHONE_ID'), OWNER_NUMBER: set('OWNER_NUMBER'), WA_VERIFY_TOKEN: set('WA_VERIFY_TOKEN'), WA_APP_SECRET: set('WA_APP_SECRET'), redis: redisReady() },
  };
  if (redisReady()) {
    try {
      const w = await redis('GET', 'wh:last'); const last = w ? JSON.parse(w) : null;
      out.lastWebhook = last ? { ...last, secondsAgo: Math.round((Date.now() - last.t) / 1000) } : 'none yet: Meta has not reached /api/whatsapp-webhook since this was deployed';
      out.latestVisitorStored = !!(await redis('GET', 'last-sid'));
    } catch (e) { out.redisError = e.message; }
  }
  return res.status(200).json(out);
}
