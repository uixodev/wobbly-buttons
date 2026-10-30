// Navigation: the logo sits top left and a hand-drawn hamburger capsule sits top right, on every screen size and scroll position.
// It opens a full-screen menu: a black liquid curtain pours down with a wavy edge (like the footer's), big serif links rise in,
// the burger turns into a cross. Esc / the cross / a link closes it; focus is kept inside while it is open.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const header = document.querySelector('.site-nav');
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  curtainSpring: 62,   // how fast the menu curtain pours (higher = quicker)
  curtainDamping: 9,   // lower = a bouncier, wobblier edge
  curtainWave: 70,     // how wavy the leading edge is while it moves (px)
};

if (header && burger && menu) init();

function init() {
  let menuOpen = false;

  // ── the liquid curtain ──
  const path = menu.querySelector('.menu-curtain path');
  let p = 0, v = 0, target = 0, raf = 0, last = 0, t0 = 0;
  function curtain(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    if (reduced) { p = target; v = 0; }
    else { v += (CONFIG.curtainSpring * (target - p) - CONFIG.curtainDamping * v) * dt; p += v * dt; }
    const W = innerWidth, H = innerHeight, tt = (now - t0) / 1000;
    const edge = p * (H + CONFIG.curtainWave * 1.4), amp = reduced ? 0 : CONFIG.curtainWave * Math.sin(Math.PI * clamp(p, 0, 1)) * (0.6 + 0.4 * Math.abs(v));
    let d = `M0 0 H${W} V${(edge + amp * Math.sin(W * 0.007 + tt * 5)).toFixed(1)}`;
    for (let x = W - 40; x > 0; x -= 40) d += ` L${x} ${(edge + amp * Math.sin(x * 0.007 + tt * 5)).toFixed(1)}`;
    d += ` L0 ${(edge + amp * Math.sin(tt * 5)).toFixed(1)} Z`;
    path.setAttribute('d', d);
    const resting = Math.abs(p - target) < 0.002 && Math.abs(v) < 0.01;
    if (resting) { p = target; if (target === 0) { menu.hidden = true; } raf = 0; } else raf = requestAnimationFrame(curtain);
  }
  const run = () => { if (!raf) { last = performance.now(); t0 = t0 || last; raf = requestAnimationFrame(curtain); } };

  // ── open / close ──
  const outside = () => [document.querySelector('main'), document.querySelector('.footer'), header].filter(Boolean);
  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    // force a frame in the closed state so the content's entrance transition runs
    requestAnimationFrame(() => menu.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Close menu');
    root.classList.add('menu-open');
    outside().forEach((el) => { el.inert = true; });
    target = 1; run();
    setTimeout(() => menu.querySelector('.menu-links a')?.focus({ preventScroll: true }), reduced ? 0 : 450);
  }
  function closeMenu(returnFocus = true) {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Menu');
    root.classList.remove('menu-open');
    outside().forEach((el) => { el.inert = false; });
    target = 0; run();
    if (returnFocus) burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeMenu(false)));
  addEventListener('keydown', (e) => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key === 'Tab') {                                                // keep focus inside: the menu links, then the burger (the close button)
      const items = [...menu.querySelectorAll('a'), burger];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
}

// the solid header backdrop switches on once the hero has scrolled away
{
  const hero = document.getElementById('hero'), root = document.documentElement;
  let tick = false;
  const upd = () => { tick = false; root.classList.toggle('bar-on', !hero || hero.getBoundingClientRect().bottom < 90); };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  addEventListener('resize', upd);
  upd();
}
