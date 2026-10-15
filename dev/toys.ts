// Dev-only preview of the crocheted toys (not part of the build).
// /dev/toys.html?from=0&n=10&cols=5&yaw=-0.62&raw=1  — parts coloured by their design group (raw=1: undyed).
import * as THREE from 'three';
import { buildToy } from '../src/items3d';
import { YARN } from '../src/levels';

const q = new URLSearchParams(location.search);
const from = Number(q.get('from') ?? 0), n = Number(q.get('n') ?? 10), cols = Number(q.get('cols') ?? 5);
const yaw = Number(q.get('yaw') ?? -0.62), raw = q.get('raw') === '1';
const cell = Number(q.get('px') ?? 360);
const rows = Math.ceil(n / cols);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1);
r.setSize(cols * cell, rows * cell + 0);
r.setScissorTest(true);
r.shadowMap.enabled = true;
r.setClearColor(0xb7e6fc);
const info: string[] = [];
for (let i = 0; i < n; i++) {
  const toy = buildToy(from + i);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9bb7d8, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 5);
  scene.add(key);
  if (!raw) for (const p of toy.parts) for (const m of p.meshes) (m.material as THREE.MeshStandardMaterial).color.set(YARN[p.c % YARN.length].color);
  toy.group.rotation.y = yaw;
  scene.add(toy.group);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const sphere = new THREE.Box3().setFromObject(toy.group).getBoundingSphere(new THREE.Sphere());
  const d = (sphere.radius / Math.sin((cam.fov * Math.PI) / 360)) * 0.9;
  cam.position.set(0, sphere.center.y + d * 0.42, d * 0.92);
  cam.lookAt(0, sphere.center.y * 0.92, 0);
  const x = (i % cols) * cell, y = (rows - 1 - Math.floor(i / cols)) * cell;
  r.setViewport(x, y, cell, cell);
  r.setScissor(x, y, cell, cell);
  r.render(scene, cam);
  let meshes = 0; toy.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  info.push(`${from + i + 1} ${toy.name}: parts ${toy.parts.length}, groups ${new Set(toy.parts.map((p) => p.c)).size}, meshes ${meshes}`);
}
const ctx2 = document.createElement('div');
ctx2.style.cssText = 'position:absolute;left:0;top:0;width:100%;pointer-events:none';
for (let i = 0; i < n; i++) {
  const d = document.createElement('div');
  d.textContent = info[i].split(':')[0];
  d.style.cssText = `position:absolute;left:${(i % cols) * cell + 6}px;top:${Math.floor(i / cols) * cell + 4}px;font-weight:bold;color:#123`;
  ctx2.appendChild(d);
}
document.body.appendChild(ctx2);
console.log(info.join('\n'));
(window as unknown as { __done: boolean }).__done = true;
