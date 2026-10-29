// The website chat asks this for the conversation of one visitor: GET /api/messages?sid=...&after=N → { ok, items: [...], next }
import { redis, redisReady, cors, validSid } from './_lib.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const sid = q.sid, after = Math.max(0, parseInt(q.after, 10) || 0);
  if (!validSid(sid)) return res.status(400).json({ ok: false, error: 'sid' });
  if (!redisReady()) return res.status(200).json({ ok: true, items: [], next: after, live: false });
  try {
    const list = await redis('LRANGE', `chat:${sid}`, after, after + 49);
    const items = (list || []).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, items, next: after + (list || []).length, live: true });
  } catch (e) { console.error('Redis error:', e.message); return res.status(502).json({ ok: false }); }
}
