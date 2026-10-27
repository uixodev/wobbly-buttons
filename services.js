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
    ctx.strokeStyle = '#F7F3EF'; ctx.lineCap = 'round';
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
(() => {
  if (!panels.length || !matchMedia('(hover: hover)').matches) return;
  const cur = document.createElement('span'); cur.className = 'icon-cur'; cur.setAttribute('aria-hidden', 'true'); document.body.append(cur);
  const root = document.documentElement;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  const loop = () => { x += (tx - x) * (reduced ? 1 : .28); y += (ty - y) * (reduced ? 1 : .28); cur.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = on || Math.abs(tx - x) + Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0; };
  panels.forEach((p) => {
    p.addEventListener('pointerenter', (e) => {
      cur.innerHTML = p.querySelector('.p-icon').outerHTML.replace('p-icon', '');
      cur.classList.toggle('light', !p.classList.contains('pn2'));      // light disc on the dark panels, dark disc on the light one
      if (!on) { x = tx = e.clientX; y = ty = e.clientY; }
      on = true; cur.classList.add('on'); root.classList.add('icon-cursor'); if (!raf) raf = requestAnimationFrame(loop);
    });
    p.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    p.addEventListener('pointerleave', () => { on = false; cur.classList.remove('on'); root.classList.remove('icon-cursor'); });
  });
})();
