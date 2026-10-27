// Hero: three floating sample websites in a little 3D stage.
//   cursor     the whole stage tilts toward it; the cards sit at different depths so they slide against each other (parallax)
//   drag       pick a card up (mouse / pen) and move it; let go and it springs home
//   click/tap  brings that card to the front
// With prefers-reduced-motion nothing tilts or springs; cards still come forward on click.

const root = document.getElementById('hero-cards');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = root.querySelector('.hc-stage'), cursorEl = root.querySelector('.hc-cursor');
  const cards = [...root.querySelectorAll('.hc')].map((el, i) => ({ el, depth: [46, 20, 0][i], x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, drag: false, z: 3 - i }));
  const tilt = { rx: 0, ry: 0, trx: 0, try: 0 }, par = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0, visible = true, ticks = 0;

  addEventListener('pointermove', (e) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = root.getBoundingClientRect(), nx = clamp(((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)), -1, 1), ny = clamp(((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)), -1, 1);
    tilt.try = nx * 9; tilt.trx = -ny * 7; par.tx = nx; par.ty = ny; wake();
  }, { passive: true });
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  const front = (c) => { let top = Math.max(...cards.map((o) => o.z)); if (c.z === top) return; cards.forEach((o) => { if (o.z > c.z) o.z--; }); c.z = top; cards.forEach((o) => { o.el.style.zIndex = o.z; }); };
  cards.forEach((c) => {
    c.el.style.zIndex = c.z;
    let sx = 0, sy = 0, moved = false;
    c.el.addEventListener('pointerdown', (e) => {
      front(c); if (reduced || e.pointerType === 'touch') return;
      c.drag = true; moved = false; sx = e.clientX - c.x; sy = e.clientY - c.y; c.el.classList.add('drag'); c.el.setPointerCapture(e.pointerId); wake();
    });
    c.el.addEventListener('pointermove', (e) => { if (!c.drag) return; c.tx = e.clientX - sx; c.ty = e.clientY - sy; if (Math.abs(c.tx) + Math.abs(c.ty) > 4) moved = true; });
    const drop = () => { if (!c.drag) return; c.drag = false; c.tx = c.ty = 0; c.el.classList.remove('drag'); wake(); };
    c.el.addEventListener('pointerup', drop); c.el.addEventListener('pointercancel', drop);
  });

  function frame() {
    ticks++;
    tilt.rx += (tilt.trx - tilt.rx) * 0.08; tilt.ry += (tilt.try - tilt.ry) * 0.08;
    par.x += (par.tx - par.x) * 0.08; par.y += (par.ty - par.y) * 0.08;
    stage.style.setProperty('--rx', `${tilt.rx.toFixed(2)}deg`); stage.style.setProperty('--ry', `${tilt.ry.toFixed(2)}deg`);
    let busy = Math.abs(tilt.trx - tilt.rx) + Math.abs(tilt.try - tilt.ry) > 0.02;
    for (const c of cards) {
      if (c.drag) { c.x += (c.tx - c.x) * 0.35; c.y += (c.ty - c.y) * 0.35; c.vx = c.vy = 0; busy = true; }
      else {                                    // spring home
        c.vx += (-90 * (c.x) - 11 * c.vx) * (1 / 60); c.vy += (-90 * (c.y) - 11 * c.vy) * (1 / 60); c.x += c.vx; c.y += c.vy;
        if (Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.vx) + Math.abs(c.vy) > 0.05) busy = true; else { c.x = c.y = c.vx = c.vy = 0; }
      }
      const lift = c.drag ? 40 : 0;
      c.el.style.setProperty('--x', `${(c.x + par.x * c.depth * -0.5).toFixed(1)}px`);
      c.el.style.setProperty('--y', `${(c.y + par.y * c.depth * -0.5).toFixed(1)}px`);
      c.el.style.setProperty('--z', `${c.depth + lift}px`);
    }
    // the little arrow drifts with the front card's depth
    cursorEl.style.setProperty('--cx', `${(par.x * -26).toFixed(1)}px`); cursorEl.style.setProperty('--cy', `${(par.y * -20).toFixed(1)}px`);
    raf = visible && busy ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible && !reduced) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(root);
  addEventListener('pointerleave', () => { tilt.trx = tilt.try = par.tx = par.ty = 0; wake(); });
  document.documentElement.addEventListener('pointerleave', () => { tilt.trx = tilt.try = par.tx = par.ty = 0; wake(); });
  if (!reduced) { tilt.trx = -2; tilt.try = 4; wake(); setTimeout(() => { tilt.trx = tilt.try = 0; wake(); }, 900); }   // a small hello tilt
}
