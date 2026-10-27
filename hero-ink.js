// Hero: the living ink flower (ink-flower/ink-flower.js) sits behind the editorial headline.
// The headline is real, selectable HTML text; where it crosses the ink it inverts to ivory (mix-blend-mode: difference in hero.css),
// so the flower can overlap the type on purpose without hiding it.
import { createInkFlower } from './ink-flower/ink-flower.js';

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.hero-canvas');
const line1 = document.querySelector('.hero-title .l1');

if (hero && canvas) start();

async function start() {
  // flower size / position depend on the viewport shape
  const layoutFor = (w, h) => {
    if (w / h > 1.1) return { mode: 'wide',   scale: 0.34, centerX: 0.58, centerY: 0.5 };
    if (w < 600)     return { mode: 'phone',  scale: 0.42, centerX: 0.5,  centerY: 0.43 };
    return                  { mode: 'tablet', scale: 0.30, centerX: 0.5,  centerY: 0.46 };
  };

  let { mode, ...opts } = layoutFor(canvas.clientWidth || 1, canvas.clientHeight || 1);
  const flower = createInkFlower(canvas, opts);
  hero.classList.add('is-ready');

  // headline: fit BEAUTIFUL to a fixed share of the stage width, whatever the font ends up being
  function fit() {
    const stage = canvas.clientWidth;
    if (!stage || !line1) return;
    hero.style.setProperty('--title-size', '100px');
    const w100 = line1.getBoundingClientRect().width;
    const target = stage * (stage < 800 ? 0.92 : 0.86);
    hero.style.setProperty('--title-size', `${(100 * target) / w100}px`);
  }

  function onResize() {
    fit();
    const next = layoutFor(canvas.clientWidth, canvas.clientHeight);
    if (next.mode !== mode) { mode = next.mode; const { mode: _m, ...o } = next; flower.set(o); }
  }
  new ResizeObserver(onResize).observe(canvas);
  if (document.fonts?.load) {
    await Promise.race([Promise.all([document.fonts.load('600 100px "Bodoni Moda"'), document.fonts.ready]), new Promise((r) => setTimeout(r, 2500))]);
  }
  fit();
}
