// Hero: a centred headline whose word "alive." is a button.
//   • "alive." sits on a flat, living Orchid shape (alive-blob.js).
//   • Press it and the purple heat-map gradient (hero-gradient.js) spreads from the word across the WHOLE website; press again and it recedes.
//   • The little character beside it (the logo mark) watches the cursor and hops when you press.
//   • Letters of the headline hop away from the cursor.
import { createAliveBlob } from './alive-blob.js';
import { createHeroGradient } from './hero-gradient.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const title = document.querySelector('.hero-title');
const hl = title?.querySelector('.hl');
const character = document.querySelector('.hero-char .vira-logo');
if (title) start();

function start() {
  // ── headline letters: split into spans (the h1 keeps a plain-text aria-label), each a little spring
  const letters = [];
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
  textNodes.forEach(splitText);
  function splitText(textNode) {
    const frag = document.createDocumentFragment();
    for (const ch of textNode.textContent) {
      if (ch === ' ') { frag.append(' '); continue; }
      const s = document.createElement('span');
      s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch;
      frag.append(s); letters.push({ el: s, y: 0, v: 0, r: 0, rv: 0 });
    }
    textNode.replaceWith(frag);
  }

  // ── the flat Orchid shape behind "alive."
  const blob = hl ? createAliveBlob(hl, { gradient: false }) : null;

  // ── the whole-page purple background, switched by pressing "alive."
  const bg = createHeroGradient(document.body, {
    fixed: true, fadeTop: 0,
    origin: () => { if (!hl) return null; const r = hl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
  });
  hl?.addEventListener('click', () => {
    const open = bg.toggle();
    hl.setAttribute('aria-pressed', String(open));
    document.documentElement.classList.toggle('is-purple', open);
    blob?.set({ color: open ? '#F7F3EF' : '#AD86CF' });          // on the purple page the shape flips to ivory so "alive." stays crisp
    blob?.ignite?.();
    character?._vl?.hop();
  });

  if (reduced) return;

  let pointer = null, raf = 0, last = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; pointer = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; wake(); });
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    let busy = false;
    for (const L of letters) {
      const r = L.el.getBoundingClientRect();
      let ty = 0, tr = 0;
      if (pointer) {
        const dx = pointer.x - (r.left + r.width / 2), dy = pointer.y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy), reach = r.height * 1.1;
        const f = Math.exp(-(d * d) / (reach * reach));            // smooth falloff, no hard edge
        ty = -f * r.height * 0.13;                                  // hop up…
        tr = -(dx / (reach || 1)) * f * 5;                          // …and lean away from the cursor
      }
      L.v += (210 * (ty - L.y) - 13 * L.v) * dt; L.y += L.v * dt;
      L.rv += (210 * (tr - L.r) - 13 * L.rv) * dt; L.r += L.rv * dt;
      L.el.style.transform = `translateY(${L.y.toFixed(2)}px) rotate(${L.r.toFixed(2)}deg)`;
      busy = busy || Math.abs(L.v) > 0.05 || Math.abs(L.y - ty) > 0.05 || Math.abs(L.rv) > 0.05 || Math.abs(L.r - tr) > 0.05;
    }
    raf = busy ? requestAnimationFrame(tick) : 0;
  }
}
