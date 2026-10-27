// Procedural glass sculpture for three.js (no Blender, no external model).
//   Six overlapping petals  Petal_01 … Petal_06   swirling around one point: some rear up and curl toward the viewer,
//                                                  others sweep out sideways; no two are alike
//   A small glass centre    Centre_Pod + a few fine Stamens
// Everything is grouped under one "Flower" group (no stem, no leaves). Each petal is a closed, thick surface with a
// rounded glass lip, built from a parametric grid, so it keeps real thickness. The artistry lives in PETALS below.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Angles in degrees. Y is up; each petal is modelled along +X and fanned around the Y axis by `yaw`.
//   a0 / a1   angle above horizontal at the base / tip (90 = straight up). High a0 = rears up and curls toward the
//             viewer; low a0 = sweeps out sideways. a1 < a0 opens the petal outward.
//   curl      extra wave in that angle along the length (the blown-glass flick)
//   cup       how far the sides curl towards the centre      twist  twist along the length
//   skew      the tip drifts sideways, the same way for every petal, which is what makes the whole thing swirl
//   sway      a slower S-wobble of the same     asym  one side fuller than the other     wave  edge ripple
//   thick     glass thickness at the rim        r0, y0 where the petal starts, so petals overlap in layers
const PETALS = [
  { yaw: 0,   roll: 6,  length: 2.05, width: 0.65, a0: 28, a1: -8, curl: 10,  cup: 0.80, twist: 24, skew: 0.88, sway: 0.30, asym: 0.12,  wave: 0.040, thick: 0.070, r0: 0.08, y0: 0.00, ph: 0.4 },
  { yaw: 52,  roll: -5, length: 1.78, width: 0.59, a0: 72, a1: 38, curl: -14, cup: 1.10, twist: 33, skew: 0.66, sway: 0.20, asym: -0.14, wave: 0.032, thick: 0.064, r0: 0.07, y0: 0.10, ph: 1.9 },
  { yaw: 121, roll: 4,  length: 2.22, width: 0.71, a0: 40, a1: 4,  curl: 16,  cup: 0.70, twist: 28, skew: 1.04, sway: 0.35, asym: 0.09,  wave: 0.046, thick: 0.074, r0: 0.09, y0: 0.03, ph: 3.1 },
  { yaw: 176, roll: -7, length: 1.58, width: 0.54, a0: 66, a1: 50, curl: -10, cup: 1.25, twist: 37, skew: 0.55, sway: 0.15, asym: -0.11, wave: 0.028, thick: 0.058, r0: 0.07, y0: 0.15, ph: 4.2 },
  { yaw: 243, roll: 8,  length: 1.98, width: 0.65, a0: 34, a1: -4, curl: 12,  cup: 0.75, twist: 26, skew: 0.94, sway: 0.25, asym: 0.14,  wave: 0.042, thick: 0.068, r0: 0.08, y0: 0.06, ph: 5.0 },
  { yaw: 301, roll: -3, length: 1.85, width: 0.61, a0: 78, a1: 30, curl: 16,  cup: 1.00, twist: 34, skew: 0.77, sway: 0.18, asym: -0.10, wave: 0.034, thick: 0.062, r0: 0.07, y0: 0.12, ph: 0.9 },
].map((p) => ({ nu: 40, nv: 28, ...p }));

const smoothstep = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

function petalGeometry(p) {
  const { nu: NU, nv: NV } = p;
  const L = p.length, W = p.width;
  const a0 = THREE.MathUtils.degToRad(p.a0), a1 = THREE.MathUtils.degToRad(p.a1), curl = THREE.MathUtils.degToRad(p.curl);
  const angle = (u) => a0 + (a1 - a0) * Math.pow(u, 1.35) + curl * Math.sin(u * Math.PI * 1.4 + p.ph);

  // centre line in the XY plane
  const pts = [new THREE.Vector3(p.r0, p.y0, 0)];
  for (let i = 0; i < NU; i++) {
    const a = angle((i + 0.5) / NU);
    pts.push(pts[i].clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(L / NU)));
  }
  // broad oval that finishes in a soft, slightly drawn-out tip
  const width = (u) => W * 3.0 * Math.pow(u, 0.6) * Math.pow(1 - u, 0.55) * 0.78;
  const Z = new THREE.Vector3(0, 0, 1);

  const positions = [];
  const rowSize = NV + 1;
  for (const side of [1, -1]) {                                       // top surface, then bottom surface
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = angle(u);
      const n = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);        // concave side, towards the axis
      const phi = THREE.MathUtils.degToRad(p.twist) * u;
      const b = Z.clone().multiplyScalar(Math.cos(phi)).addScaledVector(n, Math.sin(phi));
      const n2 = n.clone().multiplyScalar(Math.cos(phi)).addScaledVector(Z, -Math.sin(phi));
      const w = width(u);
      const closeEnds = Math.sqrt(Math.max(0, 1 - Math.pow(u, 8))) * Math.sqrt(smoothstep(u / 0.12));
      const drift = W * (p.skew * u * u + p.sway * Math.sin(u * Math.PI * 1.6 + p.ph) * 0.5);
      for (let j = 0; j <= NV; j++) {
        const v = -1 + (2 * j) / NV;
        const av = Math.abs(v);
        const lat = w * v * (1 + p.asym * v);
        const cup = p.cup * lat * lat * (0.6 + 0.8 * u);
        const ripple = p.wave * Math.sin(u * 5.6 + v * 1.9 + p.ph) * v * v;
        // fine streaks running along the petal, like the striations in blown glass
        const veins = 0.007 * Math.sin(v * 17 + p.ph * 2 + u * 2.5) * smoothstep(u / 0.25) * (1 - 0.6 * u);
        // glass is thicker at the rim: a rounded lip that only closes right at the edge
        const lip = Math.sqrt(Math.max(0, 1 - Math.pow(av, 8))) * (0.42 + 0.58 * av * av);
        const c = pts[i].clone().addScaledVector(Z, drift);
        c.addScaledVector(b, lat).addScaledVector(n2, cup + ripple + veins);
        c.addScaledVector(n2, side * p.thick * closeEnds * lip);
        positions.push(c.x, c.y, c.z);
      }
    }
  }

  const index = [];
  const layer = (NU + 1) * rowSize;
  for (let s = 0; s < 2; s++) {
    const off = s * layer;
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = off + i * rowSize + j, b = a + 1, c = a + rowSize + 1, d = a + rowSize;
        if (s === 0) index.push(a, b, c, a, c, d);        // top faces outward along +n
        else index.push(a, c, b, a, d, c);                // bottom surface is flipped
      }
    }
  }

  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g = mergeVertices(g, 1e-4);          // weld top/bottom along the rim so normals are smooth
  g.computeVertexNormals();
  if (p.roll) g.rotateX(THREE.MathUtils.degToRad(p.roll));   // roll about the petal's own axis
  return g;
}

// deterministic pseudo-random so the flower is the same every time
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function centre(material) {
  const g = new THREE.Group();
  g.name = 'Centre';
  // slender teardrop pod
  const prof = [];
  for (let i = 0; i <= 18; i++) {
    const s = i / 18;
    prof.push(new THREE.Vector2(0.075 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9) + 0.008, 0.3 * s));
  }
  const pod = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), material);
  pod.name = 'Centre_Pod';
  g.add(pod);

  // fine glass stamens with a bead on the tip
  const r = rng(7);
  const stamens = new THREE.Group();
  stamens.name = 'Stamens';
  const N = 10;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + r() * 0.3;
    const reach = 0.22 + r() * 0.26, rise = 0.24 + r() * 0.24;
    const dir = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, 0),
      dir.clone().multiplyScalar(reach * 0.25).setY(rise * 0.55),
      dir.clone().multiplyScalar(reach * 0.62).setY(rise * 0.95),
      dir.clone().multiplyScalar(reach).setY(rise * 0.9),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.008, 6), material);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.022 + r() * 0.012, 14, 10), material);
    bead.position.copy(curve.getPoint(1));
    const st = new THREE.Group();
    st.name = `Stamen_${String(i + 1).padStart(2, '0')}`;
    st.add(tube, bead);
    stamens.add(st);
  }
  g.add(stamens);
  return g;
}

export function buildFlower(material) {
  const root = new THREE.Group();
  root.name = 'Flower';
  const bloom = new THREE.Group();
  bloom.name = 'Bloom';
  PETALS.forEach((p, i) => {
    const m = new THREE.Mesh(petalGeometry(p), material);
    m.name = `Petal_${String(i + 1).padStart(2, '0')}`;
    m.rotation.y = THREE.MathUtils.degToRad(p.yaw);
    bloom.add(m);
  });
  bloom.add(centre(material));
  root.add(bloom);
  return root;
}

// bounding box of the blossom (used to rotate the sculpture around its visual centre)
export function bloomBounds(root) {
  return new THREE.Box3().setFromObject(root.getObjectByName('Bloom'));
}

// Download the flower as a GLB (handy for Spline / Blender). Materials export as plain glass; recreate the look there.
export async function exportGLB(root, filename = 'glass-flower.glb') {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const buf = await new GLTFExporter().parseAsync(root, { binary: true });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
