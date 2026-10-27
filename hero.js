// Hero: a still life of six hand-cut shapes (black solids and fine outlines). Each sits on springs: they drift gently, step aside
// as your cursor passes, and click / tap / Enter re-arranges them into the next composition. Static with prefers-reduced-motion.

const root = document.getElementById('hero-ink');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = root.querySelector('svg'), count = root.querySelector('.ink-count');
  const shapes = [...svg.querySelectorAll('.sh')];
  // compositions: [x, y, rotation°, scale] for circle, arch, semi, blob, dot, plus
  const LAYOUTS = [
    [[170, 190, 0, 1.25], [268, 232, 8, 1.15], [112, 322, -8, 1], [292, 104, 14, .95], [78, 112, 0, 1], [334, 338, 12, 1]],
    [[250, 150, 0, 1], [128, 250, -12, 1.35], [292, 316, 180, 1.05], [108, 96, -18, 1.1], [330, 236, 0, .9], [58, 340, 0, 1.1]],
    [[130, 270, 0, 1.1], [254, 196, 0, 1.55], [120, 106, 0, .95], [320, 322, 28, 1], [214, 334, 0, 1.2], [332, 84, 45, 1.1]],
  ];
  const DEPTH = [10, 16, 8, 14, 22, 18];
  const S = shapes.map((el, i) => { const t = LAYOUTS[0][i]; return { el, x: t[0], y: t[1], r: t[2], s: t[3], vx: 0, vy: 0, vr: 0, vs: 0, i }; });
  let layout = 0;
  const ptr = { x: 200, y: 200, active: false };

  const toSvg = (e) => { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 400, y: ((e.clientY - r.top) / r.height) * 400 }; };
  addEventListener('pointermove', (e) => { const p = toSvg(e); ptr.x = p.x; ptr.y = p.y; ptr.active = true; wake(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.active = false; });

  function shuffle() {
    layout = (layout + 1) % LAYOUTS.length;
    count.textContent = `0${layout + 1} / 03`;
    if (!reduced) for (const o of S) { o.vx += (Math.random() - 0.5) * 220; o.vy += (Math.random() - 0.5) * 220; o.vr += (Math.random() - 0.5) * 260; o.vs += (Math.random() - 0.5) * 3; }
    wake();
  }
  root.addEventListener('click', shuffle);
  root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shuffle(); } });

  const place = (o, dx = 0, dy = 0) => o.el.setAttribute('transform', `translate(${(o.x + dx).toFixed(1)} ${(o.y + dy).toFixed(1)}) rotate(${o.r.toFixed(1)}) scale(${o.s.toFixed(3)})`);
  let raf = 0, last = 0, time = 0, visible = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    const px = ptr.active ? (ptr.x - 200) / 200 : 0, py = ptr.active ? (ptr.y - 200) / 200 : 0;
    for (const o of S) {
      const t = LAYOUTS[layout][o.i];
      let tx = t[0] + px * DEPTH[o.i] * -1 + Math.sin(time * .8 + o.i * 1.7) * 3, ty = t[1] + py * DEPTH[o.i] * -1 + Math.cos(time * .7 + o.i * 2.1) * 3;
      if (ptr.active) {                         // step aside as the cursor passes
        const dx = o.x - ptr.x, dy = o.y - ptr.y, d = Math.hypot(dx, dy) || 1, R = 100 * Math.max(.8, t[3] * .85);
        if (d < R) { const push = (1 - d / R) * 34; tx += (dx / d) * push; ty += (dy / d) * push; }
      }
      const tr = t[2] + Math.sin(time * .6 + o.i) * 2.5, ts = t[3];
      o.vx += (110 * (tx - o.x) - 11 * o.vx) * dt; o.vy += (110 * (ty - o.y) - 11 * o.vy) * dt;
      o.vr += (90 * (tr - o.r) - 10 * o.vr) * dt; o.vs += (90 * (ts - o.s) - 10 * o.vs) * dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt; o.s += o.vs * dt;
      place(o);
    }
    raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(root);
  S.forEach((o) => place(o));
  if (!reduced) wake();
}
