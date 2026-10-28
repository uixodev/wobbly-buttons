// Featured projects as floating logos.
//   life     Mariia's gold monogram floats and rocks; Oksana's lettering drifts slowly across the stage and rests somewhere different each visit
//   play     drag a logo anywhere on the stage; let go and it springs, slides and settles naturally (it stays where you leave it)
//   click    the logo becomes the centre of an expanding, irregular ink-shaped mask that reveals the project; it opens in the space available
//            around the logo (rightward from the left edge, upward from the bottom, outward from the middle) and nudges the other logo aside
//   close    the preview shrinks back into its logo, which stays where it was
// The old project cards stay in the page as the no-JS / reduced-motion fallback and as the source of each project's title and picture.

const stage = document.getElementById('ink-stage');
const fallback = document.querySelectorAll('.ink-fallback .project');
if (stage && fallback.length) init();

function init() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = [...stage.querySelectorAll('.logo-obj')];
  const win = document.getElementById('ink-window'), inkL = win.querySelector('.iw-ink'), cardL = win.querySelector('.iw-card'), body = win.querySelector('.iw-body');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const PAD = 24, RAYS = 120;
  let W = 0, H = 0, time = 0, last = 0, raf = 0, visible = true, openLogo = null;

  const projects = Array.from(fallback).map((a) => ({
    title: a.querySelector('h3').textContent.trim(), kind: a.querySelector('.label').textContent.trim(),
    img: a.querySelector('img').getAttribute('src'), alt: a.querySelector('img').getAttribute('alt'), href: '#work',
  }));
  const logos = els.map((el, i) => ({ el, i, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, sc: 1, vsc: 0, w: 0, h: 0, drag: false, gone: false, phase: i * 2.3, seed: Math.random() * 100 }));

  function resize() {
    const b = stage.getBoundingClientRect(); W = b.width; H = b.height;
    logos.forEach((k) => { k.w = k.el.offsetWidth; k.h = k.el.offsetHeight; k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2); });
  }
  function place() {
    const [m, o] = logos, r = Math.random;
    m.x = W * (W < 700 ? 0.3 : 0.26); m.y = H * 0.42;
    o.x = W * (W < 700 ? 0.68 : 0.62 + r() * 0.12); o.y = H * (0.58 + r() * 0.16);
    logos.forEach((k) => { k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2); });
  }

  // ── drag ──
  let dragK = null, down = null;
  logos.forEach((k) => {
    k.el.addEventListener('pointerdown', (e) => {
      if (openLogo || e.button > 0) return;
      const b = stage.getBoundingClientRect(); dragK = k; k.drag = true; k.el.classList.add('drag'); k.el.setPointerCapture(e.pointerId);
      down = { sx: e.clientX, sy: e.clientY, gx: e.clientX - b.left - k.x, gy: e.clientY - b.top - k.y, moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), pvx: 0, pvy: 0 };
      k.vx = k.vy = 0; wake();
    });
    k.el.addEventListener('pointermove', (e) => {
      if (dragK !== k || !down) return;
      const b = stage.getBoundingClientRect(), now = performance.now(), dt = Math.max(1, now - down.lt) / 1000;
      if (Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 6) down.moved = true;
      const nx = e.clientX - b.left - down.gx, ny = e.clientY - b.top - down.gy;
      down.pvx = (nx - k.x) / dt * 0.6 + down.pvx * 0.4; down.pvy = (ny - k.y) / dt * 0.6 + down.pvy * 0.4; down.lt = now;
      k.tx = nx; k.ty = ny;
    });
    const up = () => {
      if (dragK !== k) return; dragK = null; k.drag = false; k.el.classList.remove('drag');
      if (down && down.moved) { k.vx = clamp(down.pvx * 0.7, -900, 900); k.vy = clamp(down.pvy * 0.7, -900, 900); k.vrot += clamp(down.pvx * 0.012, -14, 14); k.vsc -= 3; }   // let go: it springs and slides to rest
      else if (down) { down = null; openProject(k); }
      down = null; wake();
    };
    k.el.addEventListener('pointerup', up); k.el.addEventListener('pointercancel', up);
    k.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!openLogo) openProject(k); } });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && openLogo) closeProject(); });

  // ── physics ──
  function step(k, dt) {
    const t = time;
    if (k.drag) { k.vx = (k.tx - k.x) / dt * 0.0 + k.vx; }
    let fx = 0, fy = 0;
    if (!k.drag) {
      if (k.i === 1) { fx += Math.cos(t * 0.21 + k.seed) * 14 + Math.sin(t * 0.37) * 6; fy += Math.sin(t * 0.27 + k.seed) * 10; }   // Oksana drifts
      const m = 12, lw = k.w / 2 + m, lh = k.h / 2 + m;
      if (k.x < lw) fx += (lw - k.x) * 40; if (k.x > W - lw) fx -= (k.x - (W - lw)) * 40; if (k.y < lh) fy += (lh - k.y) * 40; if (k.y > H - lh) fy -= (k.y - (H - lh)) * 40;
      if (openLogo && win._rect && k !== openLogo) { const r = win._rect, g = 26, hw = k.w / 2, hh = k.h / 2;
        if (k.x > r.x - g - hw && k.x < r.x + r.w + g + hw && k.y > r.y - g - hh && k.y < r.y + r.h + g + hh) {
          const dl = k.x - (r.x - g - hw), dr = r.x + r.w + g + hw - k.x, du = k.y - (r.y - g - hh), dd = r.y + r.h + g + hh - k.y, mn = Math.min(dl, dr, du, dd), s = 340;
          if (mn === dl) fx -= s; else if (mn === dr) fx += s; else if (mn === du) fy -= s; else fy += s; } }
      k.vx += (fx - 5.2 * k.vx) * dt; k.vy += (fy - 5.2 * k.vy) * dt; k.x += k.vx * dt; k.y += k.vy * dt;
    } else { k.x += (k.tx - k.x) * Math.min(1, dt * 22); k.y += (k.ty - k.y) * Math.min(1, dt * 22); k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2); }
    // rocking: a spring on the angle (with a slow gentle target) and a spring on the scale (squash when released / popping back)
    const target = k.i === 0 ? Math.sin(t * 0.9 + k.phase) * 6 : Math.sin(t * 0.5 + k.seed) * 5 + clamp(k.vx * 0.01, -8, 8);
    k.vrot += (60 * (target - k.rot) - 5.5 * k.vrot) * dt; k.rot += k.vrot * dt;
    k.vsc += (90 * ((k.drag ? 1.08 : 1) - k.sc) - 7 * k.vsc) * dt; k.sc += k.vsc * dt;
  }
  function draw() {
    for (const k of logos) {
      const bob = k.i === 0 ? Math.sin(time * 0.7 + k.phase) * 9 : 0;
      k.el.style.transform = `translate(${(k.x - k.w / 2).toFixed(1)}px, ${(k.y - k.h / 2 + bob).toFixed(1)}px) rotate(${k.rot.toFixed(2)}deg) scale(${k.sc.toFixed(3)})`;
    }
  }

  // ── the window: a project that grows out of the logo ──
  const state = { rI: new Float32Array(RAYS), vI: new Float32Array(RAYS), rC: new Float32Array(RAYS), vC: new Float32Array(RAYS), noise: [], k: [], final: [], O: [0, 0], phase: 'none', t: 0, target: 1 };
  const insideRR = (x, y, w, h, rad) => { const cx = clamp(x, rad, w - rad), cy = clamp(y, rad, h - rad); return x >= 0 && y >= 0 && x <= w && y <= h && Math.hypot(x - cx, y - cy) <= rad + 0.01; };
  const finalRadii = (w, h, Ox, Oy) => Array.from({ length: RAYS }, (_, i) => { const a = (i / RAYS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); let lo = 0, hi = Math.hypot(w, h) * 1.2;
    for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (insideRR(Ox - PAD + c * m, Oy - PAD + s * m, w - 2 * PAD, h - 2 * PAD, 22)) lo = m; else hi = m; } return lo + PAD; });
  const poly = (r, O) => 'polygon(' + Array.from(r, (v, i) => { const a = (i / RAYS) * Math.PI * 2; return `${(O[0] + Math.cos(a) * v).toFixed(1)}px ${(O[1] + Math.sin(a) * v).toFixed(1)}px`; }).join(',') + ')';
  const content = (pr) => `<div class="iw-cover"><img src="${pr.img}" alt="${pr.alt}"></div><div class="iw-meta"><div><h3>${pr.title}</h3><p>${pr.kind}</p></div><a class="iw-link" href="${pr.href}">View project →</a></div>`;
  const applyClip = () => { inkL.style.clipPath = poly(state.rI, state.O); cardL.style.clipPath = poly(state.rC, state.O); };

  function openProject(k) {
    if (openLogo) return; openLogo = k;
    for (const o of logos) { if (o === k) continue; const dx = o.x - k.x, dy = o.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < 360) { const s = (1 - d / 360) * 480; o.vx += (dx / d) * s; o.vy += (dy / d) * s; } }
    const pr = projects[k.i], ww = Math.min(W * (W < 700 ? 0.96 : 0.9), 720) + PAD * 2, hh = Math.min(H - 20, 0.78 * (ww - PAD * 2) + PAD * 2 + 74);
    const fx = k.x / W, fy = k.y / H; let left, top;                       // the window opens in the room the logo has
    left = fx < 0.3 ? k.x - k.w / 2 - PAD : fx > 0.7 ? k.x + k.w / 2 + PAD - ww : k.x - ww / 2;
    top = fy > 0.62 ? k.y + k.h / 2 + PAD - hh : fy < 0.3 ? k.y - k.h / 2 - PAD : k.y - hh / 2;
    left = clamp(left, 4, W - ww - 4); top = clamp(top, 4, H - hh - 4);
    win._rect = { x: left + PAD, y: top + PAD, w: ww - PAD * 2, h: hh - PAD * 2 };
    win.style.cssText = `left:${left}px;top:${top}px;width:${ww}px;height:${hh}px`;
    body.innerHTML = content(pr) + '<button type="button" class="iw-close" aria-label="Close project"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button>';
    win.setAttribute('aria-label', pr.title); win.hidden = false; stage.classList.add('open');
    body.querySelector('.iw-close').addEventListener('click', closeProject);
    const O = [k.x - left, k.y - top]; state.O = O; state.final = finalRadii(ww, hh, O[0], O[1]);
    state.noise = Array.from({ length: RAYS }, (_, i) => 0.5 + 0.5 * Math.sin(i * 0.83 + k.i * 2.7) * Math.cos(i * 0.31 + k.i));
    state.k = Array.from({ length: RAYS }, (_, i) => 22 + state.noise[i] * 20);
    k.gone = true; k.el.classList.add('gone');
    if (reduced) { inkL.style.display = 'none'; inkL.style.clipPath = 'none'; cardL.style.clipPath = 'none'; state.phase = 'open'; setTimeout(() => body.querySelector('.iw-close').focus(), 0); return; }
    inkL.style.display = ''; state.rI.fill(6); state.vI.fill(0); state.rC.fill(2); state.vC.fill(0); state.phase = 'opening'; state.t = 0; state.target = 1;
    applyClip(); wake(); setTimeout(() => { const c = body.querySelector('.iw-close'); if (c) c.focus({ preventScroll: true }); }, 350);
  }
  function closeProject() {
    if (!openLogo || state.phase === 'closing') return;
    if (reduced) { finishClose(); return; }
    if (state.phase === 'open') { inkL.style.display = ''; inkL.style.clipPath = poly(state.final, state.O); cardL.style.clipPath = poly(state.final, state.O); state.rI.set(state.final); state.rC.set(state.final); state.vI.fill(0); state.vC.fill(0); }
    state.phase = 'closing'; state.t = 0; state.target = 0.03; wake();
  }
  function finishClose() {
    const k = openLogo; win.hidden = true; win._rect = null; stage.classList.remove('open'); state.phase = 'none'; openLogo = null;
    if (k) { k.gone = false; k.el.classList.remove('gone'); k.sc = 0.2; k.vsc = 0; k.vrot = (Math.random() - 0.5) * 60; k.el.focus({ preventScroll: true }); }   // it pops back, where it was left
    wake();
  }
  function stepWindow(dt) {
    if (state.phase === 'none' || state.phase === 'open') return;
    state.t += dt; const f = state.target;
    for (let i = 0; i < RAYS; i++) {
      const tI = state.final[i] * f, tC = state.final[i] * (f === 1 ? (state.t > 0.45 ? 1 : 0.04) : f), kk = state.phase === 'closing' ? 70 : state.k[i], a = (i + RAYS - 1) % RAYS, b = (i + 1) % RAYS;
      state.vI[i] += (kk * (tI - state.rI[i]) - 5.4 * state.vI[i] + 110 * ((state.rI[a] + state.rI[b]) / 2 - state.rI[i])) * dt; state.rI[i] = Math.max(1, state.rI[i] + state.vI[i] * dt);
      state.vC[i] += (kk * (tC - state.rC[i]) - 6 * state.vC[i] + 110 * ((state.rC[a] + state.rC[b]) / 2 - state.rC[i])) * dt; state.rC[i] = Math.max(1, state.rC[i] + state.vC[i] * dt);
    }
    applyClip();
    if (state.phase === 'opening' && state.t > 1.9) { let m = 0; for (let i = 0; i < RAYS; i++) m = Math.max(m, Math.abs(state.rI[i] - state.final[i]), Math.abs(state.vI[i]) * 0.2); if (m < 0.8 || state.t > 2.8) { state.phase = 'open'; inkL.style.display = 'none'; inkL.style.clipPath = 'none'; cardL.style.clipPath = 'none'; } }
    if (state.phase === 'closing') { let m = 0; for (let i = 0; i < RAYS; i++) m = Math.max(m, state.rC[i]); if (m < 14 || state.t > 1.4) finishClose(); }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    if (!reduced) for (const k of logos) step(k, dt);
    stepWindow(dt); draw();
    raf = visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '120px' }).observe(stage);
  addEventListener('resize', () => { resize(); draw(); });

  document.documentElement.classList.add('ink-ready');
  resize(); place(); resize(); draw();
  if (!reduced) wake();
}
