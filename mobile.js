// Featured projects on phones: a calm two-column grid of folders (no physics). Tap a folder and a sheet slides up with that project's screenshots
// as a big swipeable row, plus a "Visit website" button. (Desktop keeps the floating, draggable folders in ink.js.)

const mq = matchMedia('(max-width: 900px)');
const stage = document.getElementById('ink-stage');
const cards = [...document.querySelectorAll('.ink-fallback .project')];
if (mq.matches && stage && cards.length) {
  const URLS = ['https://www.mvsugaringbristol.com/', 'https://oksana-nails.vercel.app/#book', 'https://www.masterforgeneralcontracting.com/', 'https://my-bristol-college-app-publish.vercel.app/', 'https://sweet-orchard.github.io/Jakub-portfolio/', 'https://randomspark.app', 'https://sweet-orchard.github.io/unit10-cribbs-causeway-project/'];
  const SHOTS = [
    ['mariia-1', 'mariia-2', 'mariia-3', 'mariia-4'], ['oksana-1', 'oksana-2', 'oksana-3'], ['master-3', 'master-4', 'master-1', 'master-2'],
    ['bristol-1', 'bristol-2', 'bristol-3', 'bristol-4'], ['jakub-1', 'jakub-2', 'jakub-3', 'jakub-4'], ['spark-1', 'spark-2', 'spark-3'], ['cribbs-1', 'cribbs-2', 'cribbs-3'],
  ].map((l) => l.map((n) => `assets/shot-${n}.webp`));
  const logos = [...stage.querySelectorAll('.logo-obj img')].map((i) => i.getAttribute('src'));
  const titles = cards.map((c) => c.querySelector('h3').textContent.trim());
  const PROTO = new Set([3]);
  const root = document.documentElement; root.classList.add('ink-mobile');

  // folders: scattered at random (clear of each other) in a tall field
  const field = document.createElement('div'); field.className = 'mfield'; field.setAttribute('role', 'list');
  titles.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mf'; b.setAttribute('role', 'listitem'); b.dataset.i = i; b.style.setProperty('--r', `${(Math.random() * 10 - 5).toFixed(1)}deg`);
    b.setAttribute('aria-label', `Open ${t}${PROTO.has(i) ? ' (prototype)' : ''}`);
    b.innerHTML = `<span class="mf-back"></span><span class="mf-sheets">${SHOTS[i].slice(0, 3).map((s, n) => `<i style="background-image:url(${s});--l:${[8, 31, 54][n]}%;--rot:${[-7, 1, 7][n]}deg"></i>`).join('')}</span><span class="mf-front"></span><img src="${logos[i]}" alt="" draggable="false">`;
    field.append(b);
  });
  stage.after(field);
  function scatter() {                                  // random slots on a loose 2-column grid, each jittered, so they never overlap but never look lined up
    const W = field.clientWidth, fw = Math.min(150, W * 0.4), fh = fw * 0.92, rows = Math.ceil(titles.length / 2), rowH = fh * 1.3, H = Math.round(rowH * rows + 20);
    field.style.height = H + 'px';
    const slots = []; for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) slots.push([r, c]);
    slots.sort(() => Math.random() - 0.5);
    [...field.children].forEach((b, i) => {
      const [r, c] = slots[i], colW = (W - fw) / 1, x = c === 0 ? Math.random() * (W - 2 * fw) * 0.5 : W - fw - Math.random() * (W - 2 * fw) * 0.5, y = 10 + r * rowH + Math.random() * (rowH - fh * 1.05);
      void colW; b.style.width = fw + 'px'; b.style.left = clamp(x, 0, W - fw).toFixed(1) + 'px'; b.style.top = y.toFixed(1) + 'px';
    });
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  scatter();

  // tapping a folder: its screenshots fly out of it and settle into a collage that fills the screen (every screenshot as large as it can be)
  const layer = document.createElement('div'); layer.className = 'mcollage'; layer.hidden = true; layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  layer.innerHTML = '<div class="mc-back"></div><p class="mc-title"></p><button type="button" class="mc-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button><p class="mc-hint">tap a screenshot to visit the site</p>';
  document.body.append(layer);
  const titleEl = layer.querySelector('.mc-title'); let lastBtn = null, items = [];
  const ratio = (img) => (img.naturalHeight || 1) / (img.naturalWidth || 1);
  function pack(rs, W, H, g) {                       // best way to split the screenshots into rows so they fill W x H at the largest size
    const n = rs.length; let best = null;
    for (let mask = 0; mask < 1 << (n - 1); mask++) {
      const rows = [[0]]; for (let i = 1; i < n; i++) { if (mask & (1 << (i - 1))) rows.push([i]); else rows[rows.length - 1].push(i); }
      const hs = rows.map((r) => (W - g * (r.length - 1)) / r.reduce((s, i) => s + 1 / rs[i], 0));
      let tot = hs.reduce((s, h) => s + h, 0) + g * (rows.length - 1), k = Math.min(1, H / tot);
      const score = tot * k;
      if (!best || score > best.score) best = { rows, hs, k, score };
    }
    return best;
  }
  function open(i, btn) {
    lastBtn = btn; layer.hidden = false; titleEl.textContent = titles[i] + (PROTO.has(i) ? ' · prototype' : '');
    layer.querySelectorAll('.mc-shot').forEach((e) => e.remove());
    const from = btn.getBoundingClientRect(), fx = from.left + from.width / 2, fy = from.top + from.height * 0.35;
    const imgs = SHOTS[i].map((s) => { const a = document.createElement('a'); a.className = 'mc-shot'; a.href = URLS[i]; a.target = '_blank'; a.rel = 'noopener'; const im = new Image(); im.src = s; im.alt = ''; im.draggable = false; a.append(im); layer.append(a); return { a, im }; });
    root.classList.add('ms-open');
    Promise.all(imgs.map(({ im }) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))).then(() => {
      const W0 = innerWidth - 28, H0 = innerHeight - 150, rs = imgs.map(({ im }) => ratio(im)), g = 10, p = pack(rs, W0, H0, g);
      const rowsH = p.hs.map((h) => h * p.k), tot = rowsH.reduce((s, h) => s + h, 0) + g * (p.rows.length - 1);
      let y = 74 + Math.max(0, (H0 - tot) / 2);
      p.rows.forEach((row, ri) => {
        const hh = rowsH[ri], widths = row.map((k) => hh / rs[k]), rw = widths.reduce((s, w) => s + w, 0) + g * (row.length - 1); let x = (innerWidth - rw) / 2;
        row.forEach((k, ci) => {
          const { a } = imgs[k], w = widths[ci], cx = x + w / 2, cy = y + hh / 2;
          a.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${hh.toFixed(1)}px;transform:translate(${(fx - cx).toFixed(1)}px,${(fy - cy).toFixed(1)}px) scale(.18) rotate(${(k % 2 ? 8 : -8)}deg);opacity:0`;
          void a.offsetWidth; a.style.transitionDelay = `${(k * 55)}ms`; a.style.transform = `rotate(${[-1.2, 1, -.6, .8][k % 4]}deg)`; a.style.opacity = '1';
          x += w + g;
        });
        y += hh + g;
      });
      layer.classList.add('on');
    });
    layer.querySelector('.mc-close').focus({ preventScroll: true });
  }
  function close() { if (layer.hidden) return; layer.classList.remove('on'); layer.querySelectorAll('.mc-shot').forEach((a) => { a.style.transitionDelay = '0ms'; a.style.opacity = '0'; a.style.transform = 'scale(.6)'; }); root.classList.remove('ms-open'); setTimeout(() => { layer.hidden = true; layer.querySelectorAll('.mc-shot').forEach((e) => e.remove()); }, 300); if (lastBtn) lastBtn.focus({ preventScroll: true }); }
  field.addEventListener('click', (e) => { const b = e.target.closest('.mf'); if (b) open(+b.dataset.i, b); });
  layer.querySelector('.mc-close').addEventListener('click', close); layer.querySelector('.mc-back').addEventListener('click', close); layer.querySelector('.mc-hint').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (layer.hidden) scatter(); });
}
