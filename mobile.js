// Featured projects on phones: a calm two-column grid of folders (no physics). Tap a folder and a sheet slides up with that project's screenshots
// as a big swipeable row, plus a "Visit website" button. (Desktop keeps the floating, draggable folders in ink.js.)

const mq = matchMedia('(max-width: 900px)');
const stage = document.getElementById('ink-stage');
const cards = [...document.querySelectorAll('.ink-fallback .project')];
if (mq.matches && stage && cards.length) {
  const URLS = ['https://www.mvsugaringbristol.com/', 'https://oksana-nails.vercel.app/#book', 'https://www.masterforgeneralcontracting.com/', 'https://my-bristol-college-app-publish.vercel.app/', 'https://sweet-orchard.github.io/Jakub-portfolio/', 'https://randomspark.app', 'https://sweet-orchard.github.io/unit10-cribbs-causeway-project/'];
  const SHOTS = [
    ['mariia-1', 'mariia-2', 'mariia-3', 'mariia-4', 'mariia-5'], ['oksana-1', 'oksana-2', 'oksana-3'], ['master-1', 'master-2', 'master-3', 'master-4'],
    ['bristol-1', 'bristol-2', 'bristol-3', 'bristol-4', 'bristol-5'], ['jakub-1', 'jakub-2', 'jakub-3', 'jakub-4'], ['spark-1', 'spark-2', 'spark-3'], ['cribbs-1', 'cribbs-2', 'cribbs-3'],
  ].map((l) => l.map((n) => `assets/shot-${n}.webp`));
  const logos = [...stage.querySelectorAll('.logo-obj img')].map((i) => i.getAttribute('src'));
  const titles = cards.map((c) => c.querySelector('h3').textContent.trim());
  const PROTO = new Set([3, 5, 6]);   // demos
  const root = document.documentElement; root.classList.add('ink-mobile');

  // folders: scattered at random (clear of each other) in a tall field
  const field = document.createElement('div'); field.className = 'mfield'; field.setAttribute('role', 'list');
  titles.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mf'; b.setAttribute('role', 'listitem'); b.dataset.i = i; b.style.setProperty('--r', `${(Math.random() * 10 - 5).toFixed(1)}deg`);   // (set once)
    b.setAttribute('aria-label', `Open ${t}${PROTO.has(i) ? ' (demo)' : ''}`);
    b.innerHTML = `<span class="mf-back"></span><span class="mf-sheets">${SHOTS[i].slice(0, 3).map((s, n) => `<i style="background-image:url(${s});--n:${n};--l:${[8, 31, 54][n]}%;--rot:${[-7, 1, 7][n]}deg"></i>`).join('')}</span><span class="mf-front"></span><img ${i === 1 || i === 2 ? 'class="inv" ' : ''}src="${logos[i]}" alt="" draggable="false">`;
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

  // tapping a folder opens a scrolling feed: the screenshots glide in one after another (sliding in sideways), full width, and you scroll down through them.
  // Two hand-drawn imperfect circles sit in the top-right corner: a cross to close and an arrow that opens the live website.
  const layer = document.createElement('div'); layer.className = 'mgal'; layer.hidden = true; layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  layer.innerHTML = '<div class="mg-bar"><p class="mg-title"></p><a class="mg-btn mg-link" target="_blank" rel="noopener" aria-label="Open the website"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 L17 7"/><path d="M8 7 H17 V16"/></svg></a><button type="button" class="mg-btn mg-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button></div><div class="mg-feed"></div>';
  document.body.append(layer);
  const titleEl = layer.querySelector('.mg-title'), feed = layer.querySelector('.mg-feed'), link = layer.querySelector('.mg-link');
  let lastBtn = null, io = null, opening = false;
  function open(i, btn) {
    if (opening) return; opening = true; lastBtn = btn; btn.classList.add('opening');          // first the folder opens, then the screenshots reveal themselves
    setTimeout(() => { show(i, btn); opening = false; }, 650);
  }
  function show(i, btn) {
    lastBtn = btn; titleEl.textContent = titles[i] + (PROTO.has(i) ? ' · demo' : ''); link.href = URLS[i];
    feed.innerHTML = SHOTS[i].map((s, k) => `<figure class="mg-shot" style="--dir:${k % 2 ? 1 : -1}"><img src="${s}" alt="" draggable="false"></figure>`).join('');
    layer.hidden = false; void layer.offsetWidth; feed.scrollTop = 0; feed.scrollTo({ top: 0, behavior: 'instant' }); layer.classList.add('on'); root.classList.add('ms-open');
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: feed, threshold: 0.12 });
    [...feed.children].forEach((f, k) => { f.style.transitionDelay = `${Math.min(k, 2) * 90}ms`; io.observe(f); });
    layer.querySelector('.mg-close').focus({ preventScroll: true });
  }
  function close() { if (layer.hidden) return; field.querySelectorAll('.mf.opening').forEach((b) => b.classList.remove('opening')); layer.classList.remove('on'); root.classList.remove('ms-open'); setTimeout(() => { layer.hidden = true; feed.innerHTML = ''; feed.scrollTop = 0; }, 260); if (lastBtn) lastBtn.focus({ preventScroll: true }); }
  layer.querySelectorAll('.mg-btn').forEach((b) => b.addEventListener('pointerdown', () => { b.classList.add('tapped'); setTimeout(() => b.classList.remove('tapped'), 450); }));     // white until tapped, then it flashes its colour
  field.addEventListener('click', (e) => { const b = e.target.closest('.mf'); if (b) open(+b.dataset.i, b); });
  layer.querySelector('.mg-close').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (!layer.hidden && e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (layer.hidden && field.clientWidth !== lastW) scatter(); });
}
