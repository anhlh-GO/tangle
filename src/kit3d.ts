// The crocheted toys the player knits, one per level (40, all different). Every toy
// is made of parts built from rounded shapes in a crochet-stitch texture; a part
// starts as plain undyed yarn and takes the colour of the yarn the player knits
// into it. Plain decoration (eyes, wheels, glass, the bunny) is never knitted.
// Every toy faces +z; names live in levels.ts (TOY_INFO), the builders in src/toys/*.ts.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface Part { meshes: THREE.Mesh[]; c: number }

export const RAW = '#f3eee8';

let stitch: THREE.CanvasTexture | null = null;
/** A crochet texture: rows of plump V stitches with soft shading between them. */
export function stitchTexture(): THREE.CanvasTexture {
  if (stitch) return stitch;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 16, y = row * 16;
      for (const s of [-1, 1]) {
        // each half of the V is a little rounded loop of yarn
        const cx = x + 8 + s * 3.2, cy = y + 8;
        const grd = g.createRadialGradient(cx - s, cy - 3, 0.5, cx, cy, 7);
        grd.addColorStop(0, 'rgba(255,255,255,0.65)');
        grd.addColorStop(0.55, 'rgba(255,255,255,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.32)');
        g.fillStyle = grd;
        g.save();
        g.translate(cx, cy);
        g.rotate(s * 0.45);
        g.beginPath();
        g.ellipse(0, 0, 3.6, 7.2, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  }
  stitch = new THREE.CanvasTexture(c);
  stitch.wrapS = stitch.wrapT = THREE.RepeatWrapping;
  stitch.colorSpace = THREE.SRGBColorSpace;
  stitch.anisotropy = 4;
  return stitch;
}

/** Helpers a toy builder uses: every shape joins a part (or is plain decoration). */
export class Kit {
  group = new THREE.Group();
  parts: Part[] = [];
  private tex = stitchTexture();
  part(c: number): number { this.parts.push({ meshes: [], c }); return this.parts.length - 1; }
  private mat(rep: number): THREE.MeshStandardMaterial {
    const t = this.tex.clone();
    t.needsUpdate = true;
    t.repeat.set(rep * 0.45, rep * 0.45);
    return new THREE.MeshStandardMaterial({ color: RAW, map: t, roughness: 0.92 });
  }
  add(part: number, geo: THREE.BufferGeometry, x: number, y: number, z: number, rep = 2, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Mesh {
    const m = new THREE.Mesh(geo, this.mat(rep));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    if (part >= 0) this.parts[part].meshes.push(m);
    return m;
  }
  /** Plain decoration (glass, eyes, wheels, plush...) that is never knitted. */
  deco(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, rough = 0.35, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, map?: THREE.Texture): THREE.Mesh {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: rough, map: map ?? null }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    this.group.add(m);
    return m;
  }
}

export const box = (w: number, h: number, d: number, r = 0.12) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
export const sph = (r: number) => new THREE.SphereGeometry(r, 28, 18);
export const cyl = (r1: number, r2: number, h: number, s = 28) => new THREE.CylinderGeometry(r1, r2, h, s);
export const tor = (r: number, t: number, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 12, 32, arc);
export const cone = (r: number, h: number, s = 28) => new THREE.ConeGeometry(r, h, s);
export const capsule = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 16);

export function eyes(k: Kit, x: number, y: number, z: number, gap: number, r: number): void {
  for (const s of [-1, 1]) {
    k.deco(sph(r), 0x1d1a24, x + s * gap, y, z, 0.2);
    k.deco(sph(r * 0.35), 0xffffff, x + s * gap + r * 0.3, y + r * 0.35, z + r * 0.7, 0.1);
  }
}
export function cheeks(k: Kit, x: number, y: number, z: number, gap: number, r: number): void {
  for (const s of [-1, 1]) k.deco(sph(r), 0xff9db5, x + s * gap, y, z, 0.6, 0, 0, 0, 1, 0.6, 0.4);
}
export function wheel(k: Kit, x: number, y: number, z: number, r: number, w = 0.24): void {
  k.deco(cyl(r, r, w), 0x23285c, x, y, z, 0.45, 0, 0, Math.PI / 2);
  k.deco(cyl(r * 0.45, r * 0.45, w + 0.02), 0xcfd3dc, x, y, z, 0.3, 0, 0, Math.PI / 2);
}
export function plateTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#111'; g.lineWidth = 8; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = '#111'; g.font = 'bold 60px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** The plush white bunny, waving (decoration). */
export function bunny(k: Kit, x: number, y: number, z: number, s: number): void {
  const W = 0xfdfcfb;
  k.deco(sph(0.34 * s), W, x, y + 0.3 * s, z, 0.7, 0, 0, 0, 1, 0.95, 0.95);
  k.deco(sph(0.26 * s), W, x, y, z + 0.02 * s, 0.7);
  for (const d of [-1, 1]) k.deco(capsule(0.08 * s, 0.32 * s), W, x + d * 0.12 * s, y + 0.75 * s, z - 0.03 * s, 0.7, 0, 0, d * -0.12);
  for (const d of [-1, 1]) k.deco(capsule(0.04 * s, 0.24 * s), 0xffc4d2, x + d * 0.12 * s, y + 0.75 * s, z + 0.03 * s, 0.7, 0, 0, d * -0.12);
  k.deco(capsule(0.07 * s, 0.18 * s), W, x - 0.3 * s, y + 0.12 * s, z + 0.05 * s, 0.7, 0, 0, 0.9);
  k.deco(capsule(0.07 * s, 0.2 * s), W, x + 0.3 * s, y + 0.28 * s, z + 0.05 * s, 0.7, 0, 0, -2.3);
  eyes(k, x, y + 0.33 * s, z + 0.3 * s, 0.12 * s, 0.045 * s);
  cheeks(k, x, y + 0.24 * s, z + 0.3 * s, 0.2 * s, 0.05 * s);
  k.deco(sph(0.03 * s), 0xff7f98, x, y + 0.27 * s, z + 0.34 * s, 0.5);
}

export type Build = (k: Kit) => void;
