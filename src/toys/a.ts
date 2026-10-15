// Toys 1–10 (see kit3d.ts for the helpers and the part rules).
import { Kit, type Build, box, sph, cyl, tor, cone, capsule, eyes, cheeks, wheel, plateTexture, bunny } from '../kit3d';
import * as THREE from 'three';

const INK = 0x3a1e2a;
const GLASS = 0x9fe3ff;
const SILVER = 0xcfd3dc;
const GOLD = 0xffc93c;
const P2 = Math.PI / 2;

const lathe = (pts: number[][], seg = 32, phi0 = 0, phiLen = Math.PI * 2) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, phi0, phiLen);

/** A flat shape extruded `depth` along z (centred) with soft bevelled edges. */
function extrude(shape: THREE.Shape, depth: number, bevel: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
function shape(pts: number[][]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  return s;
}
/** A puffy heart about `s` wide. */
function heart(s: number, d = 0.3): THREE.BufferGeometry {
  const h = new THREE.Shape();
  h.moveTo(0, -0.45 * s);
  h.bezierCurveTo(-0.15 * s, -0.3 * s, -0.5 * s, -0.1 * s, -0.5 * s, 0.15 * s);
  h.bezierCurveTo(-0.5 * s, 0.42 * s, -0.22 * s, 0.52 * s, 0, 0.3 * s);
  h.bezierCurveTo(0.22 * s, 0.52 * s, 0.5 * s, 0.42 * s, 0.5 * s, 0.15 * s);
  h.bezierCurveTo(0.5 * s, -0.1 * s, 0.15 * s, -0.3 * s, 0, -0.45 * s);
  return extrude(h, d * s, 0.12 * s);
}
/** A plump five-point star of outer radius R. */
function star(R: number, d = 0.3): THREE.BufferGeometry {
  const pts: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const a = P2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.5 : R;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return extrude(shape(pts), d * R, 0.12 * R);
}
/** A smile: a torus arc opening upwards, facing +z (turned by ry). */
function smile(k: Kit, x: number, y: number, z: number, r: number, ry = 0, rx = 0, col: THREE.ColorRepresentation = INK): void {
  const a = 2.1;
  k.deco(tor(r, r * 0.2, a), col, x, y, z, 0.4, rx, ry, -P2 - a / 2);
}
/** A torus lying flat (axis = y), so it can share a tilt with a lathe shape. */
const ring = (r: number, t: number) => tor(r, t).rotateX(P2);
/** A cupcake-paper style cylinder with soft vertical pleats. */
function pleated(rTop: number, rBot: number, h: number, n = 16, amp = 0.05): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, n * 4, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) < 1e-4) continue;
    const f = 1 + amp * Math.cos(Math.atan2(z, x) * n);
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  g.computeVertexNormals();
  return g;
}
/** A flat round button facing +z (or turned by ry). */
function button(k: Kit, x: number, y: number, z: number, r: number, col: THREE.ColorRepresentation, ry = 0): void {
  k.deco(cyl(r, r, r * 0.45, 18), col, x, y, z, 0.35, P2, 0, 0, 1, 1, 1).rotation.set(P2, ry, 0, 'YXZ');
}
/** Little white smoke / foam puffs. */
function puffs(k: Kit, list: number[][]): void {
  for (const [x, y, z, r] of list) k.deco(sph(r), 0xffffff, x, y, z, 0.8);
}

export const TOYS_A: Build[] = [
  // 1 Bunny Car (front = +z): cream body, blue hood, red roof, orange front panels, red arches, navy wheels
  (k) => {
    const body = k.part(2), belt = k.part(0), doors = k.part(5), hood = k.part(1), panels = k.part(5), grille = k.part(4);
    const cabin = k.part(3), roof = k.part(0), arches = k.part(6), spare = k.part(6), lights = body;
    k.add(body, box(1.55, 0.66, 2.2, 0.3), 0, 0.6, 0, 3);
    k.add(belt, box(1.62, 0.12, 2.27, 0.06), 0, 0.84, 0, 3);
    for (const s of [-1, 1]) {
      k.add(doors, box(0.08, 0.42, 0.78, 0.04), s * 0.79, 0.58, -0.2, 2);
      k.deco(capsule(0.025, 0.12), SILVER, s * 0.84, 0.68, -0.05, 0.25, P2, 0, 0);
      k.add(panels, box(0.22, 0.5, 0.72, 0.1), s * 0.73, 0.66, 0.66, 2);
      k.add(lights, sph(0.08), s * 0.68, 1.16, 0.26, 1, 0, 0, 0, 1.3, 0.9, 0.7); // side mirrors
      k.add(lights, sph(0.08), s * 0.52, 0.75, -1.12, 1, 0, 0, 0, 1.2, 1, 0.5); // rear lights
    }
    k.add(hood, box(1.2, 0.3, 0.86, 0.15), 0, 0.98, 0.62, 2);
    k.add(hood, box(0.16, 0.07, 0.9, 0.035), 0, 1.15, 0.62, 1);
    k.add(grille, box(0.7, 0.26, 0.08, 0.04), 0, 0.68, 1.1, 1);
    k.add(grille, capsule(0.09, 1.3), 0, 0.38, 1.16, 1, 0, 0, P2);
    k.add(grille, capsule(0.09, 1.3), 0, 0.38, -1.15, 1, 0, 0, P2);
    for (const y of [0.62, 0.7, 0.78]) k.deco(box(0.6, 0.025, 0.03, 0.01), 0x6a5a88, 0, y - 0.02, 1.15, 0.4);
    k.add(cabin, box(1.25, 0.58, 1.15, 0.26), 0, 1.3, -0.25, 2);
    k.deco(box(1.0, 0.36, 0.04, 0.04), GLASS, 0, 1.3, 0.33, 0.1);
    for (const s of [-1, 1]) {
      k.deco(box(0.04, 0.3, 0.38, 0.04), GLASS, s * 0.63, 1.32, -0.02, 0.1);
      k.deco(box(0.04, 0.3, 0.38, 0.04), GLASS, s * 0.63, 1.32, -0.5, 0.1);
    }
    k.add(roof, box(1.38, 0.15, 1.25, 0.07), 0, 1.65, -0.25, 2);
    for (const s of [-1, 1]) k.add(roof, capsule(0.04, 1.05), s * 0.6, 1.76, -0.25, 1, P2, 0, 0);
    for (const x of [-0.8, 0.8]) for (const z of [-0.65, 0.65]) {
      k.add(arches, tor(0.38, 0.09, Math.PI), x, 0.36, z, 1, 0, P2, 0);
      wheel(k, x * 1.02, 0.34, z, 0.3);
    }
    k.add(spare, tor(0.24, 0.09), 0, 0.92, -1.2, 1);
    k.add(spare, cyl(0.2, 0.2, 0.08), 0, 0.92, -1.2, 1, P2);
    k.deco(heart(0.2), 0xff5a7a, 0, 0.93, -1.27, 0.5, 0, Math.PI, 0);
    for (const x of [-0.45, 0.45]) {
      k.add(lights, sph(0.17), x, 0.82, 1.08, 1, 0, 0, 0, 1, 1, 0.6);
      k.deco(sph(0.09), 0xfff6c8, x, 0.82, 1.17, 0.15);
    }
    for (const x of [-0.45, 0.45]) k.deco(box(0.08, 0.2, 0.08, 0.03), 0x8a5530, x, 0.3, 1.16, 0.5);
    k.deco(box(0.5, 0.17, 0.03, 0.02), 0xffffff, 0, 0.47, 1.25, 0.4, 0, 0, 0, 1, 1, 1, plateTexture('A88888'));
    for (const x of [-0.25, 0.22]) k.deco(box(0.34, 0.03, 0.03, 0.01), 0x111111, x, 1.12, 0.36, 0.4, 0, 0, 0.45);
    k.deco(cyl(0.06, 0.06, 0.22), 0x9aa0ac, 0.5, 0.32, -1.18, 0.3, P2);
    bunny(k, 0, 1.8, -0.25, 1);
    for (const [x, z, col] of [[-0.45, 0.05, 0xffd51c], [0.42, 0.0, 0x1478f4], [0.42, -0.45, 0x34c759], [-0.4, -0.5, 0xf33180]] as const) k.deco(sph(0.11), col, x, 1.84, z - 0.25, 0.4);
  },
  // 2 Teddy Bear in overalls with a beanie
  (k) => {
    const body = k.part(1), bib = k.part(7), legs = k.part(1), pads = k.part(0), head = k.part(5), muzzle = k.part(2);
    const arms = k.part(5), ears = k.part(5), bow = k.part(6), hat = k.part(3);
    k.add(body, sph(0.68), 0, 0.88, 0, 3, 0, 0, 0, 1, 1.1, 0.9);
    k.add(bib, box(0.6, 0.5, 0.14, 0.07), 0, 1.06, 0.55, 2, -0.22);
    k.add(bib, box(0.32, 0.22, 0.06, 0.04), 0, 0.98, 0.64, 1, -0.22);
    for (const s of [-1, 1]) k.add(bib, capsule(0.05, 0.42), s * 0.24, 1.38, 0.36, 1, -0.95, 0, 0);
    for (const s of [-1, 1]) button(k, s * 0.22, 1.25, 0.63, 0.05, GOLD);
    k.deco(heart(0.14), 0xff5a7a, 0, 0.99, 0.68, 0.5, -0.22);
    for (const s of [-1, 1]) {
      k.add(legs, sph(0.3), s * 0.38, 0.3, 0.2, 1, 0, 0, 0, 1, 0.85, 1.25);
      k.add(pads, sph(0.17), s * 0.38, 0.28, 0.56, 1, 0, 0, 0, 1, 1.05, 0.35);
      for (const d of [-1, 0, 1]) k.deco(sph(0.045), 0xff9db5, s * 0.38 + d * 0.09, 0.42 - Math.abs(d) * 0.03, 0.58, 0.6, 0, 0, 0, 1, 1, 0.5);
      k.add(arms, sph(0.23), s * 0.74, 1.0, 0.18, 1, 0, 0, s * 0.55, 1, 1.6, 1);
      k.add(ears, sph(0.2), s * 0.47, 2.38, -0.05, 1, 0, 0, 0, 1, 1, 0.65); // ears
      k.add(pads, sph(0.12), s * 0.47, 2.37, 0.06, 1, 0, 0, 0, 1, 1, 0.4);
      k.add(pads, sph(0.1), s * 0.9, 0.78, 0.3, 1, 0, 0, s * 0.55, 1, 1.3, 0.45); // paw pads
    }
    k.add(head, sph(0.58), 0, 1.93, 0, 3, 0, 0, 0, 1.05, 0.95, 0.95);
    k.add(muzzle, sph(0.25), 0, 1.8, 0.47, 1, 0, 0, 0, 1.25, 0.88, 0.7);
    k.deco(sph(0.075), 0x2a1d1a, 0, 1.88, 0.64, 0.25, 0, 0, 0, 1.35, 0.9, 0.8);
    smile(k, 0, 1.78, 0.64, 0.08, 0, -0.2, 0x2a1d1a);
    eyes(k, 0, 2.04, 0.5, 0.2, 0.065);
    cheeks(k, 0, 1.86, 0.45, 0.36, 0.08);
    k.add(bow, sph(0.17), -0.2, 1.45, 0.48, 1, 0, 0, 0.25, 1.4, 0.9, 0.55);
    k.add(bow, sph(0.17), 0.2, 1.45, 0.48, 1, 0, 0, -0.25, 1.4, 0.9, 0.55);
    k.add(bow, sph(0.09), 0, 1.45, 0.54, 1);
    k.add(bow, ring(0.4, 0.06), 0, 1.47, 0.02, 2, 0.15);
    k.add(hat, lathe([[0.42, 0], [0.36, 0.2], [0.2, 0.34], [0, 0.38]], 28), 0.12, 2.38, -0.04, 2, -0.12, 0, -0.28);
    k.add(hat, ring(0.42, 0.07), 0.12, 2.38, -0.04, 2, -0.12, 0, -0.28);
    k.add(hat, sph(0.12), 0.24, 2.78, -0.08, 1);
    k.add(ears, sph(0.14), 0, 0.62, -0.62, 1); // tail
    for (const s of [-1, 1]) k.add(bib, capsule(0.05, 0.36), s * 0.2, 1.22, -0.52, 1, 0.5, 0, 0);
  },
  // 3 Rocket with side boosters and a happy face
  (k) => {
    const body = k.part(1), nose = k.part(6), band1 = k.part(0), band2 = k.part(0), fins = k.part(2), port = fins;
    const nozzle = k.part(4), flame = k.part(5), boostL = k.part(3), boostR = k.part(3), caps = k.part(6);
    k.add(body, lathe([[0.5, 0.35], [0.6, 0.6], [0.64, 1.0], [0.63, 1.5], [0.58, 1.9], [0.52, 2.08]]), 0, 0, 0, 3);
    k.add(nose, lathe([[0.53, 2.04], [0.52, 2.25], [0.43, 2.55], [0.26, 2.82], [0.08, 2.97], [0, 2.99]]), 0, 0, 0, 2);
    k.add(nose, sph(0.09), 0, 3.02, 0, 1);
    k.add(band1, tor(0.6, 0.075), 0, 0.62, 0, 2, P2);
    k.add(band1, tor(0.63, 0.06), 0, 1.0, 0, 2, P2);
    k.add(band2, tor(0.53, 0.075), 0, 2.06, 0, 2, P2);
    k.add(port, tor(0.21, 0.065), 0, 1.68, 0.59, 1, -0.08);
    k.deco(sph(0.18), GLASS, 0, 1.68, 0.55, 0.08, 0, 0, 0, 1, 1, 0.55);
    k.deco(sph(0.05), 0xffffff, 0.07, 1.75, 0.64, 0.1);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      k.deco(sph(0.025), SILVER, Math.cos(a) * 0.21, 1.68 + Math.sin(a) * 0.21, 0.66, 0.25);
    }
    eyes(k, 0, 1.28, 0.62, 0.17, 0.06);
    cheeks(k, 0, 1.17, 0.6, 0.3, 0.065);
    smile(k, 0, 1.18, 0.63, 0.08);
    const fin = new THREE.Shape();
    fin.moveTo(0, 0.95);
    fin.quadraticCurveTo(0.45, 0.7, 0.5, 0.12);
    fin.lineTo(0.5, -0.05);
    fin.quadraticCurveTo(0.28, 0.02, 0, 0.12);
    fin.closePath();
    const finGeo = extrude(fin, 0.08, 0.05);
    for (const a of [0, Math.PI, P2]) {
      k.add(fins, finGeo, Math.cos(a) * 0.48, 0.32, -Math.sin(a) * 0.48, 2, 0, a, 0);
    }
    k.add(nozzle, lathe([[0.4, 0.0], [0.47, 0.0], [0.4, 0.1], [0.34, 0.24], [0.4, 0.38]]), 0, 0, 0, 2);
    k.add(flame, lathe([[0, -0.55], [0.2, -0.38], [0.32, -0.15], [0.36, 0.02]]), 0, 0, 0, 1);
    k.deco(lathe([[0, -0.42], [0.08, -0.32], [0.18, -0.15], [0.22, 0.0]]), 0xffe066, 0, -0.06, 0, 0.5);
    for (const [part, s] of [[boostL, -1], [boostR, 1]] as const) {
      const bx = s * 0.56, bz = -0.5;
      k.add(part, capsule(0.16, 0.55), bx, 0.85, bz, 2);
      k.add(part, tor(0.17, 0.045), bx, 0.92, bz, 1, P2);
      k.add(caps, cone(0.16, 0.3), bx, 1.35, bz, 1);
      k.add(caps, cyl(0.12, 0.17, 0.14), bx, 0.42, bz, 1);
    }
    k.deco(star(0.11), GOLD, 0.6, 1.5, -0.1, 0.4, 0, 1.4, 0);
    k.deco(star(0.08), GOLD, -0.55, 1.85, -0.15, 0.4, 0, -1.4, 0);
  },
  // 4 Cottage with a scalloped roof, shutters, flower boxes and bushes
  (k) => {
    const lawn = k.part(3), walls = k.part(2), roofL = k.part(6), roofR = k.part(6), trim = k.part(0), door = k.part(5);
    const wins = k.part(7), shutters = trim, chimney = k.part(4), bushes = k.part(3), fence = k.part(4);
    k.add(lawn, box(2.5, 0.18, 2.1, 0.09), 0, 0.09, 0, 3);
    k.add(walls, box(1.7, 1.05, 1.4, 0.1), 0, 0.71, 0, 3);
    const gable = extrude(shape([[-0.85, 0], [0.85, 0], [0, 0.6]]), 0.1, 0.02);
    for (const z of [-0.65, 0.65]) k.add(walls, gable, 0, 1.22, z, 2);
    const ang = Math.atan2(0.6, 0.85);
    k.add(roofL, box(1.32, 0.16, 1.7, 0.07), -0.47, 1.6, 0, 3, 0, 0, ang);
    k.add(roofR, box(1.32, 0.16, 1.7, 0.07), 0.47, 1.6, 0, 3, 0, 0, -ang);
    k.add(trim, capsule(0.1, 1.6), 0, 1.9, 0, 2, P2);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const z = -0.75 + i * 0.3;
      k.add(trim, sph(0.1), s * 1.0, 1.21, z, 1, 0, 0, 0, 0.8, 1, 1.4);
    }
    k.add(door, box(0.42, 0.5, 0.08, 0.04), 0, 0.46, 0.72, 1);
    k.add(door, cyl(0.21, 0.21, 0.08, 20, ), 0, 0.71, 0.72, 1, P2);
    k.deco(sph(0.04), GOLD, 0.12, 0.48, 0.78, 0.25);
    k.deco(box(0.6, 0.06, 0.24, 0.03), 0xbfb7ad, 0, 0.21, 0.82, 0.8);
    for (const x of [-0.55, 0.55]) {
      k.add(wins, box(0.4, 0.4, 0.06, 0.05), x, 0.85, 0.71, 1);
      k.deco(box(0.28, 0.28, 0.04, 0.03), GLASS, x, 0.85, 0.74, 0.1);
      k.deco(box(0.03, 0.28, 0.03, 0.01), 0xffffff, x, 0.85, 0.76, 0.5);
      k.deco(box(0.28, 0.03, 0.03, 0.01), 0xffffff, x, 0.85, 0.76, 0.5);
      for (const s of [-1, 1]) k.add(shutters, box(0.13, 0.42, 0.05, 0.03), x + s * 0.28, 0.85, 0.72, 1);
      k.add(door, box(0.44, 0.1, 0.14, 0.04), x, 0.6, 0.76, 1); // flower box
      for (let i = 0; i < 3; i++) k.deco(sph(0.05), [0xff5a7a, 0xffd51c, 0xb06bff][i], x - 0.13 + i * 0.13, 0.69, 0.78, 0.6);
    }
    for (const s of [-1, 1]) {
      k.add(wins, box(0.06, 0.4, 0.4, 0.05), s * 0.85, 0.85, 0, 1);
      k.deco(box(0.04, 0.28, 0.28, 0.03), GLASS, s * 0.88, 0.85, 0, 0.1);
    }
    k.add(wins, tor(0.13, 0.045), 0, 1.45, 0.72, 1);
    k.add(wins, box(0.5, 0.4, 0.06, 0.05), 0.3, 0.85, -0.71, 1);
    k.deco(box(0.38, 0.28, 0.04, 0.03), GLASS, 0.3, 0.85, -0.74, 0.1);
    k.add(door, box(0.54, 0.1, 0.14, 0.04), 0.3, 0.6, -0.76, 1);
    k.deco(cyl(0.11, 0.11, 0.03), GLASS, 0, 1.45, 0.71, 0.1, P2);
    k.add(chimney, box(0.34, 0.7, 0.34, 0.06), 0.5, 1.85, -0.35, 1);
    k.add(chimney, box(0.44, 0.12, 0.44, 0.05), 0.5, 2.23, -0.35, 1);
    puffs(k, [[0.52, 2.45, -0.35, 0.1], [0.62, 2.62, -0.38, 0.13], [0.78, 2.82, -0.42, 0.15]]);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) k.add(fence, box(0.12, 0.4, 0.08, 0.05), s * (0.48 + i * 0.22), 0.38, 0.98, 1);
      for (const y of [0.3, 0.46]) k.add(fence, box(0.78, 0.06, 0.05, 0.025), s * 0.81, y, 0.95, 1);
    }
    for (const [x, z, r] of [[-1.0, 0.55, 0.24], [-0.8, 0.72, 0.17], [0.98, 0.52, 0.22], [1.0, -0.6, 0.2], [-1.02, -0.55, 0.2]]) {
      k.add(bushes, sph(r), x, 0.16 + r * 0.7, z, 1);
    }
    for (const [x, z] of [[-1.0, 0.68], [0.95, 0.66], [-0.75, 0.82]]) k.deco(sph(0.045), 0xff5a7a, x, 0.42, z, 0.6);
    for (const [x, z] of [[0.05, 0.98], [-0.1, 1.0]]) k.deco(cyl(0.09, 0.09, 0.03), 0xbfb7ad, x, 0.19, z, 0.8);
  },
  // 5 Cupcake with a face, layered frosting, chocolate drip, sprinkles and a candle
  (k) => {
    const wrap = k.part(1), rimLow = k.part(7), rimTop = k.part(7), lace = k.part(2), cake = k.part(5), drip = k.part(4);
    const f1 = k.part(0), f2 = k.part(0), f3 = k.part(0), cherry = k.part(6), candle = cherry;
    k.add(wrap, pleated(0.85, 0.64, 0.9, 16, 0.05), 0, 0.47, 0, 3);
    k.add(rimLow, tor(0.66, 0.07), 0, 0.04, 0, 3, P2);
    k.add(rimTop, tor(0.87, 0.07), 0, 0.92, 0, 3, P2);
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18;
      k.add(lace, sph(0.09), Math.cos(a) * 0.86, 0.86, Math.sin(a) * 0.86, 1, 0, -a, 0, 0.5, 1, 1);
    }
    k.add(cake, lathe([[0, 0.9], [0.86, 0.9], [0.92, 1.0], [0.9, 1.12], [0, 1.16]]), 0, 0, 0, 3);
    k.add(drip, tor(0.8, 0.07), 0, 1.13, 0, 2, P2);
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9 + 0.2, l = 0.08 + (i % 3) * 0.05;
      k.add(drip, capsule(0.06, l), Math.cos(a) * 0.88, 1.06 - l / 2, Math.sin(a) * 0.88, 1);
    }
    k.add(f1, tor(0.64, 0.27), 0, 1.3, 0, 3, P2);
    k.add(f2, tor(0.42, 0.24), 0, 1.6, 0, 2, P2);
    k.add(f3, lathe([[0, 1.6], [0.3, 1.66], [0.3, 1.86], [0.17, 2.02], [0.06, 2.12], [0, 2.14]]), 0, 0, 0, 2);
    const cols = [0xffd51c, 0x1478f4, 0x34c759, 0xb06bff, 0xff7a1c, 0xffffff];
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12 + 0.3, top = i % 2 === 0;
      const r = top ? 0.82 : 0.6, y = top ? 1.47 : 1.8;
      k.deco(capsule(0.022, 0.06), cols[i % cols.length], Math.cos(a) * r, y, Math.sin(a) * r, 0.4, 0.5 * i, a, 1.1);
    }
    k.add(cherry, sph(0.24), 0.02, 2.32, 0.02, 1);
    k.deco(capsule(0.018, 0.2), 0x5a3a20, 0.08, 2.6, 0.0, 0.6, 0, 0, -0.4);
    k.deco(sph(0.06), 0xffffff, -0.07, 2.42, 0.18, 0.1);
    k.add(candle, cyl(0.08, 0.08, 0.5), 0.38, 2.0, -0.05, 1, 0, 0, -0.12);
    k.add(candle, capsule(0.09, 0.45), -0.42, 1.92, -0.15, 1, 0.2, 0, 0.5); // wafer stick
    k.deco(sph(0.06), 0xffb43b, 0.41, 2.33, -0.05, 0.3, 0, 0, 0, 1, 1.6, 1);
    k.deco(cyl(0.008, 0.008, 0.06), 0x333333, 0.405, 2.27, -0.05, 0.5);
    eyes(k, 0, 0.58, 0.77, 0.2, 0.07);
    cheeks(k, 0, 0.45, 0.74, 0.34, 0.08);
    smile(k, 0, 0.45, 0.77, 0.09, 0, -0.15);
  },
  // 6 Sailboat on a wave, with a jib, portholes and a smiley cabin
  (k) => {
    const waves = k.part(7), crests = k.part(7), hull = k.part(6), stripe = k.part(0), deck = k.part(5), cabin = k.part(2), cabRoof = k.part(4);
    const ports = deck, mast = k.part(4), sail = k.part(1), jib = k.part(0);
    k.add(waves, sph(1), 0, 0.12, 0, 3, 0, 0, 0, 1.0, 0.17, 1.55);
    for (const [x, z, r] of [[-0.75, 0.9, 0.22], [0.8, 0.6, 0.24], [0.75, -0.9, 0.2], [-0.8, -0.7, 0.24], [0, 1.45, 0.2], [0, -1.45, 0.2]]) {
      k.add(crests, sph(r), x, 0.15, z, 1, 0, 0, 0, 1, 0.75, 1);
    }
    puffs(k, [[-0.95, 0.28, 0.5, 0.07], [0.98, 0.3, 0.1, 0.08], [0.4, 0.27, -1.3, 0.07], [-0.3, 0.28, 1.4, 0.06]]);
    const outline = new THREE.Shape();
    outline.moveTo(-0.5, 1.05);
    outline.lineTo(0.5, 1.05);
    outline.lineTo(0.55, 0);
    outline.quadraticCurveTo(0.55, -0.85, 0, -1.25);
    outline.quadraticCurveTo(-0.55, -0.85, -0.55, 0);
    outline.closePath();
    // shape (x, y) → world (x, -z); the extrusion runs along y
    k.add(hull, extrude(outline, 0.32, 0.13), 0, 0.5, 0, 2, -P2);
    k.add(stripe, extrude(outline, 0.08, 0.05), 0, 0.57, 0, 2, -P2, 0, 0, 1.1, 1.06, 1);
    k.add(deck, extrude(outline, 0.04, 0.02), 0, 0.74, 0, 2, -P2, 0, 0, 0.88, 0.9, 1);
    k.add(hull, tor(0.15, 0.05), 0.4, 0.95, -0.55, 1, 0, P2, 0);
    k.add(cabin, box(0.68, 0.42, 0.72, 0.14), 0, 0.97, -0.5, 2);
    k.add(cabRoof, box(0.8, 0.1, 0.84, 0.05), 0, 1.22, -0.5, 2);
    for (const s of [-1, 1]) for (const z of [-0.62, -0.36]) {
      k.add(ports, tor(0.08, 0.03), s * 0.35, 0.97, z, 1, 0, P2, 0);
      k.deco(cyl(0.07, 0.07, 0.02), GLASS, s * 0.34, 0.97, z, 0.1, 0, 0, P2);
    }
    eyes(k, 0, 1.03, -0.12, 0.13, 0.05);
    cheeks(k, 0, 0.94, -0.13, 0.24, 0.055);
    smile(k, 0, 0.95, -0.12, 0.06);
    k.add(mast, cyl(0.05, 0.05, 2.25), 0, 1.85, 0.2, 1);
    k.add(mast, capsule(0.045, 1.0), 0, 1.33, -0.3, 1, P2);
    k.add(mast, extrude(shape([[0, 0], [0.42, -0.11], [0, -0.24]]), 0.04, 0.03), 0, 3.0, 0.15, 2, 0, -P2, 0);
    k.add(mast, sph(0.07), 0, 2.99, 0.2, 1);
    const mainSail = new THREE.Shape();
    mainSail.moveTo(0.1, 0);
    mainSail.lineTo(1.0, 0);
    mainSail.quadraticCurveTo(0.8, 0.9, 0.1, 1.55);
    mainSail.closePath();
    k.add(sail, extrude(mainSail, 0.06, 0.04), 0, 1.38, 0.15, 2, 0, P2, 0);
    const jibSail = new THREE.Shape();
    jibSail.moveTo(-0.1, 0);
    jibSail.lineTo(-0.85, 0);
    jibSail.quadraticCurveTo(-0.55, 0.6, -0.1, 1.35);
    jibSail.closePath();
    k.add(jib, extrude(jibSail, 0.06, 0.04), 0, 0.95, 0.25, 2, 0, P2, 0);
    k.deco(cyl(0.01, 0.01, 2.2), 0x8a5530, 0, 1.85, 0.75, 0.6, -0.42);
    k.deco(star(0.09), GOLD, -0.035, 1.95, -0.2, 0.4, 0, -P2, 0);
  },
  // 7 Robot with a screen face, chest panel, claws and a backpack
  (k) => {
    const feet = k.part(1), legs = k.part(4), joints = k.part(0), body = k.part(7), panel = k.part(2);
    const arms = k.part(4), hands = k.part(1), head = k.part(1), ears = k.part(6), pack = k.part(5);
    for (const s of [-1, 1]) {
      k.add(feet, box(0.42, 0.2, 0.56, 0.09), s * 0.3, 0.1, 0.06, 1);
      k.add(legs, box(0.28, 0.5, 0.3, 0.1), s * 0.3, 0.45, 0, 1);
      k.add(joints, tor(0.17, 0.05), s * 0.3, 0.46, 0, 1, P2);
      k.add(joints, sph(0.17), s * 0.7, 1.5, 0, 1);
      k.add(arms, box(0.24, 0.62, 0.28, 0.1), s * 0.78, 1.18, 0.02, 1, 0, 0, s * 0.15);
      k.add(joints, tor(0.15, 0.045), s * 0.83, 0.9, 0.03, 1, P2, 0, s * 0.15);
      k.add(hands, tor(0.15, 0.07, Math.PI * 1.4), s * 0.88, 0.72, 0.04, 1, 0, P2, P2 + 0.7 * Math.PI);
      k.add(ears, cyl(0.15, 0.15, 0.12), s * 0.52, 2.05, 0, 1, 0, 0, P2);
      k.deco(cyl(0.06, 0.06, 0.14), SILVER, s * 0.58, 2.05, 0, 0.25, 0, 0, P2);
    }
    k.add(body, box(1.2, 0.95, 0.8, 0.24), 0, 1.15, 0, 3);
    k.add(joints, cyl(0.2, 0.22, 0.14), 0, 1.68, 0, 1);
    k.add(panel, box(0.66, 0.44, 0.08, 0.06), 0, 1.2, 0.41, 1);
    k.add(panel, box(1.24, 0.12, 0.84, 0.06), 0, 0.78, 0, 2);
    k.deco(heart(0.18), 0xff4466, -0.14, 1.27, 0.47, 0.3);
    for (const [x, col] of [[0.06, 0xffd51c], [0.16, 0x34c759], [0.26, 0x1478f4]] as const) button(k, x, 1.3, 0.46, 0.045, col);
    for (let i = 0; i < 3; i++) k.deco(box(0.26, 0.03, 0.02, 0.01), 0x2c3170, 0.1, 1.15 - i * 0.06, 0.46, 0.4);
    k.add(head, box(0.95, 0.72, 0.78, 0.24), 0, 2.05, 0, 2);
    k.deco(box(0.72, 0.44, 0.04, 0.08), 0x23285c, 0, 2.06, 0.39, 0.25);
    for (const s of [-1, 1]) k.deco(capsule(0.06, 0.06), 0x6ff3ff, s * 0.17, 2.12, 0.42, 0.2);
    smile(k, 0, 2.0, 0.42, 0.08, 0, 0, 0x6ff3ff);
    cheeks(k, 0, 1.98, 0.42, 0.27, 0.05);
    k.add(ears, cyl(0.03, 0.03, 0.3), 0, 2.55, 0, 1);
    k.add(ears, sph(0.1), 0, 2.74, 0, 1);
    k.add(ears, tor(0.1, 0.035), 0, 2.42, 0, 1, P2);
    k.add(pack, box(0.72, 0.62, 0.26, 0.1), 0, 1.2, -0.5, 2);
    k.add(pack, capsule(0.06, 0.4), 0, 1.47, -0.64, 1, 0, 0, P2);
    k.deco(star(0.1), GOLD, 0, 1.15, -0.64, 0.4, 0, Math.PI, 0);
  },
  // 8 Air Balloon with gored stripes, a face, sandbags and a bunny passenger
  (k) => {
    const redF = k.part(6), redB = k.part(6), yelF = k.part(2), yelB = k.part(2), cap = k.part(0);
    const bandLow = k.part(1), bandHigh = k.part(1), skirt = k.part(1), basket = k.part(5), rim = k.part(4), bags = k.part(3);
    const env = [[0.3, 1.1], [0.5, 1.28], [0.78, 1.62], [0.95, 2.0], [0.98, 2.3], [0.9, 2.65], [0.68, 2.93], [0.38, 3.08], [0, 3.13]];
    for (let i = 0; i < 8; i++) {
      // gores alternate red/yellow; front = the ones around +z (lathe angle 0 is +z)
      const front = i < 2 || i > 5;
      const part = i % 2 ? (front ? yelF : yelB) : (front ? redF : redB);
      k.add(part, lathe(env, 8, ((i - 0.5) * Math.PI) / 4, Math.PI / 4), 0, 0, 0, 3);
    }
    k.add(cap, lathe([[0.42, 3.0], [0.3, 3.12], [0, 3.17]]), 0, 0, 0, 1);
    k.add(cap, cyl(0.02, 0.02, 0.3), 0, 3.3, 0, 1);
    k.add(cap, extrude(shape([[0, 0], [0.3, -0.08], [0, -0.17]]), 0.04, 0.025), 0, 3.44, 0, 2);
    k.add(bandLow, tor(0.8, 0.075), 0, 1.65, 0, 3, P2);
    k.add(bandHigh, tor(0.9, 0.07), 0, 2.66, 0, 3, P2);
    k.add(skirt, lathe([[0.3, 0.82], [0.25, 0.86], [0.26, 1.0], [0.32, 1.12]]), 0, 0, 0, 2);
    eyes(k, 0, 2.3, 0.96, 0.22, 0.08);
    cheeks(k, 0, 2.14, 0.93, 0.4, 0.09);
    smile(k, 0, 2.15, 0.97, 0.1, 0, -0.1);
    for (const s of [-1, 1]) for (const t of [-1, 1]) {
      k.deco(cyl(0.015, 0.015, 0.5), 0x8a5530, s * 0.24, 0.66, t * 0.24, 0.6, t * 0.1, 0, -s * 0.1);
    }
    k.deco(cyl(0.09, 0.12, 0.14), 0x5d6273, 0, 0.76, 0, 0.3);
    k.add(basket, box(0.66, 0.42, 0.66, 0.1), 0, 0.21, 0, 2);
    k.add(rim, box(0.74, 0.09, 0.74, 0.045), 0, 0.43, 0, 2);
    k.add(rim, box(0.72, 0.08, 0.72, 0.04), 0, 0.04, 0, 2);
    for (let i = 0; i < 3; i++) k.deco(box(0.68, 0.025, 0.68, 0.012), 0xc0782f, 0, 0.13 + i * 0.1, 0, 0.7);
    for (const [x, z] of [[0.38, 0.2], [0.38, -0.2], [-0.38, 0.2], [-0.38, -0.2]]) {
      k.add(bags, sph(0.14), x * 1.04, 0.25, z, 1, 0, 0, 0, 0.8, 1.15, 0.9);
    }
    bunny(k, -0.08, 0.6, 0.02, 0.48);
  },
  // 9 Rubber Duck in a striped swim ring, with a scarf and a beanie, on a puddle
  (k) => {
    const water = k.part(7), foam = k.part(0), ringA = k.part(6), ringB = k.part(0), body = k.part(2), head = k.part(2);
    const wings = k.part(2), scarf = k.part(1), hat = k.part(4), brim = k.part(6);
    k.add(water, sph(1), 0, 0.08, 0.05, 3, 0, 0, 0, 1.35, 0.1, 1.45);
    k.add(foam, tor(1.32, 0.08), 0, 0.1, 0.05, 3, P2, 0, 0, 1, 1.08, 1);
    for (let i = 0; i < 8; i++) k.add(i % 2 ? ringB : ringA, tor(0.95, 0.24, Math.PI / 4), 0, 0.45, 0, 2, P2, 0, (i * Math.PI) / 4);
    k.add(body, sph(0.85), 0, 0.8, -0.05, 3, 0, 0, 0, 1, 0.82, 1.15);
    k.add(body, cone(0.22, 0.4), 0, 1.17, -0.95, 1, -0.9);
    k.add(head, sph(0.52), 0, 1.7, 0.42, 3);
    for (const s of [-1, 1]) k.add(wings, sph(0.3), s * 0.78, 1.07, -0.1, 1, 0.2, 0, s * -0.3, 0.45, 0.75, 1.25);
    k.deco(sph(0.2), 0xff9a1c, 0, 1.6, 0.92, 0.55, 0, 0, 0, 1.25, 0.45, 1.25);
    k.deco(sph(0.15), 0xf07a12, 0, 1.5, 0.86, 0.55, 0, 0, 0, 1.05, 0.4, 1.05);
    eyes(k, 0, 1.83, 0.86, 0.2, 0.07);
    cheeks(k, 0, 1.65, 0.8, 0.36, 0.08);
    k.add(scarf, tor(0.4, 0.11), 0, 1.27, 0.28, 2, P2 - 0.25);
    k.add(scarf, capsule(0.09, 0.28), 0.22, 1.1, 0.68, 1, 0.3, 0, 0.35, 1.2, 1, 0.6);
    k.add(hat, lathe([[0.4, 0], [0.37, 0.18], [0.25, 0.36], [0.1, 0.43], [0, 0.44]], 28), 0, 2.1, 0.38, 2, -0.15);
    k.add(brim, tor(0.41, 0.08), 0, 2.1, 0.38, 2, P2 - 0.15);
    k.add(brim, sph(0.13), 0, 2.56, 0.33, 1);
    k.deco(heart(0.16), 0xff4f7d, 0.25, 2.22, 0.66, 0.45, -0.15, 0.4, 0);
    for (const [x, z, r] of [[1.05, 0.7, 0.07], [1.15, 0.45, 0.05], [-1.1, 0.55, 0.06], [-0.4, 1.35, 0.06], [0.45, 1.3, 0.05]]) {
      k.deco(sph(r), 0xeaffff, x, 0.2, z, 0.1);
    }
  },
  // 10 Toy Train with a smiling boiler, banded boiler, dome, lamp and a cab with windows
  (k) => {
    const base = k.part(2), boards = k.part(2), boiler = k.part(6), bands = k.part(2), front = k.part(4), chimney = k.part(4);
    const dome = k.part(5), cab = k.part(1), frames = k.part(5), roof = k.part(7), catcher = k.part(3);
    k.add(base, box(1.0, 0.22, 2.5, 0.08), 0, 0.45, 0, 3);
    for (const s of [-1, 1]) k.add(boards, box(0.2, 0.07, 1.5, 0.03), s * 0.58, 0.6, 0.35, 2);
    k.add(boiler, cyl(0.45, 0.45, 1.3), 0, 0.98, 0.35, 3, P2);
    for (const z of [-0.12, 0.35, 0.82]) k.add(bands, tor(0.46, 0.05), 0, 0.98, z, 1);
    k.add(front, sph(0.45), 0, 0.98, 1.0, 2, 0, 0, 0, 1, 1, 0.28);
    k.add(front, tor(0.44, 0.05), 0, 0.98, 1.0, 1);
    eyes(k, 0, 1.06, 1.12, 0.15, 0.06);
    cheeks(k, 0, 0.93, 1.1, 0.27, 0.07);
    smile(k, 0, 0.94, 1.13, 0.08);
    k.add(chimney, lathe([[0.13, 0], [0.13, 0.25], [0.24, 0.45], [0.24, 0.52], [0.16, 0.52]]), 0, 1.38, 0.72, 2);
    k.add(chimney, tor(0.24, 0.045), 0, 1.9, 0.72, 1, P2);
    puffs(k, [[0, 2.08, 0.72, 0.12], [-0.1, 2.28, 0.6, 0.15], [-0.25, 2.48, 0.45, 0.18]]);
    k.add(dome, sph(0.19), 0, 1.42, 0.18, 1, 0, 0, 0, 1, 0.85, 1);
    k.add(dome, cyl(0.2, 0.2, 0.08), 0, 1.36, 0.18, 1);
    k.add(dome, cyl(0.1, 0.12, 0.14), 0, 1.47, 0.98, 1, P2);
    k.deco(cyl(0.07, 0.07, 0.02), 0xfff6a0, 0, 1.47, 1.06, 0.15, P2);
    k.add(cab, box(1.0, 0.95, 0.9, 0.12), 0, 1.03, -0.75, 2);
    for (const s of [-1, 1]) {
      k.add(frames, box(0.05, 0.4, 0.46, 0.04), s * 0.51, 1.22, -0.75, 1);
      k.deco(box(0.03, 0.3, 0.36, 0.03), GLASS, s * 0.53, 1.22, -0.75, 0.1);
      k.add(frames, box(0.3, 0.3, 0.05, 0.04), s * 0.27, 1.32, -0.29, 1);
      k.deco(box(0.22, 0.22, 0.03, 0.02), GLASS, s * 0.27, 1.32, -0.27, 0.1);
    }
    k.add(roof, box(1.2, 0.18, 1.1, 0.09), 0, 1.58, -0.75, 2);
    k.add(roof, capsule(0.07, 1.0), 0, 1.68, -0.75, 1, P2);
    // shape (z, y) → world: the extrusion runs across x
    k.add(catcher, extrude(shape([[0, 0.56], [0, 0.1], [0.3, 0.1]]), 0.72, 0.04), 0, 0, 1.17, 2, 0, -P2, 0);
    k.add(catcher, capsule(0.07, 0.8), 0, 0.6, 1.2, 1, 0, 0, P2);
    for (const t of [0.3, 0.55, 0.8]) k.deco(box(0.76, 0.035, 0.035, 0.015), 0xffffff, 0, 0.56 - t * 0.46, 1.21 + t * 0.3, 0.5, -0.58);
    for (const z of [-0.85, -0.15, 0.6]) for (const x of [-0.52, 0.52]) wheel(k, x, 0.28, z, 0.25, 0.12);
    for (const s of [-1, 1]) k.deco(box(0.03, 0.05, 1.45, 0.02), 0xb9bec8, s * 0.6, 0.28, -0.12, 0.3);
    k.deco(capsule(0.05, 0.2), 0x6b6f7a, 0, 0.45, -1.3, 0.4, P2);
  },
];
