// Hero: the living ink flower (canvas, behind) + a playful headline whose letters hop away from the cursor.
import { createInkFlower } from './ink-flower/ink-flower.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.querySelector('.hero');
const canvas = document.querySelector('.hero-canvas');
const title = document.querySelector('.hero-title');
if (hero && canvas) start();

function start() {
  // ── the flower: size and position per screen shape
  const layoutFor = (w, h) => {
    if (w / h > 1.1) return { mode: 'wide', scale: 0.35, centerX: 0.77, centerY: 0.52 };
    // stacked layouts: size the flower from the free band above the headline so it never lands behind the type
    return { mode: 'stacked', scale: (0.118 * h) / Math.min(w, h), centerX: 0.68, centerY: 0.23 };
  };
  let { mode, ...opts } = layoutFor(canvas.clientWidth || 1, canvas.clientHeight || 1);
  const flower = createInkFlower(canvas, opts);
  hero.classList.add('is-ready');
  new ResizeObserver(() => {
    const next = layoutFor(canvas.clientWidth, canvas.clientHeight);
    if (next.mode !== mode || mode === 'stacked') { mode = next.mode; const { mode: _m, ...o } = next; flower.set(o); }
  }).observe(canvas);

  // ── the headline: split into letters (the h1 keeps its plain-text aria-label), each a little spring
  if (!title) return;
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
