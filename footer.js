// The black footer's wavy top edge is liquid: it drifts on its own, bulges up towards your cursor as you near it, and ripples when you
// click close to it. With prefers-reduced-motion it is still. The loop only runs while the footer is on screen.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const band = document.querySelector('.footer-dark');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fall = (s) => { s = clamp(s, 0, 1); return 1 - s * s * (3 - 2 * s); };      // 1 at the centre → 0 at the edge, no hard boundary

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  waveReach: 190,          // how far (px) above/below the edge your cursor can be and still pull it
  waveLift: 46,            // how far (viewBox units, 0–120) the edge bulges towards the cursor
  waveSpring: 55, waveDamping: 5.2, waveMembrane: 26,
  ripple: 190,             // strength of the ripple a click sends along the edge
};

if (band) start();

function start() {
  const waveSvg = band.querySelector('.wave'), wavePath = waveSvg.querySelector('path');
  let visible = false, raf = 0, last = 0, time = 0;
  const pointer = { x: -9999, y: -9999 };

  // points along the top edge of the black band, each on its own spring
  const N = 26, VB_W = 1440, VB_H = 120;
  const baseY = (x) => 64 + 22 * Math.sin(x * 0.0045 + 0.6) + 14 * Math.sin(x * 0.012 + 1.9) - 8 * (x / VB_W);
  const wave = Array.from({ length: N + 1 }, (_, i) => ({ x: (i / N) * VB_W, y: baseY((i / N) * VB_W), vy: 0, base: baseY((i / N) * VB_W) }));
  let rect = { left: 0, top: 0, width: 1, height: 1 };
  const settle = () => { const r = waveSvg.getBoundingClientRect(); rect = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 }; };

  function step(dt) {
    const k = CONFIG.waveSpring, c = CONFIG.waveDamping, km = CONFIG.waveMembrane;
    const px = ((pointer.x - rect.left) / rect.width) * VB_W, py = ((pointer.y - rect.top) / rect.height) * VB_H;
    const reachX = (CONFIG.waveReach / rect.width) * VB_W;
    for (let i = 0; i <= N; i++) {
      const p = wave[i];
      let target = p.base + (reduced ? 0 : Math.sin(time * 0.7 + i * 0.75) * 4.5 + Math.sin(time * 0.31 + i * 1.7) * 3);
      // reach for the cursor: the edge bulges towards it, but only when the cursor is close to the edge in both directions
      const near = fall(Math.abs(px - p.x) / reachX) * fall((Math.abs(py - p.y) / VB_H) * rect.height / CONFIG.waveReach);
      if (near > 0 && !reduced) target += clamp((py - p.base) * 0.9, -CONFIG.waveLift, CONFIG.waveLift) * near;
      const a = wave[Math.max(0, i - 1)], b = wave[Math.min(N, i + 1)];
      p.vy += (k * (target - p.y) - c * p.vy + km * ((a.y + b.y) / 2 - p.y)) * dt;
    }
    for (const p of wave) p.y += p.vy * dt;
  }
  function draw() {
    let d = `M${wave[0].x.toFixed(1)} ${wave[0].y.toFixed(1)}`;
    for (let i = 0; i < N; i++) {
      const p0 = wave[Math.max(0, i - 1)], p1 = wave[i], p2 = wave[i + 1], p3 = wave[Math.min(N, i + 2)];
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    wavePath.setAttribute('d', d + ` L${VB_W} ${VB_H} L0 ${VB_H}Z`);
  }

  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; if (visible) wake(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, (e) => { if (e.pointerType !== 'mouse') pointer.x = pointer.y = -9999; }, { passive: true });
  addEventListener('scroll', settle, { passive: true });
  addEventListener('resize', settle);
  // a click near the edge sends a ripple along it
  addEventListener('pointerdown', (e) => {
    if (reduced || !visible || Math.abs(e.clientY - (rect.top + rect.height * 0.6)) > 90) return;
    const x = ((e.clientX - rect.left) / rect.width) * VB_W;
    for (const p of wave) p.vy -= CONFIG.ripple * Math.exp(-Math.pow((p.x - x) / 170, 2));
    wake();
  });

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    settle();
    if (!reduced) { step(dt / 2); step(dt / 2); }
    draw();
    raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { settle(); wake(); } }, { rootMargin: '120px' }).observe(band);
  settle(); draw();
}
