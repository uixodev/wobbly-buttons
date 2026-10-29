// A little chat with Vira. It is scripted (no server): quick replies answer common questions, and anything typed is handed over to WhatsApp with the text pre-filled.
// To change what it says, edit ANSWERS below. To use your number, set WA_NUMBER (country code, digits only, e.g. '447123456789').

const WA_NUMBER = '';          // ← your WhatsApp number. Empty = WhatsApp opens its contact picker with the message ready to send.

const ANSWERS = {
  do: { q: 'What do you do?', a: 'I design and build distinctive websites for beauty studios, small businesses and creative people — with personality in every detail.', next: ['work', 'process', 'price'] },
  process: { q: 'How does a project work?', a: 'We start with a chat about you and your idea. Then: hello → sketch → build → launch. You see it early, we tweak it together, and I look after the launch.', next: ['price', 'avail', 'wa'] },
  price: { q: 'About pricing', a: 'Every project is a bit different, so I quote after hearing about your idea. Tell me what you need and I’ll give you an honest range — no surprises.', next: ['avail', 'wa', 'do'] },
  avail: { q: 'Are you available?', a: 'I’m open for new projects. The quickest way to start is a short message — it takes a minute.', next: ['wa', 'do'] },
  work: { q: 'Show me your work', a: 'Sure — I’ll take you to my projects.', action: () => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' }), next: ['process', 'price', 'wa'] },
  wa: { q: 'Message you on WhatsApp', a: 'Lovely! Tap below and I’ll see it on WhatsApp.', wa: true, next: [] },
};
const START = ['do', 'process', 'price', 'avail'];

const dock = document.getElementById('chat-dock'), fab = document.getElementById('chat-fab'), sugg = document.getElementById('chat-sugg'), closeBtn = document.getElementById('chat-x');
const log = document.getElementById('chat-log'), quick = document.getElementById('chat-quick'), form = document.getElementById('chat-form'), input = document.getElementById('chat-input'), root = document.getElementById('chat');
if (log && quick && form) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let topic = '', typed = '', started = false, busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const scroll = () => { log.scrollTop = log.scrollHeight; };

  let shapeN = 0;
  function bubble(text, who) { const b = document.createElement('div'); b.className = `cb ${who} sh${(shapeN++ % 3) + 1}`; if (typeof text === 'string') b.textContent = text; else b.append(text); log.append(b); scroll(); return b; }
  async function say(text, extra) {
    const t = bubble('', 'bot typing'); t.innerHTML = '<i></i><i></i><i></i>'; await wait(650 + Math.min(900, text.length * 8));
    t.classList.remove('typing'); t.textContent = text; if (extra) t.append(extra); scroll();
  }
  function waButton(text) { const a = document.createElement('a'); a.className = 'cb-wa'; a.href = waLink(text); a.target = '_blank'; a.rel = 'noopener'; a.innerHTML = '<span>Open WhatsApp</span><span aria-hidden="true">→</span>'; return a; }
  function chips(keys) {
    quick.replaceChildren();
    keys.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cq'; b.textContent = ANSWERS[k].q; b.addEventListener('click', () => choose(k)); quick.append(b); });
  }
  async function choose(k) {
    if (busy) return; busy = true; quick.replaceChildren(); const A = ANSWERS[k]; topic = A.q; bubble(A.q, 'me'); await wait(250);
    await say(A.a, A.wa ? waButton(`Hi Vira! ${typed || topic}`) : null); A.action?.();
    chips(A.next.length ? A.next : ['do', 'process']); busy = false;
  }
  async function free(text) {
    if (busy) return; busy = true; quick.replaceChildren(); typed = text; bubble(text, 'me'); await wait(250);
    await say('Thanks — I’d love to carry on with you properly. Tap below and your message will be ready to send to me on WhatsApp.', waButton(`Hi Vira! ${text}`));
    chips(['do', 'process', 'price']); busy = false;
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ''; free(v); });

  async function start() { if (started) return Promise.resolve(); started = true; busy = true; await say('Hi! I’m Vira — well, her little chat helper. What would you like to know?'); chips(START); busy = false; }
  // closed by default: a white button and a few suggestions; opening shows the chat (a suggestion also asks that question)
  const openChat = (key) => {
    root.hidden = false; void root.offsetWidth; dock.classList.add('open'); fab.setAttribute('aria-expanded', 'true');
    if (!started) { start().then(() => { if (key) choose(key); }); } else if (key) choose(key);
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
  const closeChat = () => { dock.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); setTimeout(() => { if (!dock.classList.contains('open')) root.hidden = true; }, 300); fab.focus({ preventScroll: true }); };
  fab.addEventListener('click', () => openChat());
  closeBtn?.addEventListener('click', closeChat);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && dock.classList.contains('open')) closeChat(); });
  sugg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => openChat(b.dataset.k)));
}
