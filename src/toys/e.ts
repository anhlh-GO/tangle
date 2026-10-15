// Toys 41–50 (see kit3d.ts for the helpers and the part rules).
import { Kit, type Build, box, sph, cyl, tor, cone, capsule, eyes, cheeks, wheel, plateTexture } from '../kit3d';
import * as THREE from 'three';

type V3 = [number, number, number];
const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);
const ZAX = new THREE.Vector3(0, 0, 1);
const GLASS = 0xdff4ff;
const INK = 0x1d1a24;
const MOUTH = 0x6a2236;
const GOLD = 0xffc928;
const WHITE = 0xfdfcfb;

/** Point a mesh's local +y (or another axis) along a direction. */
function aim(m: THREE.Mesh, d: THREE.Vector3, from = UP): THREE.Mesh {
  m.quaternion.setFromUnitVectors(from, d.clone().normalize());
  return m;
}
/** A knitted capsule from a to b (arms, legs, struts, stalks). */
function stick(k: Kit, part: number, r: number, a: V3, b: V3, rep = 1): THREE.Mesh {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const m = k.add(part, capsule(r, Math.max(0.01, d.length())), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, rep);
  return aim(m, d);
}
/** A plain (never knitted) capsule from a to b. */
function decoStick(k: Kit, color: THREE.ColorRepresentation, r: number, a: V3, b: V3, rough = 0.4): THREE.Mesh {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const m = k.deco(capsule(r, Math.max(0.01, d.length())), color, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, rough);
  return aim(m, d);
}
/** A knitted ring (stitched rim / cuff / collar) around an axis. */
function ring(k: Kit, part: number, R: number, t: number, p: V3, axis: V3, rep = 1, sx = 1, sy = 1): THREE.Mesh {
  const m = k.add(part, tor(R, t), p[0], p[1], p[2], rep, 0, 0, 0, sx, sy, 1);
  return aim(m, new THREE.Vector3(...axis), ZAX);
}
/** A point on an ellipsoid surface and its outward normal. */
function shellAt(c: V3, R: V3, th: number, ph: number, lift = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
  const dir = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
  const n = new THREE.Vector3(dir.x / R[0], dir.y / R[1], dir.z / R[2]).normalize();
  const p = new THREE.Vector3(c[0] + R[0] * dir.x, c[1] + R[1] * dir.y, c[2] + R[2] * dir.z).addScaledVector(n, lift);
  return { p, n };
}
/** A patch (dot, spike, plate) sitting on an ellipsoid surface, facing out. */
function onShell(k: Kit, part: number, geo: THREE.BufferGeometry, c: V3, R: V3, th: number, ph: number, rep = 1, s: V3 = [1, 1, 1], lift = 0): THREE.Mesh {
  const { p, n } = shellAt(c, R, th, ph, lift);
  return aim(k.add(part, geo, p.x, p.y, p.z, rep, 0, 0, 0, ...s), n);
}
/** A smooth tube through points (trunks, tails, trims, necklaces). */
const tube = (pts: V3[], r: number, seg = 48, closed = false) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed), seg, r, 12, closed);
/** Upper half of a sphere (hats, domes). */
const dome = (r: number) => new THREE.SphereGeometry(r, 32, 14, 0, PI * 2, 0, PI / 2);
/** A wide arch (fender / wheel arch): a half torus stretched across its axis. */
const arch = (r: number, t: number) => new THREE.TorusGeometry(r, t, 10, 24, PI);
function extrude(shape: THREE.Shape, depth: number, bevel: number, center = true): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
  if (center) g.center();
  return g;
}
/** A puffy heart, centred, facing +z. */
function heart(s: number): THREE.BufferGeometry {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5 * s);
  h.bezierCurveTo(-0.15 * s, -0.3 * s, -0.55 * s, -0.1 * s, -0.5 * s, 0.18 * s);
  h.bezierCurveTo(-0.45 * s, 0.48 * s, -0.08 * s, 0.5 * s, 0, 0.25 * s);
  h.bezierCurveTo(0.08 * s, 0.5 * s, 0.45 * s, 0.48 * s, 0.5 * s, 0.18 * s);
  h.bezierCurveTo(0.55 * s, -0.1 * s, 0.15 * s, -0.3 * s, 0, -0.5 * s);
  return extrude(h, 0.04 * s, 0.06 * s);
}
/** A puffy five-point star, centred, facing +z. */
function star(s: number): THREE.BufferGeometry {
  const h = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 ? 0.22 : 0.5) * s, a = (i * PI) / 5 + PI / 2;
    if (i === 0) h.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else h.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  h.closePath();
  return extrude(h, 0.05 * s, 0.06 * s);
}
/** A bat wing (root at the origin, spreading to +x and up) with a scalloped lower edge. */
function batWing(s: number): THREE.BufferGeometry {
  const w = new THREE.Shape();
  const P = (x: number, y: number): [number, number] => [x * s, y * s];
  w.moveTo(...P(0, 0.12));
  w.quadraticCurveTo(...P(0.3, 0.8), ...P(0.85, 0.82));
  w.quadraticCurveTo(...P(0.66, 0.62), ...P(0.72, 0.3));
  w.quadraticCurveTo(...P(0.5, 0.38), ...P(0.42, 0.1));
  w.quadraticCurveTo(...P(0.22, 0.2), ...P(0.05, -0.08));
  w.closePath();
  return extrude(w, 0.04 * s, 0.05 * s, false);
}
/** A little smile (lower half torus) centred at (x, y), facing +z. */
function smile(k: Kit, x: number, y: number, z: number, r: number, rx = 0): void {
  k.deco(tor(r, Math.max(0.016, r * 0.2), PI), MOUTH, x, y, z, 0.4, rx, 0, PI);
}
/**
 * Build some meshes in their closed / upright pose, then hang them in a pivot
 * group at `at` turned by `rot` (lids that open, horses that ride around).
 */
function pivot(k: Kit, at: V3, rot: V3, build: () => void): THREE.Group {
  const n = k.group.children.length;
  build();
  const kids = k.group.children.slice(n);
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.set(...rot);
  k.group.add(g);
  for (const m of kids) {
    m.position.sub(g.position);
    g.add(m);
  }
  return g;
}

export const TOYS_E: Build[] = [
  // 41 Panda: sitting in a sweater, nibbling bamboo, beanie on
  (k) => {
    const head = k.part(0), marks = k.part(4), muzzle = k.part(2), sweater = k.part(1), rib = k.part(7),
      arms = k.part(4), legs = k.part(4), bamboo = k.part(3), hat = k.part(5), trim = k.part(6);
    k.add(sweater, sph(0.72), 0, 0.82, 0, 3, 0, 0, 0, 1, 1, 0.9);
    k.add(rib, tor(0.6, 0.085), 0, 0.42, 0, 2, PI / 2, 0, 0, 1, 0.9, 1);
    k.add(rib, tor(0.37, 0.09), 0, 1.43, 0.02, 2, PI / 2, 0, 0, 1, 0.92, 1);
    k.add(muzzle, heart(0.36), 0, 0.92, 0.65, 1, -0.12);
    // sitting legs with pink paw pads
    for (const s of [-1, 1]) {
      stick(k, legs, 0.2, [s * 0.36, 0.3, 0.2], [s * 0.42, 0.26, 0.62]);
      k.deco(sph(0.12), 0xff9db5, s * 0.43, 0.25, 0.84, 0.6, 0, 0, 0, 1, 1, 0.35);
      for (const t of [-1, 0, 1]) k.deco(sph(0.042), 0xff9db5, s * 0.43 + t * 0.085, 0.4 - Math.abs(t) * 0.025, 0.8, 0.6, 0, 0, 0, 1, 1, 0.5);
      // arms with ribbed cuffs and round paws
      const a: V3 = [s * 0.58, 1.2, 0.05], b: V3 = [s * 0.36, 0.92, 0.55];
      stick(k, arms, 0.15, a, b);
      ring(k, rib, 0.145, 0.05, [s * 0.4, 0.97, 0.47], [b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      k.add(arms, sph(0.16), s * 0.34, 0.9, 0.6, 1);
    }
    // bamboo stalk held up in the right paw
    const dir = new THREE.Vector3(Math.sin(0.18), Math.cos(0.18), 0);
    const bc = new THREE.Vector3(0.5, 1.02, 0.72);
    k.add(bamboo, cyl(0.075, 0.075, 1.3, 16), bc.x, bc.y, bc.z, 1, 0, 0, -0.18);
    for (const t of [-0.35, 0.05, 0.45]) {
      const p = bc.clone().addScaledVector(dir, t);
      ring(k, bamboo, 0.078, 0.028, [p.x, p.y, p.z], [dir.x, dir.y, dir.z]);
    }
    const top = bc.clone().addScaledVector(dir, 0.6);
    for (const [dx, dy, rz] of [[0.16, 0.06, -0.5], [0.12, 0.18, -1.1], [-0.05, 0.2, 0.6]] as const) {
      k.add(bamboo, sph(0.17), top.x + dx, top.y + dy, top.z, 1, 0.3, 0, rz, 1, 0.18, 0.42);
    }
    // head with black ears and eye patches
    k.add(head, sph(0.62), 0, 1.95, 0.05, 3, 0, 0, 0, 1.12, 0.95, 1);
    for (const s of [-1, 1]) {
      k.add(marks, sph(0.22), s * 0.6, 2.3, 0.0, 1, 0, 0, 0, 1, 1, 0.6);
      k.deco(sph(0.11), 0xff9db5, s * 0.6, 2.3, 0.1, 0.6, 0, 0, 0, 1, 1, 0.3);
      k.add(marks, sph(0.16), s * 0.23, 1.97, 0.6, 1, 0, 0, s * -0.5, 0.8, 1.15, 0.45);
    }
    k.add(muzzle, sph(0.27), 0, 1.76, 0.58, 1, 0, 0, 0, 1.15, 0.78, 0.62);
    k.deco(sph(0.07), INK, 0, 1.84, 0.74, 0.3, 0, 0, 0, 1.3, 0.85, 0.8);
    for (const s of [-1, 1]) smile(k, s * 0.055, 1.77, 0.74, 0.055);
    eyes(k, 0, 1.99, 0.68, 0.23, 0.075);
    cheeks(k, 0, 1.8, 0.57, 0.42, 0.07);
    // beanie with a stitched brim and pompom
    k.add(hat, dome(0.5), 0, 2.36, -0.02, 2, -0.12, 0, 0, 1.05, 0.85, 1.05);
    k.add(trim, tor(0.52, 0.1), 0, 2.38, -0.02, 2, PI / 2 - 0.12);
    k.add(trim, sph(0.16), 0, 2.82, -0.08, 1);
  },
  // 42 Fox: sitting with a huge fluffy tail, a scarf and a leaf on its head
  (k) => {
    const body = k.part(5), chest = k.part(0), head = k.part(5), muzzle = k.part(0), ears = k.part(6),
      legs = k.part(4), tail = k.part(6), tip = k.part(0), scarf = k.part(1), leaf = k.part(3);
    k.add(body, sph(0.68), 0, 0.82, -0.05, 3, 0, 0, 0, 1, 1.05, 0.92);
    for (const s of [-1, 1]) k.add(body, sph(0.3), s * 0.42, 0.32, -0.05, 1, 0, 0, 0, 1, 0.9, 1.3);
    k.add(chest, sph(0.42), 0, 0.95, 0.42, 2, 0, 0, 0, 0.95, 1.25, 0.55);
    // legs in dark socks
    for (const s of [-1, 1]) {
      stick(k, legs, 0.12, [s * 0.24, 0.7, 0.38], [s * 0.26, 0.17, 0.5]);
      k.add(legs, sph(0.15), s * 0.26, 0.12, 0.56, 1, 0, 0, 0, 1, 0.75, 1.2);
      k.add(legs, sph(0.17), s * 0.54, 0.1, 0.3, 1, 0, 0, 0, 1, 0.6, 1.4);
    }
    // head: wide cheeks of white fluff, pointy snout, tall ears
    k.add(head, sph(0.56), 0, 1.85, 0.08, 3, 0, 0, 0, 1.18, 0.95, 1);
    for (const s of [-1, 1]) {
      k.add(muzzle, sph(0.3), s * 0.3, 1.68, 0.38, 1, 0, 0, 0, 1, 0.75, 0.8);
      k.add(ears, cone(0.22, 0.5, 16), s * 0.36, 2.36, 0.02, 1, 0, 0, -s * 0.3, 1, 1, 0.5);
      k.deco(cone(0.13, 0.3, 16), 0xffc4d2, s * 0.35, 2.31, 0.09, 0.6, 0, 0, -s * 0.3, 1, 1, 0.3);
    }
    k.add(muzzle, sph(0.22), 0, 1.72, 0.62, 1, 0, 0, 0, 1, 0.85, 1.2);
    k.deco(sph(0.075), INK, 0, 1.77, 0.87, 0.3, 0, 0, 0, 1.2, 0.85, 0.8);
    for (const s of [-1, 1]) smile(k, s * 0.05, 1.68, 0.83, 0.05);
    eyes(k, 0, 1.94, 0.62, 0.22, 0.075);
    cheeks(k, 0, 1.75, 0.6, 0.42, 0.065);
    // big bushy tail curling up the right side, white tip
    for (const [x, y, z, r] of [[0.35, 0.3, -0.6, 0.2], [0.68, 0.42, -0.8, 0.27], [0.98, 0.74, -0.76, 0.32], [1.12, 1.12, -0.52, 0.3]] as const) {
      k.add(tail, sph(r), x, y, z, 1);
    }
    k.add(tip, sph(0.25), 1.08, 1.46, -0.3, 1, 0.5, 0, 0.3, 1, 1.15, 1);
    // knitted scarf with a knot and fringe
    k.add(scarf, tor(0.38, 0.11), 0, 1.38, 0.05, 2, PI / 2 - 0.15);
    k.add(scarf, sph(0.12), 0.24, 1.32, 0.42, 1);
    stick(k, scarf, 0.09, [0.26, 1.28, 0.44], [0.34, 0.92, 0.56]);
    for (const t of [-1, 0, 1]) decoStick(k, 0x9fd0ff, 0.025, [0.34 + t * 0.05, 0.86, 0.57], [0.35 + t * 0.06, 0.76, 0.58], 0.7);
    // leaf + berry on the head
    for (const [x, rz, ry] of [[-0.3, 0.5, 0.4], [-0.12, -0.3, -0.5], [-0.24, 0.1, 1.6]] as const) {
      k.add(leaf, sph(0.2), x, 2.36, 0.15, 1, 0.2, ry, rz, 1, 0.2, 0.5);
    }
    k.deco(sph(0.075), 0xe2244a, -0.2, 2.42, 0.2, 0.3);
  },
  // 43 Elephant: trunk raised, blanket with tassels, party hat
  (k) => {
    const body = k.part(1), legs = k.part(7), cuffs = k.part(5), head = k.part(7), trunk = k.part(1), ears = k.part(0),
      earRim = k.part(4), blanket = k.part(6), trim = k.part(2), hat = k.part(4);
    k.add(body, sph(0.85), 0, 1.05, -0.2, 3, 0, 0, 0, 1, 0.88, 1.15);
    for (const s of [-1, 1]) for (const z of [0.36, -0.75]) {
      k.add(legs, cyl(0.22, 0.25, 0.75, 20), s * 0.42, 0.38, z, 1);
      k.add(cuffs, tor(0.245, 0.065), s * 0.42, 0.1, z, 1, PI / 2);
      for (const d of [-1, 1]) k.deco(sph(0.065), WHITE, s * 0.42 + d * 0.1, 0.07, z + 0.22, 0.5, 0, 0, 0, 1, 0.8, 0.7);
    }
    // little tail with a tuft
    stick(k, cuffs, 0.045, [0, 1.0, -1.16], [0.04, 0.66, -1.32]);
    k.add(cuffs, sph(0.09), 0.05, 0.6, -1.33, 1, 0, 0, 0, 1, 1.3, 1);
    // blanket: a band over the back (sphere girdle around z), edged with a trim loop
    const BC: V3 = [0, 1.05, -0.2], BR: V3 = [0.89, 0.79, 1.03];
    const P0 = (3 * PI) / 2 - 1.3, PL = 2.6, T0 = PI / 2 - 0.5, TL = 1.0;
    k.add(blanket, new THREE.SphereGeometry(1, 32, 8, P0, PL, T0, TL), BC[0], BC[1], BC[2], 2, PI / 2, 0, 0, BR[0], BR[2], BR[1]);
    const bl = (phi: number, th: number, lift = 0.02): V3 => {
      const lx = -Math.cos(phi) * Math.sin(th), ly = Math.cos(th), lz = Math.sin(phi) * Math.sin(th);
      return [BC[0] + BR[0] * lx * (1 + lift), BC[1] - BR[1] * lz * (1 + lift), BC[2] + BR[2] * ly * (1 + lift)];
    };
    const loop: V3[] = [];
    for (let i = 0; i <= 8; i++) loop.push(bl(P0 + (PL * i) / 8, T0));
    for (let i = 1; i < 4; i++) loop.push(bl(P0 + PL, T0 + (TL * i) / 4));
    for (let i = 0; i <= 8; i++) loop.push(bl(P0 + PL - (PL * i) / 8, T0 + TL));
    for (let i = 1; i < 4; i++) loop.push(bl(P0, T0 + TL - (TL * i) / 4));
    k.add(trim, tube(loop, 0.055, 96, true), 0, 0, 0, 2);
    for (const phi of [P0, P0 + PL]) for (const th of [T0, PI / 2, T0 + TL]) {
      const p = bl(phi, th, 0.04);
      k.add(trim, sph(0.075), p[0], p[1] - 0.07, p[2], 1, 0, 0, 0, 0.9, 1.3, 0.9);
    }
    for (const phi of [P0 + 0.45, P0 + PL - 0.45]) {
      const p = bl(phi, PI / 2, 0.04);
      const n = new THREE.Vector3((p[0] - BC[0]) / BR[0] ** 2, (p[1] - BC[1]) / BR[1] ** 2, (p[2] - BC[2]) / BR[2] ** 2);
      aim(k.add(trim, star(0.3), p[0], p[1], p[2], 1), n, ZAX);
    }
    // head, curled trunk, tusks
    k.add(head, sph(0.58), 0, 1.5, 0.82, 3, 0, 0, 0, 1.05, 0.98, 0.92);
    k.add(trunk, sph(0.22), 0, 1.3, 1.22, 1);
    k.add(trunk, tube([[0, 1.32, 1.2], [0, 1.05, 1.42], [0, 0.86, 1.62], [0, 0.9, 1.86], [0, 1.1, 1.95], [0, 1.24, 1.88]], 0.13), 0, 0, 0, 1.5);
    ring(k, trunk, 0.1, 0.05, [0, 1.26, 1.86], [0, 1, -0.4]);
    k.deco(cyl(0.08, 0.08, 0.04), 0xffb8cb, 0, 1.28, 1.85, 0.6, -0.4);
    for (const s of [-1, 1]) k.deco(cone(0.05, 0.22, 12), WHITE, s * 0.2, 1.16, 1.3, 0.4, PI / 2 + 0.35);
    eyes(k, 0, 1.64, 1.31, 0.22, 0.08);
    cheeks(k, 0, 1.43, 1.25, 0.37, 0.07);
    // big ears with stitched rims
    for (const s of [-1, 1]) {
      k.add(ears, sph(0.48), s * 0.64, 1.52, 0.66, 2, 0, -s * 0.6, 0, 0.18, 1, 0.85);
      k.add(earRim, tor(0.47, 0.055), s * 0.64, 1.52, 0.66, 1, 0, PI / 2 - s * 0.6, 0, 0.85, 1, 1);
    }
    // party hat with a pompom
    const ht = -0.25, hb: V3 = [0.12, 2.0, 0.78];
    const hp = (d: number): V3 => [hb[0] - Math.sin(ht) * d, hb[1] + Math.cos(ht) * d, hb[2]];
    k.add(hat, cone(0.22, 0.5, 20), ...hp(0.25), 1, 0, 0, ht);
    k.add(hat, tor(0.22, 0.055), ...hp(0.02), 1, PI / 2, 0, ht);
    k.add(trim, sph(0.09), ...hp(0.53), 1);
  },
  // 44 Giraffe: long spotted neck, mane, ossicones, leg warmers and a scarf
  (k) => {
    const body = k.part(2), neck = k.part(2), head = k.part(2), muzzle = k.part(0), spotsB = k.part(5), spotsN = k.part(5),
      legs = k.part(3), hooves = k.part(4), mane = k.part(6), scarf = k.part(1);
    const C: V3 = [0, 1.15, -0.15], R: V3 = [0.56, 0.48, 0.78];
    k.add(body, sph(1), C[0], C[1], C[2], 3, 0, 0, 0, ...R);
    for (const [th, ph] of [[0.45, 0.4], [0.9, -0.4], [1.15, 0.5], [0.7, -1.3], [1.05, -2.3], [0.55, 2.6], [1.15, 3.5], [0.9, 2.0], [1.3, 1.1], [1.25, -1.0]] as const) {
      onShell(k, spotsB, sph(0.13), C, R, th, ph, 1, [1, 0.3, 1], 0.01);
    }
    // legs with striped leg warmers + hooves
    for (const s of [-1, 1]) for (const z of [0.3, -0.6]) {
      k.add(legs, capsule(0.11, 0.62), s * 0.27, 0.5, z, 1);
      k.add(legs, tor(0.12, 0.05), s * 0.27, 0.38, z, 1, PI / 2);
      k.add(hooves, cyl(0.12, 0.14, 0.15, 16), s * 0.27, 0.075, z, 1);
    }
    // neck along A→B with spots all round, mane down the back
    const A = new THREE.Vector3(0, 1.35, 0.4), B = new THREE.Vector3(0, 2.25, 0.62);
    const dn = B.clone().sub(A), len = dn.length();
    dn.normalize();
    const u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3(0, dn.z, -dn.y); // v = back
    stick(k, neck, 0.2, [A.x, A.y, A.z], [B.x, B.y, B.z], 2);
    for (const [t, al] of [[0.15, 0.3], [0.3, 2.5], [0.48, -0.5], [0.62, 1.9], [0.78, 0.6], [0.9, 3.4], [0.55, -2.6], [0.25, -1.5]] as const) {
      const n = u.clone().multiplyScalar(Math.cos(al)).addScaledVector(v, Math.sin(al));
      const p = A.clone().addScaledVector(dn, len * t).addScaledVector(n, 0.2);
      aim(k.add(spotsN, sph(0.1), p.x, p.y, p.z, 1, 0, 0, 0, 1, 0.3, 1), n);
    }
    for (let i = 0; i < 6; i++) {
      const p = A.clone().addScaledVector(dn, len * (0.15 + i * 0.19)).addScaledVector(v, 0.19);
      k.add(mane, sph(0.1), p.x, p.y, p.z, 1, 0, 0, 0, 0.7, 1, 1);
    }
    // tail with a tuft
    stick(k, mane, 0.04, [0, 1.3, -0.9], [0, 0.85, -1.02]);
    k.add(mane, sph(0.1), 0, 0.78, -1.04, 1, 0, 0, 0, 1, 1.4, 1);
    // scarf round the neck
    const sp = A.clone().addScaledVector(dn, len * 0.38);
    ring(k, scarf, 0.22, 0.085, [sp.x, sp.y, sp.z], [dn.x, dn.y, dn.z], 1);
    stick(k, scarf, 0.07, [0.15, sp.y - 0.02, sp.z + 0.15], [0.26, sp.y - 0.35, sp.z + 0.24]);
    // head: muzzle, ears, ossicones
    k.add(head, sph(0.34), 0, 2.48, 0.72, 2, 0, 0, 0, 1, 0.92, 1.1);
    for (const s of [-1, 1]) {
      stick(k, head, 0.06, [s * 0.25, 2.6, 0.62], [s * 0.46, 2.66, 0.56]);
      stick(k, hooves, 0.045, [s * 0.12, 2.72, 0.62], [s * 0.15, 2.92, 0.6]);
      k.add(hooves, sph(0.08), s * 0.155, 2.95, 0.6, 1);
      k.deco(sph(0.03), INK, s * 0.08, 2.4, 1.2, 0.3);
    }
    k.add(muzzle, sph(0.26), 0, 2.32, 0.98, 1, 0, 0, 0, 1.05, 0.72, 0.85);
    eyes(k, 0, 2.6, 1.02, 0.15, 0.06);
    cheeks(k, 0, 2.43, 1.0, 0.26, 0.055);
    smile(k, 0, 2.3, 1.2, 0.06);
  },
  // 45 Bumblebee: striped and fuzzy, hugging a honey pot
  (k) => {
    const body = k.part(2), bands = k.part(4), head = k.part(2), antennae = k.part(6), wings = k.part(7),
      limbs = k.part(4), pot = k.part(5), rim = k.part(6), flower = k.part(0), scarf = k.part(1);
    k.add(body, sph(0.75), 0, 0.95, -0.15, 3, 0, 0, 0, 1, 0.95, 1.2);
    // stripes: sphere girdles around the long axis, plus the stinger
    for (const th of [1.45, 2.12]) {
      k.add(bands, new THREE.SphereGeometry(1, 32, 6, 0, PI * 2, th, 0.34), 0, 0.95, -0.15, 2, PI / 2, 0, 0, 0.78, 0.93, 0.74);
    }
    k.add(bands, cone(0.12, 0.3, 16), 0, 0.98, -1.12, 1, -PI / 2);
    // wings: two pairs, see-through-ish yarn
    for (const s of [-1, 1]) {
      k.add(wings, sph(0.4), s * 0.36, 1.86, -0.35, 1, 0.3, 0, -s * 0.45, 0.1, 1, 0.55);
      k.add(wings, sph(0.28), s * 0.56, 1.55, -0.6, 1, 0.3, 0, -s * 1.0, 0.1, 1, 0.6);
    }
    // head with a big face, antennae with pompoms, flower
    k.add(head, sph(0.5), 0, 1.32, 0.78, 2);
    for (const s of [-1, 1]) {
      stick(k, antennae, 0.03, [s * 0.15, 1.76, 0.76], [s * 0.3, 2.08, 0.86]);
      k.add(antennae, sph(0.1), s * 0.31, 2.12, 0.87, 1);
    }
    eyes(k, 0, 1.4, 1.22, 0.18, 0.085);
    cheeks(k, 0, 1.22, 1.16, 0.3, 0.07);
    smile(k, 0, 1.26, 1.27, 0.07);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      k.add(flower, sph(0.12), -0.26 + Math.cos(a) * 0.13, 1.76, 0.78 + Math.sin(a) * 0.13, 1, 0, 0, 0, 1, 0.45, 1);
    }
    k.deco(sph(0.075), 0xffd51c, -0.26, 1.8, 0.78, 0.5);
    // scarf between head and body
    ring(k, scarf, 0.36, 0.1, [0, 1.0, 0.56], [0, 0.55, 0.83], 1);
    k.add(scarf, sph(0.11), 0.3, 0.92, 0.82, 1);
    stick(k, scarf, 0.08, [0.33, 0.88, 0.86], [0.5, 0.6, 0.9]);
    // arms round the honey pot, little feet
    for (const s of [-1, 1]) {
      stick(k, limbs, 0.09, [s * 0.6, 1.0, 0.35], [s * 0.3, 0.62, 0.84]);
      k.add(limbs, sph(0.1), s * 0.28, 0.6, 0.88, 1);
      k.add(limbs, sph(0.16), s * 0.3, 0.25, 0.25, 1, 0, 0, 0, 1, 0.6, 1.3);
    }
    k.add(pot, cyl(0.25, 0.21, 0.42, 24), 0, 0.55, 0.75, 1);
    k.add(rim, tor(0.24, 0.065), 0, 0.77, 0.75, 1, PI / 2);
    k.add(rim, sph(0.22), 0, 0.82, 0.75, 1, 0, 0, 0, 1, 0.35, 1);
    k.deco(new THREE.PlaneGeometry(0.3, 0.11), 0xffffff, 0, 0.55, 0.995, 0.6, 0, 0, 0, 1, 1, 1, plateTexture('HONEY'));
    for (const [x, l] of [[-0.12, 0.12], [0.1, 0.18]] as const) decoStick(k, 0xffb11a, 0.035, [x, 0.76, 0.98], [x, 0.76 - l, 0.985], 0.2);
  },
  // 46 Fire Truck: ladder on top, siren, hose reel, side lockers
  (k) => {
    const body = k.part(6), cab = k.part(6), stripe = k.part(2), fenders = k.part(4), bumpers = k.part(1),
      lockers = k.part(0), turntable = k.part(5), ladder = k.part(7), hose = k.part(5), grille = k.part(4);
    k.add(body, box(1.25, 0.62, 1.75, 0.18), 0, 0.68, -0.45, 3);
    k.add(cab, box(1.22, 1.05, 0.9, 0.25), 0, 0.95, 0.85, 3);
    k.add(stripe, box(1.29, 0.1, 1.79, 0.05), 0, 0.82, -0.45, 2);
    k.add(stripe, box(1.26, 0.1, 0.94, 0.05), 0, 0.82, 0.85, 2);
    for (const s of [-1, 1]) aim(k.add(stripe, star(0.17), s * 0.625, 0.95, 0.85, 1), new THREE.Vector3(s, 0, 0), ZAX);
    // windows
    k.deco(box(1.0, 0.38, 0.04, 0.03), GLASS, 0, 1.2, 1.29, 0.1);
    for (const s of [-1, 1]) k.deco(box(0.04, 0.34, 0.5, 0.03), GLASS, s * 0.61, 1.2, 0.88, 0.1);
    // face on the front, grille, headlights, bumpers
    eyes(k, 0, 0.9, 1.32, 0.2, 0.075);
    cheeks(k, 0, 0.75, 1.31, 0.33, 0.06);
    smile(k, 0, 0.79, 1.32, 0.06);
    k.add(grille, box(0.56, 0.18, 0.06, 0.03), 0, 0.55, 1.31, 1);
    for (const x of [-0.16, 0, 0.16]) k.add(grille, capsule(0.025, 0.12), x, 0.55, 1.35, 1);
    for (const s of [-1, 1]) k.deco(sph(0.085), 0xfff1a8, s * 0.45, 0.56, 1.3, 0.3, 0, 0, 0, 1, 1, 0.6);
    k.add(bumpers, capsule(0.09, 1.1), 0, 0.38, 1.34, 1, 0, 0, PI / 2);
    k.add(bumpers, capsule(0.09, 1.1), 0, 0.42, -1.35, 1, 0, 0, PI / 2);
    for (const s of [-1, 1]) k.deco(sph(0.075), 0xff4d5a, s * 0.48, 0.72, -1.33, 0.3, 0, 0, 0, 1, 1, 0.6);
    // siren on the cab roof
    k.add(bumpers, box(0.72, 0.12, 0.26, 0.05), 0, 1.53, 1.0, 1);
    k.deco(sph(0.11), 0xff3b4a, -0.2, 1.62, 1.0, 0.2, 0, 0, 0, 1, 0.85, 1);
    k.deco(sph(0.11), 0x3b8bff, 0.2, 1.62, 1.0, 0.2, 0, 0, 0, 1, 0.85, 1);
    // wheels under knitted fenders
    for (const s of [-1, 1]) for (const z of [0.85, -0.85]) {
      k.add(fenders, arch(0.36, 0.075), s * 0.63, 0.32, z, 1, 0, PI / 2, 0, 1, 1, 1.6);
      wheel(k, s * 0.58, 0.3, z, 0.3, 0.22);
    }
    // side lockers with handles, rear door
    for (const s of [-1, 1]) {
      k.add(lockers, box(0.07, 0.32, 0.5, 0.04), s * 0.645, 0.6, -0.1, 1);
      k.deco(box(0.03, 0.04, 0.16, 0.015), 0xcfd3dc, s * 0.685, 0.68, -0.1, 0.3);
    }
    k.add(lockers, box(0.8, 0.42, 0.07, 0.04), 0, 0.68, -1.33, 1);
    // turntable + ladder sloping over the cab
    k.add(turntable, cyl(0.3, 0.34, 0.16, 24), 0, 1.07, -0.95, 1);
    stick(k, turntable, 0.06, [0, 1.12, -0.95], [0, 1.33, -0.95]);
    const L0: V3 = [0, 1.32, -1.1], L1: V3 = [0, 1.72, 0.55];
    for (const s of [-1, 1]) stick(k, ladder, 0.05, [s * 0.22, L0[1], L0[2]], [s * 0.22, L1[1], L1[2]]);
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      k.add(ladder, capsule(0.035, 0.42), 0, L0[1] + (L1[1] - L0[1]) * t, L0[2] + (L1[2] - L0[2]) * t, 1, 0, 0, PI / 2);
    }
    // hose reel on the deck
    k.add(hose, tor(0.18, 0.08), 0.42, 1.25, 0.05, 1, 0, PI / 2, 0);
    k.deco(cyl(0.08, 0.08, 0.2), 0xcfd3dc, 0.42, 1.25, 0.05, 0.3, 0, 0, PI / 2);
    k.add(hose, tube([[0.5, 1.12, 0.12], [0.62, 0.95, 0.28], [0.66, 0.92, 0.4]], 0.04, 12), 0, 0, 0, 1);
  },
  // 47 Submarine: round yellow sub with portholes, periscope and a propeller
  (k) => {
    const hull = k.part(2), cap = k.part(6), bands = k.part(1), tower = k.part(5), portholes = k.part(6),
      scope = k.part(4), sideFins = k.part(7), tailFins = k.part(7), prop = k.part(3), stern = k.part(1);
    k.add(hull, capsule(0.62, 1.5), 0, 0.85, 0, 3, PI / 2, 0, 0, 0.95, 1, 1);
    k.add(cap, new THREE.SphereGeometry(0.64, 28, 12, 0, PI * 2, 0, 1.0), 0, 0.85, 0.75, 2, PI / 2, 0, 0, 0.95, 1, 1);
    for (const z of [0.3, -0.3]) k.add(bands, tor(0.63, 0.065), 0, 0.85, z, 2, 0, 0, 0, 0.95, 1, 1);
    k.add(stern, tor(0.6, 0.08), 0, 0.85, -0.85, 2, 0, 0, 0, 0.95, 1, 1);
    k.add(stern, tor(0.4, 0.07), 0, 0.85, -1.18, 1, 0, 0, 0, 0.95, 1, 1);
    // face on the nose
    eyes(k, 0, 0.97, 1.34, 0.2, 0.08);
    cheeks(k, 0, 0.78, 1.28, 0.34, 0.065);
    smile(k, 0, 0.82, 1.37, 0.07);
    // portholes
    for (const s of [-1, 1]) for (const z of [0.6, 0, -0.6]) {
      k.add(portholes, tor(0.13, 0.045), s * 0.6, 0.92, z, 1, 0, PI / 2, 0);
      k.deco(cyl(0.1, 0.1, 0.03), GLASS, s * 0.6, 0.92, z, 0.1, 0, 0, PI / 2);
    }
    // conning tower, rim, hatch, periscope
    k.add(tower, box(0.42, 0.5, 0.8, 0.18), 0, 1.6, -0.05, 2);
    k.add(cap, box(0.48, 0.08, 0.86, 0.04), 0, 1.86, -0.05, 1);
    k.deco(cyl(0.08, 0.08, 0.03), GLASS, 0, 1.62, 0.355, 0.1, PI / 2);
    k.add(scope, cyl(0.14, 0.14, 0.07, 20), -0.05, 1.93, 0.12, 1);
    k.deco(tor(0.09, 0.02), 0xcfd3dc, -0.05, 1.99, 0.12, 0.3, PI / 2);
    k.add(scope, cyl(0.045, 0.045, 0.55, 12), 0.1, 2.15, -0.3, 1);
    k.add(scope, sph(0.07), 0.1, 2.42, -0.3, 1);
    k.add(scope, cyl(0.06, 0.06, 0.18, 12), 0.1, 2.42, -0.2, 1, PI / 2);
    k.deco(cyl(0.045, 0.045, 0.02), GLASS, 0.1, 2.42, -0.105, 0.1, PI / 2);
    // fins
    for (const s of [-1, 1]) k.add(sideFins, box(0.5, 0.07, 0.3, 0.03), s * 0.78, 0.78, 0.62, 1, 0, 0, s * 0.12);
    k.add(tailFins, box(0.07, 1.05, 0.34, 0.03), 0, 0.85, -1.22, 1);
    k.add(tailFins, box(1.05, 0.07, 0.34, 0.03), 0, 0.85, -1.22, 1);
    // propeller in a shroud
    k.add(prop, tor(0.34, 0.07), 0, 0.85, -1.55, 1);
    k.add(prop, cone(0.1, 0.22, 16), 0, 0.85, -1.5, 1, -PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + 0.4;
      k.add(prop, box(0.12, 0.42, 0.04, 0.02), -Math.sin(a) * 0.17, 0.85 + Math.cos(a) * 0.17, -1.55, 1, 0, 0.3, a);
    }
    // bubbles
    for (const [x, y, z, r] of [[0.32, 2.05, 0.95, 0.08], [0.42, 2.3, 1.02, 0.06], [0.36, 2.52, 0.96, 0.045]] as const) {
      k.deco(sph(r), 0xcff3ff, x, y, z, 0.1);
    }
  },
  // 48 Treasure Chest: lid flung open on a pile of gold, crown and pearls
  (k) => {
    const base = k.part(5), lid = k.part(5), pile = k.part(2), straps = k.part(7), lidStraps = k.part(7),
      rim = k.part(6), lock = k.part(2), feet = k.part(3), pearls = k.part(0), crown = k.part(4);
    k.add(base, box(1.8, 0.95, 1.15, 0.14), 0, 0.62, 0, 3);
    k.add(rim, box(1.86, 0.12, 1.21, 0.05), 0, 1.07, 0, 2);
    k.add(rim, box(1.86, 0.12, 1.21, 0.05), 0, 0.2, 0, 2);
    for (const s of [-1, 1]) {
      k.add(straps, box(0.18, 0.99, 1.2, 0.05), s * 0.55, 0.62, 0, 1);
      for (const z of [-0.42, 0.42]) k.add(feet, sph(0.14), s * 0.75, 0.12, z, 1, 0, 0, 0, 1, 0.75, 1);
    }
    // face on the front
    eyes(k, 0, 0.7, 0.6, 0.25, 0.085);
    cheeks(k, 0, 0.53, 0.59, 0.4, 0.07);
    smile(k, 0, 0.57, 0.6, 0.08);
    // gold pile with coins and gems
    const PC: V3 = [0, 1.05, 0.02], PR: V3 = [0.84, 0.32, 0.5];
    k.add(pile, sph(1), PC[0], PC[1], PC[2], 2, 0, 0, 0, ...PR);
    for (const [th, ph] of [[0.3, 0.5], [0.7, 1.2], [0.9, 2.6], [0.6, -0.4], [1.0, 0.2], [0.5, 2.0], [0.95, -2.5]] as const) {
      const { p, n } = shellAt(PC, PR, th, ph, 0.01);
      aim(k.deco(cyl(0.11, 0.11, 0.03, 20), GOLD, p.x, p.y, p.z, 0.3), n.lerp(new THREE.Vector3(Math.sin(ph), 1, 0), 0.4));
    }
    for (const [x, z, c] of [[-0.35, 0.25, 0xe2244a], [0.12, 0.3, 0x3b8bff], [-0.6, -0.05, 0x2fcf7a]] as const) {
      k.deco(new THREE.OctahedronGeometry(0.1), c, x, 1.32, z, 0.15, 0.3, 0.4, 0);
    }
    // crown on top of the pile
    const cp: V3 = [0.32, 1.42, 0.18];
    k.add(crown, cyl(0.2, 0.23, 0.16, 16), cp[0], cp[1], cp[2], 1, 0, 0, -0.2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + PI / 2;
      k.add(crown, cone(0.06, 0.16, 12), cp[0] + Math.cos(a) * 0.18 + 0.03, cp[1] + 0.15 - Math.cos(a) * 0.03, cp[2] + Math.sin(a) * 0.18, 1, 0, 0, -0.2);
    }
    k.deco(sph(0.05), 0xe2244a, cp[0], cp[1], cp[2] + 0.22, 0.2);
    // pearl necklace draped over the front
    k.add(pearls, tube([[-0.46, 1.22, 0.38], [-0.4, 1.14, 0.63], [-0.2, 0.95, 0.64], [0, 0.9, 0.64], [0.2, 0.95, 0.64], [0.38, 1.14, 0.63], [0.42, 1.22, 0.38]], 0.055, 40), 0, 0, 0, 1);
    k.add(pearls, heart(0.2), 0, 0.82, 0.68, 1);
    // the lid, built closed and then swung open on its back hinge
    pivot(k, [0, 1.12, -0.58], [-0.85, 0, 0], () => {
      k.add(lid, new THREE.CylinderGeometry(0.6, 0.6, 1.8, 28, 1, false, 0, PI), 0, 1.12, 0, 3, 0, 0, PI / 2);
      k.add(rim, box(1.86, 0.1, 1.21, 0.05), 0, 1.16, 0, 2);
      for (const s of [-1, 1]) k.add(lidStraps, tor(0.61, 0.075, PI), s * 0.55, 1.12, 0, 1, 0, PI / 2, 0);
      k.add(lock, box(0.3, 0.32, 0.1, 0.06), 0, 1.22, 0.62, 1);
      k.deco(sph(0.045), INK, 0, 1.25, 0.68, 0.3);
      k.deco(box(0.03, 0.08, 0.02, 0.01), INK, 0, 1.18, 0.68, 0.3);
    });
  },
  // 49 Carousel: striped tent roof, scalloped valance, three ponies on poles
  (k) => {
    const base = k.part(1), baseRim = k.part(2), column = k.part(5), roofA = k.part(6), roofB = k.part(0),
      valance = k.part(2), horses = k.part(7), manes = k.part(4), saddles = k.part(5), flag = k.part(4);
    k.add(base, cyl(1.15, 1.2, 0.28, 40), 0, 0.14, 0, 3);
    k.add(baseRim, tor(1.16, 0.075), 0, 0.29, 0, 3, PI / 2);
    k.add(baseRim, tor(1.2, 0.065), 0, 0.04, 0, 3, PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      k.deco(sph(0.045), 0xfff1a8, Math.sin(a) * 1.21, 0.15, Math.cos(a) * 1.21, 0.2);
    }
    // centre column with collars
    k.add(column, cyl(0.17, 0.17, 1.62, 20), 0, 1.08, 0, 2);
    k.add(column, tor(0.19, 0.06), 0, 0.34, 0, 1, PI / 2);
    k.add(column, tor(0.19, 0.06), 0, 1.84, 0, 1, PI / 2);
    // striped roof from eight wedges + valance + finial
    for (let i = 0; i < 8; i++) {
      k.add(i % 2 ? roofB : roofA, new THREE.ConeGeometry(1.3, 0.72, 8, 1, false, (i * PI) / 4, PI / 4), 0, 2.24, 0, 2);
    }
    k.add(valance, tor(1.28, 0.07), 0, 1.9, 0, 3, PI / 2);
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * PI * 2;
      k.add(valance, sph(0.17), Math.sin(a) * 1.25, 1.82, Math.cos(a) * 1.25, 1, 0, a, 0, 1, 0.8, 0.4);
    }
    k.add(valance, sph(0.12), 0, 2.64, 0, 1);
    k.deco(cyl(0.02, 0.02, 0.4), GOLD, 0, 2.86, 0, 0.3);
    k.add(flag, box(0.34, 0.22, 0.04, 0.02), 0.18, 2.95, 0, 1);
    k.deco(sph(0.035), GOLD, 0, 3.07, 0, 0.3);
    // ponies riding round (gold poles through them)
    for (let i = 0; i < 3; i++) {
      const a = 0.55 + (i * 2 * PI) / 3, R = 0.74, x = Math.sin(a) * R, z = Math.cos(a) * R, y = 0.95 + (i === 1 ? 0.12 : 0);
      k.deco(cyl(0.03, 0.03, 1.56, 10), GOLD, x, 1.08, z, 0.25);
      pivot(k, [x, y, z], [0, a + PI / 2, 0], () => {
        const P = (px: number, py: number, pz: number): V3 => [x + px, y + py, z + pz];
        k.add(horses, capsule(0.15, 0.32), ...P(0, 0, 0), 1, PI / 2);
        stick(k, horses, 0.09, P(0, 0.06, 0.2), P(0, 0.3, 0.32));
        k.add(horses, capsule(0.085, 0.16), ...P(0, 0.38, 0.42), 1, 1.15);
        for (const s of [-1, 1]) {
          stick(k, horses, 0.05, P(s * 0.08, -0.06, 0.2), P(s * 0.08, -0.26, 0.36));
          stick(k, horses, 0.05, P(s * 0.08, -0.06, -0.2), P(s * 0.08, -0.28, -0.3));
          k.deco(sph(0.028), INK, ...P(s * 0.07, 0.44, 0.46), 0.2);
        }
        k.add(manes, tube([P(0, 0.12, 0.08), P(0, 0.3, 0.2), P(0, 0.48, 0.34)], 0.055, 16), 0, 0, 0, 1);
        stick(k, manes, 0.05, P(0, 0.02, -0.32), P(0, -0.2, -0.44));
        k.add(saddles, sph(0.17), ...P(0, 0.12, -0.02), 1, 0, 0, 0, 1.05, 0.35, 1.1);
      });
    }
  },
  // 50 Dragon: chubby baby dragon with bat wings, spikes and a spade tail
  (k) => {
    const body = k.part(3), belly = k.part(2), head = k.part(3), snout = k.part(7), spikes = k.part(5),
      wingL = k.part(4), wingR = k.part(4), tail = k.part(7), limbs = k.part(3), scarf = k.part(6);
    const C: V3 = [0, 0.82, 0], R: V3 = [0.7, 0.735, 0.63];
    k.add(body, sph(1), C[0], C[1], C[2], 3, 0, 0, 0, ...R);
    k.add(belly, sph(0.48), 0, 0.8, 0.36, 2, 0, 0, 0, 1, 1.25, 0.55);
    for (const y of [0.6, 0.8, 1.0]) k.add(belly, capsule(0.03, 0.38 - Math.abs(y - 0.8) * 0.5), 0, y, 0.63, 1, 0, 0, PI / 2);
    // spikes down the back and head
    for (const th of [0.45, 0.8, 1.15, 1.5]) onShell(k, spikes, cone(0.11, 0.26, 12), C, R, th, -PI / 2, 1, [1, 1, 0.6], 0.09);
    const HC: V3 = [0, 1.85, 0.08], HR: V3 = [0.616, 0.5225, 0.55];
    for (const th of [0.55, 0.95]) onShell(k, spikes, cone(0.09, 0.22, 12), HC, HR, th, -PI / 2, 1, [1, 1, 0.6], 0.08);
    // head, snout, horns, ear frills
    k.add(head, sph(1), HC[0], HC[1], HC[2], 3, 0, 0, 0, ...HR);
    k.add(snout, sph(0.3), 0, 1.68, 0.55, 1, 0, 0, 0, 1.25, 0.78, 0.85);
    for (const s of [-1, 1]) {
      k.deco(sph(0.035), INK, s * 0.1, 1.75, 0.8, 0.3);
      k.add(belly, cone(0.1, 0.32, 16), s * 0.25, 2.38, -0.02, 1, -0.3, 0, -s * 0.35);
      k.add(spikes, cone(0.12, 0.3, 12), s * 0.64, 1.92, -0.02, 1, 0, 0, -s * 1.2, 1, 1, 0.4);
    }
    k.deco(tor(0.11, 0.022, PI), MOUTH, 0, 1.64, 0.79, 0.4, -0.2, 0, PI);
    eyes(k, 0, 1.96, 0.6, 0.22, 0.09);
    cheeks(k, 0, 1.75, 0.47, 0.44, 0.07);
    // bat wings
    k.add(wingR, batWing(0.95), 0.32, 1.12, -0.42, 1, 0, 0.5, 0.12);
    k.add(wingL, batWing(0.95), -0.32, 1.12, -0.42, 1, 0, -0.5, -0.12, -1, 1, 1);
    // tail curling round to the front with a spade tip
    k.add(tail, sph(0.22), 0.12, 0.32, -0.48, 1);
    const tp: V3[] = [[0.15, 0.3, -0.5], [0.55, 0.18, -0.8], [0.95, 0.2, -0.66], [1.15, 0.32, -0.25], [1.1, 0.42, 0.08]];
    k.add(tail, tube(tp, 0.13), 0, 0, 0, 1.5);
    aim(k.add(spikes, cone(0.2, 0.36, 4), 1.08, 0.48, 0.26, 1, 0, 0, 0, 1, 1, 0.35), new THREE.Vector3(-0.1, 0.3, 0.9));
    // arms, feet with claws
    for (const s of [-1, 1]) {
      stick(k, limbs, 0.12, [s * 0.55, 1.12, 0.22], [s * 0.42, 0.84, 0.52]);
      k.add(limbs, sph(0.13), s * 0.4, 0.82, 0.56, 1);
      k.add(limbs, sph(0.22), s * 0.4, 0.15, 0.42, 1, 0, 0, 0, 1, 0.65, 1.35);
      for (const t of [-1, 0, 1]) k.deco(cone(0.035, 0.08, 8), WHITE, s * 0.4 + t * 0.1, 0.13, 0.72, 0.4, PI / 2);
    }
    // little scarf
    k.add(scarf, tor(0.38, 0.1), 0, 1.4, 0.06, 2, PI / 2 - 0.15);
    k.add(scarf, sph(0.11), -0.26, 1.33, 0.4, 1);
    stick(k, scarf, 0.08, [-0.28, 1.28, 0.42], [-0.36, 0.98, 0.56]);
  },
];
