// Featured projects on phones: a calm two-column grid of folders (no physics). Tap a folder and a sheet slides up with that project's screenshots
// as a big swipeable row, plus a "Visit website" button. (Desktop keeps the floating, draggable folders in ink.js.)

const mq = matchMedia('(max-width: 900px)');
const stage = document.getElementById('ink-stage');
const cards = [...document.querySelectorAll('.ink-fallback .project')];
if (mq.matches && stage && cards.length) {
  const URLS = ['https://www.mvsugaringbristol.com/', 'https://oksana-nails.vercel.app/#book', 'https://www.masterforgeneralcontracting.com/', 'https://my-bristol-college-app-publish.vercel.app/', 'https://sweet-orchard.github.io/Jakub-portfolio/', 'https://randomspark.app', 'https://sweet-orchard.github.io/unit10-cribbs-causeway-project/'];
  const SHOTS = [
    ['mariia-1', 'mariia-2', 'mariia-3', 'mariia-4', 'mariia-5'], ['oksana-1', 'oksana-2', 'oksana-3'], ['master-3', 'master-4', 'master-1', 'master-2'],
    ['bristol-1', 'bristol-2', 'bristol-3', 'bristol-4', 'bristol-5'], ['jakub-1', 'jakub-2', 'jakub-3', 'jakub-4'], ['spark-1', 'spark-2', 'spark-3'], ['cribbs-1', 'cribbs-2', 'cribbs-3'],
  ].map((l) => l.map((n) => `assets/shot-${n}.webp`));
  const logos = [...stage.querySelectorAll('.logo-obj img')].map((i) => i.getAttribute('src'));
  const titles = cards.map((c) => c.querySelector('h3').textContent.trim());
  const PROTO = new Set([3]);
  const root = document.documentElement; root.classList.add('ink-mobile');

  // folders: scattered at random (clear of each other) in a tall field
  const field = document.createElement('div'); field.className = 'mfield'; field.setAttribute('role', 'list');
  titles.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mf'; b.setAttribute('role', 'listitem'); b.dataset.i = i; b.style.setProperty('--r', `${(Math.random() * 10 - 5).toFixed(1)}deg`);   // (set once)
    b.setAttribute('aria-label', `Open ${t}${PROTO.has(i) ? ' (prototype)' : ''}`);
    b.innerHTML = `<span class="mf-back"></span><span class="mf-sheets">${SHOTS[i].slice(0, 3).map((s, n) => `<i style="background-image:url(${s});--l:${[8, 31, 54][n]}%;--rot:${[-7, 1, 7][n]}deg"></i>`).join('')}</span><span class="mf-front"></span><img ${i === 1 || i === 2 ? 'class="inv" ' : ''}src="${logos[i]}" alt="" draggable="false">`;
    field.append(b);
  });
  stage.after(field);
  let seed = null, lastW = 0;
  function scatter() {                                  // random slots on a loose 2-column grid, each jittered, so they never overlap but never look lined up (the random numbers are drawn once, so closing a gallery never shuffles them)
    const W = field.clientWidth; lastW = W;
    const  fw = Math.min(150, W * 0.4), fh = fw * 0.92, rows = Math.ceil(titles.length / 2), rowH = fh * 1.3, H = Math.round(rowH * rows + 20);
    field.style.height = H + 'px';
    if (!seed) { const slots = []; for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) slots.push([r, c]); slots.sort(() => Math.random() - 0.5); seed = titles.map((_, i) => ({ s: slots[i], jx: Math.random(), jy: Math.random(), rot: Math.random() * 10 - 5 })); }
    [...field.children].forEach((b, i) => {
      const [r, c] = seed[i].s, colW = (W - fw) / 1, x = c === 0 ? seed[i].jx * (W - 2 * fw) * 0.5 : W - fw - seed[i].jx * (W - 2 * fw) * 0.5, y = 10 + r * rowH + seed[i].jy * (rowH - fh * 1.05);
      void colW; b.style.width = fw + 'px'; b.style.left = clamp(x, 0, W - fw).toFixed(1) + 'px'; b.style.top = y.toFixed(1) + 'px';
    });
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  scatter();

  // tapping a folder opens a gallery (like Quick Look on a Mac): one big screenshot with a strip of thumbnails under it. Swipe or tap a thumbnail to change,
  // tap the big one to expand it to full width (scroll to see all of it), and a button visits the live website.
  const layer = document.createElement('div'); layer.className = 'mgal'; layer.hidden = true; layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  layer.innerHTML = '<div class="mg-head"><p class="mg-title"></p><button type="button" class="mg-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button></div><div class="mg-main"><img alt="" draggable="false"></div><p class="mg-count"></p><div class="mg-thumbs"></div><a class="mg-visit" target="_blank" rel="noopener">Visit website <span aria-hidden="true">↗</span></a>';
  document.body.append(layer);
  const titleEl = layer.querySelector('.mg-title'), main = layer.querySelector('.mg-main'), big = main.querySelector('img'), count = layer.querySelector('.mg-count'), thumbs = layer.querySelector('.mg-thumbs'), visit = layer.querySelector('.mg-visit');
  let cur = 0, idx = 0, lastBtn = null;
  function show(n, dir = 0) {
    idx = (n + SHOTS[cur].length) % SHOTS[cur].length; layer.classList.remove('zoom'); main.scrollTop = 0;
    big.style.transition = 'none'; big.style.opacity = '0'; big.style.transform = `translateX(${dir * 40}px)`; big.src = SHOTS[cur][idx]; void big.offsetWidth; big.style.transition = ''; big.style.opacity = '1'; big.style.transform = '';
    count.textContent = `${idx + 1} / ${SHOTS[cur].length}`; [...thumbs.children].forEach((t, k) => t.classList.toggle('on', k === idx));
    const t = thumbs.children[idx]; if (t) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  function open(i, btn) {
    cur = i; lastBtn = btn; titleEl.textContent = titles[i] + (PROTO.has(i) ? ' · prototype' : ''); visit.href = URLS[i];
    thumbs.innerHTML = SHOTS[i].map((s, k) => `<button type="button" class="mg-t" aria-label="Screenshot ${k + 1}"><img src="${s}" alt="" draggable="false"></button>`).join('');
    layer.hidden = false; void layer.offsetWidth; layer.classList.add('on'); root.classList.add('ms-open'); show(0); layer.querySelector('.mg-close').focus({ preventScroll: true });
  }
  function close() { if (layer.hidden) return; layer.classList.remove('on'); root.classList.remove('ms-open'); setTimeout(() => { layer.hidden = true; }, 260); if (lastBtn) lastBtn.focus({ preventScroll: true }); }
  thumbs.addEventListener('click', (e) => { const t = e.target.closest('.mg-t'); if (t) show([...thumbs.children].indexOf(t), [...thumbs.children].indexOf(t) > idx ? 1 : -1); });
  main.addEventListener('click', () => layer.classList.toggle('zoom'));                 // expand / shrink the screenshot (it is not a link)
  let sx = 0, sy = 0;                                                                     // swipe left / right to change screenshot
  main.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  main.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (!layer.classList.contains('zoom') && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }, { passive: true });
  field.addEventListener('click', (e) => { const b = e.target.closest('.mf'); if (b) open(+b.dataset.i, b); });
  layer.querySelector('.mg-close').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (layer.hidden) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1, 1); else if (e.key === 'ArrowLeft') show(idx - 1, -1); });
  addEventListener('resize', () => { if (layer.hidden && field.clientWidth !== lastW) scatter(); });
}
