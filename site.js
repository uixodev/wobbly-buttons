// Vira — page behaviour: scroll reveals, self-drawing hand-drawn lines, the newsletter form, and the blog cover animations.

import { initPlayground } from './playground.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── reveal on scroll: fades things up, and makes the hand-drawn lines draw themselves ──
const targets = document.querySelectorAll('[data-reveal], .draw');
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((t) => io.observe(t));
} else {
  targets.forEach((t) => t.classList.add('is-in'));
}

// ── newsletter: there is no backend yet, so it validates and says thanks locally ──
const form = document.querySelector('.news');
if (form) {
  const msg = document.querySelector('.news-msg');
  const box = document.querySelector('.check input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Please enter a valid email address.'; return; }
    if (!box.checked) { msg.textContent = 'Tick the box to say yes to updates.'; return; }
    msg.textContent = 'Thank you! (This form isn’t connected yet.)';
    form.reset(); box.checked = false;
  });
}



// ── touch screens: black-and-white covers / tiles turn to colour while they are in the middle band of the screen ──
if (matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const io2 = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('in-focus', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
  document.querySelectorAll('.project .blob, .tile-stage').forEach((el) => io2.observe(el));
}

// ── hovering a project: the cursor becomes an ink ball with an arrow pointing to the top-right corner ──
(() => {
  const links = [...document.querySelectorAll('.project-link')];
  if (!links.length || !matchMedia('(hover: hover)').matches) return;
  const reducedP = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cur = document.createElement('span'); cur.className = 'icon-cur proj-cur'; cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 17 L17 7"/><path d="M8 7 H17 V16"/></svg>';
  document.body.append(cur);
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  const loop = () => { x += (tx - x) * (reducedP ? 1 : .26); y += (ty - y) * (reducedP ? 1 : .26); cur.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = on || Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0; };
  links.forEach((a) => {
    a.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; if (!on) { x = tx = e.clientX; y = ty = e.clientY; } on = true; cur.classList.add('on'); root.classList.add('icon-cursor'); if (!raf) raf = requestAnimationFrame(loop); });
    a.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    a.addEventListener('pointerleave', () => { on = false; cur.classList.remove('on'); root.classList.remove('icon-cursor'); });
  });
})();

// ── the blog covers (live canvases) ──
initPlayground({ reduced });
