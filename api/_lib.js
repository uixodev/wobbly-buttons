// Shared helpers for the chat functions (the leading underscore keeps Vercel from exposing this file as an endpoint).
// Storage is Upstash Redis over its REST API (the free database you add from Vercel → Storage). Either pair of variable names works:
//   KV_REST_API_URL + KV_REST_API_TOKEN   (added by the Vercel integration)   or   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export const redisReady = () => !!((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN));

export async function redis(...cmd) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL, token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// Which websites may call these functions from a browser. Your own site calls them on the same address, so this only matters for other origins.
// Set ALLOWED_ORIGIN in Vercel to override it: one address, several separated by commas, or * for anyone.
const ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://viraa.me,https://www.viraa.me,https://wobbly-buttons.vercel.app').split(',').map((s) => s.trim()).filter(Boolean);
export const cors = (req, res) => {
  const origin = req.headers?.origin;
  if (ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && ORIGINS.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
};

export const validSid = (s) => typeof s === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(s);
export const TTL = 60 * 60 * 24 * 30;     // conversations are kept for 30 days
