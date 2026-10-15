// The 3D view (three.js): a wooden board with pegs and yarn strands stretched
// between them. A strand floats as high as the pile of strands under it, so what
// lies on top is plain to see; yarn has a twisted-fibre texture. The game drives
// it with plain calls; this file owns no rules.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RAW, buildToy, type Toy } from './items3d';

const SP = 1.15;        // distance between pegs
const STEP = 0.11;      // height per layer of yarn
const R = 0.1;        // rope radius (thin twisted rope, as in the reference)

interface StrandView { group: THREE.Group; tube: THREE.Mesh; hit: THREE.Mesh; loops: THREE.Mesh[]; outline: THREE.MeshBasicMaterial; ball: THREE.Group | null; segs: number; mat: THREE.MeshPhysicalMaterial; color: THREE.Color; mid: THREE.Vector3; anim: number; shake: number; flash: number; glow: number; dim: boolean; gone: boolean; bead?: THREE.Object3D; mystery?: THREE.Sprite }
/** A chain tying two strands (the "knot" blocker): links on an arc over the board, which burst when it breaks. */
interface Chain { pair: [number, number]; group: THREE.Group; links: { m: THREE.Mesh; p: THREE.Vector3; q: THREE.Quaternion; v: THREE.Vector3 }[]; broken: number; shake: number }
const CHAIN_COLORS = [0xffc83a, 0xdfe4ee, 0xd8894a];
const DIM = 0.55;   // strands held by the padlock are drawn this much darker

function mysteryTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  g.lineWidth = 5; g.strokeStyle = '#6d6880'; g.stroke();
  g.fillStyle = '#6d6880';
  g.font = 'bold 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('?', 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GOLD = () => new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.28, metalness: 0.55 });
/** A chunky cartoon padlock, keyhole on the front. */
function padlock(): { group: THREE.Group; shackle: THREE.Mesh } {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.34, 0.18, 4, 0.06), GOLD());
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.042, 12, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd9dde6, roughness: 0.25, metalness: 0.8 }));
  shackle.position.y = 0.16;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0x3a2508 }));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, 0.02, 0.092);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), hole.material);
  slot.position.set(0, -0.04, 0.092);
  g.add(body, shackle, hole, slot);
  g.traverse((o) => { o.castShadow = true; });
  return { group: g, shackle };
}
/** A gold key lying on its strand. */
function keyMesh(): THREE.Group {
  const g = new THREE.Group();
  const m = GOLD();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.032, 10, 20), m);
  ring.position.x = -0.17;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), m);
  shaft.position.x = 0.03;
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.05), m);
  t1.position.set(0.12, -0.05, 0);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.05), m);
  t2.position.set(0.06, -0.04, 0);
  g.add(ring, shaft, t1, t2);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

let woodTex: THREE.CanvasTexture | null = null;
/** Light maple with soft grain streaks (the board in the reference). */
function woodTexture(): THREE.CanvasTexture {
  if (woodTex) return woodTex;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  const base = g.createLinearGradient(0, 0, 512, 512);
  base.addColorStop(0, '#f1be82');
  base.addColorStop(1, '#ecb478');
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 70; k++) {
    const y = rnd() * 512, amp = 1 + rnd() * 4, ph = rnd() * 6;
    g.strokeStyle = rnd() < 0.5 ? `rgba(214,128,48,${0.08 + rnd() * 0.1})` : `rgba(255,214,150,${0.1 + rnd() * 0.14})`;
    g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const yy = y + Math.sin(x / 90 + ph) * amp;
      if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
  }
  woodTex = new THREE.CanvasTexture(c);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.anisotropy = 4;
  return woodTex;
}

const RADIAL = 16;
/**
 * A real twisted rope: a tube whose surface bulges into three helical plies with deep
 * grooves between them (geometry, not just a texture), grooves darkened by vertex colour.
 */
function ropeGeometry(curve: THREE.Curve<THREE.Vector3>, segs: number, r: number, closed = false, len = curve.getLength()): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(curve, segs, r, RADIAL, closed);
  const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  const PITCH = 0.62;   // one full turn of a ply along the rope
  for (let k = 0; k < pos.count; k++) {
    const u = uv.getX(k), th = uv.getY(k) * Math.PI * 2;
    curve.getPointAt(Math.min(1, u), c);
    v.fromBufferAttribute(pos, k).sub(c);
    const ph = 3 * th - (3 * Math.PI * 2 * u * len) / PITCH;
    const w = Math.cos(ph);
    const bulge = 1 + 0.2 * (Math.sqrt(Math.max(0, w * 0.5 + 0.5)) - 0.55);
    v.multiplyScalar(bulge).add(c);
    pos.setXYZ(k, v.x, v.y, v.z);
    const shadeV = 0.42 + 0.58 * Math.pow(Math.max(0, w * 0.5 + 0.5), 0.55);
    col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = shadeV;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
/** Rich, glossy rope colour (as in the reference): a touch more saturated and deeper than the flat yarn colour. */
function ropeColor(c: THREE.Color): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.12), hsl.l * 0.95);
}
function ropeMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: ropeColor(color), vertexColors: true, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.3 });
}
/** The thin dark rim drawn round each peg ring, so stacked rings read as separate layers. */
function outlineMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: ropeColor(color).multiplyScalar(0.28), side: THREE.BackSide });
}
/** A wound ball of rope: a core with strands wrapped round it every which way. */
let fiberTex: THREE.CanvasTexture | null = null;
/** Soft wool: fine fibres running along the strand, a little fuzz — so the yarn reads as cloth, not plastic. */
function fiberTexture(): THREE.CanvasTexture {
  if (fiberTex) return fiberTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 64);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 420; k++) {
    const x = rnd() * 128, y = rnd() * 64, len = 6 + rnd() * 18;
    g.strokeStyle = rnd() < 0.55 ? `rgba(0,0,0,${0.05 + rnd() * 0.1})` : `rgba(255,255,255,${0.25 + rnd() * 0.3})`;
    g.lineWidth = 0.6 + rnd() * 0.9;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + (rnd() - 0.5) * 3, x + len, y + (rnd() - 0.5) * 2); g.stroke();
  }
  fiberTex = new THREE.CanvasTexture(c);
  fiberTex.wrapS = fiberTex.wrapT = THREE.RepeatWrapping;
  fiberTex.colorSpace = THREE.SRGBColorSpace;
  return fiberTex;
}
/** Matte wool with a soft velvety sheen (used for the balls of yarn). */
const BALL_LIGHT = [2.9, 3.6];
function woolMaterial(color: THREE.Color, rep = 3, raw = false): THREE.MeshPhysicalMaterial {
  const map = fiberTexture().clone();
  map.needsUpdate = true;
  map.repeat.set(rep, 1);
  // raw (the basket picture): the strand's own colour, a touch richer, with only a faint sheen so it stays deep
  let c = ropeColor(color);
  if (raw) { const h = { h: 0, s: 0, l: 0 }; color.getHSL(h); c = new THREE.Color().setHSL(h.h, Math.min(1, h.s * 1.15), h.l); }
  return new THREE.MeshPhysicalMaterial({ color: c, map, vertexColors: true, roughness: 0.85, metalness: 0, sheen: raw ? 0.6 : 1, sheenRoughness: 0.6, sheenColor: c.clone().lerp(new THREE.Color(0xffffff), raw ? 0.2 : 0.55) });
}
/** A ball of wool: a soft core wound round with many thin strands every which way, and a loose end. */
export function ropeBall(color: THREE.Color, r = 0.3, raw = false): THREE.Group {
  const g = new THREE.Group();
  const coreG = new THREE.SphereGeometry(r * 0.9, 28, 20);
  coreG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(coreG.attributes.position.count * 3).fill(0.82), 3));
  g.add(new THREE.Mesh(coreG, woolMaterial(color, 6, raw)));
  const strand = woolMaterial(color, 10, raw);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 24; k++) {
    const ring = new THREE.Mesh(ropeGeometry(new CircleCurve(r * (0.92 + rnd() * 0.06)), 48, r * 0.088, true), strand);
    ring.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    g.add(ring);
  }
  // the loose end trailing off the ball
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(r * 0.2, r * 0.9, r * 0.35), new THREE.Vector3(r * 0.6, r * 0.75, r * 0.65),
    new THREE.Vector3(r * 0.95, r * 0.35, r * 0.7), new THREE.Vector3(r * 1.25, -r * 0.15, r * 0.5),
  ]);
  g.add(new THREE.Mesh(ropeGeometry(tail, 24, r * 0.07), strand));
  g.traverse((o) => { o.castShadow = true; });
  return g;
}
class CircleCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private y = 0) { super(); }
  getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(t * Math.PI * 2) * this.r, this.y, Math.sin(t * Math.PI * 2) * this.r);
  }
}
const COIL = 0.42;   // a pulled rope winds itself up into a ball

export class Scene3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(18, 1, 0.1, 400);
  private board = new THREE.Group();
  private strands: StrandView[] = [];
  private balls = new Map<string, HTMLCanvasElement>();
  private view = { x: 0, y: 0, w: 1, h: 1 };
  private fit: THREE.Vector3[] = [];
  private target = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private chains: Chain[] = [];
  /** Board zoom (1 = whole board fits) and pan (world units on the board plane), eased toward their targets. */
  private zoom = { cur: 1, to: 1, px: 0, pz: 0, tx: 0, tz: 0, w: 6, d: 7 };
  static readonly ZOOM_MIN = 1;
  static readonly ZOOM_MAX = 2;
  private pegH = 0.8;
  private lockFx: { pad: THREE.Group; shackle: THREE.Mesh; key: THREE.Group | null; keyHome: THREE.Vector3; at: THREE.Vector3; t: number; open: boolean; shake: number; strands: number[] } | null = null;
  private mysteryTex = mysteryTexture();
  cols = 4;
  rows = 4;
  // the toy being knitted
  private toyScene = new THREE.Scene();
  private toyCam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  private toy: Toy | null = null;
  private toyIndex = -1;
  private toyView = { x: 0, y: 0, w: 1, h: 1 };
  /** Knitting progress per part: a coloured copy revealed bottom-up to `level` (0..1) by a clipping plane. */
  private knits = new Map<number, { level: number; from: number; to: number; t: number; dur: number; color: THREE.Color; plane: THREE.Plane; overlays: THREE.Mesh[]; y0: number; y1: number }>();
  private tints: THREE.Color[] = [];
  private toyPop = 0;
  /** Level-clear showcase: k = how far in (0..1), spin = extra turn of the toy (radians). */
  private show = { k: 0, spin: 0 };
  private veil: { scene: THREE.Scene; cam: THREE.OrthographicCamera; mat: THREE.MeshBasicMaterial; rays: THREE.Mesh } | null = null;
  private thumbs = new Map<number, HTMLCanvasElement>();
  private clock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.localClippingEnabled = true;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb08a68, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-5, 12, 3);   // light from the left: peg shadows fall to the right, as in the reference
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    sun.shadow.radius = 3;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.scene.add(this.board);
    this.toyScene.add(new THREE.HemisphereLight(0xffffff, 0x9bb7d8, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
    key.shadow.radius = 6;
    this.toyScene.add(key);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.toyScene.add(ground);
  }

  // ------------------------------------------------------------ the toy

  setToy(i: number): void {
    if (this.toy) this.toyScene.remove(this.toy.group);
    this.toy = buildToy(i);
    this.toyIndex = i;
    this.toyScene.add(this.toy.group);
    this.knits.clear();
    this.tints = this.toy.parts.map(() => new THREE.Color(RAW));
    this.fitToy(this.toyCam, this.toy.group);
  }
  private fitToy(cam: THREE.PerspectiveCamera, g: THREE.Object3D): void {
    const sphere = new THREE.Box3().setFromObject(g).getBoundingSphere(new THREE.Sphere());
    const d = sphere.radius / Math.sin((cam.fov * Math.PI) / 360) * 0.8;
    cam.position.set(0, sphere.center.y + d * 0.42, d * 0.92);
    cam.lookAt(0, sphere.center.y * 0.92, 0);
  }
  /** Each part's design group, size (surface area) and height — the game plans the colours from these. */
  partInfo(): { c: number; area: number; y: number }[] {
    if (!this.toy) return [];
    this.toy.group.updateMatrixWorld(true);
    return this.toy.parts.map((p) => {
      let area = 0, y = Infinity;
      for (const m of p.meshes) {
        const b = new THREE.Box3().setFromObject(m), sz = b.getSize(new THREE.Vector3());
        area += 2 * (sz.x * sz.y + sz.y * sz.z + sz.z * sz.x);
        y = Math.min(y, b.min.y);
      }
      return { c: p.c, area, y };
    });
  }
  /** Unknitted parts show a pale hint of the colour they will get. */
  setTints(colors: (string | null)[], amount = 0.22): void {
    if (!this.toy) return;
    this.tints = this.toy.parts.map((_, k) => new THREE.Color(RAW).lerp(new THREE.Color(colors[k] ?? RAW), colors[k] ? amount : 0));
    this.toy.parts.forEach((p, k) => { if (!this.knits.has(k)) for (const m of p.meshes) (m.material as THREE.MeshStandardMaterial).color.copy(this.tints[k]); });
  }

  /**
   * Knit part `k` up to `to` (0..1 of its height) in `color`: a coloured copy of the
   * part is revealed from the bottom up, as if the yarn were being stitched on.
   * A part can take several knits; `now` = straight away (undo, restarts).
   */
  knitPart(k: number, color: string, to: number, now = false, dur = 0.9): void {
    const p = this.toy?.parts[k];
    if (!p) return;
    let st = this.knits.get(k);
    if (!st) {
      this.toy!.group.updateMatrixWorld(true);
      const box = new THREE.Box3();
      for (const m of p.meshes) box.expandByObject(m);
      const y0 = box.min.y - 0.01, y1 = box.max.y + 0.01;
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), y0);
      const c = new THREE.Color(color);
      const overlays = p.meshes.map((m) => {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.color.copy(c);
        mat.clippingPlanes = [plane];
        const o = new THREE.Mesh(m.geometry, mat);
        o.position.copy(m.position);
        o.rotation.copy(m.rotation);
        o.scale.copy(m.scale).multiplyScalar(1.015);
        o.castShadow = true;
        m.parent!.add(o);
        return o;
      });
      st = { level: 0, from: 0, to: 0, t: 1, dur, color: c, plane, overlays, y0, y1 };
      this.knits.set(k, st);
    }
    st.from = st.level;
    st.to = Math.min(1, Math.max(st.to, to));
    st.t = now ? 1 : 0;
    st.dur = dur;
    if (now) this.applyKnit(k);
  }
  private applyKnit(k: number): void {
    const st = this.knits.get(k), p = this.toy?.parts[k];
    if (!st || !p) return;
    st.level = st.from + (st.to - st.from) * st.t;
    st.plane.constant = st.y0 + (st.y1 - st.y0) * st.level;
    if (st.level >= 0.999) {
      // done: the part itself takes the colour, the stitching copy goes
      for (const m of p.meshes) (m.material as THREE.MeshStandardMaterial).color.copy(st.color);
      for (const o of st.overlays) o.parent?.remove(o);
      st.overlays = [];
    }
  }
  /** Where on the page the stitching of part `k` is happening right now (css px). */
  stitchPoint(k: number): { x: number; y: number } | null {
    const p = this.toy?.parts[k];
    if (!p) return null;
    this.toy!.group.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const m of p.meshes) box.expandByObject(m);
    const f = this.knits.get(k);
    const c = box.getCenter(new THREE.Vector3());
    if (f) c.y = f.y0 + (f.y1 - f.y0) * Math.max(0, f.level);
    // wiggle across the part like a needle going back and forth
    const sz = box.getSize(new THREE.Vector3());
    c.x += Math.sin(this.clock * 14) * sz.x * 0.3;
    const q = c.project(this.toyCam);
    return { x: this.toyView.x + ((q.x + 1) / 2) * this.toyView.w, y: this.toyView.y + ((1 - q.y) / 2) * this.toyView.h };
  }
  /** Back to plain yarn (undo). */
  resetToy(): void {
    for (const f of this.knits.values()) for (const o of f.overlays) o.parent?.remove(o);
    this.knits.clear();
    this.toy?.parts.forEach((p, k) => { for (const m of p.meshes) { (m.material as THREE.MeshStandardMaterial).color.copy(this.tints[k] ?? new THREE.Color(RAW)); m.scale.setScalar(1); } });
  }
  toyCenter(): { x: number; y: number } {
    return { x: this.toyView.x + this.toyView.w / 2, y: this.toyView.y + this.toyView.h * 0.5 };
  }
  setToyView(x: number, y: number, w: number, h: number): void {
    this.toyView = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
    this.toyCam.aspect = this.toyView.w / this.toyView.h;
    this.toyCam.updateProjectionMatrix();
  }

  /** A 3D wound rope ball in `color`, rendered once into a square picture (the 2D basket uses it). */
  ballSprite(color: string, px = 128): HTMLCanvasElement {
    const key = color + px;
    const hit = this.balls.get(key);
    if (hit) return hit;
    const scene = new THREE.Scene();
    // lit brighter than the board, so the ball in the basket reads as the same colour as its strand
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a890, BALL_LIGHT[0]));
    const l = new THREE.DirectionalLight(0xffffff, BALL_LIGHT[1]);
    l.position.set(-2, 4, 5);
    scene.add(l);
    const ball = ropeBall(new THREE.Color(color), 1, true);
    ball.rotation.set(0.5, 0.3, 0.2);
    scene.add(ball);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 0, 4.6);
    cam.lookAt(0, 0, 0);
    const c = this.renderOff(scene, cam, px);
    this.balls.set(key, c);
    return c;
  }
  private renderOff(scene: THREE.Scene, cam: THREE.Camera, px: number): HTMLCanvasElement {
    const rt = new THREE.WebGLRenderTarget(px, px, { samples: 4 });
    const r = this.renderer;
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(rt);
    r.clear();
    r.render(scene, cam);
    const buf = new Uint8Array(px * px * 4);
    r.readRenderTargetPixels(rt, 0, 0, px, px, buf);
    r.setRenderTarget(null);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d')!;
    const img = g.createImageData(px, px);
    for (let y = 0; y < px; y++) img.data.set(buf.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4);
    // render targets are linear: convert to screen colours (un-premultiplied alpha stays as is)
    for (let k = 0; k < img.data.length; k += 4) for (let ch = 0; ch < 3; ch++) img.data[k + ch] = Math.min(255, Math.round(255 * Math.pow(img.data[k + ch] / 255, 1 / 2.2)));
    g.putImageData(img, 0, 0);
    return c;
  }

  /** A grey picture of toy `i` (top bar: what comes next). */
  thumb(i: number, px: number): HTMLCanvasElement {
    const key = i * 1000 + px;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const toy = buildToy(i);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777788, 2.2));
    const l = new THREE.DirectionalLight(0xffffff, 1.6);
    l.position.set(3, 5, 4);
    scene.add(l);
    for (const p of toy.parts) for (const m of p.meshes) (m.material as THREE.MeshStandardMaterial).color.set('#9a9aa6');
    toy.group.rotation.y = -0.62;
    scene.add(toy.group);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.fitToy(cam, toy.group);
    const rt = new THREE.WebGLRenderTarget(px, px);
    const r = this.renderer;
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(rt);
    r.clear();
    r.render(scene, cam);
    const buf = new Uint8Array(px * px * 4);
    r.readRenderTargetPixels(rt, 0, 0, px, px, buf);
    r.setRenderTarget(null);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d')!;
    const img = g.createImageData(px, px);
    for (let y = 0; y < px; y++) img.data.set(buf.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4);
    // render targets are linear: brighten a touch to read like the screen
    for (let k = 0; k < img.data.length; k += 4) for (let ch = 0; ch < 3; ch++) img.data[k + ch] = Math.min(255, Math.round(255 * Math.pow(img.data[k + ch] / 255, 1 / 2.2)));
    g.putImageData(img, 0, 0);
    this.thumbs.set(key, c);
    return c;
  }

  pegPos(p: number, y = 0): THREE.Vector3 {
    const x = p % this.cols, z = Math.floor(p / this.cols);
    return new THREE.Vector3((x - (this.cols - 1) / 2) * SP, y, (z - (this.rows - 1) / 2) * SP);
  }

  /**
   * Build the board. `depth[i]` = how many strands strand i sits on (its height),
   * `colors[i]` its colour (grey when hidden), knots as pairs of strand indices.
   */
  build(cols: number, rows: number, strands: { a: number; b: number; key?: boolean }[], depth: number[], colors: string[], knots: [number, number][], lock = -1, mystery: boolean[] = []): void {
    this.cols = cols;
    this.rows = rows;
    this.board.clear();
    this.strands = [];
    this.chains = [];
    this.lockFx = null;
    Object.assign(this.zoom, { cur: 1, to: 1, px: 0, pz: 0, tx: 0, tz: 0 });
    const W = (cols - 1) * SP + 1.3, D = (rows - 1) * SP + 1.3;
    this.zoom.w = W; this.zoom.d = D;
    const top = Math.max(1, ...depth);
    // many layers: squeeze them so the pegs stay short, as in the reference
    const step = Math.min(STEP, 0.75 / top);
    const pegH = Math.max(0.78, 0.25 + top * step + 0.2);
    this.pegH = pegH;
    // as in the reference: a pale maple panel sunk in a one-piece, round-cornered frame of reddish wood
    // (soft rounded top, a dark groove round the panel, a light lip on the panel's edge), thick base below
    const tex = woodTexture();
    const FW = 0.5, FH = 0.2;                         // frame width / how far it rises above the panel
    const PW = W + 0.26, PD = D + 0.26;               // the panel
    const OW = PW + FW * 2, OD = PD + FW * 2;
    const rr = (w: number, d: number, r: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2 + r, -d / 2);
      sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      sh.lineTo(-w / 2 + r, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
      sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      return sh;
    };
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc4693a, roughness: 0.38 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x652a0d, roughness: 0.55 });
    // the frame: a rounded ring, bevelled so its top is soft
    const ring = rr(OW - 0.12, OD - 0.12, 0.5);
    ring.holes.push(rr(PW + 0.02, PD + 0.02, 0.2) as unknown as THREE.Path);
    const frameGeo = new THREE.ExtrudeGeometry(ring, { depth: FH + 0.3, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 18 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.rotation.x = -Math.PI / 2;
    frame.position.y = -0.3 - 0.07 + 0.0;
    frame.castShadow = true;
    frame.receiveShadow = true;
    // the base under it: a darker, slightly larger rounded slab whose front edge shows
    const baseGeo = new THREE.ExtrudeGeometry(rr(OW, OD, 0.56), { depth: 0.28, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 18 });
    const base = new THREE.Mesh(baseGeo, sideMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.7;
    base.receiveShadow = true;
    // dark groove round the panel, then the panel with a lighter lip
    const groove = new THREE.Mesh(new THREE.ShapeGeometry(rr(PW + 0.04, PD + 0.04, 0.22), 12), new THREE.MeshStandardMaterial({ color: 0x4e1a00, roughness: 0.9 }));
    groove.rotation.x = -Math.PI / 2;
    groove.position.y = -0.03;
    const lip = new THREE.Mesh(new THREE.ShapeGeometry(rr(PW - 0.02, PD - 0.02, 0.18), 12), new THREE.MeshStandardMaterial({ color: 0xfac68a, roughness: 0.55 }));
    lip.rotation.x = -Math.PI / 2;
    lip.position.y = -0.012;
    const topMat = new THREE.MeshStandardMaterial({ color: 0xf2e2cf, map: tex, roughness: 0.62 });
    const panel = new THREE.Mesh(new THREE.ShapeGeometry(rr(PW - 0.12, PD - 0.12, 0.13), 12), topMat);
    panel.rotation.x = -Math.PI / 2;
    panel.position.y = -0.006;
    panel.receiveShadow = true;
    // ShapeGeometry UVs are in world units: scale the wood to fit the panel once
    const uv = panel.geometry.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + PW / 2) / PW, (uv.getY(k) + PD / 2) / PD);
    this.board.add(base, frame, groove, lip, panel);
    // cream pegs: a slim stem with a round knob, standing in a dark carved hole
    const pegMat = new THREE.MeshStandardMaterial({ color: 0xf3e4c8, roughness: 0.4 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf8ecd6, roughness: 0.32 });
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x5e2e10, roughness: 0.85 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x94481e, roughness: 0.75 });
    const rimMat2 = new THREE.MeshStandardMaterial({ color: 0xc58d54, roughness: 0.7 });
    const stem = new THREE.CylinderGeometry(0.1, 0.105, pegH, 20);
    const knob = new THREE.SphereGeometry(0.17, 24, 16);
    const neck = new THREE.CylinderGeometry(0.12, 0.1, 0.06, 20);
    const holeG = new THREE.CircleGeometry(0.2, 28);
    const lipG = new THREE.RingGeometry(0.2, 0.26, 28);
    const rimG = new THREE.RingGeometry(0.26, 0.31, 28);
    for (let p = 0; p < cols * rows; p++) {
      const at = this.pegPos(p);
      const peg = new THREE.Mesh(stem, pegMat);
      peg.position.set(at.x, pegH / 2, at.z);
      peg.castShadow = true;
      const n = new THREE.Mesh(neck, pegMat);
      n.position.set(at.x, pegH + 0.0, at.z);
      const head = new THREE.Mesh(knob, headMat);
      head.position.set(at.x, pegH + 0.12, at.z);
      head.scale.set(1, 0.9, 1);
      head.castShadow = true;
      const hole = new THREE.Mesh(holeG, holeMat);
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(at.x, 0.004, at.z);
      const lip = new THREE.Mesh(lipG, lipMat);
      lip.rotation.x = -Math.PI / 2;
      lip.position.set(at.x, 0.003, at.z);
      const rim = new THREE.Mesh(rimG, rimMat2);
      rim.rotation.x = -Math.PI / 2;
      rim.position.set(at.x, 0.002, at.z);
      this.board.add(peg, n, head, hole, lip, rim);
    }
    strands.forEach((s, i) => {
      const h = 0.25 + depth[i] * step;
      const a = this.pegPos(s.a, h), b = this.pegPos(s.b, h);
      const dir = b.clone().sub(a).normalize();
      // wrap a little around each peg
      const a0 = a.clone().addScaledVector(dir, -0.1), b0 = b.clone().addScaledVector(dir, 0.1);
      const curve = new THREE.CatmullRomCurve3([a0, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.03, 0)), b0]);
      const len = a.distanceTo(b);
      const color = new THREE.Color(colors[i]);
      const mat = ropeMaterial(color);
      const segs = Math.max(30, Math.round(len * 34));
      const tube = new THREE.Mesh(ropeGeometry(curve, segs, R), mat);
      tube.castShadow = true;
      tube.receiveShadow = true;
      const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.28, 6, false), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.strand = i;
      const group = new THREE.Group();
      // fat twisted rings round the two pegs (they stack up where several ropes end)
      const loops: THREE.Mesh[] = [];
      const outline = outlineMaterial(color);
      for (const e of [a, b]) {
        const loop = new THREE.Mesh(ropeGeometry(new CircleCurve(0.15), 48, R * 1.12, true), mat);
        loop.position.copy(e);
        loop.castShadow = true;
        // a dark rim just outside the ring (back faces of a slightly bigger copy)
        const rim = new THREE.Mesh(loop.geometry, outline);
        rim.scale.set(1.07, 1.22, 1.07);
        loop.add(rim);
        group.add(loop);
        loops.push(loop);
      }
      group.add(tube, hit);
      this.board.add(group);
      const mid = a.clone().lerp(b, 0.5);
      const view: StrandView = { group, tube, hit, loops, outline, ball: null, segs, mat, color, mid, anim: 0, shake: 0, flash: 0, glow: 0, dim: false, gone: false };
      if (mystery[i]) {
        // a "?" badge on the grey strand until it shows its colour
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.mysteryTex, depthTest: false }));
        sp.scale.setScalar(0.3);
        sp.position.copy(mid).add(new THREE.Vector3(0, 0.2, 0));
        sp.renderOrder = 5;
        group.add(sp);
        view.mystery = sp;
      }
      this.strands.push(view);
    });
    // chains: a clasp round the middle of each strand and an arc of links between them
    const linkGeo = new THREE.TorusGeometry(0.11, 0.038, 10, 20);
    knots.forEach(([x, y], n) => {
      const mat = new THREE.MeshStandardMaterial({ color: CHAIN_COLORS[n % CHAIN_COLORS.length], roughness: 0.3, metalness: 0.65 });
      for (const k of [x, y]) {
        const v = this.strands[k];
        const dir = this.pegPos(strands[k].b).sub(this.pegPos(strands[k].a)).normalize();
        const clasp = new THREE.Mesh(new THREE.TorusGeometry(R * 1.6, 0.06, 12, 24), mat);
        clasp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        clasp.position.copy(v.mid);
        clasp.castShadow = true;
        v.group.add(clasp);
        v.bead = clasp;
      }
      const A = this.strands[x].mid.clone().add(new THREE.Vector3(0, 0.1, 0)), B = this.strands[y].mid.clone().add(new THREE.Vector3(0, 0.1, 0));
      const lift = 0.45 + A.distanceTo(B) * 0.15;
      const curve = new THREE.QuadraticBezierCurve3(A, A.clone().lerp(B, 0.5).add(new THREE.Vector3(0, lift, 0)), B);
      const n2 = Math.max(4, Math.round(curve.getLength() / 0.17));
      const group = new THREE.Group();
      const links: Chain['links'] = [];
      for (let k = 0; k <= n2; k++) {
        const u = k / n2, p2 = curve.getPointAt(u), t2 = curve.getTangentAt(u).normalize();
        const m = new THREE.Mesh(linkGeo, mat);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), t2);
        if (k % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        m.quaternion.copy(q);
        m.position.copy(p2);
        m.scale.set(1.35, 1, 1);
        m.castShadow = true;
        group.add(m);
        links.push({ m, p: p2.clone(), q: q.clone(), v: new THREE.Vector3() });
      }
      this.board.add(group);
      this.chains.push({ pair: [x, y], group, links, broken: 0, shake: 0 });
    });
    // lock & key: a padlock over the locked peg, a key lying on the strand that opens it
    if (lock >= 0) {
      const { group: pad, shackle } = padlock();
      const at = this.pegPos(lock, pegH + 0.62);
      pad.position.copy(at);
      pad.userData.s = 1.9;
      pad.scale.setScalar(1.9);
      pad.rotation.x = -0.35;
      this.board.add(pad);
      let key: THREE.Group | null = null;
      const ki = strands.findIndex((t) => t.key);
      const keyHome = ki >= 0 ? this.strands[ki].mid.clone().add(new THREE.Vector3(0, 0.34, 0)) : at.clone();
      if (ki >= 0) {
        key = keyMesh();
        key.scale.setScalar(1.8);
        key.position.copy(keyHome);
        key.rotation.x = -0.6;
        this.board.add(key);
      }
      const held = strands.map((_, k) => k).filter((k) => strands[k].a === lock || strands[k].b === lock);
      for (const k of held) { this.strands[k].dim = true; this.strands[k].mat.color.copy(ropeColor(this.strands[k].color)).multiplyScalar(DIM); }
      this.lockFx = { pad, shackle, key, keyHome, at, t: 0, open: false, shake: 0, strands: held };
    }
    // what must be on screen: the board's rim and the tops of the far pegs
    this.fit = [];
    const fo = 0.13 + 0.5 + 0.02;
    for (const x of [-W / 2 - fo, W / 2 + fo]) {
      this.fit.push(new THREE.Vector3(x, 0.12, -D / 2 - fo), new THREE.Vector3(x, -0.44, D / 2 + fo));
    }
    for (const p of [0, cols - 1]) this.fit.push(this.pegPos(p, pegH + 0.32));
    this.target.set(0, 0, 0);
  }

  setColor(i: number, color: string): void {
    const v = this.strands[i];
    if (!v) return;
    v.color.set(color);
    v.mat.color.copy(ropeColor(v.color)).multiplyScalar(v.dim ? DIM : 1);
    v.outline.color.copy(ropeColor(v.color)).multiplyScalar(0.28);
    if (v.mystery) v.mystery.visible = false;
  }
  /** The key has come off: fly it into the padlock and open it (or, `now`, just show it open / closed). */
  setUnlocked(open: boolean, now = false): void {
    const f = this.lockFx;
    if (!f) return;
    f.open = open;
    f.t = open && !now ? 0 : open ? 2 : 0;
    if (!open || now) this.placeLock();
    if (open && now) for (const k of f.strands) { this.strands[k].dim = false; this.setColor(k, '#' + this.strands[k].color.getHexString()); }
    if (!open) for (const k of f.strands) { this.strands[k].dim = true; this.strands[k].mat.color.copy(ropeColor(this.strands[k].color)).multiplyScalar(DIM); }
  }
  private placeLock(): void {
    const f = this.lockFx!;
    const done = f.open && f.t >= 2;
    f.pad.visible = !done;
    f.pad.position.copy(f.at); f.pad.scale.setScalar(1.9); f.pad.rotation.set(-0.35, 0, 0);
    f.shackle.position.y = 0.16;
    if (f.key) { f.key.visible = !f.open; f.key.position.copy(f.keyHome); f.key.scale.setScalar(1.8); }
  }
  shakeLock(): void { if (this.lockFx) this.lockFx.shake = 1; }
  shakeChain(i: number): void { for (const c of this.chains) if (c.pair.includes(i)) c.shake = 1; }
  /** A white pulse on strand i ("this is the one you need"). */
  glow(i: number): void { const v = this.strands[i]; if (v) v.glow = 1; }
  lockPoint(): THREE.Vector3 | null { return this.lockFx ? this.lockFx.at.clone() : null; }
  chainPoint(i: number): THREE.Vector3 | null {
    const c = this.chains.find((x) => x.pair.includes(i));
    return c ? c.links[Math.floor(c.links.length / 2)].p.clone() : null;
  }
  /** Pull strand i off (animated) or put it back (undo). */
  setGone(i: number, gone: boolean): void {
    const v = this.strands[i];
    if (!v) return;
    v.gone = gone;
    if (!gone) {
      v.anim = 0; v.group.visible = true; v.group.position.set(0, 0, 0); v.group.scale.set(1, 1, 1);
      v.tube.geometry.setDrawRange(0, Infinity); v.tube.visible = true;
      for (const l of v.loops) l.scale.setScalar(1);
      if (v.bead) v.bead.visible = true;
      if (v.ball) v.ball.visible = false;
    } else if (!v.ball) {
      v.ball = ropeBall(v.color);
      v.ball.visible = false;
      this.board.add(v.ball);
    }
    for (const c of this.chains) {
      if (c.pair.some((k) => this.strands[k].gone)) continue;
      // put back (undo): a whole chain again
      c.broken = 0;
      c.group.visible = true;
      for (const l of c.links) { l.m.position.copy(l.p); l.m.quaternion.copy(l.q); l.m.scale.set(1.35, 1, 1); }
    }
  }
  shake(i: number): void { const v = this.strands[i]; if (v) v.shake = 1; }
  flash(i: number): void { const v = this.strands[i]; if (v) v.flash = 1; }
  midOf(i: number): THREE.Vector3 { return this.strands[i]?.mid.clone() ?? new THREE.Vector3(); }
  setHighlight(i: number, a: number): void { const v = this.strands[i]; if (v && !v.flash) { v.mat.emissive.set(0x9cff7a); v.mat.emissiveIntensity = a; } }

  update(dt: number): void {
    this.clock += dt;
    if (this.toy) {
      this.toy.group.rotation.y = -0.62 + (this.show.k > 0 ? this.show.spin : Math.sin(this.clock * 0.6) * 0.22);
      this.toyPop = Math.max(0, this.toyPop - dt * 2.5);
      const s = 1 + Math.sin(this.toyPop * Math.PI) * 0.06;
      this.toy.group.scale.set(s, s * (1 + Math.sin(this.clock * 2.2) * 0.012), s);
      for (const [k, f] of this.knits) {
        if (f.t >= 1) continue;
        f.t = Math.min(1, f.t + dt / f.dur);
        this.applyKnit(k);
        if (f.t >= 1 && f.level >= 0.999) this.toyPop = 1;
      }
    }
    for (const v of this.strands) {
      if (v.gone) {
        // the rope reels in from both ends into a spinning ball at its middle, which lifts off
        v.anim = Math.min(1, v.anim + dt / COIL);
        const k = v.anim, e = k * k * (3 - 2 * k);
        const per = RADIAL * 6, cut = Math.floor((v.segs * Math.min(1, e * 1.08)) / 2);
        v.tube.geometry.setDrawRange(cut * per, Math.max(0, (v.segs - 2 * cut) * per));
        v.tube.visible = v.segs - 2 * cut > 0;
        for (const l of v.loops) l.scale.setScalar(Math.max(0.001, 1 - k * 3));
        if (v.bead) v.bead.visible = k < 0.5;
        if (v.ball) {
          v.ball.visible = k < 1;
          v.ball.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * e));
          v.ball.position.copy(v.mid).add(new THREE.Vector3(0, 0.2 + e * 0.5, 0));
          v.ball.rotation.set(k * 9, k * 5, 0);
        }
        v.group.visible = k < 1;
      }
      if (v.shake > 0) {
        v.shake = Math.max(0, v.shake - dt * 2.5);
        v.group.position.x = Math.sin(v.shake * 40) * v.shake * 0.08;
      }
      if (v.flash > 0) {
        v.flash = Math.max(0, v.flash - dt * 1.5);
        v.mat.emissive.set(0xff3030);
        v.mat.emissiveIntensity = v.flash * 0.7;
      } else if (v.glow > 0) {
        v.glow = Math.max(0, v.glow - dt * 0.8);
        v.mat.emissive.set(0xffffff);
        v.mat.emissiveIntensity = (0.5 + 0.5 * Math.sin(v.glow * 18)) * v.glow * 0.6;
      } else if (v.mat.emissive.r > 0.9 && v.mat.emissive.g < 0.5) v.mat.emissiveIntensity = 0;
      else if (v.mat.emissive.b > 0.9 && v.mat.emissive.r > 0.9) v.mat.emissiveIntensity = 0;
    }
    for (const c of this.chains) {
      if (c.pair.some((k) => this.strands[k].gone)) {
        if (c.broken === 0) for (const l of c.links) l.v.set((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3);
        // snapped: the links scatter and fall
        c.broken = Math.min(1, c.broken + dt / 0.7);
        for (const l of c.links) {
          l.v.y -= 9 * dt;
          l.m.position.addScaledVector(l.v, dt);
          l.m.rotation.x += dt * 8;
          l.m.scale.setScalar(Math.max(0.001, 1 - c.broken));
        }
        c.group.visible = c.broken < 1;
      } else if (c.shake > 0) {
        c.shake = Math.max(0, c.shake - dt * 2.5);
        c.group.position.x = Math.sin(c.shake * 40) * c.shake * 0.06;
      }
    }
    const f = this.lockFx;
    if (f) {
      if (f.key && !f.open) {
        f.key.position.y = f.keyHome.y + Math.sin(this.clock * 3) * 0.04;
        f.key.rotation.y = Math.sin(this.clock * 1.6) * 0.5;
      }
      if (f.shake > 0) {
        f.shake = Math.max(0, f.shake - dt * 2.5);
        f.pad.rotation.z = Math.sin(f.shake * 36) * f.shake * 0.35;
      }
      if (f.open && f.t < 2) {
        // key flies in an arc into the lock (0–0.5), the shackle pops (0.5–0.8), the padlock drops away (0.8–1.3)
        f.t = Math.min(2, f.t + dt);
        const t = f.t;
        if (f.key) {
          const k = Math.min(1, t / 0.5), e = k * k * (3 - 2 * k);
          f.key.position.lerpVectors(f.keyHome, f.at.clone().add(new THREE.Vector3(0, -0.05, 0.22)), e);
          f.key.position.y += Math.sin(Math.PI * k) * 0.8;
          f.key.rotation.set(-0.35, 0, k * Math.PI * 2 + Math.max(0, t - 0.5) * 6);
          f.key.scale.setScalar(1.8 * (t < 0.8 ? 1 : Math.max(0.001, 1 - (t - 0.8) / 0.3)));
        }
        if (t > 0.5) f.shackle.position.y = 0.16 + Math.min(1, (t - 0.5) / 0.15) * 0.12;
        if (t > 0.5 && f.strands.some((k) => this.strands[k].dim)) for (const k of f.strands) { this.strands[k].dim = false; this.setColor(k, '#' + this.strands[k].color.getHexString()); }
        if (t > 0.8) {
          const k = Math.min(1, (t - 0.8) / 0.5);
          f.pad.position.y = f.at.y - k * k * 0.9;
          f.pad.scale.setScalar(1.9 * Math.max(0.001, 1 - k));
          f.pad.rotation.z = k * 0.8;
        }
        if (t >= 1.3) { f.t = 2; this.placeLock(); }
      }
    }
  }

  // ------------------------------------------------------------ view

  setView(x: number, y: number, w: number, h: number, cw: number, ch: number, dpr: number): void {
    this.view = { x, y, w: Math.max(1, w), h: Math.max(1, h) };
    this.renderer.setPixelRatio(dpr);
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== cw || size.y !== ch) this.renderer.setSize(cw, ch, false);
    this.camera.aspect = this.view.w / this.view.h;
    this.camera.updateProjectionMatrix();
  }

  private place(): void {
    // like the reference board: seen from above and in front, its thick front edge showing
    const tilt = (58 * Math.PI) / 180;
    const dir = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
    this.camera.zoom = 1;   // fit the whole board first; the player's zoom goes on top
    this.camera.clearViewOffset();
    const bounds = () => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of this.fit) {
        const q = p.clone().project(this.camera);
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
      }
      return { x0, x1, y0, y1 };
    };
    const at = (d: number) => {
      this.camera.position.copy(this.target).addScaledVector(dir, d);
      this.camera.lookAt(this.target);
      this.camera.updateMatrixWorld();
    };
    let lo = 3, hi = 300;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      at(mid);
      const b = bounds();
      if (b.x1 - b.x0 <= 1.99 && b.y1 - b.y0 <= 1.97) hi = mid; else lo = mid;
    }
    at(hi);
    const b = bounds();
    const { w, h } = this.view;
    // centred left-right; the board's far edge sits right under the basket, as in the reference
    this.camera.setViewOffset(w, h, (((b.x0 + b.x1) / 2) * w) / 2, ((0.985 - b.y1) * h) / 2, w, h);
    // the player's zoom + pan on top of the fit
    const z = this.zoom;
    z.cur += (z.to - z.cur) * 0.25;
    if (Math.abs(z.to - z.cur) < 0.002) z.cur = z.to;
    this.clampPan();
    z.px += (z.tx - z.px) * 0.35;
    z.pz += (z.tz - z.pz) * 0.35;
    this.camera.position.x += z.px;
    this.camera.position.z += z.pz;
    this.camera.updateMatrixWorld();
    this.camera.zoom = z.cur;
    this.camera.updateProjectionMatrix();
  }

  get zoomLevel(): number { return this.zoom.to; }
  /** Zoom the board to `z` (clamped between the whole board and about twice as close). */
  setZoom(z: number): void {
    this.zoom.to = Math.min(Scene3D.ZOOM_MAX, Math.max(Scene3D.ZOOM_MIN, z));
    if (this.zoom.to <= Scene3D.ZOOM_MIN + 0.001) { this.zoom.tx = 0; this.zoom.tz = 0; }
  }
  /** Drag the zoomed board by a screen distance (css px). */
  panBy(dx: number, dy: number): void {
    const perPx = (this.zoom.w + 0.6) / Math.max(1, this.view.w) / this.zoom.cur;
    this.zoom.tx -= dx * perPx;
    this.zoom.tz -= dy * perPx * 1.15;
    this.clampPan();
  }
  private clampPan(): void {
    const z = this.zoom, k = 1 - 1 / Math.max(1, z.to);
    const mx = (z.w / 2 + 0.3) * k, mz = (z.d / 2 + 0.3) * k;
    z.tx = Math.max(-mx, Math.min(mx, z.tx));
    z.tz = Math.max(-mz, Math.min(mz, z.tz));
  }
  /** Is the page point over the board's view? */
  inView(x: number, y: number): boolean { const v = this.view; return x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h; }

  toScreen(v: THREE.Vector3): { x: number; y: number } {
    const q = v.clone().project(this.camera);
    return { x: this.view.x + ((q.x + 1) / 2) * this.view.w, y: this.view.y + ((1 - q.y) / 2) * this.view.h };
  }

  /** The top-most strand under the page point (css px), or -1. */
  pick(x: number, y: number): number {
    const nx = ((x - this.view.x) / this.view.w) * 2 - 1;
    const ny = -(((y - this.view.y) / this.view.h) * 2 - 1);
    this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const hits = this.ray.intersectObjects(this.strands.filter((s) => !s.gone).map((s) => s.hit), false);
    if (!hits.length) return -1;
    // among hits close to the ray, prefer the highest strand
    const best = hits.slice(0, 4).sort((a, b) => b.point.y - a.point.y)[0];
    return best.object.userData.strand;
  }

  /** The finished toy, big in the middle of the screen, turning: `k` 0..1 fades the board under a sky veil. */
  showcase(k: number, spin: number): void {
    this.show = { k, spin };
    if (!this.veil) {
      const c = document.createElement('canvas');
      c.width = 4; c.height = 256;
      const g = c.getContext('2d')!;
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(0.55, '#bfe8ff'); gr.addColorStop(1, '#e8f7ff');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false });
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
      // sun rays behind the toy
      const rc = document.createElement('canvas');
      rc.width = rc.height = 256;
      const rg = rc.getContext('2d')!;
      const glow = rg.createRadialGradient(128, 128, 0, 128, 128, 128);
      glow.addColorStop(0, 'rgba(255,255,255,0.95)'); glow.addColorStop(0.35, 'rgba(255,250,210,0.45)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      for (let k2 = 0; k2 < 14; k2++) {
        rg.save(); rg.translate(128, 128); rg.rotate((k2 / 14) * Math.PI * 2);
        rg.fillStyle = 'rgba(255,255,255,0.28)';
        rg.beginPath(); rg.moveTo(0, 0); rg.lineTo(-14, -128); rg.lineTo(14, -128); rg.closePath(); rg.fill();
        rg.restore();
      }
      rg.fillStyle = glow; rg.fillRect(0, 0, 256, 256);
      const rt = new THREE.CanvasTexture(rc);
      rt.colorSpace = THREE.SRGBColorSpace;
      const rays = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rt, transparent: true, depthTest: false }));
      rays.position.z = -0.5;
      scene.add(rays);
      this.veil = { scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat, rays };
    }
  }
  /** Sun rays drawn in the veil pass, centred on the toy's view (screen px → clip space). */
  private placeRays(fw: number, fh: number): void {
    const v = this.veil!, t = this.toyView, dpr = this.renderer.getPixelRatio();
    const cx = ((t.x + t.w / 2) * dpr / fw) * 2 - 1, cy = 1 - ((t.y + t.h * 0.5) * dpr / fh) * 2;
    const R = Math.max(t.w, t.h) * 0.85 * dpr * Math.max(0.01, this.show.k);
    v.rays.position.set(cx, cy, -0.5);
    v.rays.scale.set(R / fw * 2 / 2, R / fh * 2 / 2, 1);
    v.rays.rotation.z = this.clock * 0.4;
    (v.rays.material as THREE.MeshBasicMaterial).opacity = this.show.k;
  }

  render(): void {
    this.place();
    const r = this.renderer;
    const full = r.getSize(new THREE.Vector2());
    r.setScissorTest(false);
    r.setViewport(0, 0, full.x, full.y);
    r.setClearColor(0x000000, 0);
    r.clear();
    const { x, y, w, h } = this.view;
    const vy = full.y - y - h;
    r.setViewport(x, vy, w, h);
    r.setScissor(x, vy, w, h);
    r.setScissorTest(true);
    // one colour clear per frame (above); each pass only clears depth, so passes layer up
    r.autoClear = false;
    r.clearDepth();
    r.render(this.scene, this.camera);
    if (this.show.k > 0 && this.veil) {
      // the sky veil over the board (blended, so the board fades out under it)
      r.setViewport(0, 0, full.x, full.y);
      r.setScissor(0, 0, full.x, full.y);
      this.veil.mat.opacity = this.show.k;
      this.placeRays(full.x, full.y);
      r.render(this.veil.scene, this.veil.cam);
    }
    if (this.toy) {
      const t = this.toyView;
      const ty = full.y - t.y - t.h;
      r.setViewport(t.x, ty, t.w, t.h);
      r.setScissor(t.x, ty, t.w, t.h);
      r.clearDepth();
      r.render(this.toyScene, this.toyCam);
    }
    r.setScissorTest(false);
    r.autoClear = true;
  }
}
