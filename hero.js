// Hero: the cat at its desk. The drawing is traced from the artwork and split into a few moving parts (tail, ear, wall notes, plant, laptop logo, steam) in CSS.
// Here: its eyes follow your cursor, and clicking / tapping / Enter makes it say "meow!" (tail wags faster, ear flicks).

const cat = document.getElementById('hero-cat');
if (cat) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = cat.querySelector('svg'), look = cat.querySelector('#cat-look');
  const EYE = { x: 740, y: 291 };                       // between the two eyes, in drawing units
  let raf = 0, px = 0, py = 0;

  function aim() {
    raf = 0;
    const r = svg.getBoundingClientRect(), k = r.width / 1420;
    const ex = r.left + EYE.x * k, ey = r.top + EYE.y * k;
    const dx = px - ex, dy = py - ey, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 280) * 7;   // up to 7 drawing units, eased by distance
    look.style.setProperty('--ex', `${((dx / d) * m).toFixed(2)}px`); look.style.setProperty('--ey', `${((dy / d) * m * 0.8).toFixed(2)}px`);
  }
  if (!reduced) addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(aim); }, { passive: true });

  let t = 0;
  const meow = () => { cat.classList.remove('said'); void cat.offsetWidth; cat.classList.add('said'); clearTimeout(t); t = setTimeout(() => cat.classList.remove('said'), 1600); };
  cat.addEventListener('click', meow);
  cat.setAttribute('tabindex', '0'); cat.setAttribute('role', 'button');
  cat.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); meow(); } });
}

// Contact: the thinking cat. Eyes follow the cursor; click / tap makes the fish in its thought bubble go wild for a second.
const cc = document.getElementById('contact-cat');
if (cc) {
  const reduced2 = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg2 = cc.querySelector('svg'), look2 = cc.querySelector('#cc-look');
  const EYE2 = { x: 645, y: 463 };
  let raf2 = 0, qx = 0, qy = 0;
  if (!reduced2) addEventListener('pointermove', (e) => { qx = e.clientX; qy = e.clientY; if (raf2) return; raf2 = requestAnimationFrame(() => {
    raf2 = 0; const r = svg2.getBoundingClientRect(), k = r.width / 1030, dx = qx - (r.left + EYE2.x * k), dy = qy - (r.top + EYE2.y * k), d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 300) * 6;
    look2.style.setProperty('--ex', `${((dx / d) * m).toFixed(2)}px`); look2.style.setProperty('--ey', `${((dy / d) * m * 0.8).toFixed(2)}px`);
  }); }, { passive: true });
  let t2 = 0;
  cc.addEventListener('click', () => { cc.classList.add('said'); clearTimeout(t2); t2 = setTimeout(() => cc.classList.remove('said'), 1400); });
}

// Hero scroll story: the section is tall and its content is pinned. How far you have scrolled through it decides how many steps are on:
// 0 cat alone · 1 "Hi," · 2 "I'm Viraa." · 3 intro · 4 buttons. It runs both ways (scroll back up and they leave again).
const story = document.getElementById('hero');
if (story && story.classList.contains('hero-story')) {
  const reducedS = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedS) story.classList.add('static');
  else {
    const STEPS = [0.15, 0.3, 0.44, 0.84];       // intro words are scrubbed between 0.44 and 0.8; buttons at 0.84          // progress through the story at which steps 1–4 switch on (the zoom-out finishes just before step 1)
    const ZOOM_END = 0.17;
    const art = story.querySelector('.hero-art');
    // split the intro into words so they can appear one at a time
    const lede = story.querySelector('.lede'); let words = [];
    if (lede) {
      lede.setAttribute('aria-label', lede.textContent.trim());
      const kids = [...lede.childNodes]; lede.textContent = '';
      kids.forEach((n) => {                                                  // words become spans; marked elements (the underlined word, the star) stay intact and appear as one step
        if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((t) => { if (!t) return; if (/^\s+$/.test(t)) lede.append(' '); else { const s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = t; lede.append(s); } });
        else { n.classList.add('w'); n.setAttribute('aria-hidden', 'true'); lede.append(n); }
      });
      words = [...lede.querySelectorAll('.w')];
    }
    let ticking = false, cur = -1;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const update = () => {
      ticking = false;
      const r = story.getBoundingClientRect(), span = r.height - innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      // the cat starts zoomed in (cropped, filling the screen) and zooms out to the whole picture before "Hi," arrives
      const z0 = innerWidth <= 900 ? 3.1 : 2.3, t = Math.min(1, p / ZOOM_END);
      art.style.setProperty('--z', (z0 + (1 - z0) * ease(t)).toFixed(3));
      if (words.length) { const k = Math.round(Math.min(1, Math.max(0, (p - 0.44) / 0.36)) * words.length); words.forEach((w, i) => w.classList.toggle('on', i < k)); }
      const n = STEPS.filter((s) => p >= s).length;
      if (n === cur) return; cur = n;
      for (let i = 0; i <= 4; i++) story.classList.toggle('s' + i, i <= n);
      story.classList.toggle('s0', n === 0);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }
}

// Pronunciation: a small speaker button reads "Veera" aloud with the browser's own voice (hidden where speech isn't supported).
(() => {
  const btn = document.getElementById('say-btn');
  if (!btn || !('speechSynthesis' in window)) return;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const u = new SpeechSynthesisUtterance('Veera'); u.rate = 0.8; u.lang = 'en-GB';
    btn.classList.add('on'); u.onend = u.onerror = () => btn.classList.remove('on');
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
})();
