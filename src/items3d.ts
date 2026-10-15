// The 40 crocheted toys, one per level (builders in src/toys/a–d.ts, helpers in kit3d.ts).

import * as THREE from 'three';
import { Kit, type Part } from './kit3d';
import { TOY_INFO } from './levels';
import { TOYS_A } from './toys/a';
import { TOYS_B } from './toys/b';
import { TOYS_C } from './toys/c';
import { TOYS_D } from './toys/d';
import { TOYS_E } from './toys/e';

export { RAW, Kit, stitchTexture, type Part } from './kit3d';
export interface Toy { name: string; group: THREE.Group; parts: Part[] }

export const TOYS = [...TOYS_A, ...TOYS_B, ...TOYS_C, ...TOYS_D, ...TOYS_E];

export function buildToy(i: number): Toy {
  const build = TOYS[i % TOYS.length];
  const info = TOY_INFO[i % TOY_INFO.length];
  const k = new Kit();
  build(k);
  // centre it on the ground
  const b = new THREE.Box3().setFromObject(k.group);
  const c = b.getCenter(new THREE.Vector3());
  k.group.position.set(-c.x, -b.min.y, -c.z);
  const g = new THREE.Group();
  g.add(k.group);
  return { name: info.name, group: g, parts: k.parts };
}

