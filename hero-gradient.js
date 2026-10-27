/*
 * HERO GRADIENT — a flowing purple "heat map" that spreads across the whole hero background.
 *
 * One full-size WebGL canvas behind the page (position: fixed when `fixed: true`, so it colours the WHOLE website). A warped noise field is mapped through a purple palette (deep orchid → orchid →
 * lilac → pale), with thin contour lines and fine flecks, drifting slowly like liquid.
 *   • It SPREADS outward from the word "alive." until the whole background is covered, then keeps flowing, and can spread
 *     back in again. Use setOpen(true/false) or toggle(); set `spreadOnLoad: true` to open it automatically.
 *   • Moving the cursor stirs it: the field warps and ripples around the pointer and deepens to orchid where it passes.
 *   • Mostly pale, so the black headline, paragraph and buttons stay perfectly readable.
 * Falls back to the plain ivory page if WebGL is unavailable; with reduced motion it is a still, fully-spread frame.
 *
 *   import { createHeroGradient } from './hero-gradient.js';
 *   const bg = createHeroGradient(stageEl, { origin: () => centreOfAlive() });
 *   bg.set({ flowSpeed: 0.6 });   bg.replay();   bg.destroy();
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const GRADIENT_CONFIG = {
  // — spreading —
  fixed: false,              // true = cover the whole browser window (whole website); false = cover just the element you pass
  spreadOnLoad: false,       // true = the gradient bleeds out from "alive." when the page loads; false = wait for setOpen()/toggle()
  spreadDuration: 2.8,       // seconds for it to cover the whole hero
  spreadDelay: 0.25,         // seconds to wait before it starts

  // — idle flow —
  flowSpeed: 1.0,            // how fast the colours drift (0.5 = calm, 2 = lively)
  warp: 1.0,                 // how swirly / liquid the field is
  scale: 1.0,                // size of the colour patches (bigger = larger, slower shapes)
  paleness: 0.78,            // 0 = lots of deep orchid, 1 = almost white. Keep ≥ 0.5 for comfortable text contrast
  bands: 7,                  // thin contour lines (0 = none)
  speckle: 0.45,             // fine flecks (0 = none)

  // — cursor —
  stir: 1.0,                 // how strongly the pointer disturbs and deepens the colours (0 = ignores the cursor)
  stirRadius: 0.30,          // reach of the disturbance, as a fraction of the hero height

  // — rendering —
  renderScale: 0.7,          // internal resolution (1 = full). Lower is cheaper; the gradient is soft so 0.5–0.8 looks identical
  fadeTop: 90,               // px: the top of the hero fades into the ivory navigation bar

  // palette, deep → pale. Keep the page ivory (#F7F3EF) and the last stops very light.
  palette: ['#8E66B8', '#AD86CF', '#C6A4E3', '#DEC8F1', '#F0E6F8', '#FAF6FD'],
  ivory: '#F7F3EF',
  origin: null,              // () => ({ x, y }) in hero pixels; where the spread starts (default: the hero centre)
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  u_res, u_origin, u_mouse;
uniform float u_time, u_reveal, u_energy, u_stirR, u_flow, u_warp, u_scale, u_pale, u_bands, u_speckle, u_fadeTop;
uniform vec3  u_pal[6];
uniform vec3  u_ivory;

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
  vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);          // y down, device px
  vec2 q = px / u_res.y * 2.6 / u_scale;
  float t = u_time * 0.10 * u_flow;

  // cursor stir
  float d = length(px - u_mouse) / (u_stirR * u_res.y);
  float f = (1.0 - smoothstep(0.0, 1.0, d)) * u_energy;

  // liquid domain warp (harder near the pointer)
  vec2 w = vec2(fbm(q * 0.8 + vec2(0.0, t)), fbm(q * 0.8 + vec2(5.2, 1.3) - vec2(t, 0.0)));
  q += (w - 0.5) * (1.5 * u_warp + 1.2 * f);
  float n = fbm(q + vec2(t * 0.8, -t * 0.5));                         // ~0.2 … 0.8
  float v = smoothstep(0.26, 0.74, n);

  // mostly pale, with deeper orchid islands where the field dips
  float vv = mix(0.12, 1.0, pow(v, 0.9 + (1.0 - u_pale) * 0.0));
  vv = mix(vv, 0.5 + 0.5 * vv, u_pale);                               // lift towards pale
  vv -= f * 0.38 * (0.6 + 0.4 * sin(d * 16.0 - u_time * 4.0));        // pointer deepens the colour, with a ripple

  // spreading front: noisy, so it bleeds like liquid instead of a clean circle
  float dn = length(px - u_origin) / length(u_res);
  float edgeN = (fbm(q * 0.9 + 3.0) - 0.5) * 0.34;
  float front = u_reveal * 1.45;
  float cov = 1.0 - smoothstep(front - 0.20, front, dn + edgeN);
  float rim = exp(-pow((dn + edgeN - front + 0.07) * 14.0, 2.0)) * step(0.001, u_reveal) * (1.0 - step(0.999, u_reveal));
  vv -= rim * 0.35;                                                    // the leading edge runs deeper, like the burst in the ad

  vec3 col = palette(vv);

  // thin contour lines
  if (u_bands > 0.5) {
    float b = fract(vv * u_bands + t * 0.5);
    float line = smoothstep(0.0, 0.05, b) * (1.0 - smoothstep(0.05, 0.11, b));
    col = mix(col, u_pal[5], line * 0.55);
  }
  // fine flecks: little orchid dots in the pale areas, bright ones in the deep areas
  float s = step(0.80, noise(q * 24.0 + t));
  col = mix(col, u_pal[1], s * smoothstep(0.45, 0.9, vv) * u_speckle * 0.6);
  col = mix(col, u_pal[5], s * (1.0 - smoothstep(0.2, 0.6, vv)) * u_speckle);

  // blend with the ivory page where the gradient hasn't reached yet, and fade into the nav bar at the very top
  float a = cov * smoothstep(0.0, max(1.0, u_fadeTop), px.y);
  gl_FragColor = vec4(mix(u_ivory, col, a), 1.0);
}`;

const NOOP = { open: false, set() {}, setOpen() {}, toggle() {}, replay() {}, destroy() {} };

export function createHeroGradient(stage, options = {}) {
  const cfg = { ...GRADIENT_CONFIG, ...options };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-bg';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return NOOP;                                                 // plain ivory page

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('hero gradient disabled:', e.message); return NOOP; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['u_res', 'u_origin', 'u_mouse', 'u_time', 'u_reveal', 'u_energy', 'u_stirR', 'u_flow', 'u_warp', 'u_scale', 'u_pale', 'u_bands', 'u_speckle', 'u_fadeTop', 'u_pal[0]', 'u_ivory']) U[n] = gl.getUniformLocation(prog, n);

  // `fixed` = cover the whole browser window (the whole website). Otherwise cover just `stage`.
  if (cfg.fixed) {
    document.body.prepend(canvas);
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none', display: 'none' });
  } else {
    stage.prepend(canvas);
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '-2', pointerEvents: 'none', display: 'none' });
  }

  let W = 1, H = 1, k = 1;
  let mouse = { x: -9999, y: -9999 }, prev = null, energy = 0, energyTarget = 0;
  let raf = 0, last = 0, time = 0, visible = true, running = true;
  let open = false, progress = 0, wait = 0;                              // progress 0 = ivory page, 1 = fully purple

  // the canvas's top-left corner in viewport coordinates, so pointer / origin positions can be converted
  const box = () => (cfg.fixed ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : stage.getBoundingClientRect());

  function resize() {
    const r = box();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    k = clamp(cfg.renderScale, 0.3, 1) * Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (progress > 0) draw();
  }

  // where the spread starts, in canvas pixels (default: the middle)
  const originPx = () => {
    if (typeof cfg.origin === 'function') { const o = cfg.origin(); if (o) { const r = box(); return cfg.fixed ? { x: o.x - r.left, y: o.y - r.top } : o; } }
    return { x: W / 2, y: H / 2 };
  };

  function draw() {
    const o = originPx();
    const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform2f(U.u_origin, o.x * k, o.y * k);
    gl.uniform2f(U.u_mouse, mouse.x * k, mouse.y * k);
    gl.uniform1f(U.u_time, reduced ? 6.0 : time);
    gl.uniform1f(U.u_reveal, ease(progress));
    gl.uniform1f(U.u_energy, energy * cfg.stir);
    gl.uniform1f(U.u_stirR, cfg.stirRadius);
    gl.uniform1f(U.u_flow, cfg.flowSpeed);
    gl.uniform1f(U.u_warp, cfg.warp);
    gl.uniform1f(U.u_scale, cfg.scale);
    gl.uniform1f(U.u_pale, cfg.paleness);
    gl.uniform1f(U.u_bands, cfg.bands);
    gl.uniform1f(U.u_speckle, cfg.speckle);
    gl.uniform1f(U.u_fadeTop, cfg.fadeTop * k);
    gl.uniform3fv(U['u_pal[0]'], new Float32Array(cfg.palette.flatMap(hexToRgb)));
    gl.uniform3fv(U.u_ivory, new Float32Array(hexToRgb(cfg.ivory)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    time += dt;
    // spread out / back in
    if (wait > 0) wait -= dt;
    else {
      const step = cfg.spreadDuration > 0 && !reduced ? dt / cfg.spreadDuration : 1;
      progress = clamp(progress + (open ? step : -step), 0, 1);
    }
    energy += (energyTarget - energy) * (1 - Math.exp(-dt * (energyTarget > energy ? 7 : 1.3)));
    energyTarget *= Math.exp(-dt * 2.2);                                // stirring fades unless the pointer keeps moving
    if (progress > 0) { canvas.style.display = 'block'; draw(); } else canvas.style.display = 'none';
    // keep animating while it is open or still moving; sleep completely when it is closed (no GPU use)
    const busy = open || progress > 0;
    raf = running && visible && busy && !(reduced && progress === (open ? 1 : 0)) ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf && running) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  function onMove(e) {
    if (e.pointerType === 'touch' || progress === 0) return;
    const r = box();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const speed = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    prev = { x, y }; mouse = { x, y };
    energyTarget = clamp(Math.max(energyTarget, 0.25 + speed / 45), 0, 1);
    wake();
  }
  const onLeave = () => { prev = null; mouse = { x: -9999, y: -9999 }; };

  const ro = new ResizeObserver(resize); ro.observe(cfg.fixed ? document.documentElement : stage);
  const io = cfg.fixed ? null : new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); });
  io?.observe(stage);
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  resize();

  const api = {
    config: cfg,
    get open() { return open; },
    set(next) { Object.assign(cfg, next); if (progress > 0) draw(); },
    setOpen(v) {                                                        // true = spread across the page, false = spread back in
      open = !!v; wait = 0; wake();
    },
    toggle() { api.setOpen(!open); return open; },
    replay() { progress = 0; open = true; wait = cfg.spreadDelay; wake(); },
    destroy() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io?.disconnect();
      removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.remove();
    },
  };
  if (cfg.spreadOnLoad) { open = true; wait = cfg.spreadDelay; wake(); }
  return api;
}
