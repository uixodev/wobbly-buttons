// Hero: a procedural glass flower in front of a giant serif headline. The headline (plus the thin curved line)
// is painted into the scene background, so the glass genuinely refracts and bends it. Scrolling the tall hero
// turns the flower from face-on into its side profile and spins it; motion is damped so it feels heavy and glassy.
import * as THREE from 'three';
import { buildFlower, bloomBounds, exportGLB } from './glass-flower.js';

const IVORY = '#F7F3EF';
const INK = '#111111';
const ORCHID = '#AD86CF';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const hero = document.querySelector('.hero');
const canvas = document.querySelector('.hero-canvas');
if (hero && canvas) start();

// A small photo-studio for the glass to reflect: warm ivory walls, bright strip lights and black flags.
// The dark flags are what give the glass its crisp dark edges (a uniformly bright room makes it look milky).
function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#948d85'), side: THREE.BackSide }));
  env.add(room);
  const panel = (w, h, color, x, y, z, ry = 0, rx = 0, power = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  panel(14, 2.2, '#ffffff', 0, 7.2, 0, 0, Math.PI / 2, 14);          // long overhead strip
  panel(2.4, 12, '#fff6ea', -9, 1, 4, Math.PI / 2.4, 0, 9);          // tall warm softbox, left
  panel(2.0, 10, '#ffffff', 9.5, 0, -3, -Math.PI / 2.2, 0, 8);       // tall softbox, right
  panel(7, 9, '#1a1816', 0, 1, 11.5, Math.PI, 0, 1);                 // dark flag behind the camera
  panel(5, 12, '#0b0a0a', -11, 0, -5, Math.PI / 2, 0, 1);            // black flags at the sides
  panel(4, 11, '#0b0a0a', 11, 0, 5, -Math.PI / 2, 0, 1);
  panel(12, 3, '#ffffff', 0, -6.5, 0, 0, Math.PI / 2, 4);            // soft bounce from below
  panel(3.2, 12, '#AD86CF', 6, 2, 9, -Math.PI / 3, 0, 9);
  panel(3.2, 12, '#AD86CF', -6, 1, 8, Math.PI / 3, 0, 6);             // orchid strip: the soft purple in the reflections
  panel(1.6, 9, '#D0C8C0', -7, 0, -8, Math.PI / 3, 0, 4);            // warm neutral strip
  return env;
}

async function start() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { hero.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;       // keeps the ivory exactly #F7F3EF

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;
  scene.environmentIntensity = 1.0;

  const FOV = 28;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  // ---- clear glass with a faint orchid tint
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff').lerp(new THREE.Color(ORCHID), 0.05),
    roughness: 0.03,
    transmission: 1,
    thickness: 1.1,
    ior: 1.55,
    dispersion: 0.3,
    attenuationColor: new THREE.Color(ORCHID),
    attenuationDistance: 8,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.0,
  });

  const flower = buildFlower(glass);
  flower.position.sub(bloomBounds(flower).getCenter(new THREE.Vector3()));   // rotate around the bloom, not the stem
  const pivot = new THREE.Group();
  pivot.add(flower);
  scene.add(pivot);
  window.exportFlowerGLB = () => exportGLB(flower);              // console helper: exportFlowerGLB()

  // two small drifting droplets
  const droplets = [[0.31, 0.47, 0.20], [0.91, 0.80, 0.17]].map(([fx, fy, r], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), glass.clone());
    m.material.thickness = 0.25;
    m.scale.set(r, r * 0.72, r * 0.8);
    m.userData = { fx, fy, phase: i * 2.3 };
    scene.add(m);
    return m;
  });

  // ---- backdrop painted in 2D (screen-aligned), so refraction bends the type
  const backdrop = new THREE.CanvasTexture(document.createElement('canvas'));
  backdrop.colorSpace = THREE.SRGBColorSpace;
  scene.background = backdrop;
  let layout = { W: 1, H: 1, aspect: 1, visW: 1, visH: 1 };

  function paintBackdrop() {
    const dpr = renderer.getPixelRatio();
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const c = backdrop.image;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = IVORY; g.fillRect(0, 0, W, H);

    // thin hand-drawn line sweeping through the composition, with two dots
    g.strokeStyle = INK; g.lineWidth = Math.max(1, W / 1500); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-10, H * 0.27);
    g.bezierCurveTo(W * 0.14, H * 0.22, W * 0.2, H * 0.28, W * 0.26, H * 0.38);
    g.bezierCurveTo(W * 0.33, H * 0.5, W * 0.36, H * 0.6, W * 0.5, H * 0.58);
    g.bezierCurveTo(W * 0.66, H * 0.56, W * 0.76, H * 0.7, W * 0.92, H * 0.55);
    g.bezierCurveTo(W * 0.96, H * 0.52, W * 0.99, H * 0.5, W + 10, H * 0.5);
    g.stroke();
    g.fillStyle = INK;
    for (const [x, y] of [[0.05, 0.225], [0.925, 0.585]]) { g.beginPath(); g.arc(W * x, H * y, Math.max(2, W / 600), 0, 7); g.fill(); }

    // headline: BEAUTIFUL across the top, IDEAS lower right
    const narrow = W < 800;
    const family = '"Bodoni Moda", "Playfair Display", Didot, serif';
    g.fillStyle = INK; g.textBaseline = 'alphabetic';
    g.font = `600 100px ${family}`;
    const targetW = W * (narrow ? 0.92 : 0.86);
    const size = 100 * targetW / g.measureText('BEAUTIFUL').width;
    g.font = `600 ${size}px ${family}`;
    const capH = size * 0.7;
    const x1 = narrow ? W * 0.04 : W * 0.125;
    const y1 = narrow ? H * 0.2 + capH : H * 0.12 + capH;
    g.fillText('BEAUTIFUL', x1, y1);
    const w2 = g.measureText('IDEAS').width;
    const x2 = narrow ? W * 0.96 - w2 : W * 0.34;
    const y2 = narrow ? y1 + capH * 1.12 : H * 0.97;
    g.fillText('IDEAS', x2, y2);
    backdrop.needsUpdate = true;
  }

  function resize() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    const aspect = W / H;
    camera.aspect = aspect;
    // world height visible at z=0: wide screens frame the flower by height, narrow ones by width
    const visH = Math.max(4.4, 3.7 / aspect);
    camera.position.set(0, 0, (visH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.updateProjectionMatrix();
    layout = { W, H, aspect, visW: visH * aspect, visH };
    paintBackdrop();
  }
  new ResizeObserver(resize).observe(canvas);
  if (document.fonts?.load) {
    await Promise.race([Promise.all([document.fonts.load('600 100px "Bodoni Moda"'), document.fonts.ready]), new Promise((r) => setTimeout(r, 2500))]);
  }
  resize();
  hero.classList.add('is-loaded');

  // ---- scroll → pose
  const state = { p: 0, rx: 0.95, ry: 0.4, s: 1.08, y: 0 };
  const view = { ...state };
  const ease = (t) => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;
  function target() {
    const r = hero.getBoundingClientRect();
    const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
    const span = Math.max(1, r.height - (innerHeight - navH));
    const p = Math.min(1, Math.max(0, -r.top / span));
    state.p = p;
    // face-on (looking into the petals) → side profile → lifted three-quarter view
    const a = ease(Math.min(1, p / 0.55)), b = ease(Math.max(0, (p - 0.55) / 0.45));
    state.rx = mix(mix(0.95, 0.04, a), 0.4, b);
    state.ry = 0.4 + p * Math.PI * 2.1;
    state.s = mix(1.08, 0.94, ease(p));
    state.y = mix(0, 0.15, ease(p));
  }
  addEventListener('scroll', target, { passive: true });
  target();

  const clock = new THREE.Clock();
  let t = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
    for (const key of ['rx', 'ry', 's', 'y']) view[key] += (state[key] - view[key]) * k;
    const idle = reduced ? 0 : Math.sin(t * 0.55) * 0.035;
    pivot.rotation.set(view.rx + idle, view.ry + (reduced ? 0 : t * 0.06), 0, 'YXZ');
    const { visW, visH, aspect } = layout;
    pivot.scale.setScalar(view.s * (aspect > 1.1 ? 1 : 0.85));
    // sit right of centre on wide screens, centred on phones
    pivot.position.set(aspect > 1.1 ? visW * 0.13 : 0, view.y + (aspect > 1.1 ? 0 : visH * 0.09), 0);
    droplets.forEach((d) => {
      const { fx, fy, phase } = d.userData;
      d.position.set((fx - 0.5) * visW, (0.5 - fy) * visH + Math.sin(t * 0.8 + phase) * 0.06 + state.p * (fx < 0.5 ? 0.5 : -0.4), 0.2);
      d.rotation.set(t * 0.2 + phase, t * 0.15, 0);
    });
    hero.style.setProperty('--hero-p', state.p.toFixed(3));
    renderer.render(scene, camera);
  });
}
