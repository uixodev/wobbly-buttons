// Hero: a single living ink shape (a closed curve on springs). It leans toward your cursor wherever it is on the page, its eyes follow you and
// blink, and clicking it squashes it and makes it say hi. A dot drifts round a hand-drawn dotted ring. Static with prefers-reduced-motion.

const root = document.getElementById('hero-ink');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = root.querySelector('svg'), body = svg.querySelector('.ink-body'), face = svg.querySelector('.ink-face');
  const eyes = [...svg.querySelectorAll('.ink-eye')], pupils = [...svg.querySelectorAll('.pupil')];
  const orbit = svg.querySelector('.ink-orbit'), ring = svg.querySelector('.ink-ring'), say = root.querySelector('.ink-say');
  const N = 18, CX = 200, CY = 208, R = 118;
  const pts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2, r = R * (1 + 0.11 * Math.sin(i * 2.3 + 1) + 0.07 * Math.cos(i * 3.7));
    const x = CX + Math.cos(a) * r * 1.02, y = CY + Math.sin(a) * r * 0.96;
    return { bx: x, by: y, x, y, vx: 0, vy: 0 };
  });
  const ptr = { x: CX, y: CY, active: false };
  const off = { x: 0, y: 0 };                       // whole-body lean
  const L = ring.getTotalLength?.() || 1;

  const toSvg = (e) => { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 400, y: ((e.clientY - r.top) / r.height) * 400 }; };
  addEventListener('pointermove', (e) => { const p = toSvg(e); ptr.x = p.x; ptr.y = p.y; ptr.active = true; wake(); }, { passive: true });
  addEventListener('pointerleave', () => { ptr.active = false; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.active = false; });

  const SAYS = ['hi!', 'hello!', 'hey you', 'boo!'];
  let sayI = 0, sayTimer = 0;
  root.addEventListener('pointerdown', (e) => {
    if (reduced) return;
    const p = toSvg(e); ptr.x = p.x; ptr.y = p.y;
    for (const q of pts) { q.vx += (CX - q.x) * 7 + (Math.random() - 0.5) * 60; q.vy += (CY - q.y) * 7 + (Math.random() - 0.5) * 60; }   // squash, then spring back
    say.textContent = SAYS[sayI++ % SAYS.length]; root.classList.add('hi'); clearTimeout(sayTimer); sayTimer = setTimeout(() => root.classList.remove('hi'), 1500);
    wake();
  });

  let raf = 0, last = 0, time = 0, visible = true, nextBlink = 2.2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function draw() {
    let d = '';
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      if (!i) d += `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    body.setAttribute('d', d + 'Z');
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    const dx = ptr.x - CX, dy = ptr.y - CY, dist = Math.hypot(dx, dy) || 1;
    // whole body leans a little toward the cursor
    const wantX = ptr.active ? clamp(dx * 0.06, -14, 14) : 0, wantY = ptr.active ? clamp(dy * 0.06, -14, 14) : 0;
    off.x += (wantX - off.x) * Math.min(1, dt * 5); off.y += (wantY - off.y) * Math.min(1, dt * 5);
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      let tx = p.bx + off.x + (reduced ? 0 : Math.sin(time * 1.2 + i * 1.3) * 2.2), ty = p.by + off.y + (reduced ? 0 : Math.cos(time * 1.0 + i * 1.9) * 2.2);
      if (ptr.active && !reduced) {                // the side nearest the cursor stretches toward it
        const ex = ptr.x - p.bx, ey = ptr.y - p.by, d = Math.hypot(ex, ey) || 1, pull = Math.max(0, 1 - d / 460);
        const reach = Math.min(d, 70) * Math.pow(pull, 0.7) * 0.62;
        tx += (ex / d) * reach; ty += (ey / d) * reach;
      }
      p.vx += (130 * (tx - p.x) - 8 * p.vx) * dt; p.vy += (130 * (ty - p.y) - 8 * p.vy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    draw();
    // face turns toward the cursor, pupils look at it
    const fx = off.x * 1.8 + clamp(dx * 0.05, -12, 12) * (ptr.active ? 1 : 0), fy = off.y * 1.8 + clamp(dy * 0.05, -10, 10) * (ptr.active ? 1 : 0);
    face.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)})`);
    const ang = Math.atan2(dy, dx), look = ptr.active ? Math.min(7, dist * 0.04) : 0;
    pupils.forEach((p) => p.setAttribute('transform', `translate(${(Math.cos(ang) * look).toFixed(1)} ${(Math.sin(ang) * look * 1.2).toFixed(1)})`));
    // blink
    if (time > nextBlink) { eyes.forEach((e) => e.classList.add('blink')); setTimeout(() => eyes.forEach((e) => e.classList.remove('blink')), 130); nextBlink = time + 2.4 + Math.random() * 3; }
    // a dot drifts round the dotted ring
    if (L > 1) { const pt = ring.getPointAtLength(((time * 0.05) % 1) * L); orbit.setAttribute('cx', pt.x.toFixed(1)); orbit.setAttribute('cy', pt.y.toFixed(1)); }
    raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { threshold: 0 }).observe(root);
  if (reduced) { frame(performance.now()); draw(); } else wake();
}
