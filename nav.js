// Navigation: the full bar "gathers together" into a compact capsule as you scroll, and the capsule's hamburger opens a full-screen menu.
//
//   top of page    full bar: logo · links · location
//   scrolled       the links, location and logo fly together into the capsule (mini character · hand-drawn burger · "Menu")
//   menu open      a black liquid curtain pours down with a wavy edge (like the footer's), big serif links rise in,
//                  the burger turns into a cross. Esc / the cross / a link closes it; focus is kept inside while it is open.
// On phones the capsule is always shown.

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
  gatherAt: 90,        // scroll distance (px) at which the bar gathers into the capsule
  releaseAt: 24,       // scroll distance below which it spreads back out (a gap avoids flicker)
  curtainSpring: 62,   // how fast the menu curtain pours (higher = quicker)
  curtainDamping: 9,   // lower = a bouncier, wobblier edge
  curtainWave: 70,     // how wavy the leading edge is while it moves (px)
};

if (header && burger && menu) init();

function init() {
  // things that fly into the capsule when the bar gathers
  const flyers = [header.querySelector('.vira-logo'), ...header.querySelectorAll('.nav-links li'), header.querySelector('.nav-meta')].filter(Boolean);

  // ── gather / spread ──
  let gathered = false, menuOpen = false;
  function aim() {
    // the capsule is scaled down while the bar is open, so aim at where it will sit: its fixed top-right spot
    const cs = getComputedStyle(burger);
    const cx = innerWidth - (parseFloat(cs.right) || 0) - burger.offsetWidth / 2, cy = (parseFloat(cs.top) || 0) + burger.offsetHeight / 2;
    for (const el of flyers) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx', `${(cx - (r.left + r.width / 2)).toFixed(0)}px`);
      el.style.setProperty('--fy', `${(cy - (r.top + r.height / 2)).toFixed(0)}px`);
    }
  }
  function setGathered(v) {
    if (v === gathered) return;
    if (v) aim();
    gathered = v;
    root.classList.toggle('nav-gathered', v);
    header.querySelector('nav').inert = v;                                  // gathered links can't be tabbed to
    if (!v && menuOpen) closeMenu();
  }
  function onScroll() { const y = scrollY; if (!gathered && y > CONFIG.gatherAt) setGathered(true); else if (gathered && y < CONFIG.releaseAt) setGathered(false); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { if (gathered) aim(); });
  flyers.forEach((el, i) => el.style.setProperty('--d', `${i * 45}ms`));       // they leave one after another
  onScroll();

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
