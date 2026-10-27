// Hero: a deck of mini-story cards starring the character (hello → hmm… → aha! → off we go).
//   top card   plays its little animation (the others wait, paused)
//   click/tap  swaps: the top card flies off and slips to the back of the deck
//   drag/swipe pull the top card sideways and let go past a threshold to swap (otherwise it springs back)
//   keys       ← / → (or Enter / Space) when the deck is focused; the arrow buttons work too
//   auto       swaps every few seconds while visible; pauses while you hover or focus it, and stops for good once you swap by hand
// To change a story, edit that card's <svg> in index.html. With prefers-reduced-motion there is no auto-swap and cards change instantly.

const deck = document.getElementById('hero-deck');
if (deck) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stack = deck.querySelector('.dk-stack'), cards = [...stack.querySelectorAll('.dk-card')], dots = [...deck.querySelectorAll('.dk-dots i')], live = document.getElementById('dk-live');
  let order = cards.map((_, i) => i), busy = false, auto = !reduced, hovering = false, visible = true, timer = 0;

  function apply() {
    cards.forEach((c, i) => { const p = order.indexOf(i); c.style.setProperty('--p', p); c.classList.toggle('top', p === 0); c.setAttribute('aria-hidden', p === 0 ? 'false' : 'true'); });
    dots.forEach((d, i) => d.classList.toggle('on', i === order[0]));
    if (live) live.textContent = cards[order[0]].getAttribute('aria-label');
  }
  apply();

  function next(dir = 1, fromX = 0) {
    if (busy) return; busy = true;
    const top = cards[order[0]];
    if (reduced) { order = dir > 0 ? [...order.slice(1), order[0]] : [order[order.length - 1], ...order.slice(0, -1)]; apply(); busy = false; return; }
    if (dir > 0) {
      const fly = top.animate([{ transform: top.style.transform || getComputedStyle(top).transform }, { transform: `translate(${(fromX >= 0 ? 1 : -1) * 120}%, -14%) rotate(${(fromX >= 0 ? 1 : -1) * 18}deg)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' });
      fly.onfinish = () => {
        top.style.transition = 'none'; fly.cancel(); order = [...order.slice(1), order[0]]; apply(); top.style.opacity = '0';
        void top.offsetWidth; top.style.transition = ''; top.style.opacity = ''; busy = false;
      };
    } else {                                                          // bring the last card back to the front
      const last = cards[order[order.length - 1]];
      last.style.transition = 'none'; last.style.opacity = '0'; order = [last === top ? order[0] : order[order.length - 1], ...order.filter((i) => cards[i] !== last)]; apply(); void last.offsetWidth; last.style.transition = ''; last.style.opacity = ''; busy = false;
    }
  }
  const stop = () => { auto = false; clearInterval(timer); };
  const go = (dir, x) => { stop(); next(dir, x); };

  deck.querySelector('.dk-next').addEventListener('click', (e) => { e.stopPropagation(); go(1); });
  deck.querySelector('.dk-prev').addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  // drag / swipe the top card
  let drag = null;
  stack.addEventListener('pointerdown', (e) => {
    const top = cards[order[0]]; if (busy || !top.contains(e.target)) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, top, id: e.pointerId, moved: false };
  });
  stack.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(drag.dx) > 6 && Math.abs(drag.dx) > Math.abs(dy)) { drag.moved = true; drag.top.classList.add('drag'); drag.top.setPointerCapture(e.pointerId); }
    if (drag.moved) drag.top.style.transform = `translate(${drag.dx}px, ${dy * 0.25}px) rotate(${drag.dx * 0.05}deg)`;
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; d.top.classList.remove('drag');
    if (d.moved && Math.abs(d.dx) > 80) { go(1, d.dx); d.top.style.transform = ''; }
    else { d.top.style.transform = ''; if (!d.moved) go(1); }          // a plain click / tap swaps too
  };
  stack.addEventListener('pointerup', end); stack.addEventListener('pointercancel', (e) => { if (drag) { drag.top.classList.remove('drag'); drag.top.style.transform = ''; drag = null; } });

  // gentle auto-play while it is on screen and untouched
  const tick = () => { if (auto && visible && !hovering && !busy && !document.hidden) next(1); };
  if (auto) timer = setInterval(tick, 5200);
  deck.addEventListener('pointerenter', () => { hovering = true; }); deck.addEventListener('pointerleave', () => { hovering = false; });
  deck.addEventListener('focusin', () => { hovering = true; }); deck.addEventListener('focusout', () => { hovering = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(deck);
}
