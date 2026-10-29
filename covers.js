// Blog covers: one interactive cover per article, each suited to its topic. They only animate while on screen; with prefers-reduced-motion they show a calm finished state.
//   cv-ai       "How I use AI tools": perfect dashed AI shapes; move the cursor over one and it is redrawn by hand (wobbly, black). Click to redraw differently.
//   cv-price    "What a website really costs": switch features on and the stack of blocks grows; a pin slides along £ → ££££ (a range, not a quote).
//   cv-process  "What a project looks like": a little ghost walks the four steps (hello, sketch, build, launch). Hover a step to send it there; idle it walks on its own.
//   cv-tips     "Five things in five seconds": a five-second ring ticks off five homepage checks. Click to run it again.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const onScreen = (el, cb) => new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold: 0.2 }).observe(el);

document.querySelectorAll('[data-cover]').forEach((el) => ({ 'cv-ai': ai, 'cv-price': price, 'cv-process': process, 'cv-tips': tips })[el.dataset.cover]?.(el));

// ───────────────────────── AI ─────────────────────────
function ai(root) {
  const svg = svgEl('svg', { viewBox: '0 0 400 250' }); root.append(svg);
  const SH = [
    { cx: 78, cy: 112, pts: (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283; return [Math.cos(a) * 46, Math.sin(a) * 46]; }) },
    { cx: 200, cy: 112, pts: (n) => { const r = []; const side = 84, per = n / 4; for (let i = 0; i < n; i++) { const s = Math.floor(i / per), t = (i % per) / per - 0.5, v = t * side, h = side / 2; r.push([[v, -h], [h, v], [-v, h], [-h, -v]][s]); } return r; } },
    { cx: 322, cy: 112, pts: (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.283 - 1.5708, k = i % 2 ? 22 : 50; return [Math.cos(a) * k, Math.sin(a) * k]; }) },
  ];
  const N = 40;
  const smooth = (P) => { let d = ''; for (let i = 0; i < P.length; i++) { const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length], e = P[(i + 2) % P.length]; if (!i) d += `M${b[0].toFixed(1)} ${b[1].toFixed(1)}`; d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`; } return d + 'Z'; };
  const jitter = (P, seed) => P.map(([x, y], i) => [x + Math.sin(i * 1.7 + seed) * 3.4 + Math.cos(i * 0.6 + seed * 2) * 2.2, y + Math.cos(i * 1.3 + seed) * 3.4 + Math.sin(i * 0.9 + seed) * 2.2]);
  const items = SH.map((s, i) => {
    const g = svgEl('g', { transform: `translate(${s.cx} ${s.cy})` });
    const base = s.pts(N), draft = svgEl('path', { class: 'draft', d: smooth(s.pts(i === 2 ? 10 : N)) }); if (i === 2) draft.setAttribute('d', 'M' + s.pts(10).map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z');
    if (i === 1) draft.setAttribute('d', 'M-42 -42 H42 V42 H-42Z');
    const mine = svgEl('path', { class: 'mine', pathLength: 1, d: '' }); mine.style.strokeDasharray = '1'; mine.style.strokeDashoffset = '1';
    g.append(draft, mine); svg.append(g);
    const it = { s, base, mine, p: 0, v: 0, target: 0, seed: i * 2.1 + 1 };
    const set = () => mine.setAttribute('d', smooth(jitter(i === 2 ? s.pts(10) : base, it.seed)));
    it.set = set; set(); return it;
  });
  const lbl = (x, t, c) => { const e = svgEl('text', { x, y: 214, 'text-anchor': 'middle', class: c || '' }); e.textContent = t; svg.append(e); return e; };
  const l1 = lbl(78, 'AI draft', ''), l2 = lbl(200, 'AI draft', ''), l3 = lbl(322, 'AI draft', '');
  const hint = svgEl('text', { x: 200, y: 38, 'text-anchor': 'middle' }); hint.textContent = 'move over a shape — make it yours'; svg.append(hint);
  const labels = [l1, l2, l3];
  let ptr = null, raf = 0, last = 0, vis = false;
  root.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); ptr = { x: ((e.clientX - r.left) / r.width) * 400, y: ((e.clientY - r.top) / r.height) * 250 }; wake(); });
  root.addEventListener('pointerleave', () => { ptr = null; wake(); });
  root.addEventListener('click', () => { items.forEach((it) => { it.seed = Math.random() * 20; it.set(); it.p = 0.35; }); wake(); });
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; let busy = false;
    items.forEach((it, i) => {
      const hot = ptr && Math.hypot(ptr.x - it.s.cx, ptr.y - it.s.cy) < 70;
      it.target = reduced ? 1 : hot ? 1 : it.target;       // once redrawn it stays redrawn until the cursor leaves the cover
      if (!ptr && !reduced) it.target = Math.max(0, it.target - dt * 0.35);
      it.v += (120 * (it.target - it.p) - 16 * it.v) * dt; it.p = clamp(it.p + it.v * dt, 0, 1.05);
      it.mine.style.strokeDashoffset = (1 - Math.min(1, it.p)).toFixed(3);
      labels[i].textContent = it.p > 0.5 ? 'my edit' : 'AI draft'; labels[i].setAttribute('class', it.p > 0.5 ? 'lbl-mine' : '');
      if (Math.abs(it.target - it.p) > 0.01 || Math.abs(it.v) > 0.01 || it.target > 0 && !ptr) busy = true;
    });
    raf = vis && busy && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  onScreen(root, (v) => { vis = v; if (v) wake(); });
  if (reduced) items.forEach((it) => { it.p = 1; it.mine.style.strokeDashoffset = '0'; });
  else { setTimeout(() => { items[1].target = 1; wake(); }, 700); }                  // a little hello: the middle shape redraws itself once
}

// ───────────────────────── PRICE ─────────────────────────
function price(root) {
  const FEATS = ['Pages', 'Booking', 'Blog', 'Animation', 'Shop'];
  root.innerHTML = '<div class="pr-stack"><div class="pr-base"></div></div><div class="pr-side"><div class="pr-chips"></div><div class="pr-meter"><div class="track"><i class="pin"></i></div><div class="marks"><span>£</span><span>££</span><span>£££</span><span>££££</span></div></div></div>';
  const stack = root.querySelector('.pr-stack'), chips = root.querySelector('.pr-chips'), pin = root.querySelector('.pin');
  chips.style.cssText = 'display:grid;gap:6px';
  const on = new Set();
  const render = () => {
    [...stack.querySelectorAll('.pr-block')].forEach((b) => { if (!on.has(b.dataset.f)) b.remove(); });
    FEATS.forEach((f) => { if (on.has(f) && !stack.querySelector(`[data-f="${f}"]`)) { const b = document.createElement('div'); b.className = 'pr-block'; b.dataset.f = f; b.textContent = f; stack.insertBefore(b, stack.querySelector('.pr-base')); } });
    pin.style.left = `${(on.size / FEATS.length) * 100}%`;
    chips.querySelectorAll('.pr-chip').forEach((c) => c.classList.toggle('on', on.has(c.dataset.f)));
  };
  FEATS.forEach((f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pr-chip'; b.dataset.f = f; b.textContent = '+ ' + f; b.addEventListener('click', () => { on.has(f) ? on.delete(f) : on.add(f); render(); }); chips.append(b); });
  stack.style.minHeight = '0';
  // start with the basics on, so it is never empty
  on.add('Pages'); render();
  let auto = 0;
  if (!reduced) { const steps = ['Booking', 'Blog', 'Animation']; let k = 0; auto = setInterval(() => { if (!document.hidden && root.matches(':not(:hover)') && root.getBoundingClientRect().top < innerHeight) { if (k < steps.length) { on.add(steps[k++]); } else { steps.forEach((s) => on.delete(s)); k = 0; } render(); } }, 1700); root.addEventListener('pointerdown', () => clearInterval(auto), { once: true }); }
}

// ───────────────────────── PROCESS ─────────────────────────
function process(root) {
  const svg = svgEl('svg', { viewBox: '0 0 400 250' }); root.append(svg);
  const X = [52, 150, 250, 348], Y = [150, 112, 150, 112];
  const d = X.map((x, i) => (i ? `${x} ${Y[i]}` : `M${x} ${Y[i]}`)).join(' S ').replace(/ S /g, ' S ');
  const pathD = `M${X[0]} ${Y[0]} C ${X[0] + 40} ${Y[0] - 60} ${X[1] - 40} ${Y[1] + 50} ${X[1]} ${Y[1]} S ${X[2] - 40} ${Y[2] - 60} ${X[2]} ${Y[2]} S ${X[3] - 40} ${Y[3] + 50} ${X[3]} ${Y[3]}`;
  void d;
  const path = svgEl('path', { class: 'path', d: pathD }), done = svgEl('path', { class: 'done', d: pathD, pathLength: 1 }); done.style.strokeDasharray = '1'; done.style.strokeDashoffset = '1';
  svg.append(path, done);
  const ICONS = [
    'M-8 -6 H8 V3 H1 L-3 8 V3 H-8Z', 'M-7 7 L-5 1 L5 -9 L8 -6 L-2 4 Z', 'M-5 -6 L-10 0 L-5 6 M5 -6 L10 0 L5 6 M1 -8 L-1 8', 'M0 -10 C5 -6 6 2 3 8 H-3 C-6 2 -5 -6 0 -10 M-3 8 L-6 12 M3 8 L6 12',
  ];
  const NAMES = ['hello', 'sketch', 'build', 'launch'];
  const st = X.map((x, i) => { const g = svgEl('g', { class: 'st', transform: `translate(${x} ${Y[i]})` }); g.append(svgEl('circle', { r: 17 }), svgEl('path', { class: 'ic', d: ICONS[i] })); const t = svgEl('text', { y: 36, 'text-anchor': 'middle' }); t.textContent = `0${i + 1} ${NAMES[i]}`; g.append(t); svg.append(g); return g; });
  const ghost = svgEl('g', { class: 'ghost' }); ghost.innerHTML = '<g transform="scale(.3) translate(-50 -108)"><path d="M12 100 C14 62 26 10 50 10 C74 10 86 62 88 100 C80 104 72 96 68 82 C60 76 40 76 32 82 C28 96 20 104 12 100Z"/><circle cx="86" cy="12" r="6.5"/><g class="eyes"><ellipse cx="41" cy="46" rx="5.5" ry="8"/><ellipse cx="59" cy="46" rx="5.5" ry="8"/></g></g>'; svg.append(ghost);
  const len = path.getTotalLength();
  const stationT = X.map((_, i) => { let best = 0, bd = 1e9; for (let s = 0; s <= 400; s++) { const p = path.getPointAtLength((s / 400) * len); const dd = Math.hypot(p.x - X[i], p.y - Y[i]); if (dd < bd) { bd = dd; best = s / 400; } } return best; });
  let pos = 0, vel = 0, target = 0, idle = true, raf = 0, last = 0, vis = false, timer = 0, reach = 0;
  const place = () => { const p = path.getPointAtLength(pos * len); ghost.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 22 - Math.abs(Math.sin(pos * 60)) * 3).toFixed(1)}) rotate(${(Math.sin(pos * 40) * 5).toFixed(1)})`); done.style.strokeDashoffset = (1 - clamp(pos, 0, 1)).toFixed(3); st.forEach((g, i) => g.classList.toggle('on', pos >= stationT[i] - 0.015)); };
  const go = (i) => { target = stationT[i]; reach = i; wake(); };
  svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 400; idle = false; let b = 0; X.forEach((s, i) => { if (Math.abs(s - x) < Math.abs(X[b] - x)) b = i; }); if (b !== reach || target !== stationT[b]) go(b); });
  svg.addEventListener('pointerleave', () => { idle = true; });
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    vel += (60 * (target - pos) - 11 * vel) * dt; pos = clamp(pos + vel * dt, 0, 1); place();
    raf = vis && !reduced && (Math.abs(target - pos) > 0.002 || Math.abs(vel) > 0.01) ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && vis && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  onScreen(root, (v) => { vis = v; clearInterval(timer); if (v) { wake(); timer = setInterval(() => { if (idle && !document.hidden) go((reach + 1) % 4); }, 1800); } });
  if (reduced) { pos = 1; place(); } else { pos = 0; place(); }
}

// ───────────────────────── TIPS ─────────────────────────
function tips(root) {
  const LIST = ['Who it is for', 'What you do', 'Where you are', 'Proof it works', 'The next step'];
  root.innerHTML = `<div class="tp-ring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg><b>5</b></div><ul class="tp-list">${LIST.map((t) => `<li><i><svg viewBox="0 0 12 12"><path pathLength="1" d="M2 6.5 L5 9.5 L10.5 2.5"/></svg></i>${t}</li>`).join('')}</ul><span class="tp-done">in 5 seconds ✓</span>`;
  const fg = root.querySelector('.fg'), num = root.querySelector('b'), lis = [...root.querySelectorAll('li')];
  let sec = 0, timer = 0, running = false, vis = false, wait = 0;
  const show = (n) => { lis.forEach((l, i) => l.classList.toggle('on', i < n)); num.textContent = String(Math.max(0, 5 - n)); fg.style.strokeDashoffset = String(276.5 * (n / 5)); root.classList.toggle('fin', n >= 5); };
  const run = () => { clearInterval(timer); clearTimeout(wait); sec = 0; show(0); running = true; timer = setInterval(() => { if (!vis || document.hidden) return; sec++; show(sec); if (sec >= 5) { clearInterval(timer); wait = setTimeout(run, 3200); } }, 1000); };
  root.addEventListener('click', run);
  onScreen(root, (v) => { vis = v; if (v && !running) run(); });
  if (reduced) { clearInterval(timer); show(5); }
  if (reduced) root.removeEventListener('click', run);
}
