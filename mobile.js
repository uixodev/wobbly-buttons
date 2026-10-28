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

  const grid = document.createElement('div'); grid.className = 'mgrid'; grid.setAttribute('role', 'list');
  titles.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mf'; b.setAttribute('role', 'listitem'); b.dataset.i = i; b.style.setProperty('--r', `${[-2.5, 2, 1.5, -2, -1.5, 2.5, -1][i % 7]}deg`);
    b.setAttribute('aria-label', `Open ${t}${PROTO.has(i) ? ' (prototype)' : ''}`);
    b.innerHTML = `<span class="mf-back"></span><span class="mf-sheets">${SHOTS[i].slice(0, 3).map((s, n) => `<i style="background-image:url(${s});--l:${[8, 31, 54][n]}%;--rot:${[-7, 1, 7][n]}deg"></i>`).join('')}</span><span class="mf-front"></span><img src="${logos[i]}" alt="" draggable="false"><b>${t}</b>${PROTO.has(i) ? '<em>prototype</em>' : ''}`;
    grid.append(b);
  });
  stage.after(grid);

  const sheet = document.createElement('div'); sheet.className = 'msheet'; sheet.hidden = true; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = '<div class="ms-back"></div><div class="ms-panel"><div class="ms-head"><h3></h3><button type="button" class="ms-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button></div><div class="ms-row"></div><a class="ms-visit" target="_blank" rel="noopener">Visit website <span aria-hidden="true">↗</span></a></div>';
  document.body.append(sheet);
  const row = sheet.querySelector('.ms-row'), head = sheet.querySelector('h3'), visit = sheet.querySelector('.ms-visit'); let lastBtn = null;

  function open(i, btn) {
    lastBtn = btn; head.textContent = titles[i] + (PROTO.has(i) ? ' · prototype' : ''); visit.href = URLS[i];
    row.innerHTML = SHOTS[i].map((s) => `<a href="${URLS[i]}" target="_blank" rel="noopener" class="ms-shot"><img src="${s}" alt="" draggable="false"></a>`).join('');
    row.scrollLeft = 0; sheet.hidden = false; void sheet.offsetWidth; sheet.classList.add('on'); root.classList.add('ms-open'); sheet.querySelector('.ms-close').focus({ preventScroll: true });
  }
  function close() { if (sheet.hidden) return; sheet.classList.remove('on'); root.classList.remove('ms-open'); setTimeout(() => { sheet.hidden = true; }, 320); if (lastBtn) lastBtn.focus({ preventScroll: true }); }
  grid.addEventListener('click', (e) => { const b = e.target.closest('.mf'); if (b) open(+b.dataset.i, b); });
  sheet.querySelector('.ms-close').addEventListener('click', close); sheet.querySelector('.ms-back').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
