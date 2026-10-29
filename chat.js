// A little chat with Vira. Quick replies answer common questions (edit ANSWERS below). To leave a message, the visitor writes it, gives a name and a way to reply,
// and the chat sends it to /api/send-message (see api/send-message.js), which forwards it to your WhatsApp. Visitors never see your number.
// Replies: when you answer on WhatsApp, api/whatsapp-webhook.js stores your reply and this chat picks it up from /api/messages every few seconds.

const SEND_URL = '/api/send-message', MSG_URL = '/api/messages';      // where messages are sent (the serverless function in /api). Change it if you host the function elsewhere.

const ANSWERS = {
  do: { q: 'What do you do?', a: 'I design and build distinctive websites for beauty studios, small businesses and creative people — with personality in every detail.', next: ['work', 'process', 'price'] },
  process: { q: 'How does a project work?', a: 'We start with a chat about you and your idea. Then: hello → sketch → build → launch. You see it early, we tweak it together, and I look after the launch.', next: ['price', 'avail', 'msg'] },
  price: { q: 'About pricing', a: 'Every project is a bit different, so I quote after hearing about your idea. Tell me what you need and I’ll give you an honest range — no surprises.', next: ['avail', 'msg', 'do'] },
  avail: { q: 'Are you available?', a: 'I’m open for new projects. The quickest way to start is a short message — it takes a minute.', next: ['msg', 'do'] },
  work: { q: 'Show me your work', a: 'Sure — I’ll take you to my projects.', action: () => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' }), next: ['process', 'price', 'msg'] },
  msg: { q: 'Leave me a message', a: 'I’d love that. What would you like to tell me?', ask: 'message', next: [] },
};
const START = ['do', 'process', 'price', 'avail'];

const dock = document.getElementById('chat-dock'), fab = document.getElementById('chat-fab'), sugg = document.getElementById('chat-sugg'), closeBtn = document.getElementById('chat-x');
const log = document.getElementById('chat-log'), quick = document.getElementById('chat-quick'), form = document.getElementById('chat-form'), input = document.getElementById('chat-input'), root = document.getElementById('chat');
if (log && quick && form) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, busy = false;
  // two-way: each visitor gets a private conversation id; once they have left a first message, they can keep chatting and Vira's WhatsApp replies appear here
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  let sid = store.get('vira-chat-sid'); if (!sid) { sid = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, ''); store.set('vira-chat-sid', sid); }
  let who = null; try { who = JSON.parse(store.get('vira-chat-who') || 'null'); } catch (e) {}
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
    if (A.ask) { mode = 'message'; input.placeholder = 'Write your message…'; input.focus({ preventScroll: true }); }
    else chips(A.next.length ? A.next : ['do', 'process']);
    busy = false;
  }
  async function send() {
    busy = true; mode = 'idle'; input.placeholder = 'Type a message…';
    await say('Sending…');
    let ok = false;
    try { const r = await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, sid, website: '' }) }); ok = r.ok && (await r.json()).ok; } catch (e) { ok = false; }
    if (ok) { who = { name: draft.name, contact: draft.contact }; store.set('vira-chat-who', JSON.stringify(who)); await say('Sent! Thank you — I’ve got it on my phone. You can keep typing here: when I reply, my answer will appear in this chat.'); startPolling(); }
    else await say('Hmm, that didn’t go through. Could you try the contact section below instead?', null);
    if (!ok) document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    draft = { message: '', name: '', contact: '' }; chips(['do', 'process', 'price']); busy = false;
  }
  async function followUp(text) {                                   // later messages go straight to Vira, no questions asked
    bubble(text, 'me'); let ok = false;
    try { const r = await fetch(SEND_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: who.name, contact: who.contact, message: text, sid, website: '' }) }); ok = r.ok && (await r.json()).ok; } catch (e) { ok = false; }
    if (!ok) await say('That one didn’t go through — could you try again in a moment?');
  }
  async function free(text) {
    if (busy) return;
    if (who && mode === 'idle') { quick.replaceChildren(); await followUp(text); return; }
    busy = true; quick.replaceChildren(); bubble(text, 'me'); await wait(250);
    if (mode === 'idle' || mode === 'message') { draft.message = text; mode = 'name'; await say('Thanks! Who am I talking to? (just your first name is fine)'); input.placeholder = 'Your name…'; }
    else if (mode === 'name') { draft.name = text; mode = 'contact'; await say(`Nice to meet you, ${text}. How can I reply — an email address or a WhatsApp number?`); input.placeholder = 'Email or WhatsApp number…'; }
    else if (mode === 'contact') { draft.contact = text; await send(); return; }
    busy = false;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ''; free(v); });

  async function start() {
    if (started) return Promise.resolve(); started = true; busy = true;
    if (who) { await say(`Welcome back${who.name ? ', ' + who.name : ''}! Type below to message me — my replies show up here.`); await pullReplies(true); startPolling(); chips(START); busy = false; return; }
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
}
