// Procedural glass flower for three.js (no Blender, no external model).
// Six separate, named petals (Petal_01 … Petal_06) + a small glass centre, grouped under one "Flower" group.
// Every petal is a closed, thick, rounded-edge surface built from a parametric grid, so it keeps real glass thickness.
// All the artistry lives in PETALS below: tweak a row and the flower rebuilds.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Angles in degrees. Y is up; each petal is modelled along +X and fanned around the Y axis by `yaw`.
//   a0 / a1   angle above horizontal at the base / tip (90 = straight up) → a1 < a0 opens the petal outward
//   curl      extra wave in that angle along the length (gives the blown-glass flick)
//   cup       how far the sides curl towards the centre     twist  twist along the length
//   skew/sway sideways drift of the tip                      asym   one side fuller than the other
//   wave      edge ripple                                    thick  glass thickness at its fattest
//   r0, y0    where the petal starts, so petals overlap and interleave
const PETALS = [
  { yaw: 2,   roll: 6,  length: 1.95, width: 0.62, a0: 70, a1: -4,  curl: 18,  cup: 0.80, twist: 26,  skew: 0.34,  sway: 0.24,  asym: 0.14,  wave: 0.050, thick: 0.070, r0: 0.12, y0: 0.00, ph: 0.4 },
  { yaw: 61,  roll: -8, length: 1.72, width: 0.58, a0: 62, a1: 8,   curl: -14, cup: 1.00, twist: -30, skew: -0.26, sway: -0.2,  asym: -0.16, wave: 0.040, thick: 0.064, r0: 0.11, y0: 0.07, ph: 1.9 },
  { yaw: 117, roll: 4,  length: 2.05, width: 0.66, a0: 74, a1: -12, curl: 20,  cup: 0.72, twist: 32,  skew: 0.40,  sway: 0.16,  asym: 0.09,  wave: 0.054, thick: 0.074, r0: 0.13, y0: 0.01, ph: 3.1 },
  { yaw: 181, roll: -6, length: 1.80, width: 0.60, a0: 66, a1: 4,   curl: -16, cup: 0.95, twist: -22, skew: -0.34, sway: -0.26, asym: -0.11, wave: 0.044, thick: 0.066, r0: 0.12, y0: 0.08, ph: 4.2 },
  { yaw: 238, roll: 9,  length: 1.98, width: 0.64, a0: 71, a1: -8,  curl: 16,  cup: 0.78, twist: 28,  skew: 0.24,  sway: 0.28,  asym: 0.14,  wave: 0.052, thick: 0.072, r0: 0.11, y0: 0.02, ph: 5.0 },
  { yaw: 299, roll: -4, length: 1.62, width: 0.55, a0: 60, a1: 12,  curl: -18, cup: 1.10, twist: -34, skew: -0.30, sway: -0.18, asym: -0.13, wave: 0.036, thick: 0.060, r0: 0.12, y0: 0.09, ph: 0.9 },
];

const NU = 44;   // samples along the petal
const NV = 22;   // samples across it

const smoothstep = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

function petalGeometry(p) {
  const L = p.length, W = p.width;
  const a0 = THREE.MathUtils.degToRad(p.a0), a1 = THREE.MathUtils.degToRad(p.a1), curl = THREE.MathUtils.degToRad(p.curl);
  const angle = (u) => a0 + (a1 - a0) * Math.pow(u, 1.35) + curl * Math.sin(u * Math.PI * 1.4 + p.ph);

  // centre line in the XY plane
  const pts = [new THREE.Vector3(p.r0, p.y0, 0)];
  for (let i = 0; i < NU; i++) {
    const a = angle((i + 0.5) / NU);
    pts.push(pts[i].clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(L / NU)));
  }
  const width = (u) => W * 3.0 * Math.pow(u, 0.62) * Math.pow(1 - u, 0.52) * 0.78;   // round tip, narrow base
  const Z = new THREE.Vector3(0, 0, 1);

  const positions = [];
  const rowSize = NV + 1;
  for (const side of [1, -1]) {                                       // top surface, then bottom surface
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, a = angle(u);
      const t = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const n = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);        // concave side, towards the axis
      const phi = THREE.MathUtils.degToRad(p.twist) * u;
      const b = Z.clone().multiplyScalar(Math.cos(phi)).addScaledVector(n, Math.sin(phi));
      const n2 = n.clone().multiplyScalar(Math.cos(phi)).addScaledVector(Z, -Math.sin(phi));
      const w = width(u);
      const rim = Math.sqrt(Math.max(0, 1 - Math.pow(u, 8))) * Math.sqrt(smoothstep(u / 0.12));
      const drift = W * (p.skew * u * u + p.sway * Math.sin(u * Math.PI * 1.6 + p.ph) * 0.5);
      for (let j = 0; j <= NV; j++) {
        const v = -1 + (2 * j) / NV;
        const lat = w * v * (1 + p.asym * v);
        const cup = p.cup * lat * lat * (0.6 + 0.8 * u);
        const ripple = p.wave * Math.sin(u * 5.6 + v * 1.9 + p.ph) * v * v;
        const c = pts[i].clone().addScaledVector(Z, drift);
        c.addScaledVector(b, lat).addScaledVector(n2, cup + ripple);
        c.addScaledVector(n2, side * p.thick * rim * Math.sqrt(Math.max(0, 1 - v * v)));
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
  g = mergeVertices(g, 1e-4);          // weld top/bottom along the rounded rim so normals are smooth
  g.computeVertexNormals();
  if (p.roll) g.rotateX(THREE.MathUtils.degToRad(p.roll));   // roll about the petal's own axis
  return g;
}

function centreParts(material) {
  // slender teardrop pod
  const prof = [];
  for (let i = 0; i <= 18; i++) {
    const s = i / 18;
    prof.push(new THREE.Vector2(0.115 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.8)), 0.9) + 0.012, -0.02 + 0.46 * s));
  }
  const pod = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), material);
  pod.name = 'Centre_Pod';
  // thin ring that seats the petal bases
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 12, 40), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = 'Centre_Ring';
  return [pod, ring];
}

export function buildFlower(material) {
  const root = new THREE.Group();
  root.name = 'Flower';
  PETALS.forEach((p, i) => {
    const mesh = new THREE.Mesh(petalGeometry(p), material);
    mesh.name = `Petal_${String(i + 1).padStart(2, '0')}`;
    mesh.rotation.y = THREE.MathUtils.degToRad(p.yaw);
    root.add(mesh);
  });
  centreParts(material).forEach((m) => root.add(m));
  return root;
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
