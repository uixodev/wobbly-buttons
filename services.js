// Services ("the exhibition"): three panels. Hover one and translucent objects float up inside it and drift with your cursor,
// and your cursor becomes the panel's icon. Creative Extras shows a field of + marks that open up (and turn) towards the cursor.
// With prefers-reduced-motion nothing drifts; touch screens just show the finished panels.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const panels = [...document.querySelectorAll('.panel')];

// ── cursor-driven drift for the floating objects ──
panels.forEach((p) => {
  if (reduced) return;
  p.addEventListener('pointermove', (e) => {
    const r = p.getBoundingClientRect();
    p.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    p.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });
  p.addEventListener('pointerleave', () => { p.style.setProperty('--mx', 0); p.style.setProperty('--my', 0); });
});

// ── services on phones: the panels are a deck; swipe the top card away and it slips to the back ──
(() => {
  const wrap = document.getElementById('svc-wrap'); if (!wrap) return;
  const cards = [...wrap.querySelectorAll('.panel')], mq = matchMedia('(max-width: 900px)');
  let order = cards.map((_, i) => i), busy = false, drag = null;
  const apply = () => cards.forEach((c, i) => { const p = order.indexOf(i); c.style.setProperty('--p', p); c.classList.toggle('top', p === 0); });
  apply();
  const flyAway = (card, dir) => {
    busy = true; card.classList.remove('drag'); card.classList.add('fly');
    card.style.setProperty('--dx', `${dir * wrap.offsetWidth * 1.1}px`); card.style.setProperty('--dr', `${dir * 16}deg`);
    setTimeout(() => {
      card.classList.add('drag');                                    // no transition while it teleports to the back
      order = [...order.slice(1), order[0]]; apply();
      card.classList.remove('fly'); card.style.removeProperty('--dx'); card.style.removeProperty('--dy'); card.style.removeProperty('--dr');
      void card.offsetWidth; card.classList.remove('drag'); busy = false;
    }, 400);
  };
  wrap.addEventListener('pointerdown', (e) => {
    if (!mq.matches || busy) return; const top = cards[order[0]]; if (!top.contains(e.target)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, top, moved: false };
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(dy)) { drag.moved = true; drag.top.classList.add('drag'); drag.top.setPointerCapture(e.pointerId); }
    if (drag.moved) { drag.top.style.setProperty('--dx', `${drag.dx}px`); drag.top.style.setProperty('--dy', `${dy * 0.2}px`); drag.top.style.setProperty('--dr', `${drag.dx * 0.06}deg`); }
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.moved) {
      d.moved = false; wrap.dataset.swiped = '1'; setTimeout(() => delete wrap.dataset.swiped, 60);
      if (Math.abs(d.dx) > 70) flyAway(d.top, d.dx > 0 ? 1 : -1);
      else { d.top.classList.remove('drag'); ['--dx', '--dy', '--dr'].forEach((k) => d.top.style.removeProperty(k)); }
    }
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', () => { if (drag) { drag.top.classList.remove('drag'); ['--dx', '--dy', '--dr'].forEach((k) => drag.top.style.removeProperty(k)); drag = null; } });
  wrap.addEventListener('click', (e) => { if (wrap.dataset.swiped) { e.preventDefault(); e.stopPropagation(); } }, true);
})();
