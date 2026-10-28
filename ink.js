// Featured projects as three little ink creatures.
//   life      one sleeps (zzz) on the floor, one crawls along the edge, one now and then stretches upward and relaxes
//   play      they lean toward your cursor; drag one and let go and it wobbles back into shape; two that meet briefly merge, then part
//   click     the ink swells into an irregular window in the space around it (up from the floor, out from a wall, or blooming from the middle)
//             and the other inks are nudged aside; closing it collapses the whole project back into the little creature, which wobbles and wanders on
// The old project cards stay in the page as the no-JS / reduced-motion fallback and as the source of each project's title and picture.
// With prefers-reduced-motion the creatures are drawn still and the window opens and closes instantly.

const stage = document.getElementById('ink-stage');
const fallback = document.querySelectorAll('.ink-fallback .project');
if (stage && fallback.length) init();

function init() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gooC = stage.querySelector('.ink-goo'), eyeC = stage.querySelector('.ink-eyes');
  const gx = gooC.getContext('2d'), ex = eyeC.getContext('2d');
  const tags = [...stage.querySelectorAll('.ink-tag')], zzz = stage.querySelector('.ink-zzz'), btns = [...stage.querySelectorAll('.ink-btn')];
  const win = document.getElementById('ink-window'), inkL = win.querySelector('.iw-ink'), cardL = win.querySelector('.iw-card'), body = win.querySelector('.iw-body');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const N = 30, PAD = 24;
  let W = 0, H = 0, dpr = 1, time = 0, last = 0, raf = 0, visible = true;

  // ── the three creatures: each has its own silhouette, size and habit ──
  const P = Array.from(fallback).map((a) => ({
    title: a.querySelector('h3').textContent.trim(), kind: a.querySelector('.label').textContent.trim(),
    img: a.querySelector('img').getAttribute('src'), alt: a.querySelector('img').getAttribute('alt'), href: '#work',
  }));
  const projects = [P[0], P[1], { cta: true, title: 'Your project?', kind: 'Next in line' }];
  const mkInk = (i, R, profile, habit) => ({
    i, R, R0: R, profile, habit, x: 0, y: 0, vx: 0, vy: 0, r: new Float32Array(N).fill(R * 0.3), vr: new Float32Array(N), phase: i * 2.1,
    drag: false, hidden: false, awake: habit !== 'sleep', wakeT: 0, blink: 2 + i, eyeX: 0, eyeY: 0, stretch: 0, stretchT: 3 + i * 2, u: 0, dir: 1, lean: 0,
  });
  const inks = [
    mkInk(0, 82, (a) => 1 + 0.26 * Math.cos(2 * a) + 0.05 * Math.sin(3 * a), 'sleep'),            // squat and wide
    mkInk(1, 70, (a) => 1 + 0.13 * Math.cos(3 * a + 0.5) - 0.1 * Math.cos(2 * a), 'crawl'),        // lumpy, with two soft ears
    mkInk(2, 56, (a) => 1 + 0.42 * Math.exp(-Math.pow(a - 0.55, 2) / 0.16), 'stretch'),            // small and round, with a little tail
  ];
  const profAt = (ink, a) => ink.profile(a);

  function resize() {
    const b = stage.getBoundingClientRect(); W = b.width; H = b.height;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    gooC.width = Math.round(W * 0.7); gooC.height = Math.round(H * 0.7);       // the goo layer is drawn smaller (the blur hides it)
    eyeC.width = Math.round(W * dpr); eyeC.height = Math.round(H * dpr);
    const sc = clamp(W / 1000, 0.5, 1); inks.forEach((k) => { k.R = k.R0 * sc; k.x = clamp(k.x, k.R, W - k.R); k.y = clamp(k.y, k.R, H - k.R); });
  }
  const homes = () => [[W * 0.2, H - inks[0].R - 14], null, [W * 0.56, H * 0.5]];
  function place() {
    const h = homes();
    inks[0].x = h[0][0]; inks[0].y = h[0][1];
    inks[1].x = W * 0.45; inks[1].y = H - inks[1].R - 14;
    inks[2].x = h[2][0]; inks[2].y = h[2][1];
    inks.forEach((k) => { k.vx = k.vy = 0; });
  }

  // ── pointer ──
  const ptr = { x: -999, y: -999, in: false };
  const local = (e) => { const b = stage.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const avgR = (k) => { let s = 0; for (let i = 0; i < N; i++) s += k.r[i]; return s / N; };
  const hit = (x, y) => { let best = null, bd = 1e9; for (const k of inks) { if (k.hidden) continue; const d = Math.hypot(x - k.x, y - k.y); if (d < Math.max(avgR(k), k.R * 0.8) * 1.12 && d < bd) { best = k; bd = d; } } return best; };
  let openInk = null, dragInk = null, down = null;
  stage.addEventListener('pointermove', (e) => {
    const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.in = true;
    if (dragInk) { dragInk.tx = p.x - dragInk.gx; dragInk.ty = p.y - dragInk.gy; if (down && Math.hypot(p.x - down.x, p.y - down.y) > 6) down.moved = true; }
    else stage.classList.toggle('over-ink', !openInk && !!hit(p.x, p.y));
    wake();
  });
  stage.addEventListener('pointerleave', () => { if (!dragInk) ptr.in = false; stage.classList.remove('over-ink'); });
  stage.addEventListener('pointerdown', (e) => {
    if (openInk || e.target.closest('.ink-window') || e.button > 0) return;
    const p = local(e), k = hit(p.x, p.y); if (!k) return;
    dragInk = k; k.drag = true; k.gx = p.x - k.x; k.gy = p.y - k.y; k.tx = k.x; k.ty = k.y; k.awake = true; k.wakeT = time;
    down = { x: p.x, y: p.y, moved: false, t: time };
    stage.setPointerCapture(e.pointerId); wake();
  });
  const release = () => {
    if (!dragInk) return; const k = dragInk; dragInk = null; k.drag = false;
    const sp = Math.hypot(k.vx, k.vy), a = Math.atan2(k.vy, k.vx);
    for (let i = 0; i < N; i++) { const ang = (i / N) * Math.PI * 2 - Math.PI; k.vr[i] += Math.cos(ang - a) * Math.min(sp, 500) * 0.12; }   // let go: it wobbles back into shape
    if (down && !down.moved) { down = null; openProject(k); } else down = null;
    wake();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', () => { if (dragInk) { dragInk.drag = false; dragInk = null; down = null; } });
  btns.forEach((b, i) => b.addEventListener('click', () => { if (!inks[i].hidden && !openInk) openProject(inks[i], true); }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && openInk) closeProject(); });

  // ── physics ──
  const pairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => ({ a: inks[a], b: inks[b], state: 'idle', t: 0, cool: 6 + a * 3 }));
  function stepInk(k, dt) {
    const home = homes()[k.i];
    let fx = 0, fy = 0;
    // habits
    if (k.habit === 'sleep') { fx += (home[0] - k.x) * 5; fy += (home[1] - k.y) * 5; if (k.awake && !k.drag && time - k.wakeT > 3.2 && !(ptr.in && Math.hypot(ptr.x - k.x, ptr.y - k.y) < 190)) k.awake = false; if (ptr.in && Math.hypot(ptr.x - k.x, ptr.y - k.y) < 150) { k.awake = true; k.wakeT = time; } }
    if (k.habit === 'crawl') {
      const A = [W * 0.3, H - k.R - 14], B = [W - k.R - 16, H - k.R - 14], C = [W - k.R - 16, H * 0.3];
      const L1 = Math.hypot(B[0] - A[0], B[1] - A[1]), L2 = Math.hypot(C[0] - B[0], C[1] - B[1]), L = L1 + L2;
      if (!k.drag && !k.hidden) k.u += k.dir * 20 * dt * (0.55 + 0.45 * Math.sin(time * 2.2 + 1) ** 2);
      if (k.u > L) { k.u = L; k.dir = -1; } if (k.u < 0) { k.u = 0; k.dir = 1; }
      const px = k.u < L1 ? A[0] + (B[0] - A[0]) * (k.u / L1) : B[0], py = k.u < L1 ? A[1] : B[1] + (C[1] - B[1]) * ((k.u - L1) / L2);
      k.crawlA = k.u < L1 ? (k.dir > 0 ? 0 : Math.PI) : (k.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      fx += (px - k.x) * 4; fy += (py - k.y) * 4;
    }
    if (k.habit === 'stretch') {
      k.stretchT -= dt; if (k.stretchT <= 0 && !k.drag) { k.stretchPh = 0.0001; k.stretchT = 5 + Math.random() * 4; }
      if (k.stretchPh) { k.stretchPh += dt / 2.8; if (k.stretchPh >= 1) k.stretchPh = 0; }
      k.stretch = k.stretchPh ? Math.pow(Math.sin(Math.PI * k.stretchPh), 2) : 0;
      fx += (home[0] - k.x) * 2.5; fy += (home[1] - k.y - k.stretch * 0) * 2.5;
    }
    // curiosity: lean the whole body toward a nearby cursor
    if (ptr.in && !k.drag) { const dx = ptr.x - k.x, dy = ptr.y - k.y, d = Math.hypot(dx, dy); if (d < 260 && d > 1) { const s = (1 - d / 260) * 36; fx += (dx / d) * s; fy += (dy / d) * s; } }
    // walls
    const m = k.R * 0.85;
    if (k.x < m) fx += (m - k.x) * 40; if (k.x > W - m) fx -= (k.x - (W - m)) * 40; if (k.y < m) fy += (m - k.y) * 40; if (k.y > H - m) fy -= (k.y - (H - m)) * 40;
    // an open window is an obstacle
    if (openInk && win._rect) { const r = win._rect, g = 22; if (k !== openInk && k.x > r.x - g - k.R * 0.6 && k.x < r.x + r.w + g + k.R * 0.6 && k.y > r.y - g - k.R * 0.6 && k.y < r.y + r.h + g + k.R * 0.6) {
      const dl = k.x - (r.x - g - k.R * 0.6), dr = r.x + r.w + g + k.R * 0.6 - k.x, du = k.y - (r.y - g - k.R * 0.6), dd = r.y + r.h + g + k.R * 0.6 - k.y, mn = Math.min(dl, dr, du, dd);
      const s = 260; if (mn === dl) fx -= s; else if (mn === dr) fx += s; else if (mn === du) fy -= s; else fy += s; } }
    if (k.drag) { k.vx += ((k.tx - k.x) * 220 - 20 * k.vx) * dt; k.vy += ((k.ty - k.y) * 220 - 20 * k.vy) * dt; }
    else { k.vx += (fx - 4.5 * k.vx) * dt; k.vy += (fy - 4.5 * k.vy) * dt; }
    k.extFx = 0; k.extFy = 0;
    k.x += k.vx * dt; k.y += k.vy * dt;
    // the body: a ring of springs around the centre
    const sp = Math.hypot(k.vx, k.vy), va = Math.atan2(k.vy, k.vx), toP = ptr.in ? Math.atan2(ptr.y - k.y, ptr.x - k.x) : 0, dP = ptr.in ? Math.hypot(ptr.x - k.x, ptr.y - k.y) : 1e9;
    const leanAmt = !k.drag && dP < 300 ? (1 - dP / 300) * 0.34 * k.R : 0;
    const crawlSq = k.habit === 'crawl' ? Math.sin(time * 2.2 + 1) : 0;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI;
      let t = k.R * profAt(k, a) * (1 + 0.035 * Math.sin(time * 1.3 + i * 0.9 + k.phase) + (k.habit === 'sleep' && !k.awake ? 0.025 * Math.sin(time * 1.1) : 0));
      t += leanAmt * Math.pow(Math.max(0, Math.cos(a - toP)), 2) * 1.6 - leanAmt * 0.25;
      t += k.R * 0.16 * Math.min(sp / 90, 1) * Math.cos(2 * (a - va));
      if (k.habit === 'crawl') t += k.R * 0.1 * crawlSq * Math.cos(2 * (a - (k.crawlA || 0)));
      if (k.habit === 'stretch') t += k.R * 1.15 * k.stretch * Math.pow(Math.max(0, Math.cos(a + Math.PI / 2)), 3) - k.R * 0.12 * k.stretch;
      if (k.habit === 'sleep' && !k.awake) t -= k.R * 0.12 * Math.max(0, Math.sin(a)) * 0 + k.R * 0.1 * Math.max(0, -Math.sin(a));   // slumped
      const pr = k.r[(i + N - 1) % N], nx = k.r[(i + 1) % N];
      k.vr[i] += (130 * (t - k.r[i]) - 9 * k.vr[i] + 34 * ((pr + nx) / 2 - k.r[i])) * dt;
    }
    for (let i = 0; i < N; i++) k.r[i] = Math.max(2, k.r[i] + k.vr[i] * dt);
    // eyes
    k.blink -= dt; if (k.blink < 0) { k.blinking = 0.13; k.blink = 2.2 + Math.random() * 3.5; }
    if (k.blinking > 0) k.blinking -= dt;
    const lookA = ptr.in ? toP : 0, lookD = ptr.in ? Math.min(1, dP / 260) : 0;
    k.eyeX += (Math.cos(lookA) * lookD * k.R * 0.16 - k.eyeX) * Math.min(1, dt * 8); k.eyeY += (Math.sin(lookA) * lookD * k.R * 0.12 - k.eyeY) * Math.min(1, dt * 8);
  }
  function stepPairs(dt) {
    for (const p of pairs) {
      const a = p.a, b = p.b; if (a.hidden || b.hidden || a.drag || b.drag) { p.state = 'idle'; continue; }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, rr = avgR(a) + avgR(b), ux = dx / d, uy = dy / d;
      p.cool -= dt;
      if (p.state === 'idle') { if (d < rr + 70 && p.cool <= 0) { p.state = 'merge'; p.t = 1.7; } else if (d < rr * 0.7) { const s = (rr * 0.7 - d) * 3; a.vx -= ux * s * dt; a.vy -= uy * s * dt; b.vx += ux * s * dt; b.vy += uy * s * dt; } }
      else if (p.state === 'merge') {            // drawn together until they fuse into one blob
        const s = (d - rr * 0.55) * 3.2; a.vx += ux * s * dt; a.vy += uy * s * dt; b.vx -= ux * s * dt; b.vy -= uy * s * dt; p.t -= dt;
        if (p.t <= 0) { p.state = 'split'; p.t = 0.6; for (const [k, sgn] of [[a, 1], [b, -1]]) for (let i = 0; i < N; i++) { const ang = (i / N) * Math.PI * 2 - Math.PI; k.vr[i] += Math.cos(ang - Math.atan2(sgn * dy, sgn * dx)) * -60; } }
      } else if (p.state === 'split') {          // ...then they part with a pop
        a.vx -= ux * 460 * dt; a.vy -= uy * 460 * dt; b.vx += ux * 460 * dt; b.vy += uy * 460 * dt; p.t -= dt; if (p.t <= 0) { p.state = 'idle'; p.cool = 9 + Math.random() * 6; }
      }
    }
  }

  // ── drawing ──
  function path(c, k, sx, sy, scale) {
    const pts = []; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 - Math.PI; pts.push([(k.x + Math.cos(a) * k.r[i]) * sx, (k.y + Math.sin(a) * k.r[i]) * sy]); }
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < N; i++) { const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
    c.closePath();
  }
  function draw() {
    gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, gooC.width, gooC.height); gx.fillStyle = '#111';
    const s = gooC.width / W;
    for (const k of inks) { if (k.hidden) continue; path(gx, k, s, s); gx.fill(); }
    ex.setTransform(dpr, 0, 0, dpr, 0, 0); ex.clearRect(0, 0, W, H);
    for (const k of inks) {
      if (k.hidden) continue;
      const R = k.R, sl = k.habit === 'sleep' && !k.awake;
      const fx = k.x + k.eyeX * 0.7 + (k.habit === 'stretch' ? 0 : 0), fy = k.y - R * 0.1 + k.eyeY * 0.7 - (k.habit === 'stretch' ? k.stretch * R * 0.55 : 0);
      const gap = R * (k.habit === 'stretch' ? 0.24 : 0.27), ew = R * 0.085, eh = R * 0.125;
      ex.fillStyle = '#F7F3EF'; ex.strokeStyle = '#F7F3EF'; ex.lineWidth = Math.max(1.6, R * 0.04); ex.lineCap = 'round';
      for (const sx of [-1, 1]) {
        const x = fx + sx * gap + k.eyeX * 0.5, y = fy + k.eyeY * 0.4;
        if (sl || (k.blinking > 0)) { ex.beginPath(); ex.moveTo(x - ew, y); ex.quadraticCurveTo(x, y + (sl ? eh * 0.9 : eh * 0.3), x + ew, y); ex.stroke(); }
        else { ex.beginPath(); ex.ellipse(x, y, ew, eh * (k.habit === 'stretch' && k.stretch > 0.2 ? 1.25 : 1), 0, 0, Math.PI * 2); ex.fill(); }
      }
      const tg = tags[k.i]; if (tg) { tg.style.transform = `translate(${(k.x - tg.offsetWidth / 2).toFixed(1)}px, ${(k.y + avgR(k) + 10).toFixed(1)}px)`; tg.classList.toggle('on', !openInk && (k.drag || (ptr.in && Math.hypot(ptr.x - k.x, ptr.y - k.y) < avgR(k) + 90))); }
    }
    const k0 = inks[0];
    zzz.style.transform = `translate(${(k0.x + k0.R * 0.6).toFixed(1)}px, ${(k0.y - k0.R * 1.35 + Math.sin(time * 1.4) * 4).toFixed(1)}px)`; zzz.classList.toggle('off', k0.awake || k0.hidden);
  }

  // ── the window: a project that grows out of the ink ──
  const RAYS = 120;
  const state = { f: 0, rI: new Float32Array(RAYS), vI: new Float32Array(RAYS), rC: new Float32Array(RAYS), vC: new Float32Array(RAYS), tI: new Float32Array(RAYS), noise: [], final: [], O: [0, 0], phase: 'none', t: 0 };
  function insideRR(x, y, w, h, rad) { const cx = clamp(x, rad, w - rad), cy = clamp(y, rad, h - rad); return x >= 0 && y >= 0 && x <= w && y <= h && Math.hypot(x - cx, y - cy) <= rad + 0.01; }
  function finalRadii(w, h, Ox, Oy) {
    // distance from the ink's position to the edge of the (rounded) window body, in every direction
    return Array.from({ length: RAYS }, (_, i) => { const a = (i / RAYS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); let lo = 0, hi = Math.hypot(w, h) * 1.2;
      for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (insideRR(Ox - PAD + c * m, Oy - PAD + s * m, w - 2 * PAD, h - 2 * PAD, 22)) lo = m; else hi = m; } return lo + PAD; });
  }
  const poly = (r, O) => 'polygon(' + Array.from(r, (v, i) => { const a = (i / RAYS) * Math.PI * 2; return `${(O[0] + Math.cos(a) * v).toFixed(1)}px ${(O[1] + Math.sin(a) * v).toFixed(1)}px`; }).join(',') + ')';

  function content(pr) {
    if (pr.cta) return `<div class="iw-cta iw-body-cta" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:clamp(24px,4vw,48px);background:var(--accent)"><h3 style="padding-right:52px">Your project could be next.</h3><p>Tell me about your idea — a beauty studio, a small business, something unusual — and let’s make it feel like you.</p><a class="iw-link" href="#contact" style="align-self:flex-start;background:#fff">Say hello →</a></div>`;
    return `<div class="iw-cover"><img src="${pr.img}" alt="${pr.alt}"></div><div class="iw-meta"><div><h3>${pr.title}</h3><p>${pr.kind}</p></div><a class="iw-link" href="${pr.href}">View project →</a></div>`;
  }
  function openProject(k, fromKey) {
    if (openInk) return; openInk = k;
    // nudge the neighbours aside first
    for (const o of inks) { if (o === k) continue; const dx = o.x - k.x, dy = o.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < 340) { const s = (1 - d / 340) * 420; o.vx += (dx / d) * s; o.vy += (dy / d) * s; } }
    const pr = projects[k.i], ww = Math.min(W * (W < 700 ? 0.96 : 0.9), 720) + PAD * 2, hh = Math.min(H - 110, (pr.cta ? (W < 700 ? 0.98 : 0.62) : 0.78) * (ww - PAD * 2) + PAD * 2 + (pr.cta ? 0 : 74));
    // where does it open? depends on where the ink is
    const fx = k.x / W, fy = k.y / H; let left, top;
    left = fx < 0.3 ? k.x - 40 - PAD : fx > 0.7 ? k.x + 40 + PAD - ww : k.x - ww / 2;
    top = fy > 0.62 ? k.y + 40 + PAD - hh : fy < 0.3 ? k.y - 40 - PAD : k.y - hh / 2;
    left = clamp(left, 4, W - ww - 4); top = clamp(top, 4, H - hh - 104);
    win._rect = { x: left + PAD, y: top + PAD, w: ww - PAD * 2, h: hh - PAD * 2 };
    win.style.cssText = `left:${left}px;top:${top}px;width:${ww}px;height:${hh}px`;
    body.innerHTML = content(pr) + '<button type="button" class="iw-close" aria-label="Close project"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button>';
    win.setAttribute('aria-label', pr.title); win.hidden = false; stage.classList.add('open');
    body.querySelector('.iw-close').addEventListener('click', closeProject);
    const O = [k.x - left, k.y - top]; state.O = O; state.final = finalRadii(ww, hh, O[0], O[1]);
    state.noise = Array.from({ length: RAYS }, (_, i) => 0.5 + 0.5 * Math.sin(i * 0.83 + k.i * 2.7) * Math.cos(i * 0.31 + k.i));
    state.k = Array.from({ length: RAYS }, (_, i) => 42 + state.noise[i] * 22);                 // each part of the edge spreads at its own speed
    if (reduced) { win.style.clipPath = 'none'; inkL.style.display = 'none'; cardL.style.clipPath = 'none'; k.hidden = true; state.phase = 'open'; setTimeout(() => body.querySelector('.iw-close').focus(), 0); draw(); return; }
    inkL.style.display = ''; state.rI.fill(6); state.vI.fill(0); state.rC.fill(2); state.vC.fill(0); state.phase = 'opening'; state.t = 0; state.target = 1;
    k.hidden = true; applyClip(); wake();
    setTimeout(() => { const c = body.querySelector('.iw-close'); if (c) c.focus({ preventScroll: true }); }, 350);
  }
  function closeProject() {
    if (!openInk || state.phase === 'closing') return;
    if (reduced) { finishClose(); return; }
    state.phase = 'closing'; state.t = 0; state.target = 0.03; inkL.style.display = ''; wake();
  }
  function finishClose() {
    const k = openInk; win.hidden = true; win._rect = null; stage.classList.remove('open'); state.phase = 'none'; openInk = null;
    if (k) { k.hidden = false; k.r.fill(k.R * 0.25); for (let i = 0; i < N; i++) k.vr[i] = 160 * (Math.random() - 0.3); k.vx += (Math.random() - 0.5) * 120; k.vy -= 60; btns[k.i].focus({ preventScroll: true }); }
    wake();
  }
  function applyClip() { const O = state.O; inkL.style.clipPath = poly(state.rI, O); cardL.style.clipPath = poly(state.rC, O); }
  function stepWindow(dt) {
    if (state.phase !== 'opening' && state.phase !== 'closing' && state.phase !== 'open') return false;
    if (state.phase === 'open') return false;
    state.t += dt; const f = state.target;
    for (let i = 0; i < RAYS; i++) {
      const tI = state.final[i] * (f === 1 ? 1 : f), tC = state.final[i] * (f === 1 ? (state.t > 0.3 ? 1 : 0.04) : f);
      const kk = state.phase === 'closing' ? 70 : state.k[i], a = (i + RAYS - 1) % RAYS, b = (i + 1) % RAYS;
      state.vI[i] += (kk * (tI - state.rI[i]) - 6.4 * state.vI[i] + 110 * ((state.rI[a] + state.rI[b]) / 2 - state.rI[i])) * dt; state.rI[i] = Math.max(1, state.rI[i] + state.vI[i] * dt);
      state.vC[i] += (kk * (tC - state.rC[i]) - 7 * state.vC[i] + 110 * ((state.rC[a] + state.rC[b]) / 2 - state.rC[i])) * dt; state.rC[i] = Math.max(1, state.rC[i] + state.vC[i] * dt);
    }
    applyClip();
    if (state.phase === 'opening' && state.t > 1.5) { let m = 0; for (let i = 0; i < RAYS; i++) m = Math.max(m, Math.abs(state.rI[i] - state.final[i]), Math.abs(state.vI[i]) * 0.2); if (m < 0.8 || state.t > 2.3) { state.phase = 'open'; win.style.clipPath = ''; inkL.style.display = 'none'; inkL.style.clipPath = 'none'; cardL.style.clipPath = 'none'; } }
    if (state.phase === 'closing') { let m = 0; for (let i = 0; i < RAYS; i++) m = Math.max(m, state.rC[i]); if (m < 16 || state.t > 1.4) finishClose(); }
    return true;
  }

  // ── loop ──
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    for (let s = 0; s < 2; s++) { for (const k of inks) if (!k.hidden || true) stepInk(k, dt / 2); stepPairs(dt / 2); }
    stepWindow(dt); draw();
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '120px' }).observe(stage);
  addEventListener('resize', () => { resize(); draw(); });

  resize(); place();
  document.documentElement.classList.add('ink-ready');
  resize(); place();
  if (reduced) { for (let n = 0; n < 60; n++) stepInk && inks.forEach((k) => stepInk(k, 1 / 30)); draw(); }
  else { time = 0; wake(); }
}
