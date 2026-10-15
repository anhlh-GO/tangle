// Toys 11–20 (see kit3d.ts for the helpers and the part rules).
import { Kit, type Build, box, sph, cyl, tor, cone, capsule } from '../kit3d';
import * as THREE from 'three';

type V3 = [number, number, number];
const INK = 0x2a1f2d;
const PI = Math.PI;

/** Upper half of a sphere (domes, caps, buns). */
const hemi = (r: number) => new THREE.SphereGeometry(r, 28, 12, 0, PI * 2, 0, PI / 2);
/** A turned shape from [radius, height] points. */
const lathe = (pts: number[][], seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function shapeGeo(sh: THREE.Shape, s: number, d: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.6, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -d / 2);
  g.scale(s, s, 1);
  return g;
}
/** A puffy heart about `s` wide. */
function heart(s: number, d = 0.05): THREE.ExtrudeGeometry {
  const h = new THREE.Shape();
  h.moveTo(0, -0.45);
  h.bezierCurveTo(0.12, -0.3, 0.5, -0.12, 0.5, 0.14);
  h.bezierCurveTo(0.5, 0.4, 0.18, 0.5, 0, 0.28);
  h.bezierCurveTo(-0.18, 0.5, -0.5, 0.4, -0.5, 0.14);
  h.bezierCurveTo(-0.5, -0.12, -0.12, -0.3, 0, -0.45);
  return shapeGeo(h, s, d);
}
/** A five-point star about `s` wide. */
function star(s: number, d = 0.04): THREE.ExtrudeGeometry {
  const h = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * PI) / 5, r = i % 2 ? 0.22 : 0.5;
    const x = Math.sin(a) * r, y = Math.cos(a) * r;
    if (i) h.lineTo(x, y); else h.moveTo(x, y);
  }
  h.closePath();
  return shapeGeo(h, s, d);
}

/** A point on an ellipsoid (centre c, radii r): th = turn from +z towards +x, ph = from the top. */
function onEll(c: V3, r: V3, th: number, ph: number, lift = 0): { p: V3; n: V3 } {
  const u: V3 = [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)];
  const n0: V3 = [u[0] / r[0], u[1] / r[1], u[2] / r[2]];
  const l = Math.hypot(...n0);
  const n: V3 = [n0[0] / l, n0[1] / l, n0[2] / l];
  return { p: [c[0] + r[0] * u[0] + n[0] * lift, c[1] + r[1] * u[1] + n[1] * lift, c[2] + r[2] * u[2] + n[2] * lift], n };
}
/** Turn a mesh so its +z faces along n (flat patches lying on a surface). */
function facing<T extends THREE.Mesh>(m: T, n: V3): T {
  m.lookAt(m.position.x + n[0], m.position.y + n[1], m.position.z + n[2]);
  return m;
}
/** A knitted patch lying on an ellipsoid. */
function patch(k: Kit, part: number, geo: THREE.BufferGeometry, c: V3, r: V3, th: number, ph: number, lift: number, rep = 1, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const { p, n } = onEll(c, r, th, ph, lift);
  return facing(k.add(part, geo, p[0], p[1], p[2], rep, 0, 0, 0, sx, sy, sz), n);
}
/** Plain decoration lying on an ellipsoid. */
function dot(k: Kit, geo: THREE.BufferGeometry, color: number, c: V3, r: V3, th: number, ph: number, lift: number, sx = 1, sy = 1, sz = 1, rough = 0.4): THREE.Mesh {
  const { p, n } = onEll(c, r, th, ph, lift);
  return facing(k.deco(geo, color, p[0], p[1], p[2], rough, 0, 0, 0, sx, sy, sz), n);
}

/**
 * A cute face on the front (+z) of an ellipsoid (centre c, radii r; r[1] large for a
 * cylinder): two shiny eyes, pink cheeks and a smile. s = face size, ey/my = eye and
 * mouth heights from the centre.
 */
function face(k: Kit, c: V3, r: V3, s: number, ey: number, my: number, gap = 0.34): void {
  const z = (dx: number, dy: number) => c[2] + r[2] * Math.sqrt(Math.max(0, 1 - (dx / r[0]) ** 2 - (dy / r[1]) ** 2));
  const er = 0.13 * s;
  for (const sx of [-1, 1]) {
    const ex = sx * gap * s;
    k.deco(sph(er), INK, c[0] + ex, c[1] + ey, z(ex, ey) - er * 0.25, 0.2, 0, 0, 0, 1, 1.12, 0.7);
    k.deco(sph(er * 0.36), 0xffffff, c[0] + ex + er * 0.32, c[1] + ey + er * 0.42, z(ex, ey) + er * 0.18, 0.1);
    const qx = sx * (gap + 0.24) * s, qy = my + 0.1 * s;
    k.deco(sph(0.13 * s), 0xff8fae, c[0] + qx, c[1] + qy, z(qx, qy) - 0.02 * s, 0.7, 0, 0, 0, 1, 0.62, 0.35);
  }
  const mr = 0.12 * s, tilt = Math.asin(Math.max(-0.9, Math.min(0.9, -my / r[1])));
  k.deco(tor(mr, 0.025 * s, PI * 0.72), INK, c[0], c[1] + my + mr, z(0, my) - mr * Math.sin(tilt) + 0.005, 0.4, tilt, 0, PI * 1.14);
}

export const TOYS_B: Build[] = [
  // 11 Snowman: snowy mat, three balls, striped beanie with pompom, scarf, twig arms with mittens
  (k) => {
    const mat = k.part(3), base = k.part(1), mid = k.part(7), head = k.part(7), scarf = k.part(6), tail = k.part(6);
    const hat = k.part(4), trim = k.part(2), pom = k.part(6), mitt = k.part(5);
    k.add(mat, cyl(0.86, 0.92, 0.14, 32), 0, 0.07, 0, 3);
    k.add(mat, tor(0.86, 0.06), 0, 0.14, 0, 3, PI / 2);
    k.add(base, sph(0.72), 0, 0.84, 0, 3, 0, 0, 0, 1, 0.95, 1);
    k.add(mid, sph(0.54), 0, 1.82, 0, 3);
    k.add(head, sph(0.43), 0, 2.62, 0, 2);
    // scarf: wrap, knot and two hanging ends with fringe
    k.add(scarf, tor(0.38, 0.13), 0, 2.24, 0, 2, PI / 2);
    k.add(scarf, sph(0.14), 0.24, 2.17, 0.34, 1);
    k.add(tail, box(0.2, 0.62, 0.08, 0.04), 0.3, 1.86, 0.5, 1, -0.38, 0, 0.14);
    k.add(tail, box(0.18, 0.45, 0.08, 0.04), 0.14, 1.94, 0.52, 1, -0.4, 0, -0.12);
    for (const x of [-0.06, 0, 0.06]) k.add(tail, capsule(0.018, 0.08), 0.39 + x, 1.55, 0.62, 1, -0.38, 0, 0.14);
    // beanie: dome with rib brim, pompom and a snowflake badge
    k.add(hat, hemi(0.43), 0, 2.84, -0.03, 2, -0.12, 0, -0.08);
    for (const y of [3.02, 3.14]) k.add(trim, tor(0.37 - (y - 3.02) * 1.5, 0.035), 0.0, y, -0.06, 1, PI / 2 - 0.12, 0, 0, 1, 1, 1);
    k.add(trim, tor(0.42, 0.09), 0, 2.86, -0.03, 2, PI / 2 - 0.12);
    k.add(pom, sph(0.17), 0.03, 3.3, -0.1, 1);
    k.deco(star(0.15), 0xffffff, 0.0, 3.0, 0.36, 0.5, -0.6);
    // coal buttons are knitted into the trim part
    for (const dy of [0.18, -0.02, -0.22]) {
      const zz = Math.sqrt(0.54 * 0.54 - dy * dy);
      facing(k.add(trim, sph(0.065), 0, 1.82 + dy, zz, 1, 0, 0, 0, 1, 1, 0.5), [0, dy, zz]);
    }
    // twig arms with mittens, and the carrot nose (same orange part)
    for (const s of [-1, 1]) {
      k.deco(cyl(0.03, 0.045, 0.62), 0x7a4a2a, s * 0.72, 2.0, 0, 0.7, 0, 0, -s * 0.95);
      k.deco(cyl(0.02, 0.025, 0.2), 0x7a4a2a, s * 0.78, 2.12, 0, 0.7, 0, 0, -s * 0.1);
      k.add(mitt, sph(0.13), s * 0.98, 2.2, 0, 1, 0, 0, -s * 0.5, 1, 1.2, 0.85);
      k.add(mitt, sph(0.06), s * 0.88, 2.25, 0.08, 1);
      k.add(mitt, tor(0.1, 0.035), s * 0.9, 2.08, 0, 1, PI / 2, 0, -s * 0.9);
    }
    k.add(mitt, cone(0.075, 0.34), 0, 2.57, 0.58, 1, PI / 2);
    face(k, [0, 2.62, 0], [0.43, 0.43, 0.43], 0.45, 0.12, -0.14, 0.3);
  },
  // 12 Cactus Pot: saucer, striped pot with a heart, ribbed cactus with arms, flowers and a bow
  (k) => {
    const saucer = k.part(4), pot = k.part(5), band = k.part(2), band2 = k.part(2), rim = k.part(6), stem = k.part(3);
    const armL = k.part(7), armR = k.part(7), bloom = k.part(0), bloom2 = k.part(4);
    k.add(saucer, cyl(0.82, 0.72, 0.12), 0, 0.06, 0, 3);
    k.add(saucer, tor(0.79, 0.05), 0, 0.13, 0, 3, PI / 2);
    k.add(pot, cyl(0.68, 0.52, 0.78), 0, 0.51, 0, 3);
    k.add(band, tor(0.575, 0.055), 0, 0.38, 0, 2, PI / 2);
    k.add(band2, tor(0.64, 0.055), 0, 0.72, 0, 2, PI / 2);
    k.add(rim, cyl(0.78, 0.74, 0.24), 0, 1.0, 0, 3);
    k.add(rim, tor(0.76, 0.07), 0, 1.12, 0, 3, PI / 2);
    k.add(rim, tor(0.78, 0.05), 0, 0.88, 0, 3, PI / 2);
    k.deco(cyl(0.7, 0.7, 0.04), 0x6b4a2e, 0, 1.12, 0, 0.9);
    for (const [x, z] of [[0.48, 0.38], [-0.5, 0.3], [0.2, -0.55]]) k.deco(sph(0.06), 0xb8b2a6, x, 1.15, z, 0.6, 0, 0, 0, 1, 0.6, 1);
    // ribbed stem
    k.add(stem, capsule(0.4, 1.1), 0, 1.8, 0, 3);
    for (let i = 0; i < 6; i++) {
      const a = PI / 6 + (i * PI) / 3;
      k.add(stem, capsule(0.075, 0.95), Math.sin(a) * 0.35, 1.8, Math.cos(a) * 0.35, 1, 0, 0, 0, 1, 1, 0.8);
    }
    k.add(stem, sph(0.12), 0.36, 2.2, -0.2, 1);
    // arms
    k.add(armL, capsule(0.16, 0.3), -0.52, 1.55, 0, 2, 0, 0, PI / 2);
    k.add(armL, capsule(0.17, 0.42), -0.74, 1.86, 0, 2);
    k.add(armR, capsule(0.15, 0.28), 0.5, 1.88, 0, 2, 0, 0, PI / 2);
    k.add(armR, capsule(0.16, 0.36), 0.7, 2.15, 0, 2);
    // spines
    for (const [x, y, z, nx, nz] of [[-0.3, 1.45, 0.25, -0.7, 0.7], [0.32, 1.6, 0.22, 0.8, 0.6], [-0.36, 2.25, 0.05, -1, 0.1], [0.1, 2.45, 0.34, 0.2, 1], [-0.74, 2.15, 0.15, -0.3, 1], [0.7, 2.4, 0.15, 0.3, 1], [-0.86, 1.75, 0.1, -1, 0.3], [0.85, 2.05, 0.05, 1, 0.2]]) {
      facing(k.deco(cone(0.022, 0.09), 0xfff6dc, x, y, z, 0.5), [nx, 0, nz]).rotateX(PI / 2);
    }
    // a big flower on top + heart on the pot (pink), a small flower and a bow (purple)
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * PI) / 5;
      k.add(bloom, sph(0.13), Math.sin(a) * 0.14, 2.6, Math.cos(a) * 0.14, 1, 0.25 * Math.cos(a), 0, -0.25 * Math.sin(a), 1, 0.45, 1);
    }
    k.deco(sph(0.075), 0xffd51c, 0, 2.66, 0, 0.5);
    k.add(bloom, heart(0.34), 0, 0.55, 0.615, 1, -0.2);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * PI) / 5;
      k.add(bloom2, sph(0.08), 0.7 + Math.sin(a) * 0.08, 2.52, Math.cos(a) * 0.08, 1, 0, 0, 0, 1, 0.45, 1);
    }
    k.deco(sph(0.045), 0xffd51c, 0.7, 2.56, 0, 0.5);
    const ba = 0.6, bp: V3 = [Math.sin(ba) * 0.8, 1.0, Math.cos(ba) * 0.8], t: V3 = [Math.cos(ba), 0, -Math.sin(ba)];
    for (const s of [-1, 1]) facing(k.add(bloom2, sph(0.12), bp[0] + s * 0.13 * t[0], 1.02, bp[2] + s * 0.13 * t[2], 1, 0, 0, 0, 1.25, 0.8, 0.5), [Math.sin(ba), 0, Math.cos(ba)]);
    k.add(bloom2, sph(0.06), bp[0], 1.0, bp[2] + 0.02, 1);
    face(k, [0, 1.95, 0], [0.4, 99, 0.4], 0.36, 0.06, -0.12, 0.3);
  },
  // 13 Mushroom House: grassy base, barrel walls with an arched door and round windows,
  // spotted cap with a rim, chimney with smoke, little mushrooms and a flower box
  (k) => {
    const grass = k.part(3), path = k.part(7), walls = k.part(2), gills = k.part(2), cap = k.part(6), rim = k.part(1);
    const dots = k.part(1), door = k.part(4), pink = k.part(0), chim = k.part(7);
    k.add(grass, cyl(1.15, 1.22, 0.2, 32), 0, 0.1, 0, 3);
    for (let i = 0; i < 9; i++) {
      const a = (i * 2 * PI) / 9 + 0.3;
      k.add(grass, cone(0.07, 0.22, 8), Math.sin(a) * 1.02, 0.3, Math.cos(a) * 1.02, 1, 0, 0, 0.2 * Math.sin(i * 1.7));
    }
    k.add(path, tor(0.72, 0.08), 0, 0.24, 0, 2, PI / 2);
    k.add(path, box(0.52, 0.08, 0.26, 0.04), 0, 0.24, 0.84, 1);
    for (const [x, z] of [[0.08, 1.06], [-0.12, 1.22]]) k.add(path, sph(0.12), x, 0.21, z, 1, 0, 0, 0, 1.2, 0.3, 0.8);
    k.add(walls, cyl(0.6, 0.72, 1.12), 0, 0.76, 0, 3);
    k.add(gills, cyl(1.05, 0.62, 0.14), 0, 1.25, 0, 3);
    k.add(cap, hemi(1.15), 0, 1.3, 0, 3, 0, 0, 0, 1, 0.72, 1);
    k.add(rim, tor(1.12, 0.1), 0, 1.32, 0, 3, PI / 2);
    const cc: V3 = [0, 1.3, 0], cr: V3 = [1.15, 0.83, 1.15];
    for (const [th, ph, s] of [[0.35, 0.95, 0.22], [-0.75, 0.7, 0.18], [1.3, 1.05, 0.2], [-1.6, 1.15, 0.2], [2.4, 0.9, 0.2], [-2.5, 0.75, 0.18], [0, 0.18, 0.2], [0.9, 0.45, 0.14]]) {
      patch(k, dots, sph(s), cc, cr, th, ph, 0.0, 1, 1, 1, 0.32);
    }
    // arched door with frame + window frames
    k.add(door, box(0.4, 0.46, 0.12, 0.05), 0, 0.5, 0.69, 1);
    k.add(door, cyl(0.2, 0.2, 0.12), 0, 0.73, 0.69, 1, PI / 2);
    k.add(door, tor(0.24, 0.045, PI), 0, 0.73, 0.74, 1);
    for (const s of [-1, 1]) k.add(door, capsule(0.045, 0.46), s * 0.24, 0.5, 0.74, 1);
    k.deco(sph(0.035), 0xffd51c, 0.12, 0.52, 0.77, 0.3);
    const wc: V3 = [0, 0.98, 0], wr: V3 = [0.64, 99, 0.64];
    for (const s of [-1, 1]) {
      patch(k, door, tor(0.15, 0.045), wc, wr, s * 0.85, PI / 2, 0.02);
      dot(k, sph(0.14), 0x9fd8ff, wc, wr, s * 0.85, PI / 2, 0.0, 1, 1, 0.18, 0.15);
      const bar = dot(k, box(0.26, 0.03, 0.03, 0.01), 0xffffff, wc, wr, s * 0.85, PI / 2, 0.03);
      dot(k, box(0.03, 0.26, 0.03, 0.01), 0xffffff, wc, wr, s * 0.85, PI / 2, 0.03);
      bar.visible = true;
    }
    // flower box under the right window + little mushrooms (pink)
    patch(k, pink, box(0.36, 0.12, 0.14, 0.04), [0, 0.76, 0], [0.67, 99, 0.67], 0.85, PI / 2, 0.05);
    for (const [i, col] of [0xff5d8f, 0xffd51c, 0xffffff].entries()) dot(k, sph(0.05), col, [0, 0.86, 0], [0.7, 99, 0.7], 0.73 + i * 0.12, PI / 2, 0.05);
    k.add(pink, cyl(0.09, 0.12, 0.32), 0.9, 0.36, 0.58, 1);
    k.add(pink, hemi(0.22), 0.9, 0.5, 0.58, 1, 0, 0, 0.1, 1, 0.7, 1);
    k.add(pink, cyl(0.06, 0.08, 0.22), -0.88, 0.31, 0.55, 1);
    k.add(pink, hemi(0.15), -0.88, 0.41, 0.55, 1, 0, 0, -0.1, 1, 0.7, 1);
    for (const [x, y, z] of [[0.82, 0.6, 0.64], [0.98, 0.58, 0.52], [-0.84, 0.47, 0.62]]) k.deco(sph(0.035), 0xffffff, x, y, z, 0.5);
    // chimney with smoke
    k.add(chim, cyl(0.13, 0.15, 0.5), 0.5, 2.1, -0.45, 1);
    k.add(chim, tor(0.14, 0.05), 0.5, 2.35, -0.45, 1, PI / 2);
    for (const [y, r, x] of [[2.6, 0.1, 0.52], [2.82, 0.08, 0.6], [3.0, 0.06, 0.54]]) k.deco(sph(r), 0xffffff, x, y, -0.45, 0.8);
  },
  // 14 Whale: on a wave, with a cream belly, flippers, tail flukes, a water spout,
  // a sailor hat and a heart on its side
  (k) => {
    const wave = k.part(7), body = k.part(1), tail = k.part(1), belly = k.part(2), fins = k.part(4), flukes = k.part(4);
    const spout = k.part(7), hat = k.part(6), brim = k.part(5), love = k.part(0);
    k.add(wave, cyl(1.15, 1.2, 0.16, 32), 0, 0.08, 0, 3);
    for (let i = 0; i < 10; i++) {
      const a = (i * 2 * PI) / 10;
      k.add(wave, sph(0.17), Math.sin(a) * 1.05, 0.18, Math.cos(a) * 1.05, 1, 0, 0, 0, 1.2, 0.6, 1);
    }
    const bc: V3 = [0, 1.0, 0], br: V3 = [1.0, 0.81, 1.14];
    k.add(body, sph(1), 0, 1.0, 0, 3, 0, 0, 0, 1.0, 0.81, 1.14);
    k.add(belly, sph(0.75), 0, 0.72, 0.32, 2, 0, 0, 0, 1, 0.6, 1.15);
    for (const y of [0.52, 0.64]) k.add(belly, tor(0.42 - (0.64 - y), 0.03, PI * 0.7), 0, y + 0.2, 1.0, 1, 0.6, 0, PI * 1.15);
    k.add(tail, capsule(0.28, 0.5), 0, 1.25, -1.15, 2, -0.95, 0, 0, 1, 1, 0.8);
    for (const s of [-1, 1]) {
      k.add(flukes, sph(0.32), s * 0.3, 1.62, -1.5, 1, 0, s * 0.2, s * 0.35, 1.15, 0.24, 0.6);
      k.add(fins, sph(0.3), s * 0.98, 0.72, 0.35, 1, 0, s * 0.5, -s * 0.7, 0.55, 0.2, 1);
    }
    // water spout
    k.add(spout, capsule(0.06, 0.26), -0.25, 1.95, 0.05, 1);
    for (const [x, y, r] of [[-0.25, 2.24, 0.1], [-0.45, 2.16, 0.085], [-0.05, 2.16, 0.085], [-0.58, 1.98, 0.07], [0.08, 1.98, 0.07]]) k.add(spout, sph(r), x, y, 0.05, 1);
    // sailor hat
    k.add(hat, cyl(0.26, 0.32, 0.22), 0.38, 1.82, 0.12, 1, 0, 0, -0.3);
    k.add(hat, hemi(0.26), 0.44, 1.92, 0.12, 1, 0, 0, -0.3, 1, 0.4, 1);
    k.add(brim, tor(0.32, 0.07), 0.34, 1.72, 0.12, 1, PI / 2, 0.3, 0, 1, 1, 1);
    k.add(brim, tor(0.29, 0.04), 0.36, 1.78, 0.12, 1, PI / 2, 0.3, 0, 1, 1, 1);
    k.deco(star(0.12), 0xffd51c, 0.36, 1.83, 0.42, 0.5, 0, 0.1, -0.3);
    // heart on the side
    patch(k, love, heart(0.36), bc, br, 1.45, 1.25, 0.02, 1);
    patch(k, love, heart(0.36), bc, br, -1.45, 1.25, 0.02, 1);
    face(k, bc, br, 0.6, 0.05, -0.16, 0.36);
  },
  // 15 Penguin: on an ice floe, white belly and face mask, beanie with pompom, scarf, flippers
  (k) => {
    const floe = k.part(7), orange = k.part(5), body = k.part(1), belly = k.part(2), head = k.part(1), mask = k.part(2);
    const wings = k.part(4), scarf = k.part(6), tail = k.part(6), hat = k.part(0), brim = k.part(6);
    k.add(floe, cyl(1.0, 1.06, 0.18, 9), 0, 0.09, 0, 3);
    for (const [x, z, s] of [[-0.72, 0.42, 0.22], [0.75, -0.3, 0.18]]) k.add(floe, box(s, s * 0.8, s, 0.04), x, 0.24, z, 1, 0, x * 0.8, 0);
    for (const s of [-1, 1]) {
      k.add(orange, sph(0.18), s * 0.28, 0.25, 0.42, 1, 0, s * 0.2, 0, 1.2, 0.4, 1.6);
      for (const t of [-1, 0, 1]) k.add(orange, sph(0.07), s * 0.28 + t * 0.11, 0.22, 0.68, 1, 0, 0, 0, 1, 0.7, 1);
    }
    k.add(body, sph(0.8), 0, 1.07, 0, 3, 0, 0, 0, 1, 1.12, 0.92);
    k.add(belly, sph(0.62), 0, 0.98, 0.32, 2, 0, 0, 0, 1, 1.1, 0.68);
    for (const y of [0.75, 1.0, 1.25]) k.deco(sph(0.045), INK, 0, y, 0.32 + 0.62 * 0.68 * Math.sqrt(1 - ((y - 0.98) / 0.68) ** 2), 0.3);
    k.add(head, sph(0.55), 0, 2.08, 0, 3);
    for (const s of [-1, 1]) k.add(mask, sph(0.26), s * 0.15, 2.07, 0.36, 1, 0, 0, -s * 0.15, 1, 1.15, 0.5);
    k.add(orange, cone(0.1, 0.24), 0, 1.94, 0.62, 1, PI / 2);
    for (const s of [-1, 1]) k.add(wings, sph(0.26), s * 0.8, 1.15, 0, 1, 0.15, 0, s * 0.35, 0.42, 1.3, 0.85);
    // scarf with a hanging end
    k.add(scarf, tor(0.52, 0.12), 0, 1.68, 0, 2, PI / 2);
    k.add(scarf, sph(0.13), -0.3, 1.64, 0.45, 1);
    k.add(tail, box(0.2, 0.5, 0.08, 0.04), -0.36, 1.38, 0.58, 1, -0.35, 0, -0.15);
    for (const x of [-0.06, 0, 0.06]) k.add(tail, capsule(0.018, 0.08), -0.4 + x, 1.1, 0.68, 1, -0.35, 0, -0.15);
    // beanie
    k.add(hat, hemi(0.47), 0, 2.38, -0.06, 2, -0.18);
    k.add(hat, sph(0.15), 0, 2.88, -0.16, 1);
    k.add(brim, tor(0.47, 0.08), 0, 2.4, -0.06, 2, PI / 2 - 0.18);
    face(k, [0, 2.07, 0.0], [0.55, 0.55, 0.62], 0.42, 0.1, -0.2, 0.36);
  },
  // 16 Owl: on a leafy branch, feathered belly, big eyes in face discs, ear tufts, bow tie
  (k) => {
    const branch = k.part(5), leaves = k.part(3), body = k.part(4), belly = k.part(2), discs = k.part(0), ears = k.part(6);
    const wingL = k.part(7), wingR = k.part(7), bow = k.part(6), tailF = k.part(7);
    k.add(branch, capsule(0.13, 2.1), 0, 0.13, 0.15, 2, 0, 0, PI / 2);
    k.add(branch, capsule(0.07, 0.35), 0.95, 0.32, 0.15, 1, 0, 0, -0.8);
    for (const s of [-1, 1]) for (const t of [-1, 0, 1]) k.add(branch, capsule(0.05, 0.08), s * 0.25 + t * 0.08, 0.28, 0.42, 1, PI / 2, 0, 0);
    for (const [x, y, z, ry, rz] of [[-1.05, 0.26, 0.32, 0.4, 0.2], [1.12, 0.52, 0.1, -0.3, -0.5], [0.62, 0.22, 0.45, 0.8, -0.1], [-0.6, 0.18, -0.2, -0.6, 0.1]]) {
      k.add(leaves, sph(0.15), x, y, z, 1, 0, ry, rz, 1.7, 0.25, 0.8);
    }
    k.add(body, sph(0.85), 0, 1.25, 0, 3, 0, 0, 0, 1, 1.15, 0.9);
    k.add(belly, sph(0.55), 0, 1.0, 0.48, 2, 0, 0, 0, 1, 1.05, 0.5);
    for (const [x, y] of [[-0.18, 1.15], [0.18, 1.15], [0, 0.98], [-0.32, 0.92], [0.32, 0.92], [-0.16, 0.78], [0.16, 0.78]]) {
      const zz = 0.48 + 0.275 * Math.sqrt(Math.max(0, 1 - (x / 0.55) ** 2 - ((y - 1.0) / 0.578) ** 2));
      k.add(belly, tor(0.07, 0.022, PI), x, y + 0.02, zz, 1, 0, 0, PI);
    }
    for (const s of [-1, 1]) {
      k.add(discs, cyl(0.29, 0.31, 0.08), s * 0.27, 1.68, 0.66, 1, PI / 2, 0, 0);
      k.add(discs, tor(0.3, 0.04), s * 0.27, 1.68, 0.7, 1, 0, s * 0.2, 0);
      k.deco(sph(0.18), 0xffffff, s * 0.27, 1.69, 0.72, 0.3, 0, 0, 0, 1, 1, 0.35);
      k.deco(sph(0.1), INK, s * 0.25, 1.68, 0.77, 0.2, 0, 0, 0, 1, 1.1, 0.5);
      k.deco(sph(0.035), 0xffffff, s * 0.25 + 0.04, 1.72, 0.82, 0.1);
      k.add(ears, cone(0.16, 0.38), s * 0.45, 2.2, 0.05, 1, 0, 0, -s * 0.35);
      k.add(ears, cone(0.08, 0.2), s * 0.6, 2.3, 0.05, 1, 0, 0, -s * 0.7);
      k.deco(sph(0.1), 0xff8fae, s * 0.5, 1.4, 0.63, 0.7, 0, 0, 0, 1, 0.6, 0.3);
    }
    k.add(wingL, sph(0.32), -0.85, 1.2, 0, 1, 0, 0, -0.2, 0.45, 1.25, 0.9);
    k.add(wingL, tor(0.18, 0.03, PI), -0.95, 1.05, 0.2, 1, 0, -1.3, PI);
    k.add(wingR, sph(0.32), 0.85, 1.2, 0, 1, 0, 0, 0.2, 0.45, 1.25, 0.9);
    k.add(wingR, tor(0.18, 0.03, PI), 0.95, 1.05, 0.2, 1, 0, 1.3, PI);
    for (const s of [-1, 0, 1]) k.add(tailF, capsule(0.09, 0.34), s * 0.14, 0.58, -0.66, 1, -0.75, 0, s * 0.35);
    for (const s of [-1, 1]) k.add(bow, cone(0.15, 0.26), s * 0.17, 1.36, 0.78, 1, 0, 0, s * PI / 2, 1, 1, 0.6);
    k.add(bow, sph(0.08), 0, 1.36, 0.81, 1);
    k.deco(cone(0.07, 0.18), 0xff8a1f, 0, 1.5, 0.78, 0.4, PI - 0.3);
  },
  // 17 Castle Tower: grassy mound with bushes, stone plinth, brick tower with arched door and
  // windows, battlements, scalloped roof trim, pointed roof with a flag, side turret
  (k) => {
    const mound = k.part(3), bush = k.part(3), plinth = k.part(1), tower = k.part(4), battle = k.part(1);
    const roof = k.part(6), trim = k.part(2), door = k.part(5), turret = k.part(1), troof = k.part(6);
    k.add(mound, cyl(1.05, 1.15, 0.25, 32), 0, 0.125, 0, 3);
    for (const [x, z, r] of [[-0.75, 0.55, 0.2], [-0.55, 0.72, 0.15], [0.7, 0.62, 0.18], [-0.85, -0.35, 0.18]]) k.add(bush, sph(r), x, 0.25 + r * 0.7, z, 1);
    for (const [x, z, col] of [[-0.68, 0.72, 0xff5d8f], [0.75, 0.78, 0xffd51c]]) k.deco(sph(0.045), col, x, 0.48, z, 0.5);
    k.add(plinth, cyl(0.78, 0.8, 0.22), 0, 0.36, 0, 3);
    k.add(tower, cyl(0.62, 0.66, 1.55), 0, 1.25, 0, 3);
    const tc: V3 = [0, 1.25, 0], tr: V3 = [0.64, 99, 0.64];
    for (const [th, y] of [[1.2, 0.8], [1.5, 1.2], [-1.1, 1.05], [-1.45, 0.7], [2.4, 1.3], [-2.3, 0.9], [0.8, 1.75], [-0.75, 1.7]]) {
      patch(k, tower, box(0.2, 0.1, 0.06, 0.03), [0, y, 0], tr, th, PI / 2, 0.0);
    }
    k.add(battle, cyl(0.8, 0.72, 0.28), 0, 2.16, 0, 3);
    for (let i = 0; i < 8; i++) {
      const a = (i * PI) / 4 + PI / 8;
      k.add(battle, box(0.2, 0.24, 0.2, 0.05), Math.sin(a) * 0.68, 2.42, Math.cos(a) * 0.68, 1, 0, a, 0);
    }
    k.add(roof, cone(0.6, 1.1), 0, 2.9, 0, 2);
    k.deco(cyl(0.02, 0.02, 0.55), 0x8a5530, 0, 3.6, 0, 0.5);
    k.add(roof, box(0.04, 0.22, 0.4, 0.02), 0, 3.75, 0.2, 1);
    k.add(trim, tor(0.6, 0.07), 0, 2.38, 0, 2, PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = (i * 2 * PI) / 10;
      k.add(trim, sph(0.08), Math.sin(a) * 0.6, 2.32, Math.cos(a) * 0.6, 1);
    }
    // arched door + window frames
    k.add(door, box(0.42, 0.48, 0.1, 0.05), 0, 0.72, 0.66, 1);
    k.add(door, cyl(0.21, 0.21, 0.1), 0, 0.96, 0.66, 1, PI / 2);
    k.add(door, tor(0.25, 0.045, PI), 0, 0.96, 0.7, 1);
    k.deco(sph(0.035), 0xffd51c, 0.12, 0.75, 0.73, 0.3);
    for (const x of [-0.08, 0.08]) k.deco(box(0.02, 0.62, 0.02, 0.01), 0x7a4a2a, x, 0.8, 0.72, 0.6);
    for (const [th, y] of [[0, 1.62], [-0.65, 1.35], [0.65, 1.35]]) {
      patch(k, door, tor(0.13, 0.04), [0, y, 0], tr, th, PI / 2, 0.02, 1, 0.8, 1.15, 1);
      dot(k, capsule(0.08, 0.1), 0x2d3570, [0, y, 0], tr, th, PI / 2, 0.0, 1, 1, 0.3, 0.3);
    }
    // side turret
    k.add(turret, cyl(0.25, 0.28, 1.2), 0.8, 0.85, -0.25, 2);
    k.add(turret, tor(0.27, 0.06), 0.8, 1.45, -0.25, 1, PI / 2);
    k.add(troof, cone(0.32, 0.55), 0.8, 1.75, -0.25, 1);
    k.deco(sph(0.06), 0xffd51c, 0.8, 2.05, -0.25, 0.4);
    dot(k, capsule(0.06, 0.08), 0x2d3570, [0.8, 1.05, -0.25], [0.27, 99, 0.27], 0.6, PI / 2, 0.0, 1, 1, 0.3, 0.3);
    void tc;
  },
  // 18 Teapot: saucer, footed pot with a lace band, polka dots and a face, curved spout,
  // looped handle, lid with a rim and knob
  (k) => {
    const saucer = k.part(3), foot = k.part(6), body = k.part(1), stripe = k.part(0), dots = k.part(2), lace = k.part(0);
    const rim = k.part(6), lid = k.part(7), spout = k.part(5), handle = k.part(5);
    k.add(saucer, cyl(1.05, 0.9, 0.1, 32), 0, 0.05, 0, 3);
    k.add(saucer, tor(1.02, 0.05), 0, 0.1, 0, 3, PI / 2);
    k.add(foot, cyl(0.55, 0.5, 0.14), 0, 0.17, 0, 2);
    k.add(foot, tor(0.54, 0.045), 0, 0.24, 0, 2, PI / 2);
    const bc: V3 = [0, 0.9, 0], br: V3 = [0.85, 0.7, 0.85];
    k.add(body, sph(0.85), 0, 0.9, 0, 3, 0, 0, 0, 1, 0.82, 1);
    k.add(stripe, tor(0.755, 0.06), 0, 0.58, 0, 3, PI / 2);
    for (let i = 0; i < 14; i++) {
      const a = (i * 2 * PI) / 14;
      k.add(stripe, sph(0.06), Math.sin(a) * 0.76, 0.5, Math.cos(a) * 0.76, 1);
    }
    k.add(lace, tor(0.7, 0.05), 0, 1.3, 0, 3, PI / 2);
    for (const [th, ph] of [[0.95, 0.75], [-0.95, 0.75], [2.2, 0.95], [-2.2, 0.95], [PI, 1.25], [0.85, 1.85], [-0.85, 1.85], [2.4, 1.75], [-2.4, 1.75], [PI, 0.6]]) {
      patch(k, dots, sph(0.09), bc, br, th, ph, 0, 1, 1, 1, 0.35);
    }
    k.add(rim, tor(0.44, 0.07), 0, 1.5, 0, 2, PI / 2);
    k.add(lid, hemi(0.42), 0, 1.5, 0, 2, 0, 0, 0, 1, 0.55, 1);
    k.add(lid, cyl(0.05, 0.07, 0.1), 0, 1.77, 0, 1);
    k.add(lid, sph(0.12), 0, 1.86, 0, 1);
    // curved spout (+x)
    k.add(spout, cyl(0.12, 0.2, 0.48), 0.96, 0.92, 0, 1, 0, 0, -0.9);
    k.add(spout, cyl(0.09, 0.12, 0.36), 1.22, 1.22, 0, 1, 0, 0, -0.45);
    k.add(spout, cyl(0.12, 0.1, 0.08), 1.3, 1.4, 0, 1, 0, 0, -0.45);
    // looped handle (-x) with a wrap
    k.add(handle, tor(0.34, 0.085, PI * 1.25), -0.86, 0.98, 0, 1, 0, 0, PI * 0.375);
    k.add(handle, tor(0.11, 0.04), -1.2, 0.98, 0, 1, PI / 2, 0, 0);
    // steam
    for (const [x, y, r] of [[1.38, 1.62, 0.07], [1.32, 1.8, 0.06], [1.42, 1.95, 0.05]]) k.deco(sph(r), 0xffffff, x, y, 0, 0.8);
    face(k, bc, br, 0.5, 0.1, -0.1, 0.34);
  },
  // 19 Ice Cream: waffle cone with lines and a lip, strawberry scoop with drips and a face,
  // mint scoop with a ruffle, whipped cream swirl, wafer stick, cherry, sprinkles
  (k) => {
    const coneP = k.part(5), waffle = k.part(5), lip = k.part(2), s1 = k.part(0), drip = k.part(0), s2 = k.part(3);
    const ruffle = k.part(3), cream = k.part(1), wafer = k.part(2), cherry = k.part(6);
    k.add(coneP, cone(0.52, 1.3, 24), 0, 0.65, 0, 3, PI);
    for (const y of [0.42, 0.75, 1.05]) k.add(waffle, tor((0.52 * y) / 1.3 + 0.005, 0.03), 0, y, 0, 1, PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i * PI) / 3 + 0.3;
      const m = k.add(waffle, capsule(0.025, 1.0), Math.sin(a) * 0.26, 0.68, Math.cos(a) * 0.26, 1);
      m.lookAt(Math.sin(a) * 0.5, 1.3, Math.cos(a) * 0.5);
      m.rotateX(PI / 2);
    }
    k.add(lip, tor(0.53, 0.1), 0, 1.32, 0, 2, PI / 2);
    k.add(s1, sph(0.6), 0, 1.72, 0, 3, 0, 0, 0, 1, 0.88, 1);
    k.add(drip, tor(0.54, 0.13), 0, 1.45, 0, 2, PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i * 2 * PI) / 6 + 0.5, l = 0.08 + (i % 3) * 0.06;
      k.add(drip, capsule(0.075, l), Math.sin(a) * 0.6, 1.36 - l / 2, Math.cos(a) * 0.6, 1);
    }
    k.add(s2, sph(0.5), 0, 2.36, 0, 3, 0, 0, 0, 1, 0.9, 1);
    k.add(ruffle, tor(0.46, 0.1), 0, 2.1, 0, 2, PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = (i * 2 * PI) / 10;
      k.add(ruffle, sph(0.1), Math.sin(a) * 0.52, 2.06, Math.cos(a) * 0.52, 1, 0, 0, 0, 1, 0.8, 1);
    }
    for (const [i, [r, t]] of [[0.32, 0.12], [0.23, 0.1], [0.13, 0.08]].entries()) k.add(cream, tor(r, t), 0, 2.78 + i * 0.13, 0, 1, PI / 2);
    k.add(cream, cone(0.1, 0.18), 0, 3.12, 0, 1);
    k.add(wafer, box(0.14, 0.62, 0.14, 0.04), 0.32, 2.6, -0.18, 1, 0.2, 0, -0.45);
    for (const y of [-0.15, 0.05, 0.25]) k.deco(box(0.15, 0.02, 0.15, 0.01), 0xc98a3a, 0.32 - y * Math.sin(0.45), 2.6 + y * Math.cos(0.45), -0.18 - y * 0.2, 0.6, 0.2, 0, -0.45);
    k.add(cherry, sph(0.17), 0.05, 3.32, 0.02, 1);
    k.deco(cyl(0.015, 0.015, 0.28), 0x4a8a2a, 0.12, 3.52, 0.02, 0.6, 0, 0, -0.4);
    k.add(cherry, heart(0.3), 0, 0.98, 0.39, 1, -0.38);
    const cols = [0xff5d8f, 0xffd51c, 0x1478f4, 0xffffff, 0x9b5de5, 0xff8a1f];
    for (let i = 0; i < 12; i++) {
      const th = i * 2.4, ph = 0.35 + (i % 4) * 0.22;
      dot(k, capsule(0.018, 0.06), cols[i % cols.length], [0, 2.36, 0], [0.5, 0.45, 0.5], th, ph, 0.0, 1, 1, 1, 0.4).rotateZ(i * 1.3);
    }
    face(k, [0, 1.72, 0], [0.6, 0.53, 0.6], 0.5, 0.06, -0.14, 0.34);
  },
  // 20 Hamburger: on a plate, bun with a face and sesame seeds, patty, dripping cheese,
  // ruffled lettuce, tomato, onion rings, pickles, a flag pick
  (k) => {
    const plate = k.part(1), bunB = k.part(5), patty = k.part(6), cheese = k.part(2), lettuce = k.part(3), tomato = k.part(0);
    const onion = k.part(4), pickles = k.part(3), bunT = k.part(5), crust = k.part(5);
    k.add(plate, cyl(1.25, 1.12, 0.08, 36), 0, 0.04, 0, 3);
    k.add(plate, tor(1.22, 0.06), 0, 0.1, 0, 3, PI / 2);
    k.add(bunB, lathe([[0, 0], [0.78, 0], [0.9, 0.05], [0.96, 0.16], [0.95, 0.27], [0.9, 0.32], [0, 0.32]]), 0, 0.1, 0, 3);
    k.add(patty, lathe([[0, 0], [0.95, 0], [1.02, 0.05], [1.05, 0.14], [1.01, 0.23], [0.93, 0.27], [0, 0.27]]), 0, 0.42, 0, 3);
    for (let i = 0; i < 12; i++) {
      const a = (i * 2 * PI) / 12;
      k.add(patty, sph(0.07), Math.sin(a) * 1.03, 0.56 + (i % 2) * 0.04, Math.cos(a) * 1.03, 1, 0, 0, 0, 1, 0.8, 1);
    }
    k.add(cheese, box(1.75, 0.07, 1.75, 0.03), 0, 0.72, 0, 3, 0, 0.4, 0);
    for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const lx = cx * 0.78, lz = cz * 0.78, x = lx * Math.cos(0.4) + lz * Math.sin(0.4), z = -lx * Math.sin(0.4) + lz * Math.cos(0.4);
      k.add(cheese, capsule(0.08, 0.16), x, 0.62, z, 1);
    }
    k.add(lettuce, cyl(1.0, 1.0, 0.08, 24), 0, 0.79, 0, 3);
    for (let i = 0; i < 14; i++) {
      const a = (i * 2 * PI) / 14;
      k.add(lettuce, sph(0.16), Math.sin(a) * 1.0, 0.78 + (i % 2) * 0.04, Math.cos(a) * 1.0, 1, (i % 2) * 0.4, a, 0, 1, 0.42, 1);
    }
    k.add(tomato, cyl(0.88, 0.88, 0.12, 32), 0, 0.9, 0, 3);
    k.add(tomato, tor(0.86, 0.04), 0, 0.9, 0, 2, PI / 2);
    k.add(onion, tor(0.86, 0.045), 0.06, 0.99, 0.04, 2, PI / 2);
    k.add(onion, tor(0.68, 0.04), -0.1, 0.99, -0.06, 2, PI / 2);
    for (const a of [0.6, 2.4, 4.3]) k.add(pickles, cyl(0.2, 0.2, 0.05, 12), Math.sin(a) * 0.85, 0.99, Math.cos(a) * 0.85, 1, 0.12, 0, 0.1);
    for (const a of [0.6, 2.4, 4.3]) for (const d of [-0.07, 0.07]) k.deco(sph(0.025), 0xf3f5d0, Math.sin(a) * 0.85 + d, 1.025, Math.cos(a) * 0.85 + d * 0.5, 0.5);
    const tc: V3 = [0, 1.0, 0], tr: V3 = [0.98, 0.62, 0.98];
    k.add(bunT, hemi(0.98), 0, 1.0, 0, 3, 0, 0, 0, 1, 0.62, 1);
    k.add(crust, tor(0.94, 0.09), 0, 1.03, 0, 3, PI / 2);
    for (const [th, ph] of [[0.8, 0.5], [-0.8, 0.45], [0.2, 0.25], [-0.3, 0.6], [1.6, 0.7], [-1.7, 0.75], [2.6, 0.5], [-2.5, 0.55], [3.1, 0.2], [1.2, 0.2], [0.55, 0.85], [-0.6, 0.9]]) {
      dot(k, sph(0.05), 0xfff3c4, tc, tr, th, ph, 0.005, 1.6, 0.8, 0.45, 0.5);
    }
    // flag pick
    k.deco(cyl(0.018, 0.018, 0.85), 0xc98a3a, 0.25, 1.75, -0.25, 0.6);
    k.add(plate, box(0.42, 0.26, 0.04, 0.02), 0.47, 2.03, -0.25, 1);
    k.deco(star(0.14), 0xffd51c, 0.47, 2.03, -0.22, 0.4);
    face(k, tc, tr, 0.5, 0.26, 0.05, 0.36);
  },
];
