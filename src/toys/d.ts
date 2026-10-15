// Toys 31–40 (see kit3d.ts for the helpers and the part rules).
import { Kit, type Build, box, sph, cyl, tor, cone, capsule, eyes, cheeks } from '../kit3d';
import * as THREE from 'three';

const PI = Math.PI;
const INK = 0x3a2230;

/** Turn a mesh so its rotation reads yaw (y) → tilt (x) → spin (z): handy for things placed around an axis. */
const yx = (m: THREE.Mesh): THREE.Mesh => { m.rotation.order = 'YXZ'; return m; };

/** A little smile (a torus arc opening upwards). */
function smile(k: Kit, x: number, y: number, z: number, r: number, rx = 0): void {
  k.deco(tor(r, r * 0.2, PI * 0.8), INK, x, y, z, 0.4, rx, 0, PI * 1.1);
}
/** Eyes + cheeks + smile, all facing +z. */
function face(k: Kit, x: number, y: number, z: number, s: number): void {
  eyes(k, x, y, z, 0.21 * s, 0.07 * s);
  cheeks(k, x, y - 0.13 * s, z - 0.03 * s, 0.36 * s, 0.075 * s);
  smile(k, x, y - 0.13 * s, z + 0.01 * s, 0.08 * s);
}
/** A smooth lathe through (radius, height) control points. */
function lathePts(pts: [number, number][], n = 44): THREE.Vector2[] {
  return new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n);
}
const lathe = (pts: THREE.Vector2[], seg = 32) => new THREE.LatheGeometry(pts, seg);
/** Radius of a lathe profile at height y. */
function radiusAt(pts: THREE.Vector2[], y: number): number {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
  }
  return 0;
}
function extrude(shape: THREE.Shape, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
  g.center();
  return g;
}
function heart(s: number, depth = 0.06): THREE.ExtrudeGeometry {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5 * s);
  h.bezierCurveTo(-0.55 * s, -0.1 * s, -0.62 * s, 0.45 * s, -0.27 * s, 0.48 * s);
  h.bezierCurveTo(-0.1 * s, 0.5 * s, 0, 0.38 * s, 0, 0.3 * s);
  h.bezierCurveTo(0, 0.38 * s, 0.1 * s, 0.5 * s, 0.27 * s, 0.48 * s);
  h.bezierCurveTo(0.62 * s, 0.45 * s, 0.55 * s, -0.1 * s, 0, -0.5 * s);
  return extrude(h, depth, depth * 0.5);
}
function star(s: number, depth = 0.06): THREE.ExtrudeGeometry {
  const h = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 ? 0.22 : 0.5) * s, a = (i * PI) / 5;
    if (i) h.lineTo(Math.sin(a) * r, Math.cos(a) * r); else h.moveTo(0, r);
  }
  h.closePath();
  return extrude(h, depth, depth * 0.5);
}
/** A leaf / petal: a squashed sphere (half sizes w, l, t). */
const blob = (k: Kit, part: number, x: number, y: number, z: number, w: number, l: number, t: number, rx = 0, ry = 0, rz = 0, rep = 1) =>
  k.add(part, sph(1), x, y, z, rep, rx, ry, rz, w, l, t);
/** Place a squashed sphere on a surface point, its flat side facing out (yaw θ around the y axis). */
const onSurface = (k: Kit, part: number, r: number, theta: number, y: number, w: number, l: number, t: number, tilt = 0) =>
  yx(k.add(part, sph(1), Math.sin(theta) * r, y, Math.cos(theta) * r, 1, tilt, theta, 0, w, l, t));

export const TOYS_D: Build[] = [
  // 31 Piggy: an upright plush pig in dungarees and a bobble beanie
  (k) => {
    const overalls = k.part(1), legs = overalls, hooves = k.part(4), body = k.part(0), trim = k.part(2), arms = k.part(0);
    const head = k.part(0), snout = k.part(6), ears = k.part(0), hat = k.part(7), hatTrim = k.part(5);
    for (const s of [-1, 1]) {
      k.add(legs, cyl(0.21, 0.24, 0.42), s * 0.3, 0.33, 0.02, 1);
      k.add(trim, tor(0.235, 0.055), s * 0.3, 0.2, 0.02, 1, PI / 2);
      k.add(hooves, sph(0.25), s * 0.3, 0.1, 0.08, 1, 0, 0, 0, 1, 0.55, 1.15);
      k.deco(cyl(0.012, 0.012, 0.1), INK, s * 0.3, 0.12, 0.37, 0.5, PI / 2 + 0.2);
      k.add(arms, capsule(0.14, 0.3), s * 0.8, 1.12, 0.12, 1, 0, 0, s * 0.55);
      k.add(hooves, sph(0.16), s * 0.93, 0.88, 0.16, 1, 0, 0, 0, 1, 0.9, 1);
      // straps over the shoulders
      k.add(overalls, tor(0.73, 0.055, PI), s * 0.24, 1.0, 0, 1, 0, PI / 2, 0);
      k.deco(cyl(0.065, 0.065, 0.05), 0xffc83d, s * 0.22, 1.48, 0.64, 0.3, PI / 2 - 0.4);
    }
    k.add(body, sph(0.78), 0, 1.0, 0, 3, 0, 0, 0, 1, 0.95, 0.92);
    k.add(overalls, new THREE.SphereGeometry(0.8, 28, 14, 0, PI * 2, PI / 2, PI / 2), 0, 1.0, 0, 3, 0, 0, 0, 1, 0.97, 0.94);
    k.add(overalls, box(0.62, 0.52, 0.14, 0.07), 0, 1.27, 0.64, 1, -0.38);
    k.add(trim, tor(0.8, 0.065), 0, 1.0, 0, 3, PI / 2, 0, 0, 1.0, 0.95);
    k.add(trim, box(0.3, 0.2, 0.06, 0.04), 0, 1.2, 0.72, 1, -0.38);
    k.add(head, sph(0.64), 0, 1.92, 0.04, 3, 0, 0, 0, 1.08, 0.95, 0.98);
    k.add(snout, cyl(0.27, 0.29, 0.22, 28), 0, 1.78, 0.62, 1, PI / 2);
    k.add(snout, tor(0.27, 0.04), 0, 1.78, 0.73, 1);
    for (const s of [-1, 1]) {
      k.deco(sph(0.05), 0x8a2a44, s * 0.09, 1.79, 0.74, 0.4, 0, 0, 0, 1, 1.4, 0.6);
      yx(k.add(ears, cone(0.21, 0.36, 20), s * 0.56, 2.36, 0.02, 1, 0.3, 0, -s * 0.6, 1, 1, 0.45));
      yx(k.add(snout, cone(0.13, 0.24, 20), s * 0.55, 2.34, 0.08, 1, 0.3, 0, -s * 0.6, 1, 1, 0.3));
    }
    eyes(k, 0, 2.0, 0.6, 0.24, 0.07);
    cheeks(k, 0, 1.78, 0.5, 0.43, 0.085);
    smile(k, 0, 1.6, 0.6, 0.08, -0.3);
    // curly tail
    k.add(snout, tor(0.1, 0.04), 0, 0.85, -0.78, 1, 0, PI / 2, 0);
    k.add(snout, tor(0.07, 0.035), 0, 0.97, -0.82, 1, 0, PI / 2 + 0.4, 0);
    // beanie
    k.add(hat, new THREE.SphereGeometry(0.53, 28, 14, 0, PI * 2, 0, PI / 2), 0, 2.24, -0.04, 2, -0.12, 0, 0, 1, 0.92, 1);
    k.add(hatTrim, tor(0.54, 0.085), 0, 2.24, -0.04, 2, PI / 2 - 0.12);
    k.add(hatTrim, sph(0.17), 0, 2.76, -0.1, 1);
  },
  // 32 Lighthouse: grassy island, rocks, striped tower with a face, gallery, lantern and dome
  (k) => {
    const island = k.part(3), rocks = k.part(4), plinth = k.part(4), deck = k.part(2), door = deck, tower = k.part(1), stripes = k.part(6);
    const rail = k.part(7), lantern = k.part(2), roof = k.part(6);
    k.add(island, sph(1.15), 0, 0.12, 0, 3, 0, 0, 0, 1.1, 0.32, 1.0);
    for (const [x, z] of [[-0.7, 0.55], [0.75, -0.4], [-0.5, -0.75], [0.35, 0.8]]) k.add(island, cone(0.07, 0.18, 8), x, 0.5, z, 1);
    for (const [x, z, r] of [[-0.95, 0.35, 0.3], [-0.75, 0.7, 0.22], [0.95, 0.3, 0.27], [0.55, 0.85, 0.2], [0.2, -1.0, 0.28], [-0.8, -0.55, 0.24]])
      k.add(rocks, sph(r), x, 0.32, z, 1, 0.3, x * 2, 0, 1.2, 0.8, 1);
    k.add(plinth, cyl(0.8, 0.86, 0.3, 28), 0, 0.55, 0, 2);
    k.add(plinth, tor(0.8, 0.06), 0, 0.71, 0, 2, PI / 2);
    for (let i = 0; i < 3; i++) k.add(plinth, box(0.46, 0.08, 0.2, 0.03), 0, 0.44 + i * 0.08, 0.92 - i * 0.1, 1);
    const r = (y: number) => 0.62 - ((y - 0.7) / 1.9) * 0.2;
    k.add(tower, cyl(0.42, 0.62, 1.9), 0, 1.65, 0, 3);
    for (const y of [1.15, 2.05]) {
      k.add(stripes, cyl(r(y + 0.16) + 0.03, r(y - 0.16) + 0.03, 0.32), 0, y, 0, 3);
      k.add(stripes, tor(r(y) + 0.04, 0.035), 0, y + 0.16, 0, 3, PI / 2);
    }
    // arched door with a frame
    k.add(door, box(0.36, 0.48, 0.12, 0.16), 0, 0.93, 0.59, 1, -0.1);
    k.add(door, tor(0.2, 0.045, PI), 0, 1.0, 0.63, 1, -0.1);
    k.deco(sph(0.03), 0xffc83d, 0.1, 0.92, 0.67, 0.3);
    k.deco(box(0.17, 0.24, 0.05, 0.08), 0x2c3e7a, 0, 2.37, 0.45, 0.2, -0.1);
    k.deco(box(0.17, 0.24, 0.05, 0.08), 0x2c3e7a, 0, 2.37, -0.45, 0.2, 0.1);
    face(k, 0, 1.65, 0.53, 0.75);
    // gallery
    k.add(deck, cyl(0.66, 0.6, 0.14), 0, 2.66, 0, 2);
    for (let i = 0; i < 12; i++) {
      const a = (i * PI * 2) / 12;
      k.add(rail, cyl(0.03, 0.03, 0.28, 8), Math.sin(a) * 0.6, 2.86, Math.cos(a) * 0.6, 1);
    }
    k.add(rail, tor(0.6, 0.045), 0, 3.0, 0, 2, PI / 2);
    // lantern
    k.deco(cyl(0.3, 0.3, 0.44), 0xfff1a0, 0, 2.97, 0, 0.1);
    k.add(lantern, tor(0.33, 0.05), 0, 2.77, 0, 1, PI / 2);
    k.add(lantern, tor(0.33, 0.05), 0, 3.18, 0, 1, PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i * PI) / 3 + PI / 6;
      k.add(lantern, cyl(0.035, 0.035, 0.42, 8), Math.sin(a) * 0.32, 2.97, Math.cos(a) * 0.32, 1);
    }
    k.add(lantern, sph(0.1), 0, 3.68, 0, 1);
    k.add(roof, cone(0.5, 0.46), 0, 3.43, 0, 2);
    k.add(roof, tor(0.47, 0.06), 0, 3.21, 0, 2, PI / 2);
    // a little sailing boat moored at the island
    const boat = k.part(0), sail = rail;
    k.add(boat, sph(0.32), 1.05, 0.2, 0.75, 1, 0, 0.6, 0, 1.4, 0.55, 0.75);
    k.add(boat, tor(0.3, 0.05), 1.05, 0.3, 0.75, 1, PI / 2, 0, 0.6, 1.45, 0.78);
    k.deco(cyl(0.02, 0.02, 0.7), 0x8a5530, 1.05, 0.62, 0.75, 0.5);
    k.add(sail, cone(0.24, 0.5, 3), 1.12, 0.7, 0.78, 1, 0, 0.6, 0, 1, 1, 0.25);
  },
  // 33 Windmill: octagonal tower with a face, sails with lattice, cap, flowers on a lawn
  (k) => {
    const ground = k.part(3), flowers = k.part(0), plinth = k.part(4), tower = k.part(2), bands = k.part(5), cap = k.part(6), door = cap;
    const capRim = k.part(5), hub = k.part(4), sails = k.part(1);
    k.add(ground, cyl(1.12, 1.18, 0.22), 0, 0.11, 0, 3);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + 0.3, rr = 0.95;
      k.add(ground, sph(0.1), Math.sin(a) * rr, 0.24, Math.cos(a) * rr, 1, 0, 0, 0, 1, 0.7, 1);
    }
    for (const [x, z] of [[0.62, 0.78], [-0.75, 0.62], [0.88, 0.1], [-0.2, -0.95]]) {
      for (let p = 0; p < 6; p++) {
        const a = (p * PI * 2) / 6;
        k.add(flowers, sph(0.09), x + Math.sin(a) * 0.11, 0.27, z + Math.cos(a) * 0.11, 1, 0, 0, 0, 1, 0.55, 1);
      }
      k.deco(sph(0.05), 0xffd51c, x, 0.29, z, 0.5);
    }
    k.add(plinth, cyl(0.8, 0.86, 0.3, 8), 0, 0.37, 0, 2, 0, PI / 8);
    for (let i = 0; i < 3; i++) k.add(plinth, sph(0.15), -0.12 + i * 0.12, 0.23, 0.92 + i * 0.12, 1, 0, 0, 0, 1.3, 0.3, 1);
    k.add(tower, cyl(0.5, 0.72, 1.8, 8), 0, 1.42, 0, 3, 0, PI / 8);
    k.add(bands, tor(0.6, 0.055), 0, 1.92, 0, 3, PI / 2);
    k.add(bands, tor(0.52, 0.06), 0, 2.3, 0, 3, PI / 2);
    // windows with sills on the sides
    for (const s of [-1, 1]) {
      k.deco(box(0.18, 0.24, 0.05, 0.08), 0x37406e, s * 0.55, 1.85, 0, 0.2, 0, s * PI / 2, 0.1 * s);
      k.add(bands, box(0.26, 0.06, 0.12, 0.03), s * 0.58, 1.7, 0, 1, 0, s * PI / 2);
    }
    k.add(door, box(0.36, 0.52, 0.1, 0.16), 0, 0.82, 0.64, 1, -0.11);
    k.add(door, tor(0.2, 0.045, PI), 0, 0.9, 0.68, 1, -0.11);
    k.deco(sph(0.03), 0xffc83d, 0.1, 0.8, 0.71, 0.3);
    face(k, 0, 1.33, 0.61, 0.8);
    k.add(cap, cone(0.62, 0.62, 8), 0, 2.64, 0, 2, 0, PI / 8);
    k.add(cap, sph(0.1), 0, 3.0, 0, 1);
    k.add(capRim, tor(0.6, 0.085), 0, 2.34, 0, 2, PI / 2);
    // hub, spars and lattice slats
    k.add(hub, cyl(0.13, 0.13, 0.32), 0, 2.28, 0.55, 1, PI / 2);
    k.add(hub, sph(0.17), 0, 2.28, 0.72, 1);
    const fence = k.part(1);
    for (let i = 0; i < 5; i++) {
      const a = -2.1 - i * 0.32;
      k.add(fence, box(0.08, 0.32, 0.08, 0.03), Math.sin(a) * 0.98, 0.36, Math.cos(a) * 0.98, 1);
    }
    for (const y of [0.32, 0.44]) k.add(fence, tor(0.98, 0.025, 1.28), 0, y, 0, 1, PI / 2, 0, PI / 2 + 2.1);
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + (i * PI) / 2, sx = Math.sin(a), cy = Math.cos(a), px = cy, py = -sx;
      k.add(hub, capsule(0.035, 1.0), sx * 0.6, 2.28 + cy * 0.6, 0.76, 1, 0, 0, -a);
      k.add(sails, box(0.34, 0.78, 0.06, 0.04), sx * 0.66 + px * 0.13, 2.28 + cy * 0.66 + py * 0.13, 0.73, 1, 0, 0, -a);
      for (const d of [0.5, 0.86]) k.deco(box(0.36, 0.03, 0.03, 0.01), 0xfff8ee, sx * d + px * 0.13, 2.28 + cy * d + py * 0.13, 0.77, 0.6, 0, 0, -a);
    }
  },
  // 34 Camping Tent: striped tent with tied-back flaps, campfire, backpack with a bedroll, pine tree
  (k) => {
    const ground = k.part(3), tent = k.part(5), flaps = k.part(2), stripes = k.part(0), trim = k.part(6), stones = k.part(4);
    const fire = k.part(6), pack = k.part(1), pocket = k.part(2), tree = k.part(3);
    k.add(ground, box(2.6, 0.16, 2.4, 0.08), 0, 0.08, 0, 3);
    for (const [x, z] of [[-1.1, -1.0], [1.15, 0.2], [-0.2, 1.05], [0.3, -1.05], [-1.15, 0.3]]) k.add(ground, cone(0.07, 0.16, 8), x, 0.24, z, 1);
    const tx = -0.2, tz = -0.2, base = 0.16;
    const tri = new THREE.Shape();
    tri.moveTo(-0.85, 0); tri.lineTo(0.85, 0); tri.lineTo(0, 1.35); tri.closePath();
    const prism = extrude(tri, 1.5, 0.07);
    k.add(tent, prism, tx, base + 0.72, tz, 1.4);
    // dark doorway + rolled flaps with ties
    const door = new THREE.Shape();
    door.moveTo(-0.38, 0); door.lineTo(0.38, 0); door.lineTo(0, 0.9); door.closePath();
    k.deco(extrude(door, 0.02, 0.01), 0x3b2a4a, tx, base + 0.46, tz + 0.83, 0.9);
    for (const s of [-1, 1]) {
      k.add(flaps, capsule(0.08, 0.7), tx + s * 0.27, base + 0.42, tz + 0.88, 1, 0, 0, s * 0.42);
      k.add(flaps, sph(0.07), tx + s * 0.27, base + 0.42, tz + 0.97, 1);
      // stripes along both slopes
      for (const t of [0.22, 0.55]) {
        const nx = s * 0.845, ny = 0.53;
        k.add(stripes, box(0.2, 0.05, 1.66, 0.025), tx + s * (0.85 - 0.85 * t) + nx * 0.09, base + 1.35 * t + ny * 0.09, tz, 2, 0, 0, -s * 1.01);
      }
      // bottom hems
      k.add(trim, capsule(0.055, 1.5), tx + s * 0.9, base + 0.06, tz, 2, PI / 2);
      // guy ropes and pegs
      k.deco(cyl(0.012, 0.012, 1.0), 0xd9c7a0, tx, base + 0.95, tz + s * 1.05, 0.6, s * 0.75);
      k.deco(cyl(0.025, 0.01, 0.14), 0x8a5530, tx, base + 0.06, tz + s * 1.42, 0.5);
    }
    k.add(trim, capsule(0.06, 1.55), tx, base + 1.42, tz, 2, PI / 2);
    k.deco(cyl(0.02, 0.02, 0.5), 0x8a5530, tx, base + 1.65, tz - 0.6, 0.5);
    k.add(trim, box(0.3, 0.18, 0.03, 0.02), tx + 0.16, base + 1.8, tz - 0.6, 1);
    // campfire
    const fx = 0.85, fz = 0.75;
    for (let i = 0; i < 8; i++) {
      const a = (i * PI * 2) / 8;
      k.add(stones, sph(0.1), fx + Math.sin(a) * 0.28, base + 0.06, fz + Math.cos(a) * 0.28, 1, 0, a, 0, 1.2, 0.75, 1);
    }
    for (let i = 0; i < 3; i++) k.deco(capsule(0.045, 0.32), 0x8a5530, fx, base + 0.08, fz, 0.6, PI / 2, (i * PI) / 3, 0);
    k.add(fire, sph(0.15), fx, base + 0.2, fz, 1, 0, 0, 0, 1, 0.8, 1);
    k.add(fire, cone(0.15, 0.42, 16), fx, base + 0.42, fz, 1);
    for (const s of [-1, 1]) k.add(fire, cone(0.07, 0.22, 12), fx + s * 0.11, base + 0.3, fz + 0.03, 1, 0, 0, -s * 0.35);
    k.deco(cone(0.08, 0.24, 12), 0xffe25a, fx, base + 0.3, fz + 0.08, 0.4);
    // backpack with pocket and a bedroll
    const bx = -0.85, bz = 0.92;
    k.add(pack, box(0.5, 0.58, 0.32, 0.14), bx, base + 0.3, bz, 1, -0.1, 0.4, 0);
    k.add(pocket, box(0.36, 0.24, 0.09, 0.06), bx + 0.07, base + 0.22, bz + 0.16, 1, -0.1, 0.4, 0);
    k.add(pocket, box(0.52, 0.12, 0.36, 0.05), bx, base + 0.58, bz, 1, -0.1, 0.4, 0);
    k.add(stripes, cyl(0.12, 0.12, 0.6), bx, base + 0.72, bz - 0.03, 1, 0, 0.4, PI / 2);
    k.deco(sph(0.035), 0xffc83d, bx + 0.07, base + 0.31, bz + 0.21, 0.3);
    // pine tree
    const ox = 1.0, oz = -0.75;
    k.deco(cyl(0.08, 0.1, 0.4), 0x8a5530, ox, base + 0.2, oz, 0.6);
    k.add(tree, cone(0.42, 0.55, 20), ox, base + 0.62, oz, 1);
    k.add(tree, cone(0.34, 0.5, 20), ox, base + 0.92, oz, 1);
    k.add(tree, cone(0.24, 0.42, 20), ox, base + 1.2, oz, 1);
  },
  // 35 Gift Box: dotted box with a face, lid, ribbons, big bow, a little gift beside it
  (k) => {
    const boxP = k.part(1), dots = k.part(2), ribbon = k.part(6), lid = k.part(4), lidRibbon = k.part(6), bow = k.part(0);
    const tails = k.part(6), small = k.part(3), smallLid = k.part(2), smallRibbon = k.part(5);
    k.add(boxP, box(1.5, 1.1, 1.5, 0.14), 0, 0.55, 0, 3);
    k.add(ribbon, box(0.32, 1.12, 1.54, 0.04), 0, 0.55, 0, 2);
    k.add(ribbon, box(1.54, 1.12, 0.32, 0.04), 0, 0.55, 0, 2);
    // polka dots on the sides and back
    for (const th of [PI / 2, -PI / 2, PI]) for (const [u, y] of [[-0.42, 0.32], [0.42, 0.32], [-0.42, 0.8], [0.42, 0.8]])
      k.add(dots, sph(0.12), Math.sin(th) * 0.76 + Math.cos(th) * u, y, Math.cos(th) * 0.76 - Math.sin(th) * u, 1, 0, th, 0, 1, 1, 0.3);
    // face on the front (the ribbon runs down the middle)
    eyes(k, 0, 0.74, 0.76, 0.4, 0.085);
    cheeks(k, 0, 0.52, 0.75, 0.48, 0.09);
    smile(k, 0, 0.56, 0.8, 0.12);
    k.add(lid, box(1.66, 0.32, 1.66, 0.12), 0, 1.22, 0, 3);
    k.add(lidRibbon, box(0.34, 0.34, 1.7, 0.05), 0, 1.22, 0, 2);
    k.add(lidRibbon, box(1.7, 0.34, 0.34, 0.05), 0, 1.22, 0, 2);
    for (const s of [-1, 1]) {
      k.add(bow, tor(0.22, 0.1), s * 0.3, 1.62, 0, 1, 0, 0, s * 0.45, 1.25, 0.85, 1);
      k.add(tails, box(0.16, 0.5, 0.05, 0.025), s * 0.17, 1.28, 0.9, 1, -0.15, 0, s * 0.35);
    }
    k.add(bow, sph(0.16), 0, 1.5, 0, 1, 0, 0, 0, 1.1, 0.9, 1);
    // a little gift at the front corner
    const sx = 1.08, sz = 0.6, ry = 0.5;
    k.add(small, box(0.56, 0.48, 0.56, 0.08), sx, 0.24, sz, 1, 0, ry, 0);
    k.add(smallLid, box(0.64, 0.14, 0.64, 0.06), sx, 0.52, sz, 1, 0, ry, 0);
    k.add(smallRibbon, box(0.12, 0.64, 0.66, 0.03), sx, 0.31, sz, 1, 0, ry, 0);
    k.add(smallRibbon, box(0.66, 0.64, 0.12, 0.03), sx, 0.31, sz, 1, 0, ry, 0);
    for (const s of [-1, 1]) k.add(smallRibbon, sph(0.1), sx + Math.cos(ry) * s * 0.1, 0.65, sz - Math.sin(ry) * s * 0.1, 1, 0, ry, s * 0.5, 1.3, 0.8, 0.7);
  },
  // 36 Strawberry: a strawberry buddy with seeds, leafy calyx, bow, arms and little boots
  (k) => {
    const low = k.part(6), mid = k.part(6), top = k.part(0), seeds = k.part(2), seeds2 = k.part(2), calyx = k.part(3), calyx2 = k.part(3), stem = calyx;
    const arms = k.part(7), legs = arms, boots = k.part(4), bow = k.part(1);
    const Y = 0.32;
    const prof = lathePts([[0.02, 0], [0.22, 0.08], [0.48, 0.32], [0.72, 0.66], [0.88, 1.02], [0.93, 1.32], [0.86, 1.6], [0.64, 1.8], [0.34, 1.9], [0.0, 1.93]], 48);
    const i1 = prof.findIndex((p) => p.y > 0.62), i2 = prof.findIndex((p) => p.y > 1.42);
    k.add(low, lathe(prof.slice(0, i1 + 1)), 0, Y, 0, 3);
    k.add(mid, lathe(prof.slice(i1, i2 + 1)), 0, Y, 0, 3);
    k.add(top, lathe(prof.slice(i2)), 0, Y, 0, 3);
    // seeds all around (but not on the face)
    let row = 0;
    for (const y of [0.3, 0.55, 0.8, 1.05, 1.3, 1.55]) {
      const n = y < 0.4 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const th = ((i + (row % 2) * 0.5) * PI * 2) / n;
        const front = Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) < 0.75 && y > 0.7 && y < 1.4;
        if (front) continue;
        onSurface(k, y < 0.9 ? seeds : seeds2, radiusAt(prof, y) - 0.01, th, Y + y, 0.05, 0.08, 0.035, -0.3);
      }
      row++;
    }
    face(k, 0, Y + 1.12, 0.86, 1.1);
    // calyx leaves and a curly stem
    for (let i = 0; i < 7; i++) {
      const th = (i * PI * 2) / 7 + 0.2;
      yx(blob(k, i % 2 ? calyx2 : calyx, Math.sin(th) * 0.42, Y + 1.88, Math.cos(th) * 0.42, 0.16, 0.06, 0.38, 0.35, th, 0));
    }
    k.add(calyx2, sph(0.3), 0, Y + 1.9, 0, 1, 0, 0, 0, 1, 0.35, 1);
    k.add(stem, capsule(0.075, 0.3), 0.04, Y + 2.15, 0, 1, 0, 0, -0.25);
    k.add(stem, tor(0.09, 0.045, PI * 1.2), 0.17, Y + 2.33, 0, 1, 0, 0, -0.4);
    blob(k, stem, -0.2, Y + 2.16, 0.02, 0.22, 0.06, 0.12, 0, 0, 0.5);
    // bow on the calyx
    for (const s of [-1, 1]) k.add(bow, sph(0.13), 0.42 + s * 0.13, Y + 1.98, 0.4, 1, 0, 0.6, s * 0.4, 1.2, 0.8, 0.55);
    k.add(bow, sph(0.07), 0.42, Y + 1.98, 0.42, 1);
    // arms (one waving) and legs with boots
    k.add(arms, capsule(0.075, 0.36), -0.98, Y + 0.95, 0.1, 1, 0, 0, -0.75);
    k.add(arms, sph(0.11), -1.13, Y + 0.78, 0.13, 1);
    k.add(arms, capsule(0.075, 0.36), 0.98, Y + 1.25, 0.1, 1, 0, 0, -0.75 + PI);
    k.add(arms, sph(0.11), 1.13, Y + 1.43, 0.13, 1);
    for (const s of [-1, 1]) {
      k.add(legs, capsule(0.08, 0.26), s * 0.24, 0.32, 0.03, 1);
      k.add(boots, sph(0.16), s * 0.25, 0.1, 0.08, 1, 0, 0, 0, 1, 0.62, 1.35);
      k.add(boots, tor(0.1, 0.04), s * 0.24, 0.2, 0.03, 1, PI / 2);
    }
  },
  // 37 Pineapple: a smiley pineapple with a lattice skin, three-layer crown, flower lei, arms and shoes
  (k) => {
    const fruit = k.part(2), latA = k.part(5), latB = k.part(5), crownIn = k.part(3), crownMid = k.part(7), crownOut = k.part(3);
    const lei = k.part(0), leiLeaves = crownMid, arms = k.part(2), shoes = k.part(6);
    const Y = 1.25, R = 0.86, H = 1.2;
    const fruitTop = k.part(2);
    k.add(fruit, new THREE.SphereGeometry(R, 32, 12, 0, PI * 2, PI / 2, PI / 2), 0, Y, 0, 3, 0, 0, 0, 1, H, 1);
    k.add(fruitTop, new THREE.SphereGeometry(R, 32, 12, 0, PI * 2, 0, PI / 2), 0, Y, 0, 3, 0, 0, 0, 1, H, 1);
    // criss-cross lattice lines (thin, plain) ...
    for (const dir of [1, -1]) for (let j = 0; j < 4; j++) {
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 1.0001; t += 1 / 24) {
        const v = -0.93 + 1.86 * t, rr = (R + 0.01) * Math.sqrt(1 - v * v), th = (j * PI) / 2 + PI / 4 + dir * (t - 0.5) * PI * 0.95;
        pts.push(new THREE.Vector3(Math.sin(th) * rr, Y + v * R * H, Math.cos(th) * rr));
      }
      k.deco(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.028, 5), 0xc98a2b, 0, 0, 0, 0.7);
    }
    // ... and diamond nubs in staggered rows (two parts, alternate rows), leaving the face clear
    for (let row = 0; row < 6; row++) {
      const v = -0.72 + row * 0.27, rr = R * Math.sqrt(1 - v * v), n = Math.max(6, Math.round(rr * 9));
      for (let i = 0; i < n; i++) {
        const th = ((i + (row % 2) * 0.5) * PI * 2) / n, y = Y + v * R * H;
        if ((Math.cos(th) > 0.72 && v > -0.4 && v < 0.35) || Math.cos(th) < -0.55) continue;
        onSurface(k, row % 2 ? latB : latA, rr + 0.005, th, y, 0.1, 0.12, 0.05, -v * 0.6);
      }
    }
    k.add(latA, tor(0.42, 0.07), 0, Y - R * H * 0.9, 0, 2, PI / 2);
    face(k, 0, Y + 0.08, R - 0.01, 1.1);
    // crown
    const cy = Y + R * H - 0.06;
    k.add(crownIn, tor(0.24, 0.1), 0, cy, 0, 1, PI / 2);
    const leaf = (part: number, n: number, tilt: number, len: number, off: number) => {
      for (let i = 0; i < n; i++) {
        const th = (i * PI * 2) / n + off;
        const dx = Math.sin(tilt) * Math.sin(th), dy = Math.cos(tilt), dz = Math.sin(tilt) * Math.cos(th);
        yx(k.add(part, sph(1), Math.sin(th) * 0.12 + dx * len * 0.5, cy + dy * len * 0.5, Math.cos(th) * 0.12 + dz * len * 0.5, 1, tilt, th, 0, 0.17, len * 0.5, 0.06));
      }
    };
    leaf(crownIn, 4, 0.2, 1.0, 0.4);
    leaf(crownMid, 5, 0.6, 0.85, 0);
    leaf(crownOut, 6, 1.05, 0.7, 0.3);
    // flower lei, dipping at the front
    for (let i = 0; i < 12; i++) {
      const th = (i * PI * 2) / 12, y = Y + 0.55 - 0.1 * Math.cos(th), rr = R * Math.sqrt(1 - ((y - Y) / (R * H)) ** 2) + 0.07;
      if (i % 2 === 0) onSurface(k, lei, rr, th, y, 0.14, 0.14, 0.08);
      else onSurface(k, leiLeaves, rr - 0.02, th, y, 0.1, 0.06, 0.05, 0, ).rotation.z = 0.6;
    }
    // arms and shoes
    for (const s of [-1, 1]) {
      k.add(arms, capsule(0.085, 0.32), s * 0.92, Y - 0.05, 0.12, 1, 0, 0, s * 0.45);
      k.add(arms, sph(0.12), s * 1.02, Y - 0.27, 0.16, 1);
      k.add(shoes, sph(0.21), s * 0.33, 0.11, 0.18, 1, 0, 0, 0, 1, 0.6, 1.35);
      k.add(shoes, cyl(0.1, 0.12, 0.14), s * 0.33, 0.2, 0.08, 1);
    }
  },
  // 38 Flower Pot: smiling pot with hearts on a saucer, daisy with a face, leaves, a bud and a butterfly
  (k) => {
    const saucer = k.part(4), pot = k.part(5), hearts = k.part(2), rim = k.part(6), moss = k.part(3), stem = k.part(3);
    const leaves = k.part(3), petals = k.part(0), inner = k.part(6), center = hearts, butterfly = k.part(1), bud = saucer;
    k.add(saucer, cyl(0.74, 0.6, 0.12), 0, 0.06, 0, 2);
    k.add(saucer, tor(0.72, 0.05), 0, 0.12, 0, 2, PI / 2);
    k.add(pot, cyl(0.7, 0.52, 0.86), 0, 0.55, 0, 3);
    k.add(rim, cyl(0.78, 0.75, 0.26), 0, 1.06, 0, 2);
    k.add(rim, tor(0.76, 0.06), 0, 1.19, 0, 2, PI / 2);
    k.add(rim, tor(0.76, 0.06), 0, 0.93, 0, 2, PI / 2);
    const pr = (y: number) => 0.52 + ((y - 0.12) / 0.86) * 0.18;
    for (const th of [1.15, -1.15, 2.2, -2.2, PI]) yx(k.add(hearts, heart(0.26, 0.05), Math.sin(th) * (pr(0.55) + 0.02), 0.55, Math.cos(th) * (pr(0.55) + 0.02), 1, 0.2, th, 0));
    face(k, 0, 0.62, pr(0.62) + 0.02, 1.0);
    k.deco(cyl(0.7, 0.7, 0.05), 0x6b4a32, 0, 1.17, 0, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.4;
      k.add(moss, sph(0.17), Math.sin(a) * 0.45, 1.2, Math.cos(a) * 0.45, 1, 0, 0, 0, 1, 0.45, 1);
    }
    const tube = (pts: number[][], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 32, r, 8);
    k.add(stem, tube([[0, 1.15, 0], [0.08, 1.6, 0.04], [-0.04, 2.1, 0.06], [0, 2.45, 0.08]], 0.065), 0, 0, 0, 2);
    k.add(stem, tube([[0.04, 1.5, 0.03], [-0.2, 1.75, 0.05], [-0.45, 1.95, 0.05]], 0.05), 0, 0, 0, 1);
    // big leaves with a vein
    for (const [x, y, s] of [[0.42, 1.55, 1], [-0.38, 1.4, -1], [0.3, 2.0, 1]] as const) {
      blob(k, leaves, x, y, 0.05, 0.36, 0.06, 0.17, 0.2, 0, s * 0.5);
      k.deco(box(0.5, 0.015, 0.015, 0.005), 0x2f7a3a, x, y + 0.045, 0.06, 0.6, 0.2, 0, s * 0.5);
    }
    for (const s of [-1, 1]) k.add(leaves, cone(0.06, 0.16, 8), -0.45 + s * 0.07, 1.98, 0.05, 1, 0, 0, s * 0.6);
    k.add(bud, sph(0.15), -0.45, 2.08, 0.05, 1, 0, 0, 0, 1, 1.3, 1);
    k.add(bud, cone(0.09, 0.14, 12), -0.45, 2.27, 0.05, 1);
    // daisy, tilted up a little
    const fy = 2.55, tilt = -0.25;
    for (let i = 0; i < 9; i++) {
      const a = (i * PI * 2) / 9, R = 0.42;
      k.add(petals, sph(1), Math.sin(a) * R, fy + Math.cos(a) * R * Math.cos(tilt), 0.08 + Math.cos(a) * R * Math.sin(tilt), 1, tilt, 0, -a, 0.15, 0.25, 0.06);
    }
    for (let i = 0; i < 9; i++) {
      const a = ((i + 0.5) * PI * 2) / 9, R = 0.27;
      k.add(inner, sph(1), Math.sin(a) * R, fy + Math.cos(a) * R * Math.cos(tilt), 0.14 + Math.cos(a) * R * Math.sin(tilt), 1, tilt, 0, -a, 0.1, 0.17, 0.05);
    }
    k.add(center, sph(0.22), 0, fy, 0.18, 1, tilt, 0, 0, 1, 1, 0.55);
    eyes(k, 0, fy + 0.05, 0.3, 0.075, 0.03);
    smile(k, 0, fy - 0.03, 0.3, 0.04, tilt);
    // butterfly resting on the right leaf
    for (const [bx, by, bz, sc] of [[0.7, 1.84, 0.15, 1.3], [-0.62, 2.62, -0.05, 1.0]]) {
      k.deco(capsule(0.025 * sc, 0.14 * sc), 0x3a2a4a, bx, by, bz, 0.5, 0, 0, 0.3);
      for (const s of [-1, 1]) {
        k.add(butterfly, sph(1), bx + s * 0.11 * sc, by + 0.07 * sc, bz, 1, 0, s * 0.5, s * 0.5, 0.11 * sc, 0.09 * sc, 0.025);
        k.add(butterfly, sph(1), bx + s * 0.08 * sc, by - 0.06 * sc, bz, 1, 0, s * 0.5, s * 0.2, 0.07 * sc, 0.06 * sc, 0.025);
      }
    }
  },
  // 39 Dino: a chubby dino in a heart sweater, with back plates, spots and a striped tail
  (k) => {
    const legs = k.part(3), soles = k.part(4), sweater = k.part(1), trim = k.part(6), heartP = k.part(0), head = k.part(3);
    const plates = k.part(5), tailA = k.part(3), tailB = k.part(7), spots = tailB;
    for (const s of [-1, 1]) {
      k.add(legs, cyl(0.2, 0.23, 0.36), s * 0.32, 0.27, 0.05, 1);
      k.add(soles, sph(0.25), s * 0.32, 0.09, 0.12, 1, 0, 0, 0, 1, 0.5, 1.25);
      for (const t of [-1, 0, 1]) k.deco(sph(0.045), 0xfff8ee, s * 0.32 + t * 0.1, 0.1, 0.42 - Math.abs(t) * 0.04, 0.4);
      k.add(sweater, capsule(0.15, 0.28), s * 0.8, 1.15, 0.1, 1, 0, 0, s * 0.65);
      k.add(trim, tor(0.15, 0.055), s * 0.94, 0.95, 0.13, 1, PI / 2, 0, s * 0.65);
      k.add(legs, sph(0.13), s * 0.99, 0.87, 0.14, 1);
    }
    k.add(sweater, sph(0.78), 0, 1.0, 0, 3, 0, 0, 0, 1, 1.0, 0.92);
    k.add(trim, tor(0.66, 0.075), 0, 0.58, 0, 2, PI / 2, 0, 0, 1, 0.93);
    k.add(trim, tor(0.46, 0.1), 0, 1.66, 0, 2, PI / 2, 0, 0, 1, 0.93);
    k.add(heartP, heart(0.6, 0.08), 0, 1.04, 0.72, 1, -0.15);
    yx(k.add(heartP, heart(0.36, 0.06), 0.4, 1.05, -0.6, 1, 0.1, PI - 0.6, 0));
    k.add(head, sph(0.6), 0, 2.08, 0.1, 3, 0, 0, 0, 1.05, 0.92, 1);
    const snout = k.part(3);
    k.add(snout, sph(0.44), 0, 1.92, 0.5, 2, 0, 0, 0, 1.12, 0.78, 0.9);
    k.deco(sph(0.035), INK, -0.11, 2.0, 0.89, 0.4);
    k.deco(sph(0.035), INK, 0.11, 2.0, 0.89, 0.4);
    eyes(k, 0, 2.2, 0.62, 0.23, 0.08);
    cheeks(k, 0, 1.92, 0.72, 0.4, 0.08);
    smile(k, 0, 1.86, 0.88, 0.13, -0.2);
    for (const [x, y, z, r] of [[0.45, 2.3, 0.25, 0.1], [-0.5, 2.15, 0.22, 0.08], [0.52, 2.05, -0.1, 0.12], [-0.42, 2.4, -0.15, 0.1], [0.3, 0.35, 0.27, 0.07], [-0.36, 0.42, 0.25, 0.06]])
      k.add(spots, sph(r), x, y, z, 1, 0, Math.atan2(x, z), 0, 1, 1, 0.35);
    // back plates follow the outline from the head down the back
    for (const [y, z, cy, cz, sz] of [[2.62, 0.0, 2.08, 0.1, 0.9], [2.48, -0.38, 2.08, 0.1, 1], [1.72, -0.62, 1.0, 0, 1], [1.3, -0.82, 1.0, 0, 1.05], [0.85, -0.85, 1.0, 0, 0.95]]) {
      const a = Math.atan2(z - cz, y - cy);
      k.add(plates, sph(1), 0, y, z, 1, a, 0, 0, 0.07, 0.2 * sz, 0.16 * sz);
    }
    // striped tail curling up at the tip
    for (let i = 0; i < 6; i++) {
      const r = 0.3 - i * 0.035, z = -0.75 - i * 0.16, y = 0.45 + 0.02 * i * i;
      k.add(i % 2 ? tailB : tailA, sph(r), 0.04 * i, y, z, 1);
      if (i === 2 || i === 4) k.add(plates, sph(1), 0.04 * i, y + r, z, 1, -0.4, 0, 0, 0.06, 0.13, 0.12);
    }
  },
  // 40 Unicorn: lavender pony with a rainbow mane and tail, spiral horn, star blanket and leg warmers
  (k) => {
    const body = k.part(4), warmers = k.part(7), legs = warmers, hooves = k.part(5), head = k.part(4), muzzle = k.part(0);
    const maneP = k.part(0), maneB = k.part(1), maneY = k.part(2), horn = k.part(2), blanket = k.part(6);
    const mane = [maneP, maneB, maneY];
    k.add(body, capsule(0.5, 0.75), 0, 1.05, -0.1, 3, PI / 2);
    for (const s of [-1, 1]) for (const z of [-0.62, 0.42]) {
      k.add(legs, cyl(0.15, 0.14, 0.6), s * 0.3, 0.5, z, 1);
      k.add(warmers, cyl(0.19, 0.19, 0.26), s * 0.3, 0.3, z, 1);
      k.add(warmers, tor(0.19, 0.045), s * 0.3, 0.44, z, 1, PI / 2);
      k.add(hooves, sph(0.18), s * 0.3, 0.1, z + 0.03, 1, 0, 0, 0, 1, 0.55, 1.1);
    }
    k.add(head, capsule(0.28, 0.42), 0, 1.68, 0.6, 2, 0.45);
    k.add(head, sph(0.5), 0, 2.22, 0.82, 3, 0, 0, 0, 0.95, 0.95, 1.05);
    for (const s of [-1, 1]) {
      yx(k.add(head, cone(0.12, 0.3, 16), s * 0.27, 2.68, 0.72, 1, 0.1, 0, -s * 0.35, 1, 1, 0.6));
      yx(k.deco(cone(0.07, 0.2, 16), 0xffb3c8, s * 0.27, 2.66, 0.77, 0.6, 0.1, 0, -s * 0.35, 1, 1, 0.4));
    }
    k.add(muzzle, sph(0.3), 0, 2.03, 1.18, 2, 0, 0, 0, 1.15, 0.82, 0.9);
    for (const s of [-1, 1]) k.deco(sph(0.035), INK, s * 0.12, 2.06, 1.44, 0.4, 0, 0, 0, 1, 1.4, 0.6);
    smile(k, 0, 1.98, 1.41, 0.08, -0.4);
    eyes(k, 0, 2.32, 1.2, 0.22, 0.075);
    for (const s of [-1, 1]) k.deco(capsule(0.012, 0.06), INK, s * 0.31, 2.4, 1.17, 0.4, 0, 0, -s * 0.9);
    cheeks(k, 0, 2.12, 1.18, 0.36, 0.07);
    // spiral horn
    k.add(horn, cone(0.14, 0.7, 20), 0, 2.95, 1.0, 1, 0.3);
    for (let i = 0; i < 3; i++) {
      const d = 0.12 + i * 0.16;
      k.add(horn, tor(0.14 * (1 - d / 0.7) + 0.005, 0.026), 0, 2.616 + d * 0.955, 0.897 + d * 0.296, 1, -(PI / 2 - 0.3));
    }
    // rainbow mane: forelock, along the top of the head and down the neck
    const maneAt: [number, number, number, number][] = [[0.15, 2.7, 1.12, 0.14], [-0.12, 2.72, 0.9, 0.17], [0, 2.66, 0.62, 0.19], [0, 2.45, 0.42, 0.2], [0, 2.18, 0.3, 0.2], [0, 1.92, 0.2, 0.2], [0, 1.66, 0.1, 0.19], [0, 1.45, -0.02, 0.17]];
    maneAt.forEach(([x, y, z, r], i) => k.add(mane[i % 3], sph(r), x, y, z, 1, 0.5, 0, 0, 0.6, 1.15, 0.9));
    // rainbow tail
    for (let i = 0; i < 6; i++) k.add(mane[(i + 1) % 3], sph(0.22 - i * 0.012), 0.03 * Math.sin(i * 1.5), 1.22 - i * 0.17, -1.05 - 0.07 * Math.sin(i * 0.8), 1);
    // star blanket over the back
    k.add(blanket, new THREE.CylinderGeometry(0.54, 0.54, 0.72, 28, 1, true, PI - 1.9, 3.8), 0, 1.05, -0.12, 2, PI / 2);
    for (const s of [-1, 1]) {
      k.add(blanket, tor(0.06, 0.03), s * 0.52, 0.86, -0.12, 1, 0, PI / 2, 0);
      k.add(horn, star(0.3, 0.05), s * 0.56, 1.05, -0.12, 1, 0, s * PI / 2, 0);
    }
  },
];
