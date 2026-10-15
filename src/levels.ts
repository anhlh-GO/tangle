// 40 levels from a seed; scripts/tune.ts picks seed / mix / basket so a careless
// bot wins at the level's target rate and careful play always can.
//
// Building a level: first the order in which strands will come off (colours in
// threes, stirred by `mix`); strand k of that order gets the k-th highest layer.
// Then every strand gets two pegs at random (not too long, no overlapping on one
// line, at most three strands per peg). Knots tie two strands that don't touch.

import { fromSpec, rngOf, solve, touch, type LevelSpec, type StrandSpec } from './sim.ts';
import { TUNED } from './tuned.ts';

export type Diff = 'easy' | 'normal' | 'hard' | 'super';
export const LEVEL_COUNT = 50;
export interface Tune { seed: number; mix: number; basket: number }

export const YARN = [
  { name: 'Pink', color: '#F33180' },
  { name: 'Blue', color: '#1478F4' },
  { name: 'Yellow', color: '#FFD51C' },
  { name: 'Green', color: '#34C759' },
  { name: 'Purple', color: '#9B5CF6' },
  { name: 'Orange', color: '#FF8A1F' },
  { name: 'Red', color: '#E8343B' },
  { name: 'Teal', color: '#12C2C2' },
];

/**
 * The toy knitted in each level (models in items3d.ts, same order). `palette` maps a
 * level's colour k to a yarn: a permutation, so tuning is unchanged, and the colours
 * the player sorts are the ones the toy is made of.
 */
export const TOY_INFO = [
  { name: 'Bunny Car', palette: [2, 1, 0, 5, 3, 6, 7, 4] },
  { name: 'Teddy Bear', palette: [6, 7, 2, 4, 0, 3, 1, 5] },
  { name: 'Rocket', palette: [3, 2, 7, 1, 6, 0, 4, 5] },
  { name: 'Cottage', palette: [7, 4, 2, 5, 1, 0, 3, 6] },
  { name: 'Cupcake', palette: [3, 5, 2, 1, 7, 4, 6, 0] },
  { name: 'Sailboat', palette: [4, 2, 3, 5, 7, 1, 0, 6] },
  { name: 'Robot', palette: [1, 5, 3, 7, 6, 0, 4, 2] },
  { name: 'Air Balloon', palette: [5, 3, 0, 2, 7, 6, 4, 1] },
  { name: 'Rubber Duck', palette: [7, 2, 5, 6, 3, 1, 4, 0] },
  { name: 'Toy Train', palette: [3, 0, 5, 4, 1, 6, 2, 7] },
  { name: 'Snowman', palette: [0, 5, 7, 3, 6, 2, 4, 1] },
  { name: 'Cactus Pot', palette: [2, 1, 6, 3, 5, 0, 7, 4] },
  { name: 'Mushroom House', palette: [5, 1, 7, 4, 0, 6, 3, 2] },
  { name: 'Whale', palette: [0, 1, 6, 3, 4, 2, 7, 5] },
  { name: 'Penguin', palette: [7, 5, 4, 3, 2, 0, 6, 1] },
  { name: 'Owl', palette: [7, 4, 1, 3, 2, 6, 5, 0] },
  { name: 'Castle Tower', palette: [7, 6, 4, 1, 2, 3, 0, 5] },
  { name: 'Teapot', palette: [3, 6, 4, 5, 2, 1, 0, 7] },
  { name: 'Ice Cream', palette: [4, 2, 5, 1, 0, 7, 3, 6] },
  { name: 'Hamburger', palette: [0, 6, 5, 2, 7, 3, 1, 4] },
  { name: 'Double Decker', palette: [6, 2, 0, 4, 1, 3, 7, 5] },
  { name: 'Airplane', palette: [7, 3, 4, 0, 6, 5, 1, 2] },
  { name: 'Helicopter', palette: [5, 7, 6, 3, 1, 0, 2, 4] },
  { name: 'Tractor', palette: [3, 2, 6, 0, 4, 7, 1, 5] },
  { name: 'Ladybug', palette: [4, 1, 2, 5, 0, 7, 3, 6] },
  { name: 'Octopus', palette: [4, 2, 5, 3, 6, 7, 1, 0] },
  { name: 'Snail', palette: [1, 3, 2, 6, 7, 0, 4, 5] },
  { name: 'Turtle', palette: [6, 7, 3, 5, 0, 4, 2, 1] },
  { name: 'Frog', palette: [3, 0, 1, 4, 6, 7, 5, 2] },
  { name: 'Kitty', palette: [0, 2, 7, 4, 5, 3, 6, 1] },
  { name: 'Piggy', palette: [3, 5, 6, 4, 2, 0, 7, 1] },
  { name: 'Lighthouse', palette: [3, 7, 5, 6, 2, 4, 1, 0] },
  { name: 'Windmill', palette: [3, 1, 6, 7, 2, 0, 5, 4] },
  { name: 'Camping Tent', palette: [1, 0, 7, 2, 5, 6, 4, 3] },
  { name: 'Gift Box', palette: [2, 4, 0, 5, 7, 1, 6, 3] },
  { name: 'Strawberry', palette: [4, 3, 1, 2, 6, 0, 7, 5] },
  { name: 'Pineapple', palette: [0, 1, 6, 7, 2, 4, 5, 3] },
  { name: 'Flower Pot', palette: [2, 4, 3, 7, 6, 1, 0, 5] },
  { name: 'Dino', palette: [7, 2, 6, 0, 4, 3, 1, 5] },
  { name: 'Unicorn', palette: [7, 4, 2, 3, 0, 5, 6, 1] },
  { name: 'Panda', palette: [0, 4, 7, 3, 5, 1, 2, 6] },
  { name: 'Fox', palette: [1, 2, 6, 0, 7, 5, 3, 4] },
  { name: 'Elephant', palette: [4, 0, 3, 5, 2, 6, 1, 7] },
  { name: 'Giraffe', palette: [2, 5, 7, 3, 0, 4, 6, 1] },
  { name: 'Bumblebee', palette: [4, 0, 6, 7, 3, 2, 5, 1] },
  { name: 'Fire Truck', palette: [3, 2, 4, 6, 5, 7, 0, 1] },
  { name: 'Submarine', palette: [2, 5, 7, 1, 6, 0, 4, 3] },
  { name: 'Treasure Chest', palette: [2, 6, 5, 7, 0, 1, 3, 4] },
  { name: 'Carousel', palette: [4, 2, 5, 0, 1, 3, 6, 7] },
  { name: 'Dragon', palette: [0, 7, 2, 4, 6, 5, 3, 1] },
];
export const toyOf = (i: number): number => i % TOY_INFO.length;

/** The level as the player sees it: colours mapped through the toy's palette. */
export function levelFor(i: number): LevelSpec {
  const spec = generate(i);
  const pal = TOY_INFO[toyOf(i)].palette;
  for (const s of spec.strands) s.c = pal[s.c];
  return spec;
}

/**
 * Sawtooth curve: 3 easy onboarding levels, then cycles of five — a breather (easy, where a new
 * blocker is introduced), three normal levels and a peak: hard at L5/10/15/25/35, super at L20/30/40.
 */
export function diffOf(i: number): Diff {
  const n = i + 1;
  if (n <= 3) return 'easy';
  if (n % 10 === 0 && n >= 20) return 'super';
  if (n % 5 === 0) return 'hard';
  if (n % 5 === 1) return 'easy';
  return 'normal';
}
export const BAND: Record<Diff, [number, number]> = { easy: [0.85, 1], normal: [0.55, 0.85], hard: [0.3, 0.55], super: [0.12, 0.35] };
export const AIM: Record<Diff, number> = { easy: 0.93, normal: 0.7, hard: 0.42, super: 0.24 };
/** The level (1-based) each blocker first shows up — always on a breather, alone. */
export const BLOCKER_AT = { hidden: 6, frozen: 11, lock: 16 } as const;
export type Blocker = keyof typeof BLOCKER_AT;

/** Which blockers each level uses: H mystery yarn, F frozen slot, L lock & key (L1–L40). */
const SCHEDULE = [
  '', '', '', '', '',
  'H', 'H', 'H', 'H', 'H',
  'F', 'F', 'HF', 'F', 'HF',
  'L', 'L', 'HL', 'FL', 'HFL',
  'H', 'HF', 'FL', 'HL', 'HFL',
  'F', 'HL', 'FL', 'HF', 'HFL',
  'L', 'HF', 'FL', 'HL', 'HFL',
  'H', 'FL', 'HF', 'HFL', 'HFL',
  'F', 'HL', 'FL', 'HF', 'HFL',
  'L', 'HF', 'FL', 'HFL', 'HFL',
];
const LETTER: Record<Blocker, string> = { hidden: 'H', frozen: 'F', lock: 'L' };
export const blockersOf = (i: number): Blocker[] => (Object.keys(LETTER) as Blocker[]).filter((b) => (SCHEDULE[i] ?? '').includes(LETTER[b]));

export interface Plan { diff: Diff; cols: number; rows: number; colors: number; strands: number; hidden: number; frozen: number; lock: boolean }

export function planOf(i: number): Plan {
  const diff = diffOf(i);
  const hardish = diff === 'hard' || diff === 'super';
  const intro = (Object.values(BLOCKER_AT) as number[]).includes(i + 1);
  const bl = blockersOf(i);
  const colors = Math.min(8, (i === 0 ? 2 : i < 3 ? 3 : i < 8 ? 4 : i < 15 ? 5 : i < 25 ? 6 : 7) + (diff === 'super' ? 1 : 0));
  const cols = i < 2 ? 4 : i < 8 ? 5 : 6;
  const rows = i < 2 ? 5 : i < 8 ? 6 : i < 20 ? 7 : 8;
  // grows with the level, levelling off at 22 triples (66 strands) so a 6×8 board still fits them
  const triples = Math.min(22, Math.max(colors, Math.round((i === 0 ? 2 : 4 + Math.min(i, 44) * 0.32) * (hardish ? 1.2 : diff === 'easy' && i > 2 ? 0.85 : 1))));
  return {
    diff, cols, rows, colors, strands: triples * 3,
    hidden: bl.includes('hidden') ? (hardish ? 0.3 : 0.18) : 0,
    frozen: bl.includes('frozen') ? (intro ? 4 : hardish ? 8 : 6) : 0,
    lock: bl.includes('lock'),
  };
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(rng() * (i + 1));
    [a[i], a[k]] = [a[k], a[i]];
  }
  return a;
}

function collinearOverlap(cols: number, s: StrandSpec, t: StrandSpec): boolean {
  const P = (p: number) => [p % cols, Math.floor(p / cols)];
  const [ax, ay] = P(s.a), [bx, by] = P(s.b), [cx, cy] = P(t.a), [dx, dy] = P(t.b);
  const c1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const c2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  if (c1 !== 0 || c2 !== 0) return false;
  const proj = (x: number, y: number) => (x - ax) * (bx - ax) + (y - ay) * (by - ay);
  const L = proj(bx, by);
  const p1 = proj(cx, cy), p2 = proj(dx, dy);
  return Math.max(p1, p2) > 0 && Math.min(p1, p2) < L;
}

/** Does the segment pass right through a peg it does not end on? (looks wrong) */
function throughPeg(cols: number, rows: number, a: number, b: number): boolean {
  const [ax, ay] = [a % cols, Math.floor(a / cols)], [bx, by] = [b % cols, Math.floor(b / cols)];
  for (let p = 0; p < cols * rows; p++) {
    if (p === a || p === b) continue;
    const [px, py] = [p % cols, Math.floor(p / cols)];
    const cr = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cr !== 0) continue;
    const t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
    if (t > 0 && t < 1) return true;
  }
  return false;
}

/** Hand-made first level for the tutorial. */
const LEVEL1: LevelSpec = {
  cols: 4, rows: 5, basket: 5,
  strands: [
    { a: 0, b: 15, c: 0, layer: 6 },
    { a: 3, b: 12, c: 1, layer: 5 },
    { a: 4, b: 7, c: 0, layer: 4 },
    { a: 8, b: 11, c: 1, layer: 3 },
    { a: 13, b: 1, c: 0, layer: 2 },
    { a: 17, b: 10, c: 1, layer: 1 },
  ],
};

export function generate(i: number, tune: Tune = TUNED[i] ?? { seed: 1, mix: 0.3, basket: 5 }): LevelSpec {
  if (i === 0) return structuredClone(LEVEL1);
  const p = planOf(i);
  const rng = rngOf(tune.seed * 7919 + i * 104729 + 31);
  for (let attempt = 0; attempt < 300; attempt++) {
    // removal order: colour triples, stirred
    const triples: number[] = [];
    for (let t = 0; t < p.strands / 3; t++) triples.push(t < p.colors ? t : Math.floor(rng() * p.colors));
    shuffle(triples, rng);
    const order = triples.flatMap((c) => [c, c, c]);
    for (let s = 0; s < Math.round(order.length * tune.mix); s++) {
      const a = Math.floor(rng() * order.length), b = Math.min(order.length - 1, a + 1 + Math.floor(rng() * 4));
      [order[a], order[b]] = [order[b], order[a]];
    }
    const strands: StrandSpec[] = [];
    const use = new Array(p.cols * p.rows).fill(0);
    let ok = true;
    for (let k = 0; k < order.length && ok; k++) {
      let placed = false;
      for (let tries = 0; tries < 400 && !placed; tries++) {
        const a = Math.floor(rng() * use.length), b = Math.floor(rng() * use.length);
        if (a === b || use[a] >= 3 || use[b] >= 3) continue;
        const dx = (a % p.cols) - (b % p.cols), dy = Math.floor(a / p.cols) - Math.floor(b / p.cols);
        const len = Math.hypot(dx, dy);
        if (len < 1.9 || len > 4.6) continue;
        const s: StrandSpec = { a, b, c: order[k], layer: order.length - k };
        if (strands.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a) || collinearOverlap(p.cols, s, t))) continue;
        if (throughPeg(p.cols, p.rows, a, b)) continue;
        strands.push(s);
        use[a]++; use[b]++;
        placed = true;
      }
      if (!placed) ok = false;
    }
    if (!ok) continue;
    // blockers
    for (const s of strands) if (rng() < p.hidden) s.hidden = true;
    // lock & key: the key rides an early strand; the padlocked peg only holds strands that come off well after it
    let lock: number | undefined;
    if (p.lock) {
      const early = Math.max(3, Math.floor(strands.length * 0.4));
      const pegs = new Map<number, number[]>();
      strands.forEach((t, k) => { for (const q of [t.a, t.b]) pegs.set(q, [...(pegs.get(q) ?? []), k]); });
      for (let tries = 0; tries < 60 && lock === undefined; tries++) {
        const kk = 1 + Math.floor(rng() * (early - 1));
        const ok = [...pegs.entries()].filter(([q, ks]) => q !== strands[kk].a && q !== strands[kk].b && ks.length >= 2 && ks.every((k) => k > kk + 2));
        if (!ok.length) continue;
        lock = ok[Math.floor(rng() * ok.length)][0];
        strands[kk].key = true;
      }
      if (lock === undefined) continue;
    }
    const spec: LevelSpec = { cols: p.cols, rows: p.rows, strands, basket: tune.basket, lock, frozen: p.frozen || undefined };
    if (!solve(fromSpec(spec), 12)) continue;
    return spec;
  }
  throw new Error(`level ${i + 1}: could not build`);
}
