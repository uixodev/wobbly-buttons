// Featured projects: a tiny black ink drop sits in the middle of each project area. As you scroll it spreads irregularly, like thick liquid,
// and uncovers the cover behind it (a lagging black rim follows the edge). When it finishes the edge overshoots and wobbles on springs
// before settling exactly into the card's own imperfect shape. Static with prefers-reduced-motion / without JS.

const figs = [...document.querySelectorAll('.project .blob[data-shape]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg', N = 44;

if (figs.length && reduced) figs.forEach((f) => { f.classList.add('revealed', 'static'); f.style.setProperty('--clip', `url(#${f.dataset.shape})`); f.querySelectorAll('.ink-layer.drop').forEach((d) => d.remove()); });
else if (figs.length) {
  const defs = document.querySelector('svg defs');
  // sample the card's own outline into N radii (from the centre) so the reveal ends exactly in that shape
  function outline(id) {
    const src = document.querySelector(`#${id} path`), len = src.getTotalLength(), ptsN = 900, pts = [];
    // the clip paths are in objectBoundingBox units (0..1)
    for (let i = 0; i < ptsN; i++) { const p = src.getPointAtLength((i / ptsN) * len); pts.push([Math.atan2(p.y - 0.5, p.x - 0.5), Math.hypot(p.x - 0.5, p.y - 0.5)]); }
    return Array.from({ length: N }, (_, k) => {
      const a = (k / N) * Math.PI * 2 - Math.PI; let best = 9, r = 0.4;
      for (const [pa, pr] of pts) { let d = Math.abs(pa - a); if (d > Math.PI) d = Math.PI * 2 - d; if (d < best) { best = d; r = pr; } }
      return r;
    });
  }
  const mk = (id) => { const cp = document.createElementNS(NS, 'clipPath'); cp.setAttribute('id', id); cp.setAttribute('clipPathUnits', 'objectBoundingBox'); const p = document.createElementNS(NS, 'path'); cp.append(p); defs.append(cp); return p; };
  const toPath = (r, k) => {
    const P = r.map((v, i) => { const a = (i / N) * Math.PI * 2 - Math.PI; return [0.5 + Math.cos(a) * v * k, 0.5 + Math.sin(a) * v * k]; });
    let d = `M${P[0][0].toFixed(4)} ${P[0][1].toFixed(4)}`;
    for (let i = 0; i < N; i++) {
      const p0 = P[(i + N - 1) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(4)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(4)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(4)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(4)} ${p2[0].toFixed(4)} ${p2[1].toFixed(4)}`;
    }
    return d + 'Z';
  };
  const ease = (t) => 1 - Math.pow(1 - t, 1.7);
  const items = figs.map((fig, n) => {
    const final = outline(fig.dataset.shape), seed = n * 7.3 + 1;
    const dropP = mk(`ink-drop-${n}`), coverP = mk(`ink-cover-${n}`);
    const drop = fig.querySelector('.ink-layer.drop'), cover = fig.querySelector('.ink-layer.cover');
    drop.style.clipPath = `url(#ink-drop-${n})`; cover.style.clipPath = `url(#ink-cover-${n})`;
    const noise = Array.from({ length: N }, (_, i) => 0.5 + 0.5 * Math.sin(i * 1.9 + seed) * Math.cos(i * 0.7 + seed * 2));   // 0..1, differs round the edge
    return { fig, final, noise, dropP, coverP, drop, cover, rD: final.map(() => 0.02), vD: final.map(() => 0), rC: final.map(() => 0.0), vC: final.map(() => 0), p: 0, done: false, settled: false, kicked: false };
  });
  let raf = 0, last = 0, time = 0;
  const target = (it, p, lag) => {
    const f = ease(Math.max(0, Math.min(1, (p - lag) / (1 - lag))));
    return it.final.map((R, i) => {
      const irregular = 1 + (1 - f) * 0.55 * (it.noise[i] - 0.45) + (1 - f) * 0.08 * Math.sin(time * 1.6 + i * 1.3);   // fingers of ink run ahead in some directions
      return p <= 0.001 ? 0.02 : Math.max(0.012, R * (0.035 + 0.965 * f) * irregular);
    });
  };
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    let busy = false;
    for (const it of items) {
      const r = it.fig.getBoundingClientRect(), vh = innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.96 - r.top) / (vh * 0.7)));
      it.p = p;
      const tD = target(it, p, 0), tC = target(it, p, 0.22);
      if (p >= 1 && !it.kicked) {            // the moment it finishes: shove the edge so the corners wobble
        it.kicked = true; it.vD = it.vD.map((v, i) => v + (it.final[i] > 0.52 ? 0.7 : 0.35) * (it.noise[i] - 0.5) * 3);
        it.vC = it.vC.map((v, i) => v + (it.final[i] > 0.52 ? 0.55 : 0.25) * (it.noise[i] - 0.5) * 3);
      } else if (p < 0.98) it.kicked = false;
      it.settled = false;
      for (const [r, v, t, k, c] of [[it.rD, it.vD, tD, 70, 6.5], [it.rC, it.vC, tC, 70, 6.5]]) {
        for (let i = 0; i < N; i++) { v[i] += (k * (t[i] - r[i]) - c * v[i]) * dt; r[i] += v[i] * dt; if (r[i] < 0.008) r[i] = 0.008; if (Math.abs(v[i]) > 0.002 || Math.abs(t[i] - r[i]) > 0.002) busy = true; }
      }
      const done = p >= 1 && !busy;
      if (done && !it.fig.classList.contains('revealed')) {                // settled: hand over to the card's own exact shape
        it.fig.classList.add('revealed'); it.drop.style.clipPath = 'none'; it.cover.style.clipPath = `url(#${it.fig.dataset.shape})`;
      } else if (!done && it.fig.classList.contains('revealed')) {
        it.fig.classList.remove('revealed'); it.drop.style.clipPath = `url(#ink-drop-${items.indexOf(it)})`; it.cover.style.clipPath = `url(#ink-cover-${items.indexOf(it)})`;
      }
      if (!it.fig.classList.contains('revealed')) { it.dropP.setAttribute('d', toPath(it.rD, 1)); it.coverP.setAttribute('d', toPath(it.rC, 1)); }
    }
    raf = requestAnimationFrame(frame);
  }
  // only run while a project is near the viewport
  const vis = new Set();
  const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))); if (vis.size && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } else if (!vis.size && raf) { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: '200px 0px' });
  figs.forEach((f) => io.observe(f));
  items.forEach((it, n) => { it.dropP.setAttribute('d', toPath(it.rD, 1)); it.coverP.setAttribute('d', toPath(it.rC, 1)); });
}
