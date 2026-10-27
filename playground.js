// Playground experiments (the tiles in "03 / Playground"):
//   • Interactive canvas — a pink flower that leans towards your cursor and breathes
//   • Physics playground — spheres on springs that you push around with the cursor and that bump into each other
//   • Liquid type        — SVG text warped by an animated turbulence filter that ripples harder near your cursor
//   • Jelly text         — the interactive logo (vira-logo.js)
// Each loop only runs while its tile is on screen, and everything is drawn once (still) with prefers-reduced-motion.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initPlayground({ reduced = false } = {}) {
  const pointer = { x: -9999, y: -9999, inside: false };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  // runs `frame(now, dt)` only while `el` is visible
  function loop(el, frame, once) {
    let raf = 0, last = 0, visible = false;
    const tick = (now) => { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; frame(now / 1000, dt); raf = visible && !reduced ? requestAnimationFrame(tick) : 0; };
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (reduced) frame(0, 0); else start(); } }).observe(el);
    once?.();
  }

  // fit a canvas to its CSS box (high-DPI aware) and report its size
  function fit(canvas) {
    const ctx = canvas.getContext('2d');
    const state = { ctx, w: 1, h: 1, dpr: 1 };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      state.dpr = Math.min(devicePixelRatio || 1, 2);
      state.w = Math.max(1, r.width); state.h = Math.max(1, r.height);
      canvas.width = Math.round(state.w * state.dpr); canvas.height = Math.round(state.h * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      state.onResize?.();
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
    return state;
  }
  const local = (canvas) => { const r = canvas.getBoundingClientRect(); return { x: pointer.x - r.left, y: pointer.y - r.top, r }; };

  // ───────────────────────── flower ─────────────────────────
  const fc = document.querySelector('.flower-canvas');
  if (fc) {
    const S = fit(fc);
    let lx = 0.5, ly = 0.5;                                  // smoothed "look" direction, 0–1 across the tile
    const draw = (t, dt) => {
      const { ctx, w, h } = S;
      const p = local(fc);
      const inside = p.x > -80 && p.x < w + 80 && p.y > -80 && p.y < h + 80;
      const tx = inside ? clamp(p.x / w, 0, 1) : 0.5 + Math.sin(t * 0.5) * 0.12, ty = inside ? clamp(p.y / h, 0, 1) : 0.5 + Math.cos(t * 0.4) * 0.1;
      const k = 1 - Math.exp(-dt * 5); lx += (tx - lx) * k; ly += (ty - ly) * k;
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(h * 0.46, w * 0.3), cx = w / 2 + (lx - 0.5) * w * 0.28, cy = h / 2 + (ly - 0.5) * h * 0.2;
      const lean = { x: (lx - 0.5) * 2, y: (ly - 0.5) * 2 };
      for (let layer = 0; layer < 3; layer++) {
        const n = 13 - layer * 2, len = R * (1 - layer * 0.24), wid = R * (0.3 - layer * 0.03);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + layer * 0.3 + t * (reduced ? 0 : 0.12) * (layer % 2 ? -1 : 1);
          const facing = Math.cos(a - Math.atan2(lean.y, lean.x)) * Math.hypot(lean.x, lean.y);   // petals on the cursor's side open a little
          const L = len * (1 + 0.1 * facing + 0.03 * Math.sin(t * 1.6 + i * 1.3));
          ctx.save();
          ctx.translate(cx + lean.x * layer * 4, cy + lean.y * layer * 4); ctx.rotate(a);
          const g = ctx.createLinearGradient(0, 0, L, 0);
          g.addColorStop(0, ['#f08fb3', '#f5a6c3', '#f9bdd3'][layer]); g.addColorStop(0.65, ['#f7b4cb', '#fbc6d8', '#fdd8e3'][layer]); g.addColorStop(1, ['#fde0ea', '#fde8ef', '#fff2f6'][layer]);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(L * 0.2, -wid * 1.15, L * 0.85, -wid * 0.95, L, 0);
          ctx.bezierCurveTo(L * 0.85, wid * 0.95, L * 0.2, wid * 1.15, 0, 0);
          ctx.fill();
          ctx.strokeStyle = 'rgba(214,92,140,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L * 0.1, 0); ctx.lineTo(L * 0.8, 0); ctx.stroke();
          ctx.restore();
        }
      }
      // heart of the flower
      const hc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.26);
      hc.addColorStop(0, '#ffd27a'); hc.addColorStop(0.55, '#f0a33d'); hc.addColorStop(1, '#d87c2c');
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(cx, cy, R * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,70,20,.55)';
      for (let i = 0; i < 26; i++) { const a = i * 2.399, r = R * 0.2 * Math.sqrt(i / 26); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 0, TAU); ctx.fill(); }
    };
    loop(fc, draw, () => draw(0, 0));
  }

  // ───────────────────────── physics ─────────────────────────
  const pc = document.querySelector('.physics-canvas');
  if (pc) {
    const S = fit(pc);
    let balls = [];
    const build = () => {
      const { w, h } = S, n = clamp(Math.round(w / 12), 22, 60);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      balls = Array.from({ length: n }, (_, i) => {
        const u = i / (n - 1), kind = rnd();
        const r = kind < 0.22 ? 9 + rnd() * 5 : kind < 0.6 ? 6 + rnd() * 4 : 3.5 + rnd() * 3;
        const hx = w * (0.07 + 0.86 * u) + (rnd() - 0.5) * 18, hy = h * 0.5 + Math.sin(u * 7) * h * 0.2 + (rnd() - 0.5) * h * 0.34;
        return { x: hx, y: hy, vx: 0, vy: 0, hx, hy, r: Math.min(r, h * 0.16), tone: kind < 0.22 ? 'black' : kind < 0.72 ? 'white' : 'grey' };
      });
    };
    S.onResize = build; build();
    const draw = (t, dt) => {
      const { ctx, w, h } = S, p = local(pc), reach = Math.max(60, h * 0.55);
      if (!reduced) {
        const step = Math.min(dt, 1 / 30);
        for (const b of balls) {
          b.vx += (60 * (b.hx - b.x) - 5.5 * b.vx) * step; b.vy += (60 * (b.hy - b.y) - 5.5 * b.vy) * step;       // spring home
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d < reach) { const f = (1 - d / reach); b.vx += (dx / d) * f * f * 2600 * step; b.vy += (dy / d) * f * f * 2600 * step; }   // the cursor pushes them away
        }
        for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {                       // soft collisions
          const a = balls[i], c = balls[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 0.001, min = a.r + c.r;
          if (d < min) { const push = (min - d) * 0.5, nx = dx / d, ny = dy / d; a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push; a.vx -= nx * push * 8; a.vy -= ny * push * 8; c.vx += nx * push * 8; c.vy += ny * push * 8; }
        }
        for (const b of balls) { b.x += b.vx * step; b.y += b.vy * step; b.x = clamp(b.x, b.r, w - b.r); b.y = clamp(b.y, b.r, h - b.r); }
      }
      ctx.clearRect(0, 0, w, h);
      for (const b of balls) {
        ctx.fillStyle = 'rgba(60,45,35,.16)'; ctx.beginPath(); ctx.ellipse(b.x + b.r * 0.25, b.y + b.r * 0.95, b.r * 0.9, b.r * 0.3, 0, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        if (b.tone === 'black') { g.addColorStop(0, '#6a6a6a'); g.addColorStop(0.35, '#1b1b1b'); g.addColorStop(1, '#000'); }
        else if (b.tone === 'white') { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#ece7e1'); g.addColorStop(1, '#bdb5ac'); }
        else { g.addColorStop(0, '#d9d4cf'); g.addColorStop(1, '#8f8880'); }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      }
    };
    loop(pc, draw, () => draw(0, 0));
  }

  // ───────────────────────── liquid type ─────────────────────────
  const svg = document.querySelector('.liquid-svg');
  const noise = document.getElementById('liquid-noise'), map = document.getElementById('liquid-map');
  if (svg && noise && map) {
    let heat = 0;
    loop(svg, (t, dt) => {
      const r = svg.getBoundingClientRect();
      const near = clamp(1 - Math.hypot(clamp(pointer.x, r.left, r.right) - pointer.x, clamp(pointer.y, r.top, r.bottom) - pointer.y) / 140, 0, 1);
      heat += (near - heat) * (1 - Math.exp(-dt * 4));
      noise.setAttribute('baseFrequency', `${(0.006 + 0.003 * Math.sin(t * 0.5)).toFixed(5)} ${(0.016 + 0.006 * Math.cos(t * 0.37)).toFixed(5)}`);
      map.setAttribute('scale', (18 + 34 * heat + 8 * Math.sin(t * 0.9)).toFixed(1));
    });
  }
}
