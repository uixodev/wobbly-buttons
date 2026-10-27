// Ink-droplet cursor: a living blob that lags the pointer on a spring, stretches into a teardrop
// along its velocity, grows over interactive things, squishes on press, and leaves a thin fading trail.
// Drawn on one fixed canvas with mix-blend-mode: difference, so it reads as dark ink on light pages
// and flips to light on dark surfaces (e.g. the solid black buttons).

const fine = matchMedia('(pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const R = 7;                 // resting droplet radius (px)
const TRAIL_MS = 480;        // how long a trail point lives
const POINTS = 16;           // outline points of the droplet
const INTERACTIVE = 'a, button, [role="button"], summary, label, input, select, textarea, .wobbly, .vira-logo';

export function initInkCursor() {
  if (!fine || document.querySelector('canvas.ink-cursor')) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'ink-cursor';
  Object.assign(canvas.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2147483647, mixBlendMode: 'difference' });
  document.body.appendChild(canvas);
  document.documentElement.classList.add('ink-cursor-on');
  const ctx = canvas.getContext('2d');

  let dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize(); addEventListener('resize', resize);

  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const head = { x: target.x, y: target.y, vx: 0, vy: 0 };
  const trail = [];            // {x, y, t}
  let size = 1, sizeV = 0, sizeT = 1;   // radius multiplier spring
  let visible = false, alpha = 0, pressed = false, raf = 0, last = 0;

  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    target.x = e.clientX; target.y = e.clientY;
    if (!visible) { head.x = target.x; head.y = target.y; head.vx = head.vy = 0; visible = true; }
    sizeT = pressed ? 0.7 : e.target.closest?.(INTERACTIVE) ? 2 : 1;
    wake();
  }, { passive: true });
  addEventListener('pointerdown', () => { pressed = true; sizeT = 0.7; wake(); });
  addEventListener('pointerup', (e) => { pressed = false; sizeT = e.target.closest?.(INTERACTIVE) ? 2 : 1; sizeV += 9; wake(); }); // little rebound
  document.documentElement.addEventListener('pointerleave', () => { visible = false; wake(); });
  document.documentElement.addEventListener('pointerenter', () => { visible = true; wake(); });

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;

    // head chases the pointer with a slightly underdamped spring
    if (reduced) { head.x = target.x; head.y = target.y; head.vx = head.vy = 0; }
    else {
      head.vx += (320 * (target.x - head.x) - 24 * head.vx) * dt;
      head.vy += (320 * (target.y - head.y) - 24 * head.vy) * dt;
      head.x += head.vx * dt; head.y += head.vy * dt;
    }
    sizeV += (240 * (sizeT - size) - 16 * sizeV) * dt; size += sizeV * dt;
    alpha += ((visible ? 1 : 0) - alpha) * Math.min(1, dt * 12);

    const speed = Math.hypot(head.vx, head.vy);
    if (!reduced && visible && speed > 40) trail.push({ x: head.x, y: head.y, t: now });
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = alpha;
    drawTrail(now);
    drawDroplet(now / 1000, speed);

    const settled = speed < 2 && Math.abs(target.x - head.x) < 0.2 && Math.abs(target.y - head.y) < 0.2 && Math.abs(sizeV) < 0.05 && Math.abs(sizeT - size) < 0.01;
    raf = settled && !trail.length && Math.abs(alpha - (visible ? 1 : 0)) < 0.01 ? 0 : requestAnimationFrame(tick);
  }

  // thin tapered ribbon (one filled polygon, so no beading): fades and narrows toward the tail
  function drawTrail(now) {
    const n = trail.length;
    if (n < 3) return;
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = trail[Math.max(i - 1, 0)], b = trail[Math.min(i + 1, n - 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
      const life = 1 - (now - trail[i].t) / TRAIL_MS;
      const w = Math.max(0.15, R * 0.4 * life * size);
      L.push([trail[i].x + nx * w, trail[i].y + ny * w]); Rr.push([trail[i].x - nx * w, trail[i].y - ny * w]);
    }
    const g = ctx.createLinearGradient(trail[0].x, trail[0].y, trail[n - 1].x, trail[n - 1].y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.closePath(); ctx.fill();
  }

  function drawDroplet(t, speed) {
    const r = R * size;
    const stretch = reduced ? 0 : Math.min(speed / 1400, 1);
    const ang = Math.atan2(head.vy, head.vx), dx = Math.cos(ang), dy = Math.sin(ang);
    const P = [];
    for (let i = 0; i < POINTS; i++) {
      const th = (i / POINTS) * Math.PI * 2;
      const wob = reduced ? 0 : 0.07 * Math.sin(3 * th + t * 3.1) + 0.05 * Math.sin(5 * th - t * 2.3);
      const rr = r * (1 + wob);
      let px = Math.cos(th) * rr, py = Math.sin(th) * rr;
      const along = px * dx + py * dy, perp = -px * dy + py * dx;
      // front gets slightly squashed, back is pulled into a tail; thinner across when fast
      const back = Math.max(0, -along / rr);
      const a2 = along * (1 + stretch * 0.5) - back * back * stretch * r * 1.5;
      const p2 = perp * (1 - stretch * 0.28);
      P.push([head.x + a2 * dx - p2 * dy, head.y + a2 * dy + p2 * dx]);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 0; i < POINTS; i++) {
      const p0 = P[(i - 1 + POINTS) % POINTS], p1 = P[i], p2 = P[(i + 1) % POINTS], p3 = P[(i + 2) % POINTS];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath(); ctx.fill();
  }
}

initInkCursor();
