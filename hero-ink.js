// Hero: a centred headline whose word "alive." is a button.
//   Press "alive." and a short piece of choreography plays, then everything goes back to normal:
//     1. the purple heat-map (hero-gradient.js) floods outward from the word across the whole website
//     2. as that front passes each letter, the letter fills with a flowing deep-violet gradient (a window onto liquid colour)
//     3. it holds for a moment (letters gently breathing, the cursor stirs the colour)
//     4. the purple flows back in towards "alive." and the letters return to plain ink in the reverse wave
//   Pressing again while it plays makes it recede early. The little character beside the word hops on press.
import { createAliveBlob } from './alive-blob.js';
import { createHeroGradient } from './hero-gradient.js';
import { createAliveSound } from './alive-sound.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — the press animation
// ─────────────────────────────────────────────────────────────────────────────
const PRESS = {
  spreadSeconds: 2.4,      // purple floods outward
  holdSeconds: 1.6,        // …stays fully spread for this long (after it has finished spreading)
  recedeSeconds: 2.2,      // …then flows back in
  inkColor: '#111111',     // normal type colour (the gradient fill itself is `--text-gradient` in hero.css)
  waveSpread: 3.0,         // how spread out the fill wave is across the letters (higher = a longer, slower wave)
  blobOpenColor: '#F7F3EF', // the Orchid shape behind "alive." turns ivory while the page is purple
  blobColor: '#AD86CF',
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const title = document.querySelector('.hero-title');
const hl = title?.querySelector('.hl');
const character = document.querySelector('.hero-char .vira-logo');
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

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
      frag.append(s); letters.push({ el: s, y: 0, v: 0, r: 0, rv: 0, a: 0 });
    }
    textNode.replaceWith(frag);
  }
  // the gradient fill needs background-clip:text; without it the type simply stays black
  const canFill = CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text');

  // ── the flat Orchid shape behind "alive." and the whole-page purple background
  const blob = hl ? createAliveBlob(hl, { gradient: false }) : null;
  const bg = createHeroGradient(document.body, {
    fixed: true, fadeTop: 0, spreadDuration: PRESS.spreadSeconds, recedeDuration: PRESS.recedeSeconds,
    origin: () => { if (!hl) return null; const r = hl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
  });

  // ── sound (synthesised, starts on the first press), with a small on/off switch in the nav
  let stored = null; try { stored = localStorage.getItem('viraSound'); } catch (e) {}
  const sound = createAliveSound({ enabled: stored !== 'off' });
  const soundBtn = document.querySelector('.nav-sound');
  const paintSound = () => { if (!soundBtn) return; soundBtn.setAttribute('aria-pressed', String(sound.enabled)); soundBtn.textContent = sound.enabled ? 'Sound: on' : 'Sound: off'; };
  paintSound();
  soundBtn?.addEventListener('click', () => {
    sound.setEnabled(!sound.enabled); paintSound();
    try { localStorage.setItem('viraSound', sound.enabled ? 'on' : 'off'); } catch (e) {}
  });

  // ── the choreography: idle → opening → holding → closing → idle
  let phase = 'idle', holdUntil = 0;
  const root = document.documentElement;
  function openIt() {
    phase = 'opening';
    bg.setOpen(true);
    sound.open(PRESS.spreadSeconds);
    root.classList.add('is-purple');
    blob?.set({ color: PRESS.blobOpenColor });
    blob?.ignite?.();
    character?._vl?.hop();
    wake();
  }
  function closeIt() {
    phase = 'closing';
    bg.setOpen(false);
    sound.close(PRESS.recedeSeconds);
    root.classList.remove('is-purple');
    blob?.set({ color: PRESS.blobColor });
    wake();
  }
  hl?.addEventListener('click', () => {
    if (phase === 'opening' || phase === 'holding') closeIt();            // press again: recede early
    else openIt();                                                         // idle (or already receding): play it
  });

  // ── one loop drives the letters (hop physics + colour/weight wave) while anything is moving
  let pointer = null, raf = 0, last = 0;
  if (!reduced) {
    addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; pointer = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer = null; wake(); });
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const ink = hex(PRESS.inkColor);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;

    // phase changes are driven by the gradient's own progress, so they stay in sync even on a slow machine
    if (phase === 'opening' && bg.reveal >= 0.999) { phase = 'holding'; holdUntil = now + PRESS.holdSeconds * 1000; }
    if (phase === 'holding' && now >= holdUntil) closeIt();
    if (phase === 'closing' && !bg.active) phase = 'idle';

    const reveal = bg.reveal, t = now / 1000;
    const ox = hl ? hl.getBoundingClientRect() : null;
    const origin = ox ? { x: ox.left + ox.width / 2, y: ox.top + ox.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    const diag = Math.hypot(innerWidth, innerHeight);
    const front = reveal * 1.6;
    let busy = phase !== 'idle';

    letters.forEach((L, i) => {
      const r = L.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;

      // the wave: a letter wakes up when the spreading front reaches it, and relaxes when the front recedes past it
      const dist = Math.hypot(cx - origin.x, cy - origin.y) / diag;
      const a = !canFill ? 0 : reduced ? (phase === 'idle' ? 0 : 1) : smooth((front - dist * PRESS.waveSpread) / 0.35);
      if (Math.abs(a - L.a) > 0.002 || (a === 0) !== (L.a === 0)) {
        L.a = a;
        const on = a > 0.002;
        L.el.classList.toggle('is-fill', on);
        // the solid ink fades out while the gradient (clipped to the glyph) shows through
        L.el.style.webkitTextFillColor = on ? `rgba(${ink.join(',')},${(1 - a).toFixed(3)})` : '';
      }

      // hop physics: letters lift and lean away from the cursor
      let ty = 0, tr = 0;
      if (pointer && !reduced) {
        const dx = pointer.x - cx, dy = pointer.y - cy;
        const d = Math.hypot(dx, dy), reach = r.height * 1.1;
        const f = Math.exp(-(d * d) / (reach * reach));            // smooth falloff, no hard edge
        ty = -f * r.height * 0.13;
        tr = -(dx / (reach || 1)) * f * 5;
      }
      L.v += (210 * (ty - L.y) - 13 * L.v) * dt; L.y += L.v * dt;
      L.rv += (210 * (tr - L.r) - 13 * L.rv) * dt; L.r += L.rv * dt;
      L.el.style.transform = `translateY(${L.y.toFixed(2)}px) rotate(${L.r.toFixed(2)}deg)`;
      busy = busy || Math.abs(L.v) > 0.05 || Math.abs(L.y - ty) > 0.05 || Math.abs(L.rv) > 0.05 || Math.abs(L.r - tr) > 0.05;
    });
    raf = busy ? requestAnimationFrame(tick) : 0;
  }
}
