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

// ── services: the big numbers drift at slightly different speeds as you scroll ──
(() => {
  const nums = [...document.querySelectorAll('.svc-num')];
  if (!nums.length || reduced) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const mid = innerHeight / 2;
    for (const n of nums) {
      const r = n.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      n.style.translate = `0 ${(((r.top + r.height / 2) - mid) * parseFloat(n.dataset.speed)).toFixed(1)}px`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
