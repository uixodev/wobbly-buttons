/*
 * ALIVE BLOB — the Orchid shape behind the word "alive."
 *
 * An SVG path built from ~24 outline points. Every point has a resting position, a current position, a velocity and a
 * spring. Resting positions drift slowly and never exactly repeat (several incommensurate sine waves per point), which is
 * the idle "breathing". The cursor only adds a smooth, distance-based pull to the NEARBY points; neighbouring points drag on
 * each other like a membrane, so a local tug spreads softly. When the cursor leaves, springs + damping bring the outline
 * home with a gentle wobble. The outline itself deforms: nothing is simply scaled, rotated or translated.
 *
 *   import { createAliveBlob } from './alive-blob.js';
 *   const blob = createAliveBlob(document.querySelector('.hl'), { cursorStrength: 0.7 });
 *   blob.set({ damping: 4 });   blob.destroy();
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — adjust the personality of the shape here
// ─────────────────────────────────────────────────────────────────────────────
export const ALIVE_CONFIG = {
  color: '#AD86CF',          // Orchid

  // — shape —
  points: 24,                // outline resolution
  irregularity: 0.10,        // how uneven the silhouette is (0 = smooth oval, 0.2 = very lumpy)
  seed: 11,                  // changes the unique lumps
  overhangX: 0.16,           // how far the shape extends beyond the word, left/right (× text height)
  overhangY: 0.05,           // … and top/bottom

  // — idle breathing —
  idleAmount: 1.0,           // size of the slow swelling and edge movement (0 = still)
  idleSpeed: 1.0,            // how fast it drifts (0.5 = sleepy, 2 = restless)

  // — cursor —
  cursorRadius: 1.45,        // how close the cursor must come, in text heights, before the ink notices it
  cursorStrength: 0.6,       // how far the nearby edge reaches towards the cursor (0–1). Negative = pushes away
  cursorWake: 0.22,          // extra shove from the cursor's own speed (0 = none)

  // — softness / wobble (spring physics) —
  springStrength: 52,        // how firmly points return to rest (higher = tighter, snappier)
  damping: 5.0,              // how quickly wobble dies down (lower = jellier, more wobble)
  membrane: 20,              // how strongly neighbouring points pull on each other (higher = smoother, more spread)
};

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const falloff = (s) => { s = clamp(s, 0, 1); return 1 - s * s * (3 - 2 * s); };   // 1 at the cursor → 0 at its reach, no hard boundary
function rng(seed) { let s = (seed * 2654435761) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function createAliveBlob(host, options = {}) {
  const cfg = { ...ALIVE_CONFIG, ...options };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'alive-blob');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', cfg.color);
  svg.appendChild(path);
  host.prepend(svg);
  host.classList.add('has-blob');

  let w = 1, h = 1;                       // host size (px)
  let pts = [];                           // { rx, ry, x, y, vx, vy }
  let traits = [];                        // per-point personality: base lumpiness + independent rhythms
  let cursor = null, prev = null, vel = { x: 0, y: 0 };
  let raf = 0, last = 0, time = 0, running = true, visible = true, ready = false;

  // ── per-point personality (seeded, so the shape is always "the same creature") ──
  function buildTraits() {
    const rand = rng(cfg.seed);
    traits = Array.from({ length: cfg.points }, () => ({
      lump: 1 + (rand() - 0.5) * 2 * cfg.irregularity,
      // three incommensurate rhythms → the motion practically never repeats
      f: [0.21 + rand() * 0.17, 0.47 + rand() * 0.23, 0.93 + rand() * 0.4],
      p: [rand() * TAU, rand() * TAU, rand() * TAU],
      a: [0.05 + rand() * 0.02, 0.032 + rand() * 0.014, 0.014 + rand() * 0.008],
    }));
    const lobes = [rand() * TAU, rand() * TAU];
    traits.lobes = lobes;
    pts = traits.map(() => ({ rx: 0, ry: 0, x: 0, y: 0, vx: 0, vy: 0 }));
  }

  // ── where each point wants to be right now (the breathing outline) ──
  function rest(t) {
    const idle = reduced ? 0 : cfg.idleAmount, ts = t * cfg.idleSpeed;
    const cx = w / 2, cy = h * 0.6;                                       // sits on the x-height of the word
    const rxBase = w / 2 + cfg.overhangX * h, ryBase = h * 0.43 + cfg.overhangY * h;
    const breathe = 1 + idle * 0.03 * Math.sin(ts * 0.27 + 1.3) + idle * 0.015 * Math.sin(ts * 0.61);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU, tr = traits[i];
      let r = tr.lump
        * (1 + 0.07 * Math.sin(2 * th + traits.lobes[0]) + 0.05 * Math.sin(3 * th + traits.lobes[1]))   // a few large, irregular lobes
        * breathe;
      for (let k = 0; k < 3; k++) r += idle * tr.a[k] * Math.sin(ts * tr.f[k] * TAU * 0.5 + tr.p[k]);   // slow edge movement
      // a squarish-oval so it reads as a paint swoosh rather than an ellipse
      const c = Math.cos(th), s = Math.sin(th);
      const px = Math.sign(c) * Math.pow(Math.abs(c), 0.82), py = Math.sign(s) * Math.pow(Math.abs(s), 0.9);
      pts[i].rx = cx + rxBase * px * r;
      pts[i].ry = cy + ryBase * py * r;
    }
  }

  // ── physics ──
  function step(dt) {
    const reach = cfg.cursorRadius * h;
    const k = cfg.springStrength, c = cfg.damping, km = cfg.membrane, n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      let tx = p.rx, ty = p.ry;
      if (cursor) {
        const dx = cursor.x - p.rx, dy = cursor.y - p.ry, d = Math.hypot(dx, dy) || 1;
        const f = falloff(d / reach);
        if (f > 0) {
          const s = cfg.cursorStrength;
          // pull: reaches a fraction of the way to the cursor; push: a fixed gentle shove
          const move = s >= 0 ? s * f * d : -s * f * reach * 0.3;
          const dir = s >= 0 ? 1 : -1;
          tx += (dx / d) * move * dir; ty += (dy / d) * move * dir;
        }
      }
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      p.vx += (k * (tx - p.x) - c * p.vx + km * ((a.x + b.x) / 2 - p.x)) * dt;
      p.vy += (k * (ty - p.y) - c * p.vy + km * ((a.y + b.y) / 2 - p.y)) * dt;
    }
    for (const p of pts) { p.x += p.vx * dt; p.y += p.vy * dt; }
  }

  // ── drawing (closed Catmull-Rom → cubic Bézier, so the outline stays soft) ──
  function draw() {
    const n = pts.length;
    let d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    path.setAttribute('d', d + 'Z');
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    time += dt;
    rest(time);
    if (reduced) for (const p of pts) { p.x = p.rx; p.y = p.ry; p.vx = p.vy = 0; }
    else { step(dt / 2); step(dt / 2); }                                 // two sub-steps keep the springs stable
    draw();
    raf = running && visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && running) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // ── layout: the SVG simply fills the word's box; its overflow is visible so the ink may reach beyond it ──
  function measure() {
    const r = host.getBoundingClientRect();
    const nw = Math.max(1, r.width), nh = Math.max(1, r.height);
    const sx = nw / w, sy = nh / h;
    if (ready) for (const p of pts) { p.x *= sx; p.y *= sy; p.vx *= sx; p.vy *= sy; }
    w = nw; h = nh;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    rest(time);
    if (reduced) { for (const p of pts) { p.x = p.rx; p.y = p.ry; } draw(); }
  }

  // ── input ──
  function onMove(e) {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) * (w / (r.width || w)), y = (e.clientY - r.top) * (h / (r.height || h));
    if (prev) vel = { x: x - prev.x, y: y - prev.y };
    prev = { x, y }; cursor = { x, y };
    if (cfg.cursorWake && !reduced) {
      const reach = cfg.cursorRadius * h;
      for (const p of pts) {
        const f = falloff(Math.hypot(p.x - x, p.y - y) / reach);
        if (f > 0) { p.vx += vel.x * f * cfg.cursorWake * 5; p.vy += vel.y * f * cfg.cursorWake * 5; }
      }
    }
    wake();
  }
  const onLeave = () => { cursor = null; prev = null; wake(); };

  buildTraits();
  measure();
  for (const p of pts) { p.x = p.rx; p.y = p.ry; }                       // first frame is already a finished shape
  ready = true;
  draw();

  const ro = new ResizeObserver(measure); ro.observe(host);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }); io.observe(host);
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') onLeave(); });
  addEventListener('blur', onLeave);
  last = performance.now();
  wake();

  return {
    config: cfg,
    set(next) {
      const rebuild = ['points', 'irregularity', 'seed'].some((k) => k in next);
      Object.assign(cfg, next);
      path.setAttribute('fill', cfg.color);
      if (rebuild) { buildTraits(); measure(); for (const p of pts) { p.x = p.rx; p.y = p.ry; } }
    },
    destroy() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave);
      svg.remove(); host.classList.remove('has-blob');
    },
  };
}
