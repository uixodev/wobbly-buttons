// A little chat with Vira. Quick replies answer common questions (edit ANSWERS below). To leave a message, the visitor writes it, gives a name and a way to reply,
// and the chat sends it to /api/send-message (see api/send-message.js), which forwards it to your WhatsApp. Visitors never see your number.
// Replies: when you answer on WhatsApp, api/whatsapp-webhook.js stores your reply and this chat picks it up from /api/messages every few seconds.

const SEND_URL = '/api/send-message', MSG_URL = '/api/messages';      // where messages are sent (the serverless function in /api). Change it if you host the function elsewhere.

// ── Your information: change the text here and the chat's answers update. ─────────────────────────────────────────────────────────────────────────
const INFO = {
  who: 'a web designer in Bristol, UK',
  services: 'web design, development, creative extras, website refreshes and ongoing support',
  open: true,                                   // true: "I'm open for new projects"  ·  false: "I'm fully booked right now" (see the avail answer)
};
const ANSWERS = {
  do: { q: 'What do you do?', a: `I’m Vira, ${INFO.who}. I design and build distinctive websites for beauty studios, small businesses and creative people — with personality in every detail.`, next: ['services', 'work', 'process'] },
  services: { q: 'What can you help with?', a: `I can help with ${INFO.services}. Not sure which one you need? Tell me about your idea and we’ll work it out.`, next: ['process', 'price', 'msg'] },
  process: { q: 'How does a project work?', a: 'We start with a chat about you and your idea. Then: hello → sketch → build → launch. You see it early, we tweak it together, and I look after the launch.', next: ['price', 'avail', 'msg'] },
  price: { q: 'About pricing', a: 'Every project is a bit different, so I quote after hearing about your idea. Tell me what you need and I’ll give you an honest range — no surprises.', next: ['avail', 'msg', 'do'] },
  avail: { q: 'Are you available?', a: INFO.open ? 'I’m open for new projects. The quickest way to start is a short message — it takes a minute.' : 'I’m fully booked right now, but leave a message and I’ll tell you when I have space.', next: ['msg', 'do'] },
  work: { q: 'Show me your work', a: 'Sure — I’ll take you to my projects.', action: () => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' }), next: ['process', 'price', 'msg'] },
  blog: { q: 'Read your blog', a: 'Here are my notes on design, pricing, domains and how I work with AI.', action: () => document.getElementById('blog')?.scrollIntoView({ behavior: 'smooth' }), next: ['price', 'msg'] },
  msg: { q: 'Leave me a message', a: 'I’d love that. What would you like to tell me? Then I’ll ask for your name and email — I’ll reply to you by email, not here.', ask: 'message', next: [] },
  live: { q: 'Chat with me live, anonymously', a: 'Sure — no name or email needed. Type your message below and it goes straight to my phone. I’ll reply right here in this chat, so keep it open while you wait. Please don’t share anything private.', ask: 'live', next: [] },
};
const START = ['do', 'process', 'price', 'msg', 'live'];

const dock = document.getElementById('chat-dock'), fab = document.getElementById('chat-fab'), sugg = document.getElementById('chat-sugg'), closeBtn = document.getElementById('chat-x');
const log = document.getElementById('chat-log'), quick = document.getElementById('chat-quick'), form = document.getElementById('chat-form'), input = document.getElementById('chat-input'), root = document.getElementById('chat');
if (log && quick && form) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, busy = false;
  // two-way: each visitor gets a private conversation id; once they have left a first message, they can keep chatting and Vira's WhatsApp replies appear here
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let sid = store.get('vira-chat-sid'); if (!sid) { sid = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); store.set('vira-chat-sid', sid); }
  let who = null; try { who = JSON.parse(store.get('vira-chat-who') || 'null'); } catch (e) {}
  if (who && !who.anon && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(who.contact || '')) who = null;      // an older chat saved a phone number: ask again, now for an email
  let next = 0, pollTimer = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const scroll = () => { log.scrollTop = log.scrollHeight; };

  let shapeN = 0;
  function bubble(text, who) { const b = document.createElement('div'); b.className = `cb ${who} sh${(shapeN++ % 3) + 1}`; if (typeof text === 'string') b.textContent = text; else b.append(text); log.append(b); scroll(); return b; }
  async function say(text, extra) {
    const t = bubble('', 'bot typing'); t.innerHTML = '<i></i><i></i><i></i>'; await wait(650 + Math.min(900, text.length * 8));
    t.classList.remove('typing'); t.textContent = text; if (extra) t.append(extra); scroll();
  }
  function chips(keys) {
    quick.replaceChildren();
    keys.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cq'; b.textContent = ANSWERS[k].q; b.addEventListener('click', () => choose(k)); quick.append(b); });
  }
  const pullReplies = async (history) => {
    try {
      const r = await fetch(`${MSG_URL}?sid=${encodeURIComponent(sid)}&after=${next}`, { cache: 'no-store' }); if (!r.ok) return; const d = await r.json(); if (!d.ok) return; next = d.next;
      d.items.forEach((m) => { if (m.from === 'vira') bubble(m.text, 'bot'); else if (history) bubble(m.text, 'me'); });
      if (d.items.some((m) => m.from === 'vira') && !dock.classList.contains('open')) fab.classList.add('ping');
    } catch (e) { /* offline: try again next time */ }
  };
  const startPolling = () => { clearInterval(pollTimer); if (!who) return; pollTimer = setInterval(() => { if (!document.hidden) pullReplies(false); }, 4000); };
  let mode = 'idle', draft = { message: '', name: '', contact: '' };
  async function choose(k) {
    if (busy) return; busy = true; quick.replaceChildren(); const A = ANSWERS[k]; bubble(A.q, 'me'); await wait(250);
    await say(A.a); A.action?.();
    if (A.ask) { mode = A.ask; input.placeholder = 'Write your message…'; input.focus({ preventScroll: true }); }
    else chips(A.next.length ? A.next : ['do', 'process']);
    busy = false;
  }
  const post = async (p) => { try { const r = await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, sid, website: '' }) }); return r.ok && (await r.json()).ok; } catch (e) { return false; } };
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  async function send() {
    busy = true; mode = 'idle'; input.placeholder = 'Type a message…';
    await say('Sending…');
    const ok = await post(draft);
    if (ok) {
      who = { name: draft.name, contact: draft.contact }; store.set('vira-chat-who', JSON.stringify(who));
      await say(`Got it, ${draft.name} — your message is on its way to me. ✓`);
      await say(`What happens next: I’ll reply by email to ${draft.contact}, so keep an eye on your inbox (and your spam folder). You don’t need to keep this chat open.`); startPolling();
    } else { await say('Hmm, that didn’t go through. Could you try the contact section below instead?', null); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }
    draft = { message: '', name: '', contact: '' }; chips(['do', 'process', 'price']); busy = false;
  }
  async function sendLive(text, echo = true) {                      // anonymous: no name, no email, just the message
    busy = true; mode = 'idle'; input.placeholder = 'Type a message…'; quick.replaceChildren(); if (echo) bubble(text, 'me'); await wait(250);
    const ok = await post({ message: text, anon: true });
    if (ok) { who = { anon: true, name: '', contact: '' }; store.set('vira-chat-who', JSON.stringify(who)); await say('Sent! I’ll reply right here in this chat as soon as I see it, so keep it open. If you close it, come back on this device and my answer will be waiting.'); startPolling(); }
    else { await say('That didn’t go through — could you try again in a moment?'); mode = 'live'; input.placeholder = 'Write your message…'; }
    busy = false;
  }
  async function followUp(text) {                                   // later messages go straight to Vira, no questions asked
    bubble(text, 'me');
    if (!(await post({ name: who.name, contact: who.contact, anon: !!who.anon, message: text }))) await say('That one didn’t go through — could you try again in a moment?');
  }
  // ── Secret commands (for you, the developer). Type them in the chat box; they are never sent to WhatsApp or stored. ──
  //   /clear  wipes this browser's chat data (chat code, name) and every cached copy of the site, then reloads
  //   /update refreshes the cached copies of the site's files and reloads (keeps the chat)    /help  lists them
  const refreshCache = async (wipeChat) => {
    if (wipeChat) { try { localStorage.removeItem('vira-chat-sid'); localStorage.removeItem('vira-chat-who'); } catch (e) {} }
    try { for (const k of (await caches?.keys?.()) || []) await caches.delete(k); } catch (e) {}
    try { for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) await r.unregister(); } catch (e) {}
    const urls = [...new Set([location.href.split('#')[0], ...performance.getEntriesByType('resource').map((e) => e.name)])].filter((u) => u.startsWith(location.origin));
    await Promise.all(urls.map((u) => fetch(u, { cache: 'reload' }).catch(() => {})));      // forces a fresh copy into the browser cache
    location.reload();
  };
  const COMMANDS = {
    '/help': async () => say('Secret commands: /clear wipes this browser’s chat data and cache, /update refreshes the cached site files. Neither is sent to me.'),
    '/clear': async () => { await say('Clearing the chat data and cache, then reloading…'); await refreshCache(true); },
    '/update': async () => { await say('Refreshing the cached site files, then reloading…'); await refreshCache(false); },
  };
  // a typed message from someone who has not picked an option yet: offer the two ways to continue
  let pending = '';
  async function offerChoice(text) {
    busy = true; quick.replaceChildren(); bubble(text, 'me'); pending = text; await wait(250);
    await say('Thanks! How would you like me to answer? I can reply to you by email, or you can wait here and chat with me live — no details needed.');
    const opt = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cq'; b.textContent = label; b.addEventListener('click', async () => { if (busy) return; quick.replaceChildren(); bubble(label, 'me'); await wait(250); await fn(); }); quick.append(b); };
    opt('Send it — reply to me by email', async () => { busy = true; draft.message = pending; mode = 'name'; await say('Great! Who am I talking to? (just your first name is fine)'); input.placeholder = 'Your name…'; input.focus({ preventScroll: true }); busy = false; });
    opt('Wait here — chat live', async () => { await sendLive(pending, false); });
    busy = false;
  }
  async function free(text) {
    if (busy) return;
    const cmd = COMMANDS[text.trim().toLowerCase()];
    if (cmd) { busy = true; quick.replaceChildren(); bubble(text, 'me'); await wait(250); await cmd(); busy = false; return; }
    if (who && mode === 'idle') { quick.replaceChildren(); await followUp(text); return; }
    if (mode === 'live') { await sendLive(text); return; }
    if (mode === 'idle' && !who) { await offerChoice(text); return; }
    busy = true; quick.replaceChildren(); bubble(text, 'me'); await wait(250);
    if (mode === 'idle' || mode === 'message') { draft.message = text; mode = 'name'; await say('Thanks! Who am I talking to? (just your first name is fine)'); input.placeholder = 'Your name…'; }
    else if (mode === 'name') { draft.name = text; mode = 'contact'; await say(`Nice to meet you, ${text}. What’s your email address? (Gmail or any other is fine)`); input.placeholder = 'Your email…'; }
    else if (mode === 'contact') { if (!isEmail(text)) { await say('That doesn’t look like an email address — could you check it? (for example name@gmail.com)'); busy = false; return; } draft.contact = text; await send(); return; }
    busy = false;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ''; free(v); });

  async function start() {
    if (started) return Promise.resolve(); started = true; busy = true;
    if (who) { await say(who.anon ? 'Welcome back! Type below to keep chatting — my replies show up here.' : `Welcome back${who.name ? ', ' + who.name : ''}! I reply by email (${who.contact}), but you can add to your message below.`); await pullReplies(true); startPolling(); chips(START); busy = false; return; }
    await say('Hi! I’m Vira — well, her little chat helper. What would you like to know?'); chips(START); busy = false;
  }
  // closed by default: a white button and a few suggestions; opening shows the chat (a suggestion also asks that question)
  const openChat = (key) => {
    root.hidden = false; void root.offsetWidth; dock.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); fab.classList.remove('ping');
    if (!started) { start().then(() => { if (key) choose(key); }); } else if (key) choose(key);
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
  const closeChat = () => { dock.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); setTimeout(() => { if (!dock.classList.contains('open')) root.hidden = true; }, 300); fab.focus({ preventScroll: true }); };
  fab.addEventListener('click', () => openChat());
  closeBtn?.addEventListener('click', closeChat);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && dock.classList.contains('open')) closeChat(); });
  sugg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openChat(b.dataset.k)));
  if (new URLSearchParams(location.search).get('chat')) setTimeout(() => { document.getElementById('chat-dock')?.scrollIntoView({ block: 'center' }); openChat(); }, 700);      // arriving from the pop-up on another page
}
