/*
 * ALIVE BLOB — the living Orchid shape behind the word "alive."
 *
 * Two layers work together:
 *   1. THE OUTLINE (spring physics). ~24 points, each with a resting position, a current position, a velocity and a
 *      spring. Resting positions drift slowly and never exactly repeat (several incommensurate sine waves per point) =
 *      the idle breathing. The cursor adds a smooth, distance-based pull to the NEARBY points only; neighbouring points
 *      drag on each other like a membrane, so a local tug spreads softly. On release, springs + damping bring the
 *      outline home with a gentle wobble. The outline itself deforms; nothing is just scaled, rotated or translated.
 *   2. THE FILL (WebGL fragment shader). The outline is used as a mask. Inside it, a warped noise field is mapped through a
 *      purple "heat map" palette (deep orchid → orchid → lilac → pale), with thin contour lines and tiny speckled
 *      highlights, flowing slowly like liquid. When the cursor approaches (and once when the page loads) the field
 *      "ignites": it warps harder, ripples outward from the cursor and runs hotter, then settles back into the calm flow.
 *   If WebGL is unavailable the outline is simply filled with flat Orchid.
 *
 *   import { createAliveBlob } from './alive-blob.js';
 *   const blob = createAliveBlob(document.querySelector('.hl'), { cursorStrength: 0.7 });
 *   blob.set({ damping: 4 });   blob.destroy();
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — adjust the personality of the shape here
// ─────────────────────────────────────────────────────────────────────────────
export const ALIVE_CONFIG = {
  color: '#AD86CF',          // Orchid: the flat fallback colour, and the heart of the gradient

  // — shape —
  points: 24,                // outline resolution
  irregularity: 0.10,        // how uneven the silhouette is (0 = smooth oval, 0.2 = very lumpy)
  seed: 11,                  // changes the unique lumps
  overhangX: 0.16,           // how far the shape extends beyond the word, left/right (× text height)
  overhangY: 0.05,           // … and top/bottom

  // — idle breathing —
  idleAmount: 1.0,           // size of the slow swelling and edge movement (0 = still)
  idleSpeed: 1.0,            // how fast it drifts (0.5 = sleepy, 2 = restless)

  // — cursor (shape) —
  cursorRadius: 1.45,        // how close the cursor must come, in text heights, before the ink notices it
  cursorStrength: 0.6,       // how far the nearby edge reaches towards the cursor (0–1). Negative = pushes away
  cursorWake: 0.22,          // extra shove from the cursor's own speed (0 = none)

  // — softness / wobble (spring physics) —
  springStrength: 52,        // how firmly points return to rest (higher = tighter, snappier)
  damping: 5.0,              // how quickly wobble dies down (lower = jellier, more wobble)
  membrane: 20,              // how strongly neighbouring points pull on each other (higher = smoother, more spread)

  // — gradient fill (shader) —
  gradient: true,            // false = flat Orchid
  flowSpeed: 1.0,            // how fast the colours drift
  warp: 1.0,                 // how liquid / swirly the colour field is
  bands: 6,                  // number of thin contour lines in the heat map (0 = none)
  speckle: 0.55,             // tiny bright flecks (0 = none)
  heat: 1.0,                 // how strongly the colours flare when the cursor approaches
  igniteOnLoad: true,        // the first moment: a burst of heat that settles into the calm flow
  // palette, from cool/deep to hot/pale. Keep the first stops dark enough for the black headline to stay readable.
  palette: ['#8E66B8', '#AD86CF', '#C6A4E3', '#DEC8F1', '#F1E7F8', '#FBF7FE'],
};

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const falloff = (s) => { s = clamp(s, 0, 1); return 1 - s * s * (3 - 2 * s); };   // 1 at the cursor → 0 at its reach, no hard boundary
function rng(seed) { let s = (seed * 2654435761) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ─────────────────────────────────────────────────────────────────────────────
// the fill shader
// ─────────────────────────────────────────────────────────────────────────────
const VERT = `
attribute vec2 a_pos; varying vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_mask;
uniform vec2  u_res;        // canvas size in device px
uniform vec2  u_mouse;      // cursor in canvas px (y down)
uniform float u_time, u_energy, u_reach, u_flow, u_warp, u_bands, u_speckle, u_heat;
uniform vec3  u_pal[6];

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }

vec3 palette(float v){
  v = clamp(v, 0.0, 1.0) * 5.0;
  vec3 c = u_pal[0];
  c = mix(c, u_pal[1], smoothstep(0.0, 1.0, v));
  c = mix(c, u_pal[2], smoothstep(1.0, 2.0, v));
  c = mix(c, u_pal[3], smoothstep(2.0, 3.0, v));
  c = mix(c, u_pal[4], smoothstep(3.0, 4.0, v));
  c = mix(c, u_pal[5], smoothstep(4.0, 5.0, v));
  return c;
}

void main(){
  float a = texture2D(u_mask, v_uv).a;
  if (a < 0.003) { gl_FragColor = vec4(0.0); return; }

  vec2 px = vec2(v_uv.x, 1.0 - v_uv.y) * u_res;
  vec2 q = px / u_res.y * 2.4;                         // field coordinates, independent of resolution
  float t = u_time * 0.11 * u_flow;

  // cursor: a soft falloff around it, scaled by how "excited" the shape currently is
  float d = length(px - u_mouse) / u_reach;
  float f = (1.0 - smoothstep(0.0, 1.0, d)) * u_energy;

  // liquid domain warp: the harder the shape is excited, the more the field swirls
  vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - vec2(t, 0.0)));
  q += (w - 0.5) * (1.1 * u_warp + 1.6 * u_energy);
  float v = fbm(q * 1.15 + vec2(t * 0.8, -t * 0.55));          // roughly 0.2 … 0.8
  v = smoothstep(0.22, 0.78, v) * 0.72;                         // mostly cool/orchid by default

  // heat from the cursor + load burst, with a ripple travelling outward from the cursor
  v += (0.30 * f + 0.10 * u_energy * (1.0 - f)) * u_heat;
  v += 0.07 * sin(d * 14.0 - u_time * 4.5) * f * u_heat;

  // rim light: estimate how close to the edge we are with a few mask taps
  float r = 7.0 / u_res.y;
  float edge = 1.0 - 0.25 * (texture2D(u_mask, v_uv + vec2(r, 0.0)).a + texture2D(u_mask, v_uv - vec2(r, 0.0)).a
                           + texture2D(u_mask, v_uv + vec2(0.0, r)).a + texture2D(u_mask, v_uv - vec2(0.0, r)).a);
  v += edge * 0.18;

  vec3 col = palette(v);

  // thin contour lines of the heat map
  if (u_bands > 0.5) {
    float b = fract(v * u_bands + t * 0.6);
    float line = smoothstep(0.0, 0.05, b) * (1.0 - smoothstep(0.05, 0.12, b));
    col = mix(col, u_pal[4], line * 0.32);
  }
  // tiny bright flecks, only in the warmer parts
  float sp = step(0.80, noise(q * 26.0 + t)) * smoothstep(0.35, 0.8, v);
  col = mix(col, u_pal[5], sp * u_speckle);

  gl_FragColor = vec4(col * a, a);
}`;

export function createAliveBlob(host, options = {}) {
  const cfg = { ...ALIVE_CONFIG, ...options };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // SVG layer: draws the flat-colour fallback, and always holds the current outline path
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'alive-blob');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', cfg.color);
  svg.appendChild(path);
  host.prepend(svg);
  host.classList.add('has-blob');

  let w = 1, h = 1;                       // host size (px)
  let pts = [], traits = [];
  let cursor = null, prev = null, vel = { x: 0, y: 0 };
  let raf = 0, last = 0, time = 0, running = true, visible = true, ready = false;
  let energy = cfg.igniteOnLoad && !reduced ? 1 : 0, energyTarget = 0;

  // ── WebGL fill ──
  let gl = null, glCanvas = null, maskCanvas = null, mctx = null, loc = {}, tex = null, M = 0, scale = 1, cssW = 1, cssH = 1;
  if (cfg.gradient) initGL();

  function initGL() {
    try {
      glCanvas = document.createElement('canvas');
      glCanvas.className = 'alive-blob-gl';
      gl = glCanvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
      if (!gl) throw new Error('no webgl');
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['u_mask', 'u_res', 'u_mouse', 'u_time', 'u_energy', 'u_reach', 'u_flow', 'u_warp', 'u_bands', 'u_speckle', 'u_heat', 'u_pal[0]']) loc[n] = gl.getUniformLocation(prog, n);
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
      gl.uniform1i(loc.u_mask, 0);
      maskCanvas = document.createElement('canvas'); mctx = maskCanvas.getContext('2d');
      glCanvas.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;';
      host.prepend(glCanvas);
      svg.style.visibility = 'hidden';                                  // the shader draws the fill; the SVG just carries the path
      glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); teardownGL(); });
    } catch (err) { teardownGL(); }
  }
  function teardownGL() { glCanvas?.remove(); gl = glCanvas = null; svg.style.visibility = 'visible'; }

  // ── per-point personality (seeded, so the shape is always "the same creature") ──
  function buildTraits() {
    const rand = rng(cfg.seed);
    traits = Array.from({ length: cfg.points }, () => ({
      lump: 1 + (rand() - 0.5) * 2 * cfg.irregularity,
      f: [0.21 + rand() * 0.17, 0.47 + rand() * 0.23, 0.93 + rand() * 0.4],     // three incommensurate rhythms → never visibly loops
      p: [rand() * TAU, rand() * TAU, rand() * TAU],
      a: [0.05 + rand() * 0.02, 0.032 + rand() * 0.014, 0.014 + rand() * 0.008],
    }));
    traits.lobes = [rand() * TAU, rand() * TAU];
    pts = traits.map(() => ({ rx: 0, ry: 0, x: 0, y: 0, vx: 0, vy: 0 }));
  }

  // ── where each point wants to be right now (the breathing outline) ──
  function rest(t) {
    const idle = reduced ? 0 : cfg.idleAmount, ts = t * cfg.idleSpeed;
    const cx = w / 2, cy = h * 0.6;
    const rxBase = w / 2 + cfg.overhangX * h, ryBase = h * 0.43 + cfg.overhangY * h;
    const breathe = 1 + idle * 0.03 * Math.sin(ts * 0.27 + 1.3) + idle * 0.015 * Math.sin(ts * 0.61);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU, tr = traits[i];
      let r = tr.lump * (1 + 0.07 * Math.sin(2 * th + traits.lobes[0]) + 0.05 * Math.sin(3 * th + traits.lobes[1])) * breathe;
      for (let k = 0; k < 3; k++) r += idle * tr.a[k] * Math.sin(ts * tr.f[k] * TAU * 0.5 + tr.p[k]);
      const c = Math.cos(th), s = Math.sin(th);
      const px = Math.sign(c) * Math.pow(Math.abs(c), 0.82), py = Math.sign(s) * Math.pow(Math.abs(s), 0.9);   // squarish oval: a paint swoosh, not an ellipse
      pts[i].rx = cx + rxBase * px * r;
      pts[i].ry = cy + ryBase * py * r;
    }
  }

  const rectDistance = (x, y) => Math.hypot(Math.max(-x, 0, x - w), Math.max(-y, 0, y - h));

  // ── physics ──
  function step(dt) {
    const reach = cfg.cursorRadius * h;
    // once the cursor is over the word itself the pull relaxes, so the shape can't collapse onto it
    const inside = cursor ? 0.3 + 0.7 * clamp(rectDistance(cursor.x, cursor.y) / (0.3 * h), 0, 1) : 1;
    const k = cfg.springStrength, c = cfg.damping, km = cfg.membrane, n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      let tx = p.rx, ty = p.ry;
      if (cursor) {
        const dx = cursor.x - p.rx, dy = cursor.y - p.ry, d = Math.hypot(dx, dy) || 1;
        const f = falloff(d / reach);
        if (f > 0) {
          const s = cfg.cursorStrength;
          const move = s >= 0 ? s * inside * f * d : -s * f * reach * 0.3;        // pull: a fraction of the way; push: a fixed gentle shove
          const dir = s >= 0 ? 1 : -1;
          tx += (dx / d) * move * dir; ty += (dy / d) * move * dir;
        }
      }
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      p.vx += (k * (tx - p.x) - c * p.vx + km * ((a.x + b.x) / 2 - p.x)) * dt;
      p.vy += (k * (ty - p.y) - c * p.vy + km * ((a.y + b.y) / 2 - p.y)) * dt;
    }
    for (const p of pts) { p.x += p.vx * dt; p.y += p.vy * dt; }
  }

  // ── drawing: closed Catmull-Rom → cubic Bézier, so the outline stays soft ──
  let d = '';
  function buildPath() {
    const n = pts.length;
    d = `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    d += 'Z';
    path.setAttribute('d', d);
  }

  function paintGL() {
    if (!gl) return;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.setTransform(scale, 0, 0, scale, M * scale, M * scale);
    mctx.fillStyle = '#fff';
    mctx.fill(new Path2D(d));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    const m = cursor || { x: -9999, y: -9999 };
    gl.uniform2f(loc.u_res, glCanvas.width, glCanvas.height);
    gl.uniform2f(loc.u_mouse, (m.x + M) * scale, (m.y + M) * scale);
    gl.uniform1f(loc.u_time, reduced ? 4.0 : time);
    gl.uniform1f(loc.u_energy, energy);
    gl.uniform1f(loc.u_reach, cfg.cursorRadius * h * scale);
    gl.uniform1f(loc.u_flow, cfg.flowSpeed);
    gl.uniform1f(loc.u_warp, cfg.warp);
    gl.uniform1f(loc.u_bands, cfg.bands);
    gl.uniform1f(loc.u_speckle, cfg.speckle);
    gl.uniform1f(loc.u_heat, cfg.heat);
    gl.uniform3fv(loc['u_pal[0]'], new Float32Array(cfg.palette.flatMap(hexToRgb)));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    time += dt;
    // excitement: rises quickly when the cursor is near, fades slowly (so the heat lingers, then settles)
    const rate = energyTarget > energy ? 6 : 1.4;
    energy += (energyTarget - energy) * (1 - Math.exp(-dt * rate));
    rest(time);
    if (reduced) for (const p of pts) { p.x = p.rx; p.y = p.ry; p.vx = p.vy = 0; }
    else { step(dt / 2); step(dt / 2); }
    buildPath();
    paintGL();
    raf = running && visible && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && running) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // ── layout: the SVG fills the word's box (overflow visible); the shader canvas is the same box plus a margin for stretching ──
  function measure() {
    const r = host.getBoundingClientRect();
    const nw = Math.max(1, r.width), nh = Math.max(1, r.height);
    const sx = nw / w, sy = nh / h;
    if (ready) for (const p of pts) { p.x *= sx; p.y *= sy; p.vx *= sx; p.vy *= sy; }
    w = nw; h = nh;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    if (gl) {
      M = Math.round(h * 1.1);
      cssW = w + 2 * M; cssH = h + 2 * M;
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
      for (const c of [glCanvas, maskCanvas]) { c.width = Math.round(cssW * scale); c.height = Math.round(cssH * scale); }
      Object.assign(glCanvas.style, { left: `${-M}px`, top: `${-M}px`, width: `${cssW}px`, height: `${cssH}px` });
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    }
    rest(time);
    if (reduced) { for (const p of pts) { p.x = p.rx; p.y = p.ry; } buildPath(); paintGL(); }
  }

  // ── input ──
  function onMove(e) {
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) * (w / (r.width || w)), y = (e.clientY - r.top) * (h / (r.height || h));
    let speed = 0;
    if (prev) { vel = { x: x - prev.x, y: y - prev.y }; speed = Math.hypot(vel.x, vel.y); }
    prev = { x, y }; cursor = { x, y };
    // excitement grows as the cursor closes in on the word, and a little more when it moves briskly
    const prox = falloff(rectDistance(x, y) / (cfg.cursorRadius * h * 1.4));
    energyTarget = clamp(prox * (0.75 + Math.min(speed / 40, 0.3)), 0, 1);
    if (cfg.cursorWake && !reduced) {
      const reach = cfg.cursorRadius * h;
      for (const p of pts) {
        const f = falloff(Math.hypot(p.x - x, p.y - y) / reach);
        if (f > 0) { p.vx += vel.x * f * cfg.cursorWake * 5; p.vy += vel.y * f * cfg.cursorWake * 5; }
      }
    }
    wake();
  }
  const onLeave = () => { cursor = null; prev = null; energyTarget = 0; wake(); };

  buildTraits();
  measure();
  for (const p of pts) { p.x = p.rx; p.y = p.ry; }                       // first frame is already a finished shape
  ready = true;
  buildPath(); paintGL();

  const ro = new ResizeObserver(measure); ro.observe(host);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }); io.observe(host);
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') onLeave(); });
  addEventListener('blur', onLeave);
  last = performance.now();
  wake();

  return {
    config: cfg,
    set(next) {
      const rebuild = ['points', 'irregularity', 'seed'].some((k) => k in next);
      Object.assign(cfg, next);
      path.setAttribute('fill', cfg.color);
      if (rebuild) { buildTraits(); measure(); for (const p of pts) { p.x = p.rx; p.y = p.ry; } }
    },
    ignite() { energy = 1; wake(); },                                    // replay the burst of heat
    destroy() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave);
      svg.remove(); glCanvas?.remove(); host.classList.remove('has-blob');
    },
  };
}
