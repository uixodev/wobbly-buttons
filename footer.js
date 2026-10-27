// The black footer band, made playful. Everything is drawn in the same cream line-art as the rest of the band.
//   • the wavy top edge is liquid: it drifts on its own, bulges up towards your cursor as you near it, and ripples when you click it
//   • the two swirly lines are plucked strings: push them and they spring back with a wobble
//   • the empty dark area is a doodle pad: press and drag to draw in cream ink; lines slowly dissolve
//   • DESIGN / CODE / EXPERIMENT / REPEAT light up one after another, in a loop
//   • pressing "Back to top" makes the character hop
// Loops only run while the footer is on screen. With prefers-reduced-motion everything is still, except what you draw yourself.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const band = document.querySelector('.footer-dark');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fall = (s) => { s = clamp(s, 0, 1); return 1 - s * s * (3 - 2 * s); };      // 1 at the centre → 0 at the edge, no hard boundary

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  // liquid edge
  waveReach: 190,          // how far (px) above/below the edge your cursor can be and still pull it
  waveLift: 46,            // how far (viewBox units, 0–120) the edge bulges towards the cursor
  waveSpring: 55, waveDamping: 5.2, waveMembrane: 26,
  // plucked strings
  stringReach: 120,        // how close the cursor must come to push a string (px)
  stringPush: 58,          // how far it is pushed (px)
  stringSpring: 38, stringDamping: 4.0, stringMembrane: 22,
  // doodles
  inkWidth: 2.4,
  inkLife: 7,              // seconds before a doodle has completely dissolved
  // words
  wordSeconds: 1.3,        // how long each word stays lit
};

if (band) start();

function start() {
  const canvas = band.querySelector('.dark-canvas');
  const ctx = canvas.getContext('2d');
  const waveSvg = band.querySelector('.wave'), wavePath = waveSvg.querySelector('path');
  const ropeSvgs = [...band.querySelectorAll('[data-rope]')];
  let W = 1, H = 1, dpr = 1, visible = false, raf = 0, last = 0, time = 0;
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, down: false };

  // ── liquid edge: points along the top edge of the black band, each on its own spring ──
  const N = 26, VB_W = 1440, VB_H = 120;
  const baseY = (x) => 64 + 22 * Math.sin(x * 0.0045 + 0.6) + 14 * Math.sin(x * 0.012 + 1.9) - 8 * (x / VB_W);
  const wave = Array.from({ length: N + 1 }, (_, i) => ({ x: (i / N) * VB_W, y: baseY((i / N) * VB_W), vy: 0, base: baseY((i / N) * VB_W) }));
  let waveRect = { left: 0, top: 0, width: 1, height: 1 };

  function stepWave(dt) {
    const k = CONFIG.waveSpring, c = CONFIG.waveDamping, km = CONFIG.waveMembrane;
    // pointer → viewBox coordinates
    const px = ((pointer.x - waveRect.left) / waveRect.width) * VB_W;
    const py = ((pointer.y - waveRect.top) / waveRect.height) * VB_H;
    const reachX = (CONFIG.waveReach / waveRect.width) * VB_W;
    for (let i = 0; i <= N; i++) {
      const p = wave[i];
      let target = p.base + (reduced ? 0 : Math.sin(time * 0.7 + i * 0.75) * 4.5 + Math.sin(time * 0.31 + i * 1.7) * 3);
      // reach for the cursor: the edge bulges towards it, but only when the cursor is close to the edge in both directions
      const near = fall(Math.abs(px - p.x) / reachX) * fall(Math.max(0, Math.abs(py - p.y) / VB_H * waveRect.height / CONFIG.waveReach));
      if (near > 0 && !reduced) target += clamp((py - p.base) * 0.9, -CONFIG.waveLift, CONFIG.waveLift) * near;
      const a = wave[Math.max(0, i - 1)], b = wave[Math.min(N, i + 1)];
      p.vy += (k * (target - p.y) - c * p.vy + km * ((a.y + b.y) / 2 - p.y)) * dt;
    }
    for (const p of wave) p.y += p.vy * dt;
  }
  function drawWave() {
    let d = `M${wave[0].x.toFixed(1)} ${wave[0].y.toFixed(1)}`;
    for (let i = 0; i < N; i++) {
      const p0 = wave[Math.max(0, i - 1)], p1 = wave[i], p2 = wave[i + 1], p3 = wave[Math.min(N, i + 2)];
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    wavePath.setAttribute('d', d + ` L${VB_W} ${VB_H} L0 ${VB_H}Z`);
  }
  // a click on the edge sends a ripple along it
  function ripple(clientX) {
    const x = ((clientX - waveRect.left) / waveRect.width) * VB_W;
    for (const p of wave) { const f = Math.exp(-Math.pow((p.x - x) / 170, 2)); p.vy += -190 * f; }
  }

  // ── plucked strings: each swirl's geometry is sampled into nodes that spring back to where they belong ──
  let ropes = [];
  function buildRopes() {
    const cr = canvas.getBoundingClientRect();
    ropes = [];
    for (const svg of ropeSvgs) {
      const path = svg.querySelector('path'), m = svg.getScreenCTM();
      if (!m || getComputedStyle(svg).display === 'none') continue;
      const len = path.getTotalLength(), n = Math.max(24, Math.round(len / 9));
      const nodes = Array.from({ length: n + 1 }, (_, i) => {
        const pt = path.getPointAtLength((i / n) * len), x = m.a * pt.x + m.c * pt.y + m.e - cr.left, y = m.b * pt.x + m.d * pt.y + m.f - cr.top;
        return { rx: x, ry: y, x, y, vx: 0, vy: 0 };
      });
      ropes.push(nodes);
    }
  }
  function stepRopes(dt) {
    const reach = CONFIG.stringReach, k = CONFIG.stringSpring, c = CONFIG.stringDamping, km = CONFIG.stringMembrane;
    const cr = canvas.getBoundingClientRect(), mx = pointer.x - cr.left, my = pointer.y - cr.top;
    for (const nodes of ropes) {
      const n = nodes.length;
      for (let i = 0; i < n; i++) {
        const p = nodes[i];
        let tx = p.rx, ty = p.ry;
        const dx = p.rx - mx, dy = p.ry - my, d = Math.hypot(dx, dy) || 1;
        if (!reduced && d < reach) { const f = fall(d / reach); tx += (dx / d) * f * CONFIG.stringPush; ty += (dy / d) * f * CONFIG.stringPush; }   // pushed away, like a plucked string
        const a = nodes[Math.max(0, i - 1)], b = nodes[Math.min(n - 1, i + 1)];
        const pin = i === 0 || i === n - 1 ? 3 : 1;                                       // the ends are anchored harder
        p.vx += (k * pin * (tx - p.x) - c * p.vx + km * ((a.x + b.x) / 2 - p.x)) * dt;
        p.vy += (k * pin * (ty - p.y) - c * p.vy + km * ((a.y + b.y) / 2 - p.y)) * dt;
      }
      for (const p of nodes) { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
  }
  function drawRopes() {
    ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#F7F3EF';
    for (const nodes of ropes) {
      const n = nodes.length;
      ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 0; i < n - 1; i++) {
        const p0 = nodes[Math.max(0, i - 1)], p1 = nodes[i], p2 = nodes[i + 1], p3 = nodes[Math.min(n - 1, i + 2)];
        ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
      }
      ctx.stroke();
    }
  }

  // ── doodle pad: press and drag on empty dark space; the ink dissolves slowly ──
  const strokes = [];
  let current = null;
  const blocked = (t) => !!t.closest('a, button, input, label, .vira-logo, .to-top');
  band.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || blocked(e.target)) return;
    const cr = canvas.getBoundingClientRect();
    current = { pts: [{ x: e.clientX - cr.left, y: e.clientY - cr.top, t: performance.now() }] };
    strokes.push(current); pointer.down = true; wake();
  });
  addEventListener('pointerup', () => { current = null; pointer.down = false; });
  function drawInk(now) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = CONFIG.inkWidth;
    for (let s = strokes.length - 1; s >= 0; s--) {
      const pts = strokes[s].pts;
      if (strokes[s] !== current && now - pts[pts.length - 1].t > CONFIG.inkLife * 1000) { strokes.splice(s, 1); continue; }
      for (let i = 1; i < pts.length; i++) {
        const age = (now - pts[i].t) / 1000, a = clamp(1 - age / CONFIG.inkLife, 0, 1);
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(247,243,239,${(a * a * 0.95).toFixed(3)})`;     // fades out smoothly
        ctx.beginPath();
        const p0 = pts[i - 1], p1 = pts[i];
        ctx.moveTo((p0.x + (pts[Math.max(0, i - 2)].x)) / 2, (p0.y + (pts[Math.max(0, i - 2)].y)) / 2);
        ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        ctx.stroke();
      }
    }
  }

  // ── pointer tracking ──
  addEventListener('pointermove', (e) => {
    pointer.vx = e.clientX - pointer.x; pointer.vy = e.clientY - pointer.y;
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (current) { const cr = canvas.getBoundingClientRect(); current.pts.push({ x: e.clientX - cr.left, y: e.clientY - cr.top, t: performance.now() }); }
    if (visible) wake();
  }, { passive: true });
  band.addEventListener('pointerdown', (e) => { const r = waveRect; if (Math.abs(e.clientY - (r.top + r.height * 0.6)) < 90) ripple(e.clientX); });   // click near the edge: a ripple
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });

  // ── layout ──
  function measure() {
    const r = band.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wr = waveSvg.getBoundingClientRect(); waveRect = { left: wr.left, top: wr.top, width: wr.width || 1, height: wr.height || 1 };
    buildRopes();
  }
  new ResizeObserver(measure).observe(band);
  addEventListener('resize', measure);
  measure();
  drawWave();
  const settle = () => { const wr = waveSvg.getBoundingClientRect(); waveRect = { left: wr.left, top: wr.top, width: wr.width || 1, height: wr.height || 1 }; };
  addEventListener('scroll', settle, { passive: true });

  // ── loop ──
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    settle();
    if (!reduced) { stepWave(dt / 2); stepWave(dt / 2); stepRopes(dt / 2); stepRopes(dt / 2); }
    ctx.clearRect(0, 0, W, H);
    drawRopes(); drawInk(now); drawWave();
    raf = visible && (!reduced || strokes.length) ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { settle(); if (reduced) { ctx.clearRect(0, 0, W, H); drawRopes(); } else wake(); } }, { rootMargin: '120px' }).observe(band);

  // ── the words: light up one after another ──
  const words = [...band.querySelectorAll('.dark-list span')];
  if (words.length && !reduced) {
    let i = 0;
    words[0].classList.add('on');
    setInterval(() => { if (!visible) return; words[i].classList.remove('on'); i = (i + 1) % words.length; words[i].classList.add('on'); }, CONFIG.wordSeconds * 1000);
  } else words.forEach((w) => w.classList.add('on'));

  // ── the character hops when you head back to the top ──
  band.querySelector('.to-top')?.addEventListener('click', () => band.querySelector('.dark-char .vira-logo')?._vl?.hop());
}
