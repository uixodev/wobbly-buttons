// Interactive "vira" logo: the A-blob leans toward the cursor, its eyes follow it,
// the dot floats loosely, and a press squishes the body. Blinks on its own.

const SVG_NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (name, attrs = {}) => {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// critically-ish damped spring on a named set of values
class Springs {
  constructor(init, k = 150, c = 12) { this.v = { ...init }; this.vel = Object.fromEntries(Object.keys(init).map((n) => [n, 0])); this.t = { ...init }; this.k = k; this.c = c; }
  step(dt) {
    let e = 0;
    for (const n in this.v) {
      this.vel[n] += (this.k * (this.t[n] - this.v[n]) - this.c * this.vel[n]) * dt;
      this.v[n] += this.vel[n] * dt;
      e += Math.abs(this.vel[n]) + Math.abs(this.t[n] - this.v[n]);
    }
    return e;
  }
}

// hand-placed outline points (viewBox 200); drawn as a closed Catmull-Rom curve so the shape is soft and a bit uneven
const BODY = [[100, 26], [125, 33], [141, 66], [157, 101], [175, 138], [181, 166], [165, 187], [147, 179], [131, 160], [115, 150], [99, 148], [84, 151], [69, 162], [52, 181], [33, 186], [19, 165], [27, 137], [44, 99], [60, 67], [76, 34]];
const DOT = Array.from({ length: 8 }, (_, i) => [170 + 14 * Math.cos((i / 8) * Math.PI * 2), 28 + 14 * Math.sin((i / 8) * Math.PI * 2)]);

// wordmark letters as stroked centre-lines (units: 100 = 1em, baseline y = 0, up is negative).
// They are rendered as thick round-capped strokes, then wobbled point-by-point so nothing is perfectly straight.
const circle = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2 - 0.6), cy + r * Math.sin((i / n) * Math.PI * 2 - 0.6)]);
const GLYPHS = [
  { x: 0, tilt: -2, dy: 0.6, shapes: [{ pts: [[7, -50], [17, -28], [28, -7], [39, -28], [49, -50]] }] },                                    // v
  { x: 60, tilt: 3, dy: -0.5, shapes: [{ pts: [[7, -46], [7, -26], [6.5, -7]] }, { pts: circle(7, -75, 8.5, 9), closed: true, fill: true }] }, // i
  { x: 82, tilt: -1.5, dy: 0.4, shapes: [{ pts: [[7, -7], [7, -26], [8, -40], [16, -48], [28, -50], [38, -45]] }] },                       // r
  { x: 128, tilt: 2.5, dy: -0.4, shapes: [{ pts: circle(25, -27, 19, 12), closed: true }, { pts: [[44, -48], [44, -27], [44.5, -7], [49, -5]] }] }, // a
];
const WORD_W = 190, STROKE = 16;

const openPath = (P) => {
  const n = P.length; let d = `M${P[0][0].toFixed(2)} ${P[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n - 1)];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
};

const blobPath = (P) => {
  const n = P.length; let d = `M${P[0][0].toFixed(2)} ${P[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
};

class ViraLogo {
  constructor(root) {
    this.root = root;
    this.pointer = null; this.hover = false; this.pressed = false; this.blink = 0;
    this.s = new Springs({ rot: 0, sx: 1, sy: 1, ex: 0, ey: 0, lid: 1, dx: 0, dy: 0 });
    this.raf = 0; this.last = 0;

    const word = document.createElement('span');
    word.className = 'vira-word';
    const text = root.dataset.text || 'vira';
    word.setAttribute('aria-hidden', 'true');
    // hand-built SVG letters (the data-text attribute only sets the accessible name)
    const wsvg = el('svg', { viewBox: `0 -90 ${WORD_W} 100`, class: 'vira-wordsvg' });
    this.letters = GLYPHS.map((g) => {
      const grp = el('g', { class: 'vira-letter' });
      const shapes = g.shapes.map((sh) => {
        const path = el('path', sh.fill ? { fill: 'currentColor' } : { fill: 'none', stroke: 'currentColor', 'stroke-width': STROKE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        grp.appendChild(path);
        return { ...sh, path };
      });
      wsvg.appendChild(grp);
      return { el: grp, g, shapes, y: 0, v: 0 };
    });
    word.appendChild(wsvg);
    this.word = word;

    this.svg = el('svg', { viewBox: '0 0 200 200', class: 'vira-mark', 'aria-hidden': 'true' });
    this.body = el('g', { class: 'vira-body' });
    this.bodyPath = el('path', { fill: 'currentColor' });
    this.body.append(this.bodyPath);
    this.pts = [BODY, DOT].map((base) => ({ base, off: base.map(() => [0, 0]), vel: base.map(() => [0, 0]) }));
    this.eyes = el('g', { fill: '#F7F3EF' });
    this.eyeL = el('ellipse', { cx: 86, cy: 80, rx: 9.5, ry: 12.5 });
    this.eyeR = el('ellipse', { cx: 114, cy: 80, rx: 9.5, ry: 12.5 });
    this.eyes.append(this.eyeL, this.eyeR);
    this.body.append(this.eyes);
    this.dot = el('path', { class: 'vira-dot' });
    this.svg.append(this.body, this.dot);
    this.markOnly = root.hasAttribute('data-mark-only');            // the character without its wordmark
    root.replaceChildren(...(this.markOnly ? [this.svg] : [this.svg, word]));
    root.setAttribute('aria-label', text);

    root.addEventListener('pointerenter', () => { this.hover = true; this.kick(); });
    root.addEventListener('pointerleave', () => { this.hover = false; this.pressed = false; this.kick(); });
    root.addEventListener('pointerdown', () => { this.pressed = true; this.kick(); });
    root.addEventListener('pointerup', () => { this.pressed = false; this.hop(); });
    window.addEventListener('pointermove', (e) => { this.pointer = { x: e.clientX, y: e.clientY }; this.kick(); }, { passive: true });
    if (!reduced) this.scheduleBlink();
    this.kick();
  }

  hop() { this.s.vel.dy -= 160; this.s.vel.sy += 4; this.s.vel.sx -= 3; this.kick(); }

  scheduleBlink() {
    setTimeout(() => {
      this.s.t.lid = 0.08; this.kick();
      setTimeout(() => { this.s.t.lid = 1; this.kick(); this.scheduleBlink(); }, 130);
    }, 2200 + Math.random() * 3000);
  }

  kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((n) => this.tick(n)); } }

  targets() {
    const r = this.svg.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height * 0.45 };
    const p = this.pointer || c;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(d / 240, 1);              // how strongly we react: far cursors count less
    const ux = dx / d, uy = dy / d;
    const t = this.s.t;
    t.ex = ux * 7 * k; t.ey = uy * 6 * k;
    t.rot = clamp(dx / 40, -1, 1) * 7 * (this.hover ? 1 : 0.6);
    t.sx = this.pressed ? 1.08 : this.hover ? 1.05 : 1;
    t.sy = this.pressed ? 0.86 : this.hover ? 1.05 : 1;
    // the dot drifts away from the cursor when near, like it's shy; otherwise leans toward it a little
    t.dx = this.hover ? -ux * 10 : ux * 4 * k;
    t.dy = this.hover ? -uy * 10 : uy * 4 * k;
  }

  // soft-body: every outline point has its own spring; idle drift + a bulge toward the cursor
  wobble(dt, t) {
    if (reduced) { this.draw(); return false; }
    const r = this.svg.getBoundingClientRect();
    const q = this.pointer && r.width ? { x: (this.pointer.x - r.left) * 200 / r.width, y: (this.pointer.y - r.top) * 200 / r.height } : null;
    const lean = this.pressed ? 0 : this.hover ? 1 : 0.35;
    this.pts.forEach((g, gi) => {
      g.base.forEach((b, i) => {
        const amp = gi === 0 ? 1.5 : 0.7;
        let tx = Math.sin(t * 1.2 + i * 1.9 + gi) * amp, ty = Math.cos(t * 0.95 + i * 2.3 + gi * 2) * amp;
        if (q && gi === 0) {
          const dx = q.x - b[0], dy = q.y - b[1], d = Math.hypot(dx, dy) || 1;
          const k = Math.exp(-Math.pow(d / 70, 2)) * lean * Math.min(d, 40) / d * 0.4;
          tx += dx * k; ty += dy * k;
        }
        const o = g.off[i], vel = g.vel[i];
        vel[0] += (120 * (tx - o[0]) - 9 * vel[0]) * dt; vel[1] += (120 * (ty - o[1]) - 9 * vel[1]) * dt;
        o[0] += vel[0] * dt; o[1] += vel[1] * dt;
      });
    });
    this.draw();
    return true;
  }

  // letter under the cursor hops up; its neighbours follow a little, like a soft wave
  lift(dt) {
    if (this.markOnly) return 0;
    const wr = this.word.getBoundingClientRect(), p = this.pointer, t = performance.now() / 1000;
    const over = p && p.x > wr.left - 6 && p.x < wr.right + 6 && p.y > wr.top - wr.height * 0.4 && p.y < wr.bottom + wr.height * 0.4;
    let busy = 0;
    this.letters.forEach((L, li) => {
      const r = L.el.getBoundingClientRect();
      const d = over ? (p.x - (r.left + r.width / 2)) / Math.max(r.width, wr.width / 5) : 9;
      const target = -Math.exp(-d * d * 3) * 0.18;               // em: negative = up
      if (reduced) L.y = target;
      else {
        L.v += (260 * (target - L.y) - 15 * L.v) * dt; L.y += L.v * dt;
        busy |= Math.abs(L.v) > 0.002 || Math.abs(target - L.y) > 0.002;
      }
      L.el.setAttribute('transform', `translate(${L.g.x} ${(L.g.dy + L.y * 100).toFixed(2)}) rotate(${L.g.tilt} 25 -25)`);
      // imperfect: every centre-line point drifts a little, so strokes are never ruler-straight
      L.shapes.forEach((sh, si) => {
        const P = sh.pts.map((q, i) => reduced ? q : [q[0] + Math.sin(t * 1.1 + i * 2.1 + li * 1.7 + si) * 0.9, q[1] + Math.cos(t * 0.9 + i * 1.6 + li * 2.3) * 0.9]);
        sh.path.setAttribute('d', sh.closed ? blobPath(P) : openPath(P));
      });
    });
    return busy;
  }

  draw() {
    const pos = (g) => g.base.map((b, i) => [b[0] + g.off[i][0], b[1] + g.off[i][1]]);
    this.bodyPath.setAttribute('d', blobPath(pos(this.pts[0])));
    this.dot.setAttribute('d', blobPath(pos(this.pts[1])));
  }

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 30); this.last = now;
    this.targets();
    const e = reduced ? 0 : this.s.step(dt);
    if (reduced) Object.assign(this.s.v, this.s.t);
    const v = this.s.v;
    const moving = this.wobble(dt, now / 1000) | this.lift(dt) | !reduced;
    // scale from the feet so squish feels grounded
    this.body.setAttribute('transform', `translate(100 185) rotate(${v.rot.toFixed(2)}) scale(${v.sx.toFixed(3)} ${v.sy.toFixed(3)}) translate(-100 -185)`);
    const squint = this.pressed ? 0.45 : 1;
    const ry = 12.5 * clamp(v.lid, 0.08, 1.2) * squint * (this.hover && !this.pressed ? 1.12 : 1);
    for (const [eye, cx] of [[this.eyeL, 86], [this.eyeR, 114]]) {
      eye.setAttribute('cx', (cx + v.ex).toFixed(2));
      eye.setAttribute('cy', (80 + v.ey).toFixed(2));
      eye.setAttribute('ry', ry.toFixed(2));
    }
    this.dot.setAttribute('transform', `translate(${v.dx.toFixed(2)} ${v.dy.toFixed(2)})`);
    this.raf = e > 0.05 || moving ? requestAnimationFrame((n) => this.tick(n)) : 0;
  }
}

export const initLogos = (scope = document) => scope.querySelectorAll('.vira-logo').forEach((n) => { if (!n._vl) n._vl = new ViraLogo(n); });
initLogos();
