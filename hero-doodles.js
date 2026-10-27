/*
 * HERO DOODLES — hand-drawn web-design doodles down both sides of the page, drawn in the page's own ivory.
 *
 * On the ivory page they are invisible (same colour as the background). When the purple spreads from "alive." the doodles
 * DRAW THEMSELVES as the colour front reaches them, so you discover them against the purple; as it recedes they un-draw.
 *
 * Each doodle is a few strokes (point lists) that are smoothed with a Catmull-Rom curve and jittered a little with a seeded
 * random, so nothing is ruler-straight. Edit DOODLES / PLACEMENT below to change what is drawn and where.
 *
 *   const doodles = createDoodles(containerEl);
 *   doodles.update(reveal, origin);   // reveal 0…1 (how far the purple has spread), origin {x, y} in viewport px
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const DOODLE_CONFIG = {
  strokeWidth: 2.6,        // line weight (in a 100-unit doodle box)
  jitter: 1.1,             // hand-drawn wobble (0 = clean, 2 = shaky)
  waveSpread: 1.0,         // how soon doodles draw once the purple front reaches them (higher = later, more staggered)
  seed: 5,
};

// ── tiny drawing helpers: each returns a list of [x, y] points (the stroke is smoothed through them) ──
const line = (x1, y1, x2, y2) => [[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]];
const circle = (cx, cy, r, n = 14) => ({ closed: true, pts: Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2 - 1), cy + r * Math.sin((i / n) * Math.PI * 2 - 1)]) });
const rect = (x, y, w, h) => ({ closed: true, pts: [[x, y], [x + w / 2, y - 0.4], [x + w, y], [x + w + 0.4, y + h / 2], [x + w, y + h], [x + w / 2, y + h + 0.4], [x, y + h], [x - 0.4, y + h / 2]] });
const open = (pts) => ({ pts });
const shut = (pts) => ({ closed: true, pts });
const L = (...a) => open(line(...a));

// ── the doodles (each fits a 100 × 100 box) ──
const DOODLES = {
  window:   [rect(8, 16, 84, 64), L(8, 34, 92, 34), circle(18, 25, 2.6, 8), circle(27, 25, 2.6, 8), circle(36, 25, 2.6, 8), L(18, 48, 58, 48), L(18, 60, 76, 60), L(18, 70, 46, 70)],
  cursor:   [shut([[30, 14], [30, 78], [46, 63], [58, 92], [70, 86], [58, 58], [80, 56]]), L(12, 14, 20, 20), L(10, 28, 19, 30), L(20, 4, 24, 13)],
  bezier:   [open([[10, 72], [28, 34], [58, 82], [90, 30]]), L(10, 72, 24, 44), circle(24, 42, 3.2, 8), L(90, 30, 78, 60), circle(78, 62, 3.2, 8), rect(7, 69, 6, 6), rect(87, 27, 6, 6)],
  type:     [open([[8, 82], [26, 20], [46, 82]]), L(15, 60, 38, 60), circle(70, 66, 13), L(83, 54, 83, 82), L(4, 90, 96, 90)],
  sparkle:  [shut([[50, 8], [57, 43], [92, 50], [57, 57], [50, 92], [43, 57], [8, 50], [43, 43]]), shut([[82, 10], [85, 20], [95, 23], [85, 26], [82, 36], [79, 26], [69, 23], [79, 20]])],
  layers:   [shut([[50, 12], [90, 34], [50, 56], [10, 34]]), open([[10, 50], [50, 72], [90, 50]]), open([[10, 66], [50, 88], [90, 66]])],
  pencil:   [shut([[18, 84], [26, 56], [68, 14], [88, 34], [46, 76]]), L(26, 56, 46, 76), L(60, 22, 80, 42), L(10, 92, 40, 90)],
  code:     [open([[34, 24], [12, 50], [34, 76]]), L(58, 22, 44, 80), open([[68, 24], [90, 50], [68, 76]])],
  wire:     [rect(10, 10, 80, 80), rect(18, 18, 64, 34), L(18, 18, 82, 52), L(82, 18, 18, 52), L(18, 64, 68, 64), L(18, 74, 52, 74), rect(60, 72, 22, 10)],
  phone:    [rect(30, 8, 40, 84), L(43, 17, 57, 17), circle(50, 82, 3, 8), L(38, 32, 62, 32), L(38, 42, 56, 42), rect(38, 52, 24, 14)],
  swatches: [circle(36, 38, 22, 16), circle(64, 38, 22, 16), circle(50, 64, 22, 16), circle(36, 38, 3, 6)],
  ruler:    [rect(6, 34, 88, 32), L(18, 34, 18, 46), L(30, 34, 30, 42), L(42, 34, 42, 46), L(54, 34, 54, 42), L(66, 34, 66, 46), L(78, 34, 78, 42)],
  bulb:     [circle(50, 38, 24, 16), L(40, 66, 60, 66), L(42, 75, 58, 75), L(46, 83, 54, 83), L(50, 4, 50, 8), L(18, 18, 22, 22), L(82, 18, 78, 22), L(6, 40, 11, 40), L(94, 40, 89, 40)],
  heart:    [shut([[50, 84], [24, 56], [16, 38], [26, 22], [42, 24], [50, 36], [58, 24], [74, 22], [84, 38], [76, 56]])],
  grid:     [L(20, 6, 20, 94), L(40, 6, 40, 94), L(60, 6, 60, 94), L(80, 6, 80, 94), L(6, 20, 94, 20), L(6, 40, 94, 40), L(6, 60, 94, 60), L(6, 80, 94, 80)],
};

// where each doodle sits: centre as % of the viewport, size factor, tilt in degrees. Left and right of the headline.
const PLACEMENT = [
  ['window', 9, 18, 1.05, -6], ['cursor', 18, 32, 0.8, 8], ['bezier', 8, 47, 1.1, -4], ['type', 18, 62, 0.9, 5], ['layers', 9, 77, 0.95, -8], ['sparkle', 19, 88, 0.6, 10],
  ['code', 91, 17, 0.95, 6], ['wire', 82, 32, 0.95, -5], ['phone', 92, 48, 0.9, 7], ['swatches', 83, 64, 0.95, -6], ['bulb', 92, 79, 0.95, 5], ['pencil', 81, 89, 0.8, -12],
];

export function createDoodles(root, options = {}) {
  const cfg = { ...DOODLE_CONFIG, ...options };
  if (!root) return { update() {} };
  const NS = 'http://www.w3.org/2000/svg';
  let s = cfg.seed * 9301 + 49297;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;

  // closed / open Catmull-Rom through the jittered points
  const pathFor = ({ pts, closed }) => {
    const P = pts.map(([x, y]) => [x + (rand() - 0.5) * 2 * cfg.jitter, y + (rand() - 0.5) * 2 * cfg.jitter]);
    const n = P.length;
    const at = (i) => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + (closed ? 'Z' : '');
  };

  const items = PLACEMENT.map(([name, x, y, size, tilt]) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'doodle');
    svg.style.cssText = `left:${x}%;top:${y}%;--s:${size};transform:translate(-50%,-50%) rotate(${tilt}deg);`;
    const paths = DOODLES[name].map((stroke) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', pathFor(Array.isArray(stroke) ? { pts: stroke } : stroke));
      p.setAttribute('pathLength', '1');                          // so dash maths is 0…1 whatever the real length
      p.setAttribute('stroke-width', cfg.strokeWidth);
      p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = '1';
      svg.appendChild(p);
      return p;
    });
    root.appendChild(svg);
    return { svg, paths, x: 0, y: 0 };
  });

  const measure = () => items.forEach((it) => { const r = it.svg.getBoundingClientRect(); it.x = r.left + r.width / 2; it.y = r.top + r.height / 2; });
  addEventListener('resize', measure);
  requestAnimationFrame(measure);

  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  let measured = false;
  return {
    // reveal: 0 = ivory page … 1 = fully purple. Doodles draw as the colour front reaches them, and un-draw as it recedes.
    update(reveal, origin) {
      if (!measured) { measure(); measured = true; }
      const diag = Math.hypot(innerWidth, innerHeight), front = reveal * 1.45;
      for (const it of items) {
        const dist = Math.hypot(it.x - origin.x, it.y - origin.y) / diag;
        const p = smooth((front - dist * cfg.waveSpread - 0.04) / 0.3);        // 0 = not drawn … 1 = fully drawn
        const n = it.paths.length;
        it.paths.forEach((path, i) => {
          const sp = Math.min(1, Math.max(0, p * (n + 1) - i * 0.9));            // strokes draw one after another
          path.style.strokeDashoffset = (1 - sp).toFixed(3);
        });
      }
    },
  };
}
