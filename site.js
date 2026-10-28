// Vira — page behaviour: scroll reveals, self-drawing hand-drawn lines, the newsletter form, and the playground experiments.
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

// ── the playground tiles ──
initPlayground({ reduced });

// ── touch screens: black-and-white covers / tiles turn to colour while they are in the middle band of the screen ──
if (matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const io2 = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('in-focus', e.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
  document.querySelectorAll('.project .blob, .tile-stage').forEach((el) => io2.observe(el));
}
