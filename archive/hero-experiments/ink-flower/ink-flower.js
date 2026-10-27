/*
 * LIVING INK FLOWER — a flower made of soft, elastic black ink (Canvas 2D, zero dependencies).
 *
 * How it works
 *   • Every petal is a closed contour of sampled points (left edge → tip → right edge).
 *   • Each point has a resting position (where the breathing petal wants it to be), a current position and a velocity.
 *     A spring pulls it to its resting position, damping calms the wobble, and neighbouring points pull on each other
 *     like an elastic membrane, so a local push spreads softly into the surrounding ink.
 *   • The cursor never moves or rotates a whole petal: it only adds a smooth, distance-based pull/push to the nearby
 *     contour points, and the springs do the rest.
 *   • Contours are drawn with Catmull-Rom → Bézier smoothing, so silhouettes stay flowing and round.
 *
 * Usage
 *   import { createInkFlower } from './ink-flower.js';
 *   const flower = createInkFlower(canvas, { petalCount: 6, cursorStrength: 0.7 });
 *   flower.set({ damping: 5 });   // tweak live (rebuilds the shape if a shape option changed)
 *   flower.destroy();
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — change these to experiment with the flower's personality
// ─────────────────────────────────────────────────────────────────────────────
export const CONFIG = {
  // — shape —
  petalCount: 6,          // 5 or 6 looks best (other numbers work too)
  petalLength: 1.0,       // overall petal length multiplier
  petalWidth: 1.0,        // overall petal width multiplier
  asymmetry: 1.0,         // 0 = perfectly even rosette, 1 = the hand-composed, lopsided flower, 1.5 = wilder
  seed: 7,                // changes the random details (ripple phases, tiny shape variations)

  // — idle life —
  idleMovement: 1.0,      // 0 = frozen, 1 = gentle breathing, 2 = restless

  // — cursor —
  cursorRadius: 0.7,     // reach of the cursor, in units of the flower radius
  cursorStrength: 0.85,   // how far ink follows the cursor. Positive = PULL towards it, negative = PUSH away
  cursorWake: 0.35,       // a little extra shove from the cursor's own movement (0 = none)

  // — spring physics —
  springStrength: 70,     // how hard points are pulled back to rest (higher = snappier)
  damping: 6.5,           // how quickly wobble settles (lower = jellier). ~2·√spring is critically damped
  membrane: 26,           // how strongly neighbouring points pull on each other (spreads deformation)

  // — colour —
  inkColor: '#111111',
  accentColor: '#AD86CF', // used sparingly: a small organic shape in the centre
  backgroundColor: null,  // null = transparent canvas (page background shows through)

  // — layout —
  scale: 0.34,            // flower radius as a fraction of min(canvas width, canvas height)
  centerX: 0.5,           // position inside the canvas (0–1)
  centerY: 0.5,
};

// Hand-composed "personalities" for the petals. Angles are offsets (degrees) from an even spread,
// length/width are multipliers, bend curves the petal sideways, bulge is where it is widest (0–1 along its length).
const PETAL_PERSONALITIES = [
  { dAng: -9,  len: 1.12, wid: 1.30, bend:  0.50, bulge: 0.58 },   // broad, graceful
  { dAng:  14, len: 0.90, wid: 0.55, bend: -0.45, bulge: 0.50 },   // slim
  { dAng: -4,  len: 1.28, wid: 0.95, bend:  0.62, bulge: 0.62 },   // the long one
  { dAng: -16, len: 0.78, wid: 1.35, bend: -0.40, bulge: 0.54 },   // short and plump
  { dAng:  10, len: 1.08, wid: 0.50, bend:  0.50, bulge: 0.44 },   // slim, leaning
  { dAng:   6, len: 1.18, wid: 1.10, bend: -0.60, bulge: 0.58 },   // broad, swept the other way
  { dAng:  -8, len: 0.96, wid: 0.75, bend:  0.35, bulge: 0.48 },   // (used when petalCount > 6)
];

const SAMPLES_PER_SIDE = 17;     // contour resolution per petal edge
const BASE_ANGLE = -82;          // degrees; the first petal points up and slightly left

// ─────────────────────────────────────────────────────────────────────────────
// small helpers
// ─────────────────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothFalloff = (s) => { s = clamp(s, 0, 1); return 1 - s * s * (3 - 2 * s); };   // 1 at the cursor → 0 at the edge of its reach, no hard boundary

function rng(seed) { let s = (seed * 2654435761) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ─────────────────────────────────────────────────────────────────────────────
// the flower
// ─────────────────────────────────────────────────────────────────────────────
export function createInkFlower(canvas, options = {}) {
  const cfg = { ...CONFIG, ...options };
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 1, H = 1, dpr = 1, R = 100, cx = 0, cy = 0;       // layout in CSS px
  let petals = [];                                         // each: { def, phase, contour: Point[] }
  let hub = null, bloom = null;                            // soft centre blob + the orchid shape
  let cursor = null, cursorVel = { x: 0, y: 0 };
  let raf = 0, last = 0, time = 0, running = true;

  // ── building the flower ────────────────────────────────────────────────────
  function build() {
    const rand = rng(cfg.seed);
    const n = Math.max(3, Math.round(cfg.petalCount));
    petals = [];
    for (let i = 0; i < n; i++) {
      const pers = PETAL_PERSONALITIES[i % PETAL_PERSONALITIES.length];
      const a = cfg.asymmetry;
      const def = {
        angle: toRad(BASE_ANGLE + (i * 360) / n + pers.dAng * a + (rand() - 0.5) * 6 * a),
        length: cfg.petalLength * (1 + (pers.len - 1) * a) * (1 + (rand() - 0.5) * 0.06 * a),
        width: cfg.petalWidth * 0.17 * (1 + (pers.wid - 1) * a),
        bend: pers.bend * (0.4 + 0.6 * a),
        bulge: 0.5 + (pers.bulge - 0.5) * a,
        sideBias: (rand() - 0.5) * 0.22 * a,               // one edge a little fuller than the other
        // each petal breathes to its own rhythm
        rate: 0.75 + rand() * 0.6,
        ph: [rand() * TAU, rand() * TAU, rand() * TAU, rand() * TAU, rand() * TAU],
      };
      const m = 2 * SAMPLES_PER_SIDE - 1;
      const contour = Array.from({ length: m }, () => ({ x: 0, y: 0, vx: 0, vy: 0, rx: 0, ry: 0 }));
      petals.push({ def, contour });
    }
    hub = makeBlob(0.17, 14, rand, 0.2);
    bloom = makeBlob(0.058, 12, rand, 0.3);
    layout();
    // start at rest so the very first frame is already a finished flower
    updateRest(0);
    for (const c of allContours()) for (const p of c) { p.x = p.rx; p.y = p.ry; p.vx = p.vy = 0; }
  }

  function makeBlob(radius, count, rand, irregular) {
    const radii = Array.from({ length: count }, () => 1 + (rand() - 0.5) * 2 * irregular);
    const contour = Array.from({ length: count }, () => ({ x: 0, y: 0, vx: 0, vy: 0, rx: 0, ry: 0 }));
    return { radius, radii, contour, ph: rand() * TAU, rate: 0.9 + rand() * 0.5 };
  }

  const allContours = () => [...petals.map((p) => p.contour), hub.contour, bloom.contour];

  // ── the analytic petal model (this is the "resting" shape; it breathes over time) ──────
  function petalPoint(def, u, side, t, idle) {
    const wob = (k) => Math.sin(t * def.rate * k);
    const breathe = 1 + idle * 0.075 * Math.sin(t * def.rate * 0.9 + def.ph[0]);
    const lenF = 1 + idle * 0.03 * Math.sin(t * def.rate * 0.6 + def.ph[1]);
    const bend = def.bend + idle * 0.07 * Math.sin(t * def.rate * 0.5 + def.ph[2]);
    const ang = def.angle + idle * 0.025 * Math.sin(t * def.rate * 0.35 + def.ph[3]);   // a tiny sway; the shape stays put

    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    const baseR = 0.02 * R, len = def.length * lenF * R;
    const Bx = cx + dx * baseR, By = cy + dy * baseR;
    const Tx = cx + dx * len, Ty = cy + dy * len;
    // S-shaped centre line (cubic Bézier): it leans one way, then flicks back at the tip
    const C1x = Bx + dx * len * 0.30 + nx * bend * len * 0.46, C1y = By + dy * len * 0.30 + ny * bend * len * 0.46;
    const C2x = Bx + dx * len * 0.68 - nx * bend * len * 0.30, C2y = By + dy * len * 0.68 - ny * bend * len * 0.30;

    const v = 1 - u, b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
    const px = b0 * Bx + b1 * C1x + b2 * C2x + b3 * Tx, py = b0 * By + b1 * C1y + b2 * C2y + b3 * Ty;
    let tx = 3 * v * v * (C1x - Bx) + 6 * v * u * (C2x - C1x) + 3 * u * u * (Tx - C2x);
    let ty = 3 * v * v * (C1y - By) + 6 * v * u * (C2y - C1y) + 3 * u * u * (Ty - C2y);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const qx = -ty, qy = tx;                                // normal to the curve

    // width profile: a thick neck that melts into the centre, widest at `bulge`, then a soft, slightly drawn-out tip
    const a = Math.log(0.5) / Math.log(def.bulge);
    const core = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, a))), 0.5 + 0.4 * u);
    const neck = 0.72 * Math.pow(Math.max(0, 1 - u / 0.5), 2);
    const shape = Math.max(core, neck);
    const w = def.width * R * breathe * shape * (1 + side * def.sideBias);
    // slow ripple travelling along the edge
    const ripple = idle * R * 0.014 * Math.sin(6.5 * u - t * def.rate * 1.1 + def.ph[4] + side * 1.7) * Math.sin(Math.PI * u);
    return { x: px + qx * (side * w + ripple), y: py + qy * (side * w + ripple) };
  }

  const sampleU = (k) => Math.pow(k / SAMPLES_PER_SIDE, 0.75);   // denser sampling near the tip keeps it round

  function updateRest(t) {
    const idle = reducedMotion ? 0 : cfg.idleMovement;
    for (const { def, contour } of petals) {
      let i = 0;
      for (let k = 1; k <= SAMPLES_PER_SIDE; k++, i++) { const q = petalPoint(def, sampleU(k), +1, t, idle); contour[i].rx = q.x; contour[i].ry = q.y; }
      for (let k = SAMPLES_PER_SIDE - 1; k >= 1; k--, i++) { const q = petalPoint(def, sampleU(k), -1, t, idle); contour[i].rx = q.x; contour[i].ry = q.y; }
    }
    for (const blob of [hub, bloom]) {
      const off = blob === bloom ? { x: -0.02 * R, y: 0.014 * R } : { x: 0, y: 0 };
      blob.contour.forEach((p, i) => {
        const a = (i / blob.contour.length) * TAU;
        const swell = 1 + idle * 0.09 * Math.sin(t * blob.rate * 0.8 + i * 1.3 + blob.ph) + idle * 0.05 * Math.sin(t * blob.rate * 1.3 - i * 0.7);
        const r = blob.radius * R * blob.radii[i] * swell;
        p.rx = cx + off.x + Math.cos(a) * r; p.ry = cy + off.y + Math.sin(a) * r;
      });
    }
  }

  // ── physics ─────────────────────────────────────────────────────────────────
  function step(dt) {
    const radius = cfg.cursorRadius * R;
    const k = cfg.springStrength, c = cfg.damping, kn = cfg.membrane;
    for (const contour of allContours()) {
      const n = contour.length;
      for (let i = 0; i < n; i++) {
        const p = contour[i];
        let tx = p.rx, ty = p.ry;
        // cursor: a smooth, distance-based offset on this point's resting position (never a whole-petal move)
        if (cursor) {
          const dx = cursor.x - p.rx, dy = cursor.y - p.ry, d = Math.hypot(dx, dy) || 1;
          const f = smoothFalloff(d / radius);
          if (f > 0) {
            const pull = Math.sign(cfg.cursorStrength) || 1, mag = Math.abs(cfg.cursorStrength) * f;
            const move = pull > 0 ? mag * d : mag * radius * 0.4;      // pull: a fraction of the distance; push: a fixed gentle shove
            tx += (dx / d) * move * pull; ty += (dy / d) * move * pull;
          }
        }
        // membrane: neighbouring points drag on each other so the deformation spreads softly
        const a = contour[(i + n - 1) % n], b = contour[(i + 1) % n];
        const lx = (a.x + b.x) / 2 - p.x, ly = (a.y + b.y) / 2 - p.y;
        p.vx += (k * (tx - p.x) - c * p.vx + kn * lx) * dt;
        p.vy += (k * (ty - p.y) - c * p.vy + kn * ly) * dt;
      }
      for (const p of contour) { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
  }

  // ── drawing ─────────────────────────────────────────────────────────────────
  function tracePath(contour) {
    // closed Catmull-Rom → cubic Bézier
    const n = contour.length;
    ctx.moveTo(contour[0].x, contour[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = contour[(i - 1 + n) % n], p1 = contour[i], p2 = contour[(i + 1) % n], p3 = contour[(i + 2) % n];
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (cfg.backgroundColor) { ctx.fillStyle = cfg.backgroundColor; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = cfg.inkColor;
    for (const { contour } of petals) { ctx.beginPath(); tracePath(contour); ctx.fill(); }
    ctx.beginPath(); tracePath(hub.contour); ctx.fill();
    ctx.fillStyle = cfg.accentColor;                               // the only touch of Orchid
    ctx.beginPath(); tracePath(bloom.contour); ctx.fill();
  }

  // ── main loop ───────────────────────────────────────────────────────────────
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    time += dt;
    updateRest(time);
    if (reducedMotion) {
      for (const c of allContours()) for (const p of c) { p.x = p.rx; p.y = p.ry; }
    } else {
      step(dt / 2); step(dt / 2);                                  // two sub-steps keep the springs stable
    }
    draw();
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  // ── layout / input ──────────────────────────────────────────────────────────
  function layout() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    R = Math.min(W, H) * cfg.scale;
    cx = W * cfg.centerX; cy = H * cfg.centerY;
  }
  function resize() {
    const before = { R, cx, cy };
    layout();
    // keep the flower where it was relative to its new size so nothing snaps
    const s = R / (before.R || R);
    for (const c of allContours()) for (const p of c) { p.x = cx + (p.x - before.cx) * s; p.y = cy + (p.y - before.cy) * s; p.vx *= s; p.vy *= s; }
  }

  let prev = null;
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (prev) { cursorVel = { x: x - prev.x, y: y - prev.y }; }
    prev = { x, y };
    cursor = { x, y };
    // a little extra shove from the cursor's own movement, falling off with distance
    if (cfg.cursorWake && !reducedMotion) {
      const radius = cfg.cursorRadius * R;
      for (const contour of allContours()) for (const p of contour) {
        const f = smoothFalloff(Math.hypot(p.x - x, p.y - y) / radius);
        if (f > 0) { p.vx += cursorVel.x * f * cfg.cursorWake * 6; p.vy += cursorVel.y * f * cfg.cursorWake * 6; }
      }
    }
  }
  function onLeave() { cursor = null; prev = null; }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') onLeave(); });
  window.addEventListener('blur', onLeave);

  build();
  last = performance.now();
  raf = requestAnimationFrame(frame);

  const SHAPE_KEYS = ['petalCount', 'petalLength', 'petalWidth', 'asymmetry', 'seed'];
  return {
    config: cfg,
    set(next) {
      const rebuild = Object.keys(next).some((k) => SHAPE_KEYS.includes(k));
      Object.assign(cfg, next);
      if (next.scale || next.centerX || next.centerY) layout();
      if (rebuild) build();
    },
    destroy() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}

function toRad(d) { return (d * Math.PI) / 180; }   // degrees → radians
