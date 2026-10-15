// Toys 21–30 (see kit3d.ts for the helpers and the part rules).
import { Kit, type Build, box, sph, cyl, tor, cone, capsule, eyes, cheeks, wheel, plateTexture } from '../kit3d';
import * as THREE from 'three';

type V3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
const ZAX = new THREE.Vector3(0, 0, 1);
const GLASS = 0xdff4ff;
const INK = 0x1d1a24;
const MOUTH = 0x6a2236;

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
/** A patch (dot, plate, spot) sitting on an ellipsoid surface, facing out. */
function onShell(k: Kit, part: number, geo: THREE.BufferGeometry, c: V3, R: V3, th: number, ph: number, rep = 1, s: V3 = [1, 1, 1], lift = 0): THREE.Mesh {
  const dir = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
  const n = new THREE.Vector3(dir.x / R[0], dir.y / R[1], dir.z / R[2]).normalize();
  const p = new THREE.Vector3(c[0] + R[0] * dir.x, c[1] + R[1] * dir.y, c[2] + R[2] * dir.z).addScaledVector(n, lift);
  const m = k.add(part, geo, p.x, p.y, p.z, rep, 0, 0, 0, ...s);
  return aim(m, n);
}
/** A smooth tube through points (tentacles, tails, spirals). */
const tube = (pts: V3[], r: number, seg = 48) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 12, false);
/** Upper half of a sphere (shells, domes, caps). */
const dome = (r: number) => new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
/** Half of a dome: side -1 = the -x half, +1 = the +x half. */
const halfDome = (r: number, side: number) => new THREE.SphereGeometry(r, 28, 14, side < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI / 2);
/** A wide arch (fender / wheel arch): a half torus stretched across its axis. */
const arch = (r: number, t: number) => new THREE.TorusGeometry(r, t, 10, 24, Math.PI);
/** A puffy heart, centred, facing +z. */
function heart(s: number): THREE.BufferGeometry {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5 * s);
  h.bezierCurveTo(-0.15 * s, -0.3 * s, -0.55 * s, -0.1 * s, -0.5 * s, 0.18 * s);
  h.bezierCurveTo(-0.45 * s, 0.48 * s, -0.08 * s, 0.5 * s, 0, 0.25 * s);
  h.bezierCurveTo(0.08 * s, 0.5 * s, 0.45 * s, 0.48 * s, 0.5 * s, 0.18 * s);
  h.bezierCurveTo(0.55 * s, -0.1 * s, 0.15 * s, -0.3 * s, 0, -0.5 * s);
  const g = new THREE.ExtrudeGeometry(h, { depth: 0.04 * s, bevelEnabled: true, bevelThickness: 0.06 * s, bevelSize: 0.06 * s, bevelSegments: 4, curveSegments: 16 });
  g.center();
  return g;
}
/** A little smile (lower half torus) centred at (x, y), facing +z. */
function smile(k: Kit, x: number, y: number, z: number, r: number, rx = 0): void {
  k.deco(tor(r, Math.max(0.016, r * 0.2), Math.PI), MOUTH, x, y, z, 0.4, rx, 0, Math.PI);
}
/** Eyes + cheeks + smile, the standard cute face. */
function face(k: Kit, x: number, y: number, z: number, s: number): void {
  eyes(k, x, y, z, 0.2 * s, 0.07 * s);
  cheeks(k, x, y - 0.1 * s, z - 0.02 * s, 0.34 * s, 0.065 * s);
  smile(k, x, y - 0.06 * s, z + 0.01 * s, 0.075 * s);
}

export const TOYS_C: Build[] = [
  // 21 Double Decker
  (k) => {
    const low = k.part(6), up = k.part(0), belt = k.part(2), roof = k.part(1), skirt = k.part(4),
      front = k.part(7), rear = k.part(7), door = k.part(5), ads = k.part(5), sign = k.part(2);
    k.add(low, box(1.3, 0.86, 2.4, 0.22), 0, 0.78, 0, 3);
    k.add(belt, box(1.38, 0.15, 2.46, 0.07), 0, 1.24, 0, 3);
    k.add(up, box(1.28, 0.8, 2.34, 0.24), 0, 1.7, 0, 3);
    k.add(roof, box(1.34, 0.12, 2.4, 0.06), 0, 2.12, 0, 3);
    k.add(roof, box(1.04, 0.1, 1.9, 0.05), 0, 2.2, 0, 2);
    k.add(roof, box(0.42, 0.1, 0.5, 0.05), 0, 2.28, -0.35, 1);
    // skirt + wheel arches
    k.add(skirt, box(1.36, 0.14, 2.46, 0.06), 0, 0.41, 0, 3);
    for (const x of [-0.67, 0.67]) for (const z of [-0.8, 0.8]) k.add(skirt, arch(0.34, 0.07), x, 0.34, z, 1, 0, Math.PI / 2, 0, 1, 1, 1.4);
    // front & back faces with bumpers
    for (const [p, s] of [[front, 1], [rear, -1]] as const) {
      k.add(p, box(1.16, 0.36, 0.1, 0.05), 0, 0.6, s * 1.2, 1);
      k.add(p, capsule(0.08, 1.06), 0, 0.37, s * 1.25, 1, 0, 0, Math.PI / 2);
      k.deco(box(1.06, 0.3, 0.04, 0.02), GLASS, 0, 0.99, s * 1.2, 0.1);
      k.deco(box(1.04, 0.32, 0.04, 0.02), GLASS, 0, 1.66, s * 1.17, 0.1);
      for (const x of [-0.44, 0.44]) k.deco(sph(0.085), s > 0 ? 0xfff1a8 : 0xff4d5a, x, 0.6, s * 1.25, 0.3, 0, 0, 0, 1, 1, 0.6);
    }
    // destination sign
    k.add(sign, box(0.88, 0.2, 0.1, 0.05), 0, 1.97, 1.16, 1);
    k.add(sign, box(0.88, 0.2, 0.1, 0.05), 0, 1.97, -1.16, 1);
    k.deco(new THREE.PlaneGeometry(0.74, 0.14), 0xffffff, 0, 1.97, 1.215, 0.6, 0, 0, 0, 1, 1, 1, plateTexture('BUS 88'));
    // side windows (door on the -x side)
    for (const s of [-1, 1]) {
      for (const z of s < 0 ? [-0.85, -0.3, 0.25] : [-0.85, -0.3, 0.25, 0.8]) k.deco(box(0.04, 0.28, 0.42, 0.02), GLASS, s * 0.655, 1.0, z, 0.1);
      for (const z of [-0.85, -0.3, 0.25, 0.8]) k.deco(box(0.04, 0.3, 0.42, 0.02), GLASS, s * 0.645, 1.68, z, 0.1);
      k.add(ads, box(0.07, 0.26, 1.35, 0.05), s * 0.665, 0.62, -0.4, 1);
      decoStick(k, 0x23285c, 0.03, [s * 0.62, 1.12, 1.12], [s * 0.8, 1.02, 1.2]);
    }
    k.add(door, box(0.07, 0.66, 0.44, 0.04), -0.67, 0.73, 0.8, 1);
    k.deco(box(0.03, 0.4, 0.3, 0.015), GLASS, -0.71, 0.8, 0.8, 0.1);
    for (const x of [-0.6, 0.6]) for (const z of [-0.8, 0.8]) wheel(k, x, 0.3, z, 0.29, 0.2);
    // face on the front panel
    eyes(k, 0, 0.66, 1.25, 0.17, 0.065);
    cheeks(k, 0, 0.57, 1.24, 0.29, 0.055);
    smile(k, 0, 0.6, 1.26, 0.06);
  },
  // 22 Airplane
  (k) => {
    const body = k.part(1), band = k.part(0), wingL = k.part(6), wingR = k.part(6), tips = k.part(2), fin = k.part(2),
      stab = k.part(6), nose = k.part(5), prop = k.part(3), canopy = k.part(0), gear = k.part(4);
    k.add(body, capsule(0.42, 1.7), 0, 1.0, 0, 3, Math.PI / 2);
    k.add(body, sph(0.3), 0, 1.12, -1.15, 1, 0, 0, 0, 0.9, 0.9, 1.2);
    for (const z of [0.45, -0.55]) k.add(band, tor(0.43, 0.06), 0, 1.0, z, 2);
    // nose cowling + spinner + propeller
    k.add(nose, tor(0.36, 0.09), 0, 1.0, 1.02, 2);
    k.add(prop, cone(0.16, 0.3), 0, 1.0, 1.42, 1, Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      k.add(prop, box(0.14, 0.5, 0.05, 0.04), Math.sin(a) * -0.28, 1.0 + Math.cos(a) * 0.28, 1.38, 1, 0, 0, a);
    }
    // face on the nose
    eyes(k, 0, 1.23, 1.16, 0.14, 0.06);
    for (const s of [-1, 1]) k.deco(sph(0.06), 0xff9db5, s * 0.3, 1.06, 1.1, 0.6, 0, s * 0.8, 0, 1, 0.6, 0.4);
    // canopy
    k.deco(sph(0.3), GLASS, 0, 1.36, 0.3, 0.1, 0, 0, 0, 0.8, 0.7, 1.3);
    k.add(canopy, tor(0.3, 0.06), 0, 1.33, 0.3, 1, Math.PI / 2, 0, 0, 0.85, 1.35, 1);
    k.add(canopy, capsule(0.04, 0.6), 0, 1.55, 0.3, 1, Math.PI / 2);
    // wings with tips and ailerons
    for (const [p, s] of [[wingL, -1], [wingR, 1]] as const) {
      k.add(p, box(1.35, 0.13, 0.78, 0.06), s * 0.82, 0.82, 0.15, 2, 0, 0, s * 0.07);
      k.add(tips, sph(0.2), s * 1.52, 0.87, 0.15, 1, 0, 0, 0, 0.6, 0.45, 2.0);
      k.add(tips, box(0.7, 0.07, 0.16, 0.03), s * 1.0, 0.88, -0.17, 1, 0, 0, s * 0.07);
      for (const z of [-0.45, -0.05, 0.35]) k.deco(cyl(0.075, 0.075, 0.03), GLASS, s * 0.41, 1.1, z - 0.15, 0.1, 0, 0, Math.PI / 2);
    }
    // tail
    k.add(fin, box(0.1, 0.7, 0.55, 0.05), 0, 1.55, -1.05, 1, -0.35);
    k.add(fin, capsule(0.07, 0.3), 0, 1.86, -1.25, 1, Math.PI / 2 - 0.35);
    k.add(stab, box(1.25, 0.09, 0.42, 0.05), 0, 1.12, -1.15, 1);
    // landing gear with wheel pants
    for (const s of [-1, 1]) {
      k.add(gear, cyl(0.045, 0.045, 0.45), s * 0.45, 0.55, 0.35, 1, 0, 0, -s * 0.2);
      k.add(gear, sph(0.2), s * 0.5, 0.27, 0.35, 1, 0, 0, 0, 0.55, 0.75, 1.5);
      wheel(k, s * 0.5, 0.18, 0.35, 0.16, 0.14);
    }
    k.deco(sph(0.08), 0x23285c, 0, 0.62, -1.15, 0.4);
  },
  // 23 Helicopter
  (k) => {
    const cabin = k.part(2), tail = k.part(2), frame = k.part(7), stripes = k.part(7), door = k.part(0),
      hump = k.part(5), mast = k.part(4), blades = k.part(1), fin = k.part(3), skids = k.part(4);
    k.add(cabin, sph(0.8), 0, 1.15, 0.15, 3, 0, 0, 0, 1, 0.9, 1.15);
    // windscreen + frame
    k.deco(sph(0.48), GLASS, 0, 1.36, 0.9, 0.1, 0, 0, 0, 1, 0.72, 0.5);
    k.add(frame, tor(0.47, 0.065), 0, 1.36, 0.98, 1, -0.25, 0, 0, 1, 0.72, 1);
    eyes(k, 0, 1.4, 1.12, 0.17, 0.08);
    cheeks(k, 0, 0.98, 1.0, 0.36, 0.07);
    smile(k, 0, 1.03, 1.04, 0.08, -0.3);
    // stripes: lower band + tail rings
    k.add(stripes, tor(0.64, 0.075), 0, 0.73, 0.15, 2, Math.PI / 2, 0, 0, 1, 1.15, 1);
    for (const z of [-0.95, -1.35]) k.add(stripes, tor(0.17, 0.055), 0, 1.3 + (z + 1) * -0.1, z, 1, -0.1);
    // tail boom, fin and tail rotor
    k.add(tail, capsule(0.16, 1.3), 0, 1.3, -1.15, 2, Math.PI / 2 - 0.1);
    k.add(fin, box(0.08, 0.55, 0.36, 0.04), 0, 1.6, -1.85, 1, -0.3);
    k.add(fin, box(0.6, 0.07, 0.25, 0.03), 0, 1.38, -1.75, 1);
    for (const a of [0.3, 0.3 + Math.PI / 2]) k.add(fin, box(0.04, 0.46, 0.09, 0.02), -0.09, 1.62, -1.86, 1, a);
    k.deco(sph(0.06), 0xcfd3dc, -0.11, 1.62, -1.86, 0.3);
    // door with porthole on each side
    for (const s of [-1, 1]) {
      k.add(door, box(0.07, 0.5, 0.45, 0.04), s * 0.78, 1.1, -0.1, 1, 0, 0, s * 0.08);
      k.deco(cyl(0.12, 0.12, 0.03), GLASS, s * 0.83, 1.2, -0.1, 0.1, 0, 0, Math.PI / 2);
    }
    // engine hump, mast, rotor
    k.add(hump, box(0.62, 0.32, 0.85, 0.15), 0, 1.93, -0.1, 1);
    k.deco(cyl(0.06, 0.06, 0.2), 0x5b6377, 0.18, 1.98, -0.55, 0.4, Math.PI / 2);
    k.add(mast, cyl(0.07, 0.07, 0.3), 0, 2.2, 0.0, 1);
    k.add(mast, sph(0.14), 0, 2.36, 0.0, 1, 0, 0, 0, 1, 0.7, 1);
    for (const a of [0.5, 0.5 + Math.PI / 2]) {
      k.add(blades, box(2.8, 0.06, 0.22, 0.03), 0, 2.4, 0, 2, 0, a, 0);
      for (const s of [-1, 1]) k.add(blades, sph(0.13), Math.cos(a) * s * 1.4, 2.4, -Math.sin(a) * s * 1.4, 1, 0, -a, 0, 1, 0.4, 1);
    }
    // skids
    for (const s of [-1, 1]) {
      k.add(skids, capsule(0.065, 1.5), s * 0.55, 0.12, 0.1, 1, Math.PI / 2);
      stick(k, skids, 0.06, [s * 0.55, 0.12, 0.85], [s * 0.55, 0.28, 1.1]);
      for (const z of [-0.3, 0.5]) stick(k, skids, 0.045, [s * 0.55, 0.12, z], [s * 0.4, 0.55, z]);
    }
  },
  // 24 Tractor
  (k) => {
    const body = k.part(3), hood = k.part(3), grille = k.part(4), stripe = k.part(2), cab = k.part(6), roof = k.part(2),
      rearF = k.part(5), frontF = k.part(5), pipe = k.part(4), seat = k.part(0), toolbox = k.part(7);
    k.add(body, box(1.1, 0.55, 1.9, 0.18), 0, 0.85, 0, 3);
    k.add(hood, box(0.95, 0.55, 0.95, 0.22), 0, 1.32, 0.45, 2);
    k.add(stripe, box(0.99, 0.09, 0.99, 0.045), 0, 1.42, 0.45, 2);
    // grille with slats + headlights
    k.add(grille, box(0.7, 0.38, 0.08, 0.04), 0, 1.25, 0.93, 1);
    for (const x of [-0.2, 0, 0.2]) k.add(grille, capsule(0.035, 0.26), x, 1.25, 0.98, 1);
    for (const s of [-1, 1]) {
      k.deco(cyl(0.1, 0.1, 0.06), 0xfff1a8, s * 0.36, 1.5, 0.93, 0.3, Math.PI / 2);
      k.deco(tor(0.1, 0.025), 0xcfd3dc, s * 0.36, 1.5, 0.96, 0.3);
    }
    // cab: low walls, four posts, roof
    k.add(cab, box(1.05, 0.36, 0.9, 0.1), 0, 1.3, -0.5, 2);
    for (const x of [-0.48, 0.48]) for (const z of [-0.9, -0.1]) k.add(cab, capsule(0.065, 0.62), x, 1.8, z, 1);
    k.add(roof, box(1.3, 0.14, 1.1, 0.07), 0, 2.15, -0.5, 2);
    k.add(roof, box(1.05, 0.1, 0.85, 0.05), 0, 2.25, -0.5, 1);
    k.deco(sph(0.1), 0xffa21a, 0.35, 2.33, -0.75, 0.3, 0, 0, 0, 1, 0.8, 1);
    k.deco(box(0.86, 0.56, 0.03, 0.02), GLASS, 0, 1.78, -0.1, 0.1);
    k.deco(box(0.86, 0.56, 0.03, 0.02), GLASS, 0, 1.78, -0.9, 0.1);
    for (const s of [-1, 1]) k.deco(box(0.03, 0.56, 0.7, 0.015), GLASS, s * 0.48, 1.78, -0.5, 0.1);
    eyes(k, 0, 1.86, -0.06, 0.18, 0.075);
    cheeks(k, 0, 1.68, -0.07, 0.3, 0.06);
    smile(k, 0, 1.76, -0.06, 0.08);
    // seat + steering wheel
    k.add(seat, box(0.45, 0.12, 0.35, 0.05), 0, 1.53, -0.62, 1);
    k.add(seat, box(0.45, 0.4, 0.1, 0.05), 0, 1.75, -0.8, 1);
    k.deco(tor(0.13, 0.025), 0x23285c, 0, 1.72, -0.28, 0.4, -0.9);
    decoStick(k, 0x23285c, 0.025, [0, 1.48, -0.18], [0, 1.72, -0.28]);
    // fenders over the wheels
    for (const s of [-1, 1]) {
      k.add(rearF, arch(0.68, 0.09), s * 0.76, 0.62, -0.5, 2, 0, Math.PI / 2, 0, 1, 1, 2.0);
      k.add(frontF, arch(0.44, 0.08), s * 0.66, 0.38, 0.68, 1, 0, Math.PI / 2, 0, 1, 1, 1.6);
      wheel(k, s * 0.75, 0.62, -0.5, 0.6, 0.32);
      k.deco(cyl(0.16, 0.16, 0.34), 0xffcf3d, s * 0.75, 0.62, -0.5, 0.35, 0, 0, Math.PI / 2);
      wheel(k, s * 0.66, 0.38, 0.68, 0.37, 0.24);
      k.deco(cyl(0.1, 0.1, 0.26), 0xffcf3d, s * 0.66, 0.38, 0.68, 0.35, 0, 0, Math.PI / 2);
    }
    // exhaust + toolbox on the back
    k.add(pipe, cyl(0.07, 0.07, 0.75), 0.3, 1.9, 0.72, 1);
    k.add(pipe, cyl(0.1, 0.09, 0.1), 0.3, 2.3, 0.72, 1);
    k.add(toolbox, box(0.85, 0.36, 0.32, 0.1), 0, 0.98, -1.08, 1);
    k.deco(box(0.2, 0.06, 0.04, 0.02), 0xcfd3dc, 0, 1.08, -1.25, 0.3);
  },
  // 25 Ladybug
  (k) => {
    const shellL = k.part(6), shellR = k.part(6), dotsL = k.part(4), dotsR = k.part(4), head = k.part(4),
      belly = k.part(1), legs = k.part(1), antenna = k.part(2), collar = k.part(0), flower = k.part(5);
    const C: V3 = [0, 0.42, -0.1], R: V3 = [0.95, 0.74, 1.06];
    k.add(belly, sph(0.88), 0, 0.42, -0.08, 2, 0, 0, 0, 1, 0.4, 1.12);
    for (const [p, s] of [[shellL, -1], [shellR, 1]] as const) {
      k.add(p, halfDome(1, s), s * 0.025, C[1], C[2], 2, 0, 0, s * -0.04, R[0], R[1], R[2]);
    }
    for (const [p, s] of [[dotsL, -1], [dotsR, 1]] as const) {
      for (const [th, ph] of [[0.55, 0.45], [0.95, 0.15], [0.85, -0.6], [1.25, -1.1], [1.25, 0.75]] as const) {
        const phi = s > 0 ? ph : Math.PI - ph;
        onShell(k, p, sph(0.16), C, R, th, phi, 1, [1, 0.32, 1], 0.01);
      }
    }
    // collar between head and shell
    k.add(collar, sph(0.5), 0, 0.62, 0.78, 1, 0, 0, 0, 1.15, 0.62, 0.55);
    k.add(head, sph(0.42), 0, 0.6, 1.0, 2);
    face(k, 0, 0.66, 1.38, 0.85);
    // antennae with pompom tips
    for (const s of [-1, 1]) {
      stick(k, antenna, 0.03, [s * 0.12, 0.95, 1.02], [s * 0.3, 1.32, 1.12]);
      k.add(antenna, sph(0.085), s * 0.31, 1.36, 1.13, 1);
      for (const z of [-0.55, 0.0, 0.5]) {
        stick(k, legs, 0.055, [s * 0.75, 0.3, z], [s * 1.02, 0.12, z + 0.12]);
        k.add(legs, sph(0.08), s * 1.04, 0.08, z + 0.14, 1, 0, 0, 0, 1, 0.7, 1.3);
      }
    }
    // flower on the head
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.add(flower, sph(0.11), 0.22 + Math.cos(a) * 0.12, 0.98, 0.92 + Math.sin(a) * 0.12, 1, 0, 0, 0, 1, 0.45, 1);
    }
    k.deco(sph(0.07), 0xffd51c, 0.22, 1.02, 0.92, 0.5);
  },
  // 26 Octopus
  (k) => {
    const head = k.part(4), spotsL = k.part(0), spotsR = k.part(0), frill = k.part(5), hat = k.part(1), band = k.part(6);
    const arms = [k.part(7), k.part(7), k.part(7), k.part(7)];
    const C: V3 = [0, 1.45, 0], R: V3 = [0.85, 0.92, 0.8];
    k.add(head, sph(1), C[0], C[1], C[2], 3, 0, 0, 0, ...R);
    k.add(frill, tor(0.52, 0.13), 0, 0.72, 0, 2, Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const dx = Math.sin(a), dz = Math.cos(a);
      const P = (r: number, y: number): V3 => [dx * r, y, dz * r];
      const pts = [P(0.3, 0.8), P(0.68, 0.36), P(1.0, 0.16), P(1.32, 0.2), P(1.45, 0.42), P(1.3, 0.58)];
      k.add(arms[i >> 1], tube(pts, 0.135), 0, 0, 0, 1.5);
      const end = pts[pts.length - 1];
      k.add(arms[i >> 1], sph(0.135), end[0], end[1], end[2], 1);
      k.deco(sph(0.05), 0xffc1d6, dx * 1.18, 0.33, dz * 1.18, 0.6, 0, 0, 0, 1, 0.4, 1);
    }
    for (const [p, s] of [[spotsL, -1], [spotsR, 1]] as const) {
      for (const [th, ph] of [[0.5, 0.95], [0.85, 0.35], [1.05, -0.45], [0.55, -0.9]] as const) {
        onShell(k, p, sph(0.15), C, R, th, s > 0 ? ph : Math.PI - ph, 1, [1, 0.3, 1], 0.01);
      }
    }
    // tilted sailor hat
    const T = -0.18, hx = (dy: number) => 0.12 - dy * Math.sin(T), hy = (dy: number) => 2.3 + dy * Math.cos(T);
    k.add(hat, cyl(0.33, 0.38, 0.32), hx(0.16), hy(0.16), 0, 1, 0, 0, T);
    k.add(hat, tor(0.38, 0.09), hx(0.02), hy(0.02), 0, 1, Math.PI / 2, 0, T);
    k.add(band, cyl(0.345, 0.37, 0.11), hx(0.08), hy(0.08), 0, 1, 0, 0, T);
    k.add(band, sph(0.12), hx(0.42), hy(0.42), 0, 1);
    eyes(k, 0, 1.42, 0.78, 0.27, 0.11);
    cheeks(k, 0, 1.22, 0.72, 0.46, 0.09);
    smile(k, 0, 1.3, 0.8, 0.09, -0.2);
  },
  // 27 Snail
  (k) => {
    const foot = k.part(3), head = k.part(3), stalks = k.part(3), coilOut = k.part(5), coilIn = k.part(6),
      bits = k.part(2), spots = k.part(2), flower = k.part(0), scarf = k.part(1), leaf = k.part(7);
    k.add(foot, capsule(0.3, 1.7), 0, 0.28, 0.05, 3, Math.PI / 2, 0, 0, 1.15, 1, 0.8);
    k.add(foot, sph(0.18), 0, 0.2, -1.05, 1, 0, 0, 0, 1, 0.6, 1.6);
    k.add(head, capsule(0.27, 0.5), 0, 0.72, 0.95, 2, -0.2);
    k.add(head, sph(0.4), 0, 1.15, 1.05, 2);
    face(k, 0, 1.18, 1.42, 0.85);
    for (const s of [-1, 1]) {
      stick(k, stalks, 0.045, [s * 0.14, 1.42, 1.0], [s * 0.27, 1.8, 1.02]);
      k.add(stalks, sph(0.1), s * 0.28, 1.84, 1.03, 1);
      k.deco(sph(0.05), INK, s * 0.29, 1.85, 1.12, 0.2);
    }
    // coiled shell: outer coil, inner coil, centre button and a band at the opening
    k.add(coilOut, tor(0.5, 0.34), 0, 1.15, -0.3, 3, 0, Math.PI / 2, 0);
    k.add(coilIn, tor(0.22, 0.21), -0.22, 1.15, -0.3, 2, 0, Math.PI / 2, 0);
    k.add(coilIn, sph(0.3), 0.08, 1.15, -0.3, 1, 0, 0, 0, 0.9, 1, 1);
    k.add(bits, sph(0.14), -0.4, 1.15, -0.3, 1, 0, 0, 0, 0.6, 1, 1);
    k.add(bits, sph(0.14), 0.36, 1.15, -0.3, 1, 0, 0, 0, 0.6, 1, 1);
    for (const z of [-0.65, 0.15, 0.55]) k.add(spots, sph(0.1), -0.33, 0.33, z, 1, 0, 0, 0, 0.5, 1, 1.2);
    // flower on top of the shell
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.add(flower, sph(0.13), Math.cos(a) * 0.14, 2.0, -0.3 + Math.sin(a) * 0.14, 1, 0, 0, 0, 1, 0.45, 1);
    }
    k.deco(sph(0.08), 0xffd51c, 0, 2.04, -0.3, 0.5);
    // scarf + leaf hat
    ring(k, scarf, 0.27, 0.085, [0, 0.82, 0.92], [0, 1, 0.2], 1);
    stick(k, scarf, 0.07, [0.2, 0.8, 1.12], [0.32, 0.55, 1.2]);
    k.add(leaf, sph(0.3), -0.12, 1.6, 0.98, 1, 0, 0.5, 0.45, 1, 0.22, 0.55);
    stick(k, leaf, 0.025, [0.05, 1.5, 1.0], [0.08, 1.66, 1.0]);
  },
  // 28 Turtle
  (k) => {
    const shellL = k.part(3), shellR = k.part(3), rim = k.part(2), plates = k.part(5), lowPlates = k.part(5), head = k.part(7),
      frontLegs = k.part(7), backLegs = k.part(7), scarf = k.part(6), cap = k.part(1);
    const C: V3 = [0, 0.38, 0], R: V3 = [0.95, 0.68, 1.08];
    for (const [p, s] of [[shellL, -1], [shellR, 1]] as const) k.add(p, halfDome(1, s), C[0], C[1], C[2], 2, 0, 0, 0, ...R);
    k.add(rim, tor(1.0, 0.12), 0, 0.4, 0, 3, Math.PI / 2, 0, 0, 0.98, 1.1, 1);
    onShell(k, plates, cyl(0.27, 0.27, 0.07, 6), C, R, 0, 0, 1, [1, 1, 1], 0.0);
    for (let i = 0; i < 6; i++) onShell(k, plates, cyl(0.24, 0.24, 0.07, 6), C, R, 0.72, (i / 6) * Math.PI * 2 + Math.PI / 6, 1);
    for (let i = 0; i < 8; i++) onShell(k, lowPlates, cyl(0.2, 0.2, 0.07, 6), C, R, 1.22, (i / 8) * Math.PI * 2, 1);
    // head with cap and scarf
    stick(k, head, 0.2, [0, 0.38, 0.85], [0, 0.55, 1.15], 1);
    k.add(head, sph(0.4), 0, 0.66, 1.25, 2);
    face(k, 0, 0.7, 1.6, 0.85);
    k.add(cap, dome(0.33), 0, 0.86, 1.2, 1, -0.2);
    k.add(cap, sph(0.24), 0, 0.92, 1.5, 1, -0.15, 0, 0, 1, 0.14, 1);
    k.deco(sph(0.05), 0xffd51c, 0, 1.2, 1.14, 0.5);
    ring(k, scarf, 0.24, 0.08, [0, 0.47, 1.0], [0, 0.6, 0.8], 1);
    stick(k, scarf, 0.06, [-0.2, 0.42, 1.08], [-0.34, 0.2, 1.12]);
    // legs + tail
    for (const s of [-1, 1]) {
      k.add(frontLegs, sph(0.25), s * 0.78, 0.18, 0.62, 1, 0, s * 0.5, 0, 1.3, 0.6, 1);
      k.add(backLegs, sph(0.23), s * 0.76, 0.16, -0.66, 1, 0, -s * 0.5, 0, 1.3, 0.6, 1);
      for (const d of [-0.08, 0.08]) k.deco(sph(0.04), 0xfdfcfb, s * (0.93 + d), 0.17, 0.84 - s * d * 0.5, 0.6);
    }
    k.add(backLegs, cone(0.12, 0.35), 0, 0.3, -1.22, 1, -Math.PI / 2);
  },
  // 29 Frog
  (k) => {
    const body = k.part(3), bumps = k.part(3), belly = k.part(0), thighs = k.part(7), arms = k.part(7), feet = k.part(5), frontFeet = k.part(5),
      spots = k.part(4), crown = k.part(2), bow = k.part(6);
    const C: V3 = [0, 0.82, 0], R: V3 = [1.0, 0.74, 0.86];
    k.add(body, sph(1), C[0], C[1], C[2], 3, 0, 0, 0, ...R);
    k.add(belly, sph(0.62), 0, 0.62, 0.42, 2, 0, 0, 0, 1, 0.75, 0.75);
    for (const s of [-1, 1]) {
      k.add(bumps, sph(0.3), s * 0.42, 1.52, 0.28, 2);
      k.deco(sph(0.2), 0xffffff, s * 0.42, 1.56, 0.45, 0.3);
      k.deco(sph(0.11), INK, s * 0.4, 1.56, 0.6, 0.2);
      k.deco(sph(0.04), 0xffffff, s * 0.4 + 0.04, 1.6, 0.7, 0.1);
      // big back legs, little arms, webbed feet
      k.add(thighs, sph(0.38), s * 0.82, 0.42, -0.12, 1, 0, 0, 0, 0.8, 0.9, 1.3);
      stick(k, arms, 0.11, [s * 0.62, 0.62, 0.52], [s * 0.5, 0.16, 0.78]);
      for (const [x, z, sc] of [[0.98, 0.42, 1.0], [0.5, 0.88, 0.75]] as const) {
        const fp = sc < 1 ? frontFeet : feet;
        k.add(fp, sph(0.2 * sc), s * x, 0.07, z, 1, 0, 0, 0, 1.1, 0.35, 1.3);
        for (const t of [-1, 0, 1]) k.add(fp, sph(0.07 * sc), s * x + t * 0.11 * sc, 0.07, z + 0.24 * sc, 1);
      }
    }
    for (const [th, ph] of [[0.55, -1.2], [0.9, -2.1], [0.95, -0.7], [1.3, -1.6], [0.7, -2.7], [0.7, -0.15]] as const) {
      onShell(k, spots, sph(0.15), C, R, th, ph, 1, [1, 0.3, 1], 0.01);
    }
    // big smile + cheeks
    k.deco(tor(0.24, 0.035, Math.PI), MOUTH, 0, 1.2, 0.78, 0.4, -0.35, 0, Math.PI);
    cheeks(k, 0, 1.1, 0.72, 0.42, 0.08);
    // bow tie
    for (const s of [-1, 1]) k.add(bow, sph(0.15), s * 0.16, 0.9, 0.86, 1, 0, 0, s * 0.2, 1.2, 0.8, 0.55);
    k.add(bow, sph(0.075), 0, 0.9, 0.92, 1);
    // little crown
    k.add(crown, cyl(0.22, 0.26, 0.18, 16), 0, 1.66, 0.02, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      k.add(crown, cone(0.065, 0.17, 12), Math.cos(a) * 0.19, 1.83, 0.02 + Math.sin(a) * 0.19, 1);
      k.deco(sph(0.035), 0xffffff, Math.cos(a) * 0.19, 1.93, 0.02 + Math.sin(a) * 0.19, 0.3);
    }
    k.deco(sph(0.05), 0xe2244a, 0, 1.66, 0.25, 0.2);
  },
  // 30 Kitty
  (k) => {
    const body = k.part(1), rib = k.part(6), heartP = k.part(0), sleeves = k.part(1), paws = k.part(2), feet = k.part(2),
      head = k.part(5), muzzle = k.part(2), ears = k.part(5), tail = k.part(5), bow = k.part(4);
    k.add(body, sph(0.72), 0, 0.85, 0, 3, 0, 0, 0, 1, 1, 0.9);
    // sweater ribbing: hem, neck, cuffs; tabby stripes on the forehead share the colour
    k.add(rib, tor(0.62, 0.085), 0, 0.5, 0, 2, Math.PI / 2, 0, 0, 1, 0.9, 1);
    k.add(rib, tor(0.4, 0.09), 0, 1.45, 0.02, 2, Math.PI / 2, 0, 0, 1, 0.92, 1);
    k.add(heartP, heart(0.38), 0, 0.95, 0.66, 1, -0.12);
    for (const s of [-1, 1]) {
      const a: V3 = [s * 0.55, 1.22, 0.12], b: V3 = [s * 0.46, 0.84, 0.5];
      stick(k, sleeves, 0.15, a, b);
      ring(k, rib, 0.13, 0.05, [s * 0.455, 0.8, 0.53], [b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      k.add(paws, sph(0.15), s * 0.44, 0.72, 0.6, 1);
      k.add(feet, sph(0.2), s * 0.3, 0.12, 0.45, 1, 0, 0, 0, 1, 0.6, 1.3);
      k.deco(sph(0.07), 0xff9db5, s * 0.3, 0.13, 0.7, 0.6, 0, 0, 0, 1, 0.6, 0.4);
    }
    // head
    k.add(head, sph(0.62), 0, 1.95, 0.08, 3, 0, 0, 0, 1.12, 0.95, 1);
    for (const x of [-0.13, 0, 0.13]) k.add(rib, capsule(0.035, 0.14), x, 2.38, 0.42, 1, -0.75);
    for (const s of [-1, 1]) {
      k.add(ears, cone(0.25, 0.42, 16), s * 0.42, 2.5, 0.02, 1, 0, 0, -s * 0.35, 1, 1, 0.55);
      k.add(heartP, cone(0.15, 0.26, 16), s * 0.4, 2.47, 0.1, 1, 0, 0, -s * 0.35, 1, 1, 0.3);
      k.add(muzzle, sph(0.17), s * 0.13, 1.78, 0.6, 1, 0, 0, 0, 1, 0.8, 0.7);
      for (const t of [-1, 1]) decoStick(k, 0x5a4a52, 0.008, [s * 0.28, 1.8 + t * 0.03, 0.66], [s * 0.6, 1.83 + t * 0.09, 0.6]);
    }
    k.deco(sph(0.06), 0xff7f98, 0, 1.87, 0.73, 0.5, 0, 0, 0, 1.3, 0.8, 0.8);
    for (const s of [-1, 1]) smile(k, s * 0.06, 1.8, 0.75, 0.055);
    eyes(k, 0, 2.02, 0.63, 0.24, 0.085);
    cheeks(k, 0, 1.82, 0.56, 0.42, 0.075);
    // curly tail
    k.add(tail, tube([[0.25, 0.35, -0.55], [0.55, 0.5, -0.7], [0.75, 0.95, -0.72], [0.68, 1.35, -0.6], [0.5, 1.45, -0.5]], 0.11), 0, 0, 0, 1.5);
    k.add(tail, sph(0.11), 0.5, 1.45, -0.5, 1);
    // bow by the right ear
    for (const s of [-1, 1]) k.add(bow, sph(0.13), 0.3 + s * 0.13, 2.42, 0.38, 1, 0, 0, s * 0.35, 1.3, 0.9, 0.6);
    k.add(bow, sph(0.065), 0.3, 2.42, 0.44, 1);
  },
];
