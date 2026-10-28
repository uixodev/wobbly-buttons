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
  let W = 0, H = 0, time = 0, last = 0, raf = 0, visible = true, openLogo = null, started = false;

  const URLS = ['https://www.mvsugaringbristol.com/', 'https://oksana-nails.vercel.app/#book', 'https://www.masterforgeneralcontracting.com/', 'https://my-bristol-college-app-publish.vercel.app/', 'https://sweet-orchard.github.io/Jakub-portfolio/'];
  const projects = Array.from(fallback).map((a, idx) => ({
    title: a.querySelector('h3').textContent.trim(), kind: a.querySelector('.label').textContent.trim(),
    img: a.querySelector('img').getAttribute('src'), alt: a.querySelector('img').getAttribute('alt'), href: URLS[idx],
  }));
  const logos = els.map((el, i) => ({ el, i, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, sc: 1, vsc: 0, w: 0, h: 0, drag: false, gone: false, phase: i * 2.3, seed: Math.random() * 100 }));

  // each project is a folder: a black back panel with a tab, a paper peeking out, and a front flap the logo sits on (every outline a little off)
  els.forEach((el, i) => {
    const s = (n) => (Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453 % 1 + 1) % 1 * 3 - 1.5, NS = 'http://www.w3.org/2000/svg';
    const mk = (cls) => { const v = document.createElementNS(NS, 'svg'); v.setAttribute('viewBox', '0 0 100 80'); v.setAttribute('class', 'folder ' + cls); v.setAttribute('aria-hidden', 'true'); v.setAttribute('preserveAspectRatio', 'none'); return v; };
    const P = (v, d, cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); v.append(p); };
    const back = mk('f-back-svg'), front = mk('f-front-svg');
    P(back, `M${3 + s(1)} ${15 + s(2)} Q${3 + s(3)} ${6 + s(4)} ${12 + s(5)} ${6 + s(6)} H${35 + s(7)} Q${41 + s(8)} ${6 + s(9)} ${44 + s(10)} ${11 + s(11)} L${48 + s(12)} ${15 + s(13)} H${89 + s(14)} Q${97 + s(15)} ${15 + s(16)} ${97 + s(17)} ${23 + s(18)} V${70 + s(19)} Q${97 + s(20)} ${76 + s(21)} ${89 + s(22)} ${76 + s(23)} H${11 + s(24)} Q${3 + s(25)} ${76 + s(26)} ${3 + s(27)} ${69 + s(28)} Z`, 'f-back');
    P(front, `M${3 + s(40)} ${33 + s(41)} Q${3 + s(42)} ${26 + s(43)} ${10 + s(44)} ${26 + s(45)} L${90 + s(46)} ${25 + s(47)} Q${97 + s(48)} ${26 + s(49)} ${97 + s(50)} ${33 + s(51)} V${69 + s(52)} Q${97 + s(53)} ${76 + s(54)} ${90 + s(55)} ${76 + s(56)} H${10 + s(57)} Q${3 + s(58)} ${76 + s(59)} ${3 + s(60)} ${69 + s(61)} Z`, 'f-front');
    el.prepend(back); el.append(front);
  });
  function resize() {
    const b = stage.getBoundingClientRect(); W = b.width; H = b.height;
    logos.forEach((k) => { k.w = k.el.offsetWidth; k.h = k.el.offsetHeight; k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2); });
  }
  function place() {
    const [m, o, s, t, u] = logos, r = Math.random;
    m.x = W * (W < 700 ? 0.3 : 0.26); m.y = m.h / 2 + 10;
    o.x = W * (W < 700 ? 0.68 : 0.55 + r() * 0.2); o.y = o.h / 2 - H * 0.35;
    s.x = W * (W < 700 ? 0.5 : 0.82); s.y = s.h / 2 - H * 0.6;
    t.x = W * (W < 700 ? 0.18 : 0.4); t.y = t.h / 2 - H * 0.9;
    u.x = W * (W < 700 ? 0.8 : 0.68); u.y = u.h / 2 - H * 1.2;
    logos.forEach((k) => { k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2); });
  }

  const PROTO = new Set([3]);
  const tag = document.createElement('span'); tag.className = 'proto-tag hand'; tag.innerHTML = '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M40 24 C28 26 12 22 6 8 M6 8 L5 19 M6 8 L16 11"/></svg><span>prototype</span>'; tag.setAttribute('aria-hidden', 'true'); stage.append(tag);
  const visit = (k) => { logos.forEach((o) => { if (o !== k) o.open = false; }); k.open = !k.open; k.vsc -= 2; wake(); };   // a click expands (or folds away) the screenshots around the folder

  // ── drag ──
  let dragK = null, down = null;
  logos.forEach((k) => {
    k.el.addEventListener('pointerdown', (e) => {
      if (openLogo || e.button > 0) return;
      const b = stage.getBoundingClientRect(); dragK = k; k.drag = true; k.el.classList.add('drag'); k.el.setPointerCapture(e.pointerId);
      down = { sx: e.clientX, sy: e.clientY, gx: e.clientX - b.left - k.x, gy: e.clientY - b.top - k.y, moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), pvx: 0, pvy: 0 };
      k.tx = k.x; k.ty = k.y; k.vx = k.vy = 0; wake();
    });
    k.el.addEventListener('pointermove', (e) => {
      if (dragK !== k || !down) return;
      const b = stage.getBoundingClientRect(), now = performance.now(), dt = Math.max(1, now - down.lt) / 1000;
      if (Math.hypot(e.clientX - down.sx, e.clientY - down.sy) > 6) down.moved = true;
      const nx = e.clientX - b.left - down.gx, ny = e.clientY - b.top - down.gy;
      down.pvx = (nx - k.x) / dt * 0.6 + down.pvx * 0.4; down.pvy = (ny - k.y) / dt * 0.6 + down.pvy * 0.4; down.lt = now;
      k.tx = nx; k.ty = ny;
    });
    const up = (e) => {
      if (dragK !== k) return; dragK = null; k.drag = false; k.el.classList.remove('drag');
      if (e && e.pointerType === 'mouse') { const b = stage.getBoundingClientRect(); cur.x = e.clientX - b.left; cur.y = e.clientY - b.top; if (!openLogo) { cur.on = k.i; } }
      if (down && down.moved) { k.vx = clamp(down.pvx * 0.7, -900, 900); k.vy = clamp(down.pvy * 0.7, -900, 900); k.vrot += clamp(down.pvx * 0.012, -14, 14); k.vsc -= 3; }   // let go: it springs and slides to rest
      else if (down) { down = null; visit(k); }
      down = null; wake();
    };
    k.el.addEventListener('pointerup', up); k.el.addEventListener('pointercancel', up);
    k.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visit(k); } });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (openLogo) closeProject(); closeAll(); } });

  // ── physics: real gravity. They fall, bounce, tumble, collide with each other and the walls, and come to rest on the floor ──
  const G = 2100, REST = 0.42;
  const rad = (k) => (k.w + k.h) * 0.27;
  function step(k, dt) {
    if (k.drag) { k.x += (k.tx - k.x) * Math.min(1, dt * 24); k.y += (k.ty - k.y) * Math.min(1, dt * 24); k.x = clamp(k.x, k.w / 2, W - k.w / 2); k.y = clamp(k.y, k.h / 2, H - k.h / 2 - (k.i === 3 ? 38 : 0)); k.vx = k.vy = 0; k.rest = false; }
    else if (!started) { /* waiting to fall */ }
    else {
      k.vy += G * dt;
      if (openLogo && win._rect && k !== openLogo) { const r = win._rect, g = 26, hw = k.w / 2, hh = k.h / 2;   // an open window is a solid block: logos slide off it
        if (k.x > r.x - g - hw && k.x < r.x + r.w + g + hw && k.y > r.y - g - hh && k.y < r.y + r.h + g + hh) { const dl = k.x - (r.x - g - hw), dr = r.x + r.w + g + hw - k.x; k.vx += (dl < dr ? -1 : 1) * 900 * dt; } }
      k.x += k.vx * dt; k.y += k.vy * dt;
      const hw = k.w / 2, hh = k.h / 2, floor = H - hh - 6 - (k.i === 3 ? 38 : 0);
      if (k.y > floor) { k.y = floor; if (k.vy > 160) { k.vrot += (Math.random() - 0.5) * k.vy * 0.04; k.vsc -= Math.min(k.vy, 1500) * 0.0035; } k.vy = k.vy > 160 ? -k.vy * REST : 0; k.vx *= Math.pow(0.05, dt); if (Math.abs(k.vx) < 6) k.vx = 0; }   // bounce, scuff and slide to a stop
      if (k.x < hw) { k.x = hw; k.vx = Math.abs(k.vx) * REST; } if (k.x > W - hw) { k.x = W - hw; k.vx = -Math.abs(k.vx) * REST; }
      if (k.y < hh) { k.y = hh; k.vy = Math.abs(k.vy) * REST; }
    }
    const grounded = !k.drag && started && k.y >= H - k.h / 2 - 8 - (k.i === 3 ? 38 : 0);
    const target = grounded ? ([2, -3, 1, -2, 2][k.i]) : clamp(k.vx * 0.012, -18, 18);          // upright when resting, leaning into the fall
    k.vrot += (46 * (target - k.rot) - 5 * k.vrot) * dt; k.rot += k.vrot * dt;
    k.vsc += (90 * ((k.drag ? 1.08 : 1) - k.sc) - 7 * k.vsc) * dt; k.sc += k.vsc * dt;
  }
  function collide() {
    for (let p = 0; p < logos.length; p++) for (let q = p + 1; q < logos.length; q++) pair(logos[p], logos[q]);
  }
  function pair(a, b) {
    if (a.gone || b.gone || a.drag && b.drag) return;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, min = rad(a) + rad(b);
    if (d < min) { const nx = dx / d, ny = dy / d, o = min - d, wa = a.drag ? 0 : 1, wb = b.drag ? 0 : 1, wt = wa + wb || 1;
      a.x -= nx * o * wa / wt; a.y -= ny * o * wa / wt; b.x += nx * o * wb / wt; b.y += ny * o * wb / wt;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const j = -(1 + REST) * rv / 2; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; a.vrot += 8; b.vrot -= 8; } }
  }
  function draw() {
    for (const k of logos) {
      if (PROTO.has(k.i)) { const tw = tag.offsetWidth, th = tag.offsetHeight; tag.classList.remove('flip'); tag.style.transform = `translate(${clamp(k.x - tw / 2 + 14, 4, W - tw - 4).toFixed(1)}px, ${Math.min(k.y + k.el.offsetHeight * k.sc / 2 + 12, H - th - 2).toFixed(1)}px) rotate(-3deg)`; tag.classList.toggle('on', cur.on === k.i && !openLogo); }
      const bob = 0;
      k.el.style.transform = `translate(${(k.x - k.w / 2).toFixed(1)}px, ${(k.y - k.h / 2 + bob).toFixed(1)}px) rotate(${k.rot.toFixed(2)}deg) scale(${k.sc.toFixed(3)})`;
    }
  }

  // ── the window: a project that grows out of the logo ──
  const state = { rI: new Float32Array(RAYS), vI: new Float32Array(RAYS), rC: new Float32Array(RAYS), vC: new Float32Array(RAYS), noise: [], k: [], final: [], O: [0, 0], phase: 'none', t: 0, target: 1 };
  const insideRR = (x, y, w, h, rad) => { const cx = clamp(x, rad, w - rad), cy = clamp(y, rad, h - rad); return x >= 0 && y >= 0 && x <= w && y <= h && Math.hypot(x - cx, y - cy) <= rad + 0.01; };
  const finalRadii = (w, h, Ox, Oy) => Array.from({ length: RAYS }, (_, i) => { const a = (i / RAYS) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); let lo = 0, hi = Math.hypot(w, h) * 1.2;
    for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (insideRR(Ox - PAD + c * m, Oy - PAD + s * m, w - 2 * PAD, h - 2 * PAD, 22)) lo = m; else hi = m; } return lo + PAD; });
  const poly = (r, O) => 'polygon(' + Array.from(r, (v, i) => { const a = (i / RAYS) * Math.PI * 2; return `${(O[0] + Math.cos(a) * v).toFixed(1)}px ${(O[1] + Math.sin(a) * v).toFixed(1)}px`; }).join(',') + ')';
  const content = (pr) => `<div class="iw-cover"><img src="${pr.img}" alt="${pr.alt}"></div><div class="iw-meta"><div><h3>${pr.title}</h3><p>${pr.kind}</p></div><a class="iw-link" href="${pr.href}" target="_blank" rel="noopener">Visit website ↗</a></div>`;
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


  // ── hovering a logo: its screenshots pop up around the cursor ──
  const SHOTS = [['assets/shot-mariia-1.webp', 'assets/shot-mariia-2.webp', 'assets/shot-mariia-3.webp', 'assets/shot-mariia-4.webp'], ['assets/shot-oksana-1.webp', 'assets/shot-oksana-2.webp', 'assets/shot-oksana-3.webp'], ['assets/shot-master-3.webp', 'assets/shot-master-4.webp', 'assets/shot-master-1.webp', 'assets/shot-master-2.webp'], ['assets/shot-bristol-1.webp', 'assets/shot-bristol-2.webp', 'assets/shot-bristol-3.webp', 'assets/shot-bristol-4.webp'], ['assets/shot-jakub-1.webp', 'assets/shot-jakub-2.webp', 'assets/shot-jakub-3.webp', 'assets/shot-jakub-4.webp']];
  // Each screenshot has a fixed size, tilt and layer; the layout places them AROUND the logo (never on top of it), on the side with the most room.
  const TILT = [[-6, 5, 4, 2], [-5, 5, 0], [2, -3, -5, 5], [-4, 3, 5, -3], [3, -4, 4, -5]], LAYER = [[6, 7, 8, 9], [6, 7, 8], [9, 8, 6, 7], [6, 7, 8, 9], [6, 7, 8, 9]];
  const WIDE = (i, n) => (i === 0 && n === 3) || (i === 2 && n < 2) || (i === 4 && n < 3);
  const ASPECT = (i, n) => (i === 0 && n === 3 ? 368 / 560 : i === 2 ? [342 / 560, 338 / 560, 658 / 320, 654 / 320][n] : i === 3 ? [1608 / 782, 1586 / 776, 1594 / 718, 1602 / 718][n] : i === 4 ? [351 / 560, 376 / 560, 395 / 560, 658 / 320][n] : 600 / 320);               // height / width of each screenshot
  const shotEls = SHOTS.map((list, i) => list.map((src, n) => { const a = document.createElement('a'); a.className = 'shot'; a.href = URLS[i]; a.target = '_blank'; a.rel = 'noopener'; a.tabIndex = -1; a.setAttribute('aria-label', `Visit ${projects[i].title} website`); a.style.backgroundImage = `url(${src})`; a.dataset.pinNopin = 'true'; const pre = new Image(); pre.src = src; (pre.decode ? pre.decode() : Promise.resolve()).catch(() => {}); stage.append(a); a.addEventListener('pointerenter', () => { holdShots(i); }); a.addEventListener('pointerleave', () => { releaseShots(i); }); return { el: a, n, x: 0, y: 0, s: 0, vs: 0, ready: false }; }));
  const cur = { x: 0, y: 0, on: -1 }; let shotsOn = false, shotTimer = 0;
  const holdShots = (i) => { clearTimeout(shotTimer); if (cur.on !== i && !openLogo) { cur.on = i; wake(); } };
  const releaseShots = (i) => { clearTimeout(shotTimer); if (cur.on === i) cur.on = -1; wake(); };
  logos.forEach((k, i) => {
    k.el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse' || openLogo || k.drag) return; clearTimeout(shotTimer); const b = stage.getBoundingClientRect(); cur.x = e.clientX - b.left; cur.y = e.clientY - b.top; cur.on = i; shotsOn = true; shotEls[i].forEach((s) => { s.x = cur.x; s.y = cur.y; s.ready = true; }); wake(); });
    k.el.addEventListener('pointerleave', () => releaseShots(i));
    k.el.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const b = stage.getBoundingClientRect(); cur.x = e.clientX - b.left; cur.y = e.clientY - b.top;
      if (cur.on !== i && !k.drag && !openLogo) { clearTimeout(shotTimer); cur.on = i; wake(); } });     // still over the logo after a drag or a fall: show the screenshots
  });
  // Pack the screenshots around the logo: each one goes in the free spot nearest the logo (beside it, above it, or beside another screenshot) that
  // is inside the stage and touches neither the logo nor another screenshot. If they don't all fit, everything is scaled down until they do,
  // so the arrangement is clean wherever the logo has been dragged.

  // ── the screenshots live inside each folder: they peek out behind the front flap and rise when you hover ──
  els.forEach((el, i) => {
    const front = el.querySelector('.f-front-svg'), wrap = document.createElement('div'); wrap.className = 'sheets';
    const picks = i === 0 ? [0, 1, 3] : i === 2 ? [0, 2, 3] : i === 4 ? [0, 1, 3] : [0, 1, 2];
    picks.forEach((n, idx) => {
      const sh = document.createElement('div'), asp = ASPECT(i, n), wide = asp < 1; sh.className = 'sheet' + (wide ? ' wide' : '');
      sh.style.backgroundImage = `url(${SHOTS[i][n]})`; sh.style.setProperty('--w', wide ? '52%' : `${(54 / asp * 0.8).toFixed(1)}%`); sh.style.aspectRatio = `${1 / asp}`;
      sh.style.setProperty('--l', `${[6, 27, 48][idx]}%`); sh.style.setProperty('--r', `${[-7, 2, 8][idx]}deg`); sh.style.setProperty('--d', `${idx * 50}ms`);
      wrap.append(sh);
    });
    el.insertBefore(wrap, front);
  });
  const ORDER = [[3, 0, 1, 2], [0, 1, 2], [0, 2, 3, 1], [0, 1, 2, 3], [0, 1, 2, 3]], layoutCache = [null, null, null, null, null];
  function layout(i) {
    const k = logos[i], g = 12, m = 6, baseSc = Math.min(1, (W - 24) / 1120) * (W < 700 ? 0.72 : 1);
    const L = { l: k.x - k.w * 0.46, r: k.x + k.w * 0.46, t: k.y - k.h * 0.46, b: k.y + k.h * 0.46 };
    const others = logos.filter((o) => o !== k && !o.gone).map((o) => ({ l: o.x - o.w * 0.5, r: o.x + o.w * 0.5, t: o.y - o.h * 0.5, b: o.y + o.h * 0.5 }));
    const hint = stage.querySelector('.ink-hint'), sb = stage.getBoundingClientRect(), hb = hint ? hint.getBoundingClientRect() : null, HINT = hb ? { l: hb.left - sb.left - 8, r: hb.right - sb.left + 8, t: hb.top - sb.top - 8, b: hb.bottom - sb.top + 8 } : null;
    const TAGR = PROTO.has(i) ? { l: k.x - 80, r: k.x + 120, t: k.y + k.h / 2 - 4, b: k.y + k.h / 2 + 44 } : null;
    const hit = (a, b) => a.l < b.r + g * 0.6 && a.r > b.l - g * 0.6 && a.t < b.b + g * 0.6 && a.b > b.t - g * 0.6;
    const cache = layoutCache[i];                                               // keep the previous arrangement while it is still valid (no flip-flopping between equal choices)
    if (cache) { const rs = cache.out.map((o) => ({ l: o.cx - o.w / 2, r: o.cx + o.w / 2, t: o.cy - o.h / 2, b: o.cy + o.h / 2 }));
      const okc = rs.every((r, a) => r.l >= m - 1 && r.t >= m - 1 && r.r <= W - m + 1 && r.b <= H - m + 1 && !hit(r, L) && (cache.pass > 0 || !others.some((o) => hit(r, o))) && (cache.pass > 1 || !HINT || !hit(r, HINT)) && (!TAGR || !hit(r, TAGR)) && (cache.pass > 1 || rs.every((q, b) => b === a || !hit(r, q))));
      const near = rs.some((r) => Math.max(0, L.l - r.r, r.l - L.r) + Math.max(0, L.t - r.b, r.t - L.b) < 90);
      if (okc && near) return cache.out; }
    // pass 0: clear of both logos and of each other. pass 1: may cover the other logo. pass 2: may also overlap each other a little (never the logo itself)
    for (let pass = 0; pass < 3; pass++) for (let f = 1; f >= 0.3; f -= 0.05) {
      const sc = baseSc * f, placed = [], out = [];
      const size = (n) => { const w = (WIDE(i, n) ? 520 : 260) * sc; return [w, w * ASPECT(i, n)]; };
      let ok = true;
      for (const n of ORDER[i]) {
        const [w, h] = size(n), anchors = [L, ...placed.map((p) => p.rect)], cands = [];
        for (const A of anchors) {
          const cx = (A.l + A.r) / 2, cy = (A.t + A.b) / 2;
          for (const y of [cy - h / 2, A.b - h, A.t]) { cands.push([A.r + g, y]); cands.push([A.l - g - w, y]); }
          for (const x of [cx - w / 2, A.l, A.r - w]) { cands.push([x, A.t - g - h]); cands.push([x, A.b + g]); }
        }
        let best = null, bs = 1e9;
        for (const [x, y] of cands) {
          const r = { l: x, r: x + w, t: y, b: y + h };
          if (r.l < m || r.t < m || r.r > W - m || r.b > H - m) continue;
          if (hit(r, L) || (pass < 3 && TAGR && hit(r, TAGR)) || (pass < 2 && HINT && hit(r, HINT)) || (pass < 2 && placed.some((p) => hit(r, p.rect)))) continue;
          const sco = Math.hypot((r.l + r.r) / 2 - k.x, (r.t + r.b) / 2 - k.y); if (sco < bs) { bs = sco; best = r; }
        }
        if (!best) { ok = false; break; }
        placed.push({ n, rect: best }); out[n] = { cx: (best.l + best.r) / 2, cy: (best.t + best.b) / 2, w, h };
      }
      if (ok) { layoutCache[i] = { out, pass }; return out; }
    }
    layoutCache[i] = null; return null;
  }
  // hovering an opened screenshot: the cursor becomes the purple ink ball with the arrow pointing to the top-right corner
  const pcur = document.createElement('span'); pcur.className = 'icon-cur proj-cur proj-white'; pcur.setAttribute('aria-hidden', 'true'); pcur.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 17 L17 7"/><path d="M8 7 H17 V16"/></svg>'; document.body.append(pcur);
  const pc = { x: 0, y: 0, tx: 0, ty: 0, on: false, raf: 0 };
  const pcLoop = () => { pc.x += (pc.tx - pc.x) * (reduced ? 1 : 0.3); pc.y += (pc.ty - pc.y) * (reduced ? 1 : 0.3); pcur.style.transform = `translate(${pc.x.toFixed(1)}px, ${pc.y.toFixed(1)}px)`; pc.raf = pc.on || Math.abs(pc.tx - pc.x) + Math.abs(pc.ty - pc.y) > 0.5 ? requestAnimationFrame(pcLoop) : 0; };
  if (matchMedia('(hover: hover)').matches) shotEls.flat().forEach((s) => {
    s.el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; if (!pc.on) { pc.x = pc.tx = e.clientX; pc.y = pc.ty = e.clientY; } pc.on = true; pcur.classList.add('on'); document.documentElement.classList.add('icon-cursor'); if (!pc.raf) pc.raf = requestAnimationFrame(pcLoop); });
    s.el.addEventListener('pointermove', (e) => { pc.tx = e.clientX; pc.ty = e.clientY; });
    s.el.addEventListener('pointerleave', () => { pc.on = false; pcur.classList.remove('on'); document.documentElement.classList.remove('icon-cursor'); });
  });
  // the little imperfect square with an arrow pointing to the top-right corner: it goes to the project's website
  const SQR = ['3px 9px 4px 8px / 8px 4px 9px 3px', '8px 3px 9px 4px / 4px 9px 3px 8px', '4px 8px 3px 9px / 9px 3px 8px 4px', '9px 4px 8px 3px / 3px 8px 4px 9px', '5px 7px 9px 3px / 7px 4px 8px 5px'];
  const sqs = logos.map((k) => {
    const a = document.createElement('a'); a.className = 'open-sq'; a.href = URLS[k.i]; a.target = '_blank'; a.rel = 'noopener'; a.style.borderRadius = SQR[k.i]; a.setAttribute('aria-label', `Open the ${projects[k.i] ? projects[k.i].title : 'project'} website`);
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 L17 7"/><path d="M8 7 H17 V16"/></svg>'; a.tabIndex = -1; stage.append(a); return a;
  });
  const closeAll = () => { logos.forEach((o) => { o.open = false; }); wake(); };
  stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('.logo-obj, .shot, .open-sq')) closeAll(); });
  function stepShots(dt) {
    let any = false;
    shotEls.forEach((list, i) => {
      const k = logos[i], on = !!k.open && !openLogo && !k.drag;
      const active = on || list.some((s) => s.s > 0.01);
      const lay = active ? layout(i) : null;
      list.forEach((s, n) => {
        const T = lay && lay[n];
        if (T) { if (s.tx === undefined || (!on && s.s < 0.01)) { s.tx = T.cx; s.ty = T.cy; s.w = T.w; s.h = T.h; } else { const e = 1 - Math.exp(-dt * 10); s.tx += (T.cx - s.tx) * e; s.ty += (T.cy - s.ty) * e; s.w += (T.w - s.w) * e; s.h += (T.h - s.h) * e; } }
        s.hold = clamp((s.hold || 0) + (on && T ? dt : -dt * 3.2), 0, 1);
        const t = clamp((s.hold - n * 0.06) / 0.45, 0, 1), p = 1 - Math.pow(1 - t, 3);                              // eased, no overshoot
        s.s = p;
        if (p > 0.001 && s.w) {
          any = true;
          const ox = k.x, oy = k.y - k.h * 0.28, x = ox + (s.tx - ox) * p, y = oy + (s.ty - oy) * p, scale = 0.35 + 0.65 * p;
          s.el.style.cssText = `background-image:url(${SHOTS[i][n]});width:${s.w.toFixed(1)}px;height:${s.h.toFixed(1)}px;z-index:${20 + LAYER[i][n]};opacity:${Math.min(1, p * 1.6).toFixed(2)};transform:translate3d(${(x - s.w / 2).toFixed(1)}px,${(y - s.h / 2).toFixed(1)}px,0) rotate(${(TILT[i][n] * 0.5 * p).toFixed(2)}deg) scale(${scale.toFixed(3)});pointer-events:${p > 0.85 && on ? 'auto' : 'none'}`;
        } else if (s.el.style.opacity !== '0') s.el.style.cssText = 'opacity:0;pointer-events:none';
      });
    });
    logos.forEach((k, i) => { k.el.classList.toggle('expanded', !!k.open && !openLogo); const a = sqs[i], show = !!k.open && !openLogo && !k.drag; a.classList.toggle('on', show); if (show) a.style.transform = `translate(${(k.x + k.w * 0.5 - 20).toFixed(1)}px, ${(k.y - k.h * 0.5 - 34).toFixed(1)}px) rotate(${(-5 + i * 3).toFixed(0)}deg)`; });
    shotsOn = any;
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    if (!reduced) { for (const k of logos) step(k, dt); collide(); }
    stepShots(dt);
    stepWindow(dt); draw();
    raf = visible && (!reduced || shotsOn) ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '120px' }).observe(stage);
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; wake(); } }, { threshold: 0.45 }).observe(stage);
  addEventListener('resize', () => { resize(); draw(); });
  els.forEach((el) => { const im = el.querySelector('img'); if (im && !im.complete) im.addEventListener('load', () => { resize(); }); });

  document.documentElement.classList.add('ink-ready');
  resize(); place(); resize(); draw();
  if (reduced) { started = true; logos.forEach((k) => { k.y = H - k.h / 2 - 8; }); draw(); }
  else wake();
}
