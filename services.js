// Services: three miniature browser windows that demonstrate what each service is.
//   design      a wireframe transforms into a polished layout (loops while on screen; hover or tap flips it)
//   dev         a tiny preview assembles itself as the code is typed
//   ink         a black ink shape (springs on a closed curve) bends toward your cursor
// With prefers-reduced-motion everything shows its finished state and nothing loops.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wins = {};
document.querySelectorAll('.win[data-demo]').forEach((w) => { wins[w.dataset.demo] = w; });

// run a demo only while its window is on screen
function whenVisible(el, on, off) {
  new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off()), { threshold: 0.25 }).observe(el);
}

// ── 01 design ──
if (wins.design) {
  const svg = wins.design.querySelector('.demo-design');
  let timer = 0, held = false;
  const flip = () => svg.classList.toggle('polished');
  if (reduced) svg.classList.add('polished');
  else {
    whenVisible(wins.design, () => { if (!timer) { setTimeout(flip, 500); timer = setInterval(() => { if (!held) flip(); }, 3200); } }, () => { clearInterval(timer); timer = 0; });
    wins.design.addEventListener('pointerenter', () => { held = true; svg.classList.add('polished'); });
    wins.design.addEventListener('pointerleave', () => { held = false; });
  }
}

// ── 02 development ──
if (wins.dev) {
  const code = wins.dev.querySelector('.code'), parts = [...wins.dev.querySelectorAll('.pv > *')];
  const lines = [
    ['<header class="nav">', [0]],
    ['<h1>Hello, <em>Bristol</em>', [1]],
    ['<p>Thoughtful sites</p>', [2, 3]],
    ['<img src="blob.svg">', [4]],
    ['<a class="btn">Say hi</a>', [5]],
  ];
  if (reduced) { code.textContent = lines.map((l) => l[0]).join('\n'); parts.forEach((p) => p.classList.add('on')); }
  else {
    let run = 0, alive = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function play(id) {
      code.textContent = ''; parts.forEach((p) => p.classList.remove('on'));
      await wait(500);
      for (const [text, show] of lines) {
        const row = document.createElement('span'); row.className = 'c'; code.append(row);
        for (const ch of text) { if (id !== run) return; row.textContent += ch; await wait(26 + Math.random() * 30); }
        row.classList.remove('c'); code.append('\n');
        show.forEach((i) => parts[i].classList.add('on'));
        await wait(260);
      }
      await wait(3200);
      if (id === run && alive) play(id);
    }
    whenVisible(wins.dev, () => { alive = true; play(++run); }, () => { alive = false; run++; });
  }
}

// ── 03 ink ──
if (wins.ink) {
  const svg = wins.ink.querySelector('.demo-ink'), path = svg.querySelector('.ink');
  const N = 14, CX = 150, CY = 88, R = 34;
  const pts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2, r = R * (1 + 0.16 * Math.sin(i * 2.3) + 0.1 * Math.cos(i * 4.1));
    const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
    return { bx: x, by: y, x, y, vx: 0, vy: 0 };
  });
  const ptr = { x: 0, y: 0, in: false };
  svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); ptr.x = ((e.clientX - r.left) / r.width) * 300; ptr.y = ((e.clientY - r.top) / r.height) * 190; ptr.in = true; wake(); });
  svg.addEventListener('pointerleave', () => { ptr.in = false; });
  let raf = 0, last = 0, time = 0, visible = false;
  function draw() {
    let d = '';
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i + N - 1) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      if (!i) d += `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    path.setAttribute('d', d + 'Z');
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; time += dt;
    let moving = ptr.in;
    pts.forEach((p, i) => {
      let tx = p.bx + (reduced ? 0 : Math.sin(time * 1.1 + i * 1.3) * 1.6), ty = p.by + (reduced ? 0 : Math.cos(time * .9 + i * 1.7) * 1.6);
      if (ptr.in) {
        const dx = ptr.x - p.bx, dy = ptr.y - p.by, d = Math.hypot(dx, dy) || 1, pull = Math.max(0, 1 - d / 210);
        const reach = Math.min(d, 70) * Math.sqrt(pull) * 0.9;
        tx += (dx / d) * reach; ty += (dy / d) * reach;
      }
      p.vx += (150 * (tx - p.x) - 9 * p.vx) * dt; p.vy += (150 * (ty - p.y) - 9 * p.vy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) moving = true;
    });
    draw();
    raf = visible && (moving || !reduced) ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  whenVisible(wins.ink, () => { visible = true; wake(); }, () => { visible = false; });
  draw();
}
