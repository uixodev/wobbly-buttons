// Wobbly buttons: a soft-body blob drawn as an SVG path, driven by per-point springs.
// States: idle → close (cursor nearby, blob leans toward it) → hover → press (squish) → release (springy rebound).

const SVG_NS = 'http://www.w3.org/2000/svg';
const N = 24;               // points on the outline
const STIFFNESS = 170;
const DAMPING = 13;
const CLOSE_RADIUS = 120;   // px around the button where the blob starts leaning
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = (name, attrs = {}) => {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

class Wobbly {
  constructor(root) {
    this.root = root;
    this.state = 'idle';
    this.pointer = null;       // {x, y} in button-local coords
    this.inside = false;
    this.base = []; this.off = []; this.vel = [];
    this.scale = 1; this.scaleV = 0;
    this.raf = 0; this.last = 0; this.releaseTimer = 0;

    // keep authored children inside a label wrapper so the text can squish with the blob
    const label = document.createElement('span');
    label.className = 'wb-label';
    while (root.firstChild) label.appendChild(root.firstChild);

    this.svg = el('svg', { 'aria-hidden': 'true' });
    this.shape = el('path', { class: 'wb-shape' });
    this.sparks = {
      hover: el('g', { class: 'wb-spark wb-hover' }),
      close: el('g', { class: 'wb-spark wb-close' }),
      press: el('g', { class: 'wb-spark wb-press' }),
      release: el('g', { class: 'wb-spark wb-release' }),
    };
    this.svg.append(this.shape, ...Object.values(this.sparks));
    root.append(this.svg, label);
    root.dataset.state = 'idle';

    new ResizeObserver(() => this.measure()).observe(root);
    this.measure();

    root.addEventListener('pointerenter', (e) => { this.inside = true; this.track(e); this.set('hover'); });
    root.addEventListener('pointerleave', (e) => { this.inside = false; this.track(e); this.set(this.near() ? 'close' : 'idle'); });
    root.addEventListener('pointerdown', () => { clearTimeout(this.releaseTimer); this.set('press'); });
    root.addEventListener('pointerup', () => this.release());
    root.addEventListener('pointercancel', () => this.set('idle'));
    root.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') this.set('press'); });
    root.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') this.release(); });
    window.addEventListener('pointermove', (e) => {
      this.track(e);
      if (this.state === 'idle' && this.near()) this.set('close');
      else if (this.state === 'close' && !this.near()) this.set('idle');
    }, { passive: true });
  }

  measure() {
    const w = this.root.offsetWidth, h = this.root.offsetHeight;
    this.w = w; this.h = h;
    const cx = w / 2, cy = h / 2;
    // peanut outline: fuller ends, pinched waist top & bottom
    this.base = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const x = cx + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.85);
      const y = cy + (h / 2) * 1.12 * s * (1 + 0.24 * Math.cos(2 * t)) + 0.02 * h * Math.sin(t * 2 + 0.6);
      return { x, y };
    });
    if (this.off.length !== N) { this.off = this.base.map(() => ({ x: 0, y: 0 })); this.vel = this.base.map(() => ({ x: 0, y: 0 })); }
    this.buildSparks();
    this.kick();
  }

  buildSparks() {
    const { w, h } = this, S = this.sparks;
    const line = (x1, y1, x2, y2) => el('path', { d: `M${x1} ${y1}L${x2} ${y2}` });
    const arc = (d) => el('path', { d });
    for (const g of Object.values(S)) g.replaceChildren();
    // hover: double arcs off the top-left and bottom-right bulges
    S.hover.append(
      arc('M-6 22Q-6 -4 22 -10'), arc('M-14 26Q-14 -12 24 -18'),
      arc(`M${w + 6} ${h - 22}Q${w + 6} ${h + 4} ${w - 22} ${h + 10}`), arc(`M${w + 14} ${h - 26}Q${w + 14} ${h + 12} ${w - 24} ${h + 18}`),
    );
    // press: ticks fanning out of the top and bottom edges
    for (const dx of [-26, 0, 26]) {
      const a = dx / 90;
      S.press.append(
        line(w / 2 + dx, -10, w / 2 + dx + Math.sin(a) * 12, -22),
        line(w / 2 + dx, h + 10, w / 2 + dx + Math.sin(a) * 12, h + 22),
      );
    }
    // release: diagonal ticks at top-right and bottom-left
    S.release.append(
      line(w - 6, -8, w + 4, -20), line(w + 8, -2, w + 22, -8),
      line(6, h + 8, -4, h + 20), line(-8, h + 2, -22, h + 8),
    );
  }

  // pointer → button-local coordinates
  track(e) {
    const r = this.root.getBoundingClientRect();
    this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    this.kick();
  }
  distToBox() {
    if (!this.pointer) return Infinity;
    const dx = Math.max(-this.pointer.x, 0, this.pointer.x - this.w);
    const dy = Math.max(-this.pointer.y, 0, this.pointer.y - this.h);
    return Math.hypot(dx, dy);
  }
  near() { return this.distToBox() < CLOSE_RADIUS; }

  set(state) {
    if (this.state === state) return;
    this.state = state;
    this.root.dataset.state = state;
    if (state === 'close') this.placeCloseSparks();
    this.kick();
  }
  release() {
    if (this.state !== 'press') return;
    this.set('release');
    this.releaseTimer = setTimeout(() => this.set(this.inside ? 'hover' : this.near() ? 'close' : 'idle'), 420);
  }
  placeCloseSparks() {
    if (!this.pointer) return;
    const { w, h } = this, p = this.pointer;
    const bx = clamp(p.x, 0, w), by = clamp(p.y, 0, h);
    const ang = Math.atan2(p.y - h / 2, p.x - w / 2) * 180 / Math.PI;
    const g = this.sparks.close;
    g.replaceChildren(el('path', { d: 'M0 -14Q12 0 0 14' }), el('path', { d: 'M8 -20Q26 0 8 20' }));
    g.setAttribute('transform', `translate(${bx} ${by}) rotate(${ang})`);
  }

  // spring targets per state
  targets() {
    const { w, h } = this, c = { x: w / 2, y: h / 2 };
    const st = this.state;
    const S = st === 'press' ? 0.9 : st === 'release' ? 1.1 : st === 'hover' ? 1.07 : st === 'close' ? 1.03 : 1;
    const sx = st === 'press' ? 0.93 : 1, sy = st === 'press' ? 0.8 : 1;
    const lean = st === 'close' ? clamp(1 - this.distToBox() / CLOSE_RADIUS, 0, 1) : st === 'hover' ? 0.28 : 0;
    const t = performance.now() / 1000;
    return this.base.map((b, i) => {
      let x = (b.x - c.x) * (S * sx - 1), y = (b.y - c.y) * (S * sy - 1);
      if (this.pointer && lean) {
        const dx = this.pointer.x - b.x, dy = this.pointer.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.exp(-Math.pow(d / 110, 2)) * lean * Math.min(d, 90) / d;
        x += dx * k * 1.25; y += dy * k * 1.25;
      }
      if (!reduced) { x += Math.sin(t * 1.3 + i * 1.7) * 1.1; y += Math.cos(t * 1.1 + i * 2.1) * 1.1; }
      return { x, y };
    });
  }

  kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((n) => this.tick(n)); } }

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 30); this.last = now;
    const T = this.targets();
    let energy = 0;
    for (let i = 0; i < N; i++) {
      for (const a of ['x', 'y']) {
        if (reduced) { this.off[i][a] = T[i][a]; this.vel[i][a] = 0; continue; }
        const f = STIFFNESS * (T[i][a] - this.off[i][a]) - DAMPING * this.vel[i][a];
        this.vel[i][a] += f * dt;
        this.off[i][a] += this.vel[i][a] * dt;
        energy += Math.abs(this.vel[i][a]);
      }
    }
    // label scale follows the same spring feel
    const ts = this.state === 'press' ? 0.94 : this.state === 'release' ? 1.04 : 1;
    this.scaleV += (STIFFNESS * (ts - this.scale) - DAMPING * this.scaleV) * dt;
    this.scale += this.scaleV * dt;
    this.root.style.setProperty('--wb-scale', reduced ? ts : this.scale.toFixed(4));

    this.draw();
    // idle drift keeps animating; stop only when reduced-motion
    this.raf = reduced && energy < 0.01 ? 0 : requestAnimationFrame((n) => this.tick(n));
    if (reduced) this.raf = 0;
  }

  draw() {
    const P = this.base.map((b, i) => ({ x: b.x + this.off[i].x, y: b.y + this.off[i].y }));
    // closed Catmull-Rom → cubic Bézier
    let d = `M${P[0].x.toFixed(2)} ${P[0].y.toFixed(2)}`;
    for (let i = 0; i < N; i++) {
      const p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += `C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    this.shape.setAttribute('d', d + 'Z');
  }
}

export const init = (scope = document) => scope.querySelectorAll('.wobbly').forEach((n) => { if (!n._wb) n._wb = new Wobbly(n); });
init();
