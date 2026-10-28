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

// ── creative extras: + marks that grow, turn into × and lean toward the cursor ──
const plus = document.querySelector('.a-plus');
if (plus) {
  const panel = plus.closest('.panel'), ctx = plus.getContext('2d');
  const GAP = 38; let w = 0, h = 0, dpr = 1, raf = 0, inside = false;
  const ptr = { x: -999, y: -999 }, ease = { x: -999, y: -999 };
  const fit = () => { const r = panel.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; plus.width = w * dpr; plus.height = h * dpr; };
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#AD86CF'; ctx.lineCap = 'round';
    const cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1, ox = (w - (cols - 1) * GAP) / 2, oy = (h - (rows - 1) * GAP) / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let x = ox + i * GAP, y = oy + j * GAP;
      const dx = ease.x - x, dy = ease.y - y, d = Math.hypot(dx, dy), t = Math.max(0, 1 - d / 150), tt = t * t * (3 - 2 * t);
      x += (dx / (d || 1)) * tt * 12; y += (dy / (d || 1)) * tt * 12;
      const s = 3 + 9 * tt, rot = tt * Math.PI / 4;
      ctx.globalAlpha = 0.18 + 0.82 * tt; ctx.lineWidth = 1.1 + tt * .6;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(rot) * s, y - Math.sin(rot) * s); ctx.lineTo(x + Math.cos(rot) * s, y + Math.sin(rot) * s);
      ctx.moveTo(x + Math.sin(rot) * s, y - Math.cos(rot) * s); ctx.lineTo(x - Math.sin(rot) * s, y + Math.cos(rot) * s);
      ctx.stroke();
    }
  }
  function frame() {
    ease.x += (ptr.x - ease.x) * .2; ease.y += (ptr.y - ease.y) * .2;
    draw();
    raf = inside || Math.abs(ptr.x - ease.x) + Math.abs(ptr.y - ease.y) > .5 ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  fit(); addEventListener('resize', () => { fit(); draw(); });
  if (reduced || !matchMedia('(hover: hover)').matches) { ease.x = ptr.x = w * .5; ease.y = ptr.y = h * .4; draw(); }
  else {
    ease.x = ptr.x = -999; ease.y = ptr.y = -999; draw();
    panel.addEventListener('pointerenter', (e) => { fit(); const r = panel.getBoundingClientRect(); ptr.x = ease.x = e.clientX - r.left; ptr.y = ease.y = e.clientY - r.top; inside = true; wake(); });
    panel.addEventListener('pointermove', (e) => { const r = panel.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    panel.addEventListener('pointerleave', () => { inside = false; ptr.x = ptr.y = -999; wake(); });
  }
}

// ── the cursor becomes the panel's icon while you hover a panel ──
const ICONS = {
  pen: '<svg viewBox="0 0 24 24"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  support: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>',
};
(() => {
  if (!panels.length || !matchMedia('(hover: hover)').matches) return;
  const cur = document.createElement('span'); cur.className = 'icon-cur'; cur.setAttribute('aria-hidden', 'true'); document.body.append(cur);
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  const loop = () => { x += (tx - x) * (reduced ? 1 : .28); y += (ty - y) * (reduced ? 1 : .28); cur.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = on || Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0; };
  panels.forEach((p) => {
    p.addEventListener('pointerenter', (e) => {
      cur.innerHTML = ICONS[p.dataset.icon] || '';
      cur.classList.toggle('light', !(p.classList.contains('pn2') || p.classList.contains('pn4')));      // light disc on the dark panels, dark disc on the light one
      if (!on) { x = tx = e.clientX; y = ty = e.clientY; }
      on = true; cur.classList.add('on'); root.classList.add('icon-cursor'); if (!raf) raf = requestAnimationFrame(loop);
    });
    p.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    p.addEventListener('pointerleave', () => { on = false; cur.classList.remove('on'); root.classList.remove('icon-cursor'); });
  });
})();

// ── services on phones: the five panels are a deck; each swipe sends the top card away for good, and when the deck is empty "and more...." appears ──
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
      card.classList.add('drag', 'gone');                            // the card has left the deck for good
      order = order.slice(1); apply();
      card.classList.remove('fly'); card.style.removeProperty('--dx'); card.style.removeProperty('--dy'); card.style.removeProperty('--dr');
      busy = false; if (!order.length) wrap.classList.add('done');
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
