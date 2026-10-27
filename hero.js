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
