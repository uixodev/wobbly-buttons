// Procedural glass flower for three.js (no Blender, no external model).
//   Outer ring  Petal_01 … Petal_06        large, wide-open, slightly asymmetrical
//   Inner ring  Petal_Inner_01 … _06       smaller, more upright, set between the outer petals
//   Centre      Centre_Pod, Centre_Ring, Stamens (Stamen_01 …: fine glass filaments with a bead at the tip)
//   Stem        Calyx + Stem                a slender curved glass stalk
// Everything is grouped under one "Flower" group. Each petal is a closed, thick surface with a rounded glass lip,
// built from a parametric grid, so it keeps real thickness. All the artistry lives in the tables below.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Angles in degrees. Y is up; each petal is modelled along +X and fanned around the Y axis by `yaw`.
//   a0 / a1   angle above horizontal at the base / tip (90 = straight up) → a1 < a0 opens the petal outward
//   curl      extra wave in that angle along the length (gives the blown-glass flick)
//   cup       how far the sides curl towards the centre      twist  twist along the length
//   skew/sway sideways drift of the tip                       asym   one side fuller than the other
//   wave      edge ripple                                     thick  glass thickness at the fattest part of the lip
//   r0, y0    where the petal starts, so petals overlap and interleave
//   nu, nv    mesh resolution
const OUTER = [
  { yaw: 2,   roll: 5,  length: 2.15, width: 0.66, a0: 46, a1: 6,   curl: 14,  cup: 0.70, twist: 26,  skew: 0.34,  sway: 0.22,  asym: 0.14,  wave: 0.050, thick: 0.075, r0: 0.14, y0: 0.00, ph: 0.4 },
  { yaw: 62,  roll: -7, length: 1.90, width: 0.62, a0: 40, a1: 14,  curl: -12, cup: 0.90, twist: -30, skew: -0.26, sway: -0.18, asym: -0.16, wave: 0.040, thick: 0.068, r0: 0.13, y0: 0.05, ph: 1.9 },
  { yaw: 119, roll: 4,  length: 2.25, width: 0.70, a0: 52, a1: -6,  curl: 16,  cup: 0.62, twist: 32,  skew: 0.40,  sway: 0.14,  asym: 0.09,  wave: 0.054, thick: 0.078, r0: 0.15, y0: 0.00, ph: 3.1 },
  { yaw: 181, roll: -6, length: 1.98, width: 0.64, a0: 43, a1: 10,  curl: -14, cup: 0.84, twist: -22, skew: -0.34, sway: -0.24, asym: -0.11, wave: 0.044, thick: 0.070, r0: 0.13, y0: 0.06, ph: 4.2 },
  { yaw: 240, roll: 8,  length: 2.10, width: 0.68, a0: 49, a1: 0,   curl: 12,  cup: 0.68, twist: 28,  skew: 0.24,  sway: 0.26,  asym: 0.14,  wave: 0.052, thick: 0.076, r0: 0.14, y0: 0.01, ph: 5.0 },
  { yaw: 300, roll: -4, length: 1.82, width: 0.60, a0: 38, a1: 18,  curl: -16, cup: 0.95, twist: -34, skew: -0.30, sway: -0.16, asym: -0.13, wave: 0.036, thick: 0.064, r0: 0.13, y0: 0.07, ph: 0.9 },
].map((p) => ({ nu: 38, nv: 26, ...p }));

const INNER = [
  { yaw: 33,  roll: 3,  length: 1.30, width: 0.42, a0: 70, a1: 26, curl: 10,  cup: 1.00, twist: 20,  skew: 0.18,  sway: 0.12,  asym: 0.10,  wave: 0.026, thick: 0.058, r0: 0.09, y0: 0.14, ph: 1.1 },
  { yaw: 92,  roll: -4, length: 1.14, width: 0.38, a0: 64, a1: 34, curl: -9,  cup: 1.15, twist: -22, skew: -0.14, sway: -0.1,  asym: -0.12, wave: 0.022, thick: 0.054, r0: 0.09, y0: 0.18, ph: 2.6 },
  { yaw: 150, roll: 5,  length: 1.38, width: 0.44, a0: 73, a1: 22, curl: 12,  cup: 0.95, twist: 24,  skew: 0.22,  sway: 0.1,   asym: 0.08,  wave: 0.028, thick: 0.060, r0: 0.09, y0: 0.13, ph: 3.7 },
  { yaw: 212, roll: -3, length: 1.20, width: 0.40, a0: 66, a1: 30, curl: -10, cup: 1.10, twist: -18, skew: -0.2,  sway: -0.14, asym: -0.10, wave: 0.024, thick: 0.056, r0: 0.09, y0: 0.17, ph: 4.8 },
  { yaw: 272, roll: 6,  length: 1.34, width: 0.43, a0: 71, a1: 24, curl: 9,   cup: 1.00, twist: 22,  skew: 0.16,  sway: 0.16,  asym: 0.12,  wave: 0.027, thick: 0.058, r0: 0.09, y0: 0.15, ph: 5.6 },
  { yaw: 331, roll: -5, length: 1.10, width: 0.37, a0: 62, a1: 36, curl: -12, cup: 1.20, twist: -26, skew: -0.18, sway: -0.12, asym: -0.09, wave: 0.020, thick: 0.052, r0: 0.09, y0: 0.19, ph: 0.2 },
].map((p) => ({ nu: 28, nv: 20, ...p }));

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
    prof.push(new THREE.Vector2(0.10 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9) + 0.01, 0.42 * s));
  }
  const pod = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), material);
  pod.name = 'Centre_Pod';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 12, 40), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.name = 'Centre_Ring';
  g.add(pod, ring);

  // fine glass stamens with a bead on the tip
  const r = rng(7);
  const stamens = new THREE.Group();
  stamens.name = 'Stamens';
  const N = 18;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + r() * 0.3;
    const reach = 0.38 + r() * 0.42, rise = 0.34 + r() * 0.34;
    const dir = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, 0),
      dir.clone().multiplyScalar(reach * 0.25).setY(rise * 0.55),
      dir.clone().multiplyScalar(reach * 0.62).setY(rise * 0.95),
      dir.clone().multiplyScalar(reach).setY(rise * 0.9),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.008, 6), material);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028 + r() * 0.014, 14, 10), material);
    bead.position.copy(curve.getPoint(1));
    const st = new THREE.Group();
    st.name = `Stamen_${String(i + 1).padStart(2, '0')}`;
    st.add(tube, bead);
    stamens.add(st);
  }
  g.add(stamens);
  return g;
}

function stem(material) {
  const g = new THREE.Group();
  g.name = 'Stem_Group';
  // calyx: a small flared cup that holds the petals
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    prof.push(new THREE.Vector2(0.055 + 0.15 * Math.pow(1 - s, 2.2) + 0.012, -0.34 + 0.34 * s));
  }
  const calyx = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), material);
  calyx.name = 'Calyx';
  // the stalk: a graceful S-curve
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.3, 0),
    new THREE.Vector3(0.07, -0.9, 0.09),
    new THREE.Vector3(-0.11, -1.7, -0.1),
    new THREE.Vector3(0.09, -2.6, 0.07),
    new THREE.Vector3(-0.02, -3.5, -0.02),
  ]);
  const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.06, 20), material);
  stalk.name = 'Stem';
  g.add(calyx, stalk);
  return g;
}

export function buildFlower(material) {
  const root = new THREE.Group();
  root.name = 'Flower';
  const bloom = new THREE.Group();
  bloom.name = 'Bloom';
  OUTER.forEach((p, i) => {
    const m = new THREE.Mesh(petalGeometry(p), material);
    m.name = `Petal_${String(i + 1).padStart(2, '0')}`;
    m.rotation.y = THREE.MathUtils.degToRad(p.yaw);
    bloom.add(m);
  });
  INNER.forEach((p, i) => {
    const m = new THREE.Mesh(petalGeometry(p), material);
    m.name = `Petal_Inner_${String(i + 1).padStart(2, '0')}`;
    m.rotation.y = THREE.MathUtils.degToRad(p.yaw);
    bloom.add(m);
  });
  bloom.add(centre(material));
  root.add(bloom, stem(material));
  return root;
}

// bounding box of the blossom only (so the stem doesn't pull the pivot away from the flower's heart)
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
