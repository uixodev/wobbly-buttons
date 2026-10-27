// Viraa — page behaviour: scroll reveals, self-drawing hand-drawn lines, the newsletter form, and the playground experiments.
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

// ── services: the icon blob follows the cursor over the list (pointer devices only) ──
(() => {
  const list = document.querySelector('.svc-list');
  if (!list || reduced || !matchMedia('(hover: hover) and (min-width: 901px)').matches) return;
  const peek = document.createElement('span'); peek.className = 'svc-peek'; peek.setAttribute('aria-hidden', 'true'); document.body.append(peek);
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, active = false;
  const loop = () => { x += (tx - x) * .16; y += (ty - y) * .16; peek.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = active || Math.abs(tx - x) > .5 ? requestAnimationFrame(loop) : 0; };
  list.querySelectorAll('.svc').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      peek.innerHTML = row.querySelector('.svc-blob .icon').outerHTML;
      peek.classList.toggle('light', row.querySelector('.svc-blob').classList.contains('b2'));
      if (!active) { x = tx = e.clientX + 60; y = ty = e.clientY; }
      active = true; peek.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop);
    });
  });
  list.addEventListener('pointermove', (e) => { tx = e.clientX + 70; ty = e.clientY - 10; });
  list.addEventListener('pointerleave', () => { active = false; peek.classList.remove('on'); });
})();
