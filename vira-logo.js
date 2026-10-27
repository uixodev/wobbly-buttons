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

const BODY = 'M100 26C124 26 134 54 147 84C159 112 178 138 180 163C182 184 160 188 148 180C132 168 118 150 100 150C82 150 68 168 52 180C40 188 18 184 20 163C22 138 41 112 53 84C66 54 76 26 100 26Z';

class ViraLogo {
  constructor(root) {
    this.root = root;
    this.pointer = null; this.hover = false; this.pressed = false; this.blink = 0;
    this.s = new Springs({ rot: 0, sx: 1, sy: 1, ex: 0, ey: 0, lid: 1, dx: 0, dy: 0 });
    this.raf = 0; this.last = 0;

    const word = document.createElement('span');
    word.className = 'vira-word';
    word.textContent = root.dataset.text || 'vira';

    this.svg = el('svg', { viewBox: '0 0 200 200', class: 'vira-mark', 'aria-hidden': 'true' });
    this.body = el('g', { class: 'vira-body' });
    this.body.append(el('path', { d: BODY, fill: 'currentColor' }));
    this.eyes = el('g', { fill: '#faf7f0' });
    this.eyeL = el('ellipse', { cx: 86, cy: 80, rx: 9.5, ry: 12.5 });
    this.eyeR = el('ellipse', { cx: 114, cy: 80, rx: 9.5, ry: 12.5 });
    this.eyes.append(this.eyeL, this.eyeR);
    this.body.append(this.eyes);
    this.dot = el('circle', { cx: 170, cy: 28, r: 14, fill: 'currentColor' });
    this.svg.append(this.body, this.dot);
    root.replaceChildren(this.svg, word);
    root.setAttribute('aria-label', word.textContent);

    root.addEventListener('pointerenter', () => { this.hover = true; this.kick(); });
    root.addEventListener('pointerleave', () => { this.hover = false; this.pressed = false; this.kick(); });
    root.addEventListener('pointerdown', () => { this.pressed = true; this.kick(); });
    root.addEventListener('pointerup', () => { this.pressed = false; this.hop(); });
    window.addEventListener('pointermove', (e) => { this.pointer = { x: e.clientX, y: e.clientY }; this.kick(); }, { passive: true });
    if (!reduced) this.scheduleBlink();
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

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, 1 / 30); this.last = now;
    this.targets();
    const e = reduced ? 0 : this.s.step(dt);
    if (reduced) Object.assign(this.s.v, this.s.t);
    const v = this.s.v;
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
    this.raf = e > 0.05 ? requestAnimationFrame((n) => this.tick(n)) : 0;
  }
}

export const initLogos = (scope = document) => scope.querySelectorAll('.vira-logo').forEach((n) => { if (!n._vl) n._vl = new ViraLogo(n); });
initLogos();
