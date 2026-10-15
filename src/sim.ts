// The rules of Knot Untangle, shared by the game, the bots and the tuner.
//
// Yarn strands are stretched between pegs on a board. A strand lies on top of
// another when their segments cross or share a peg and its layer is higher.
// Tapping a strand pulls it off — only when nothing lies on top of it. A pulled
// strand rolls into a ball in the basket; three balls of one colour are knitted
// away. A basket that fills up with no three alike loses the level. Knotted
// strands come off together (both must be free). Won when the board is clear.
//
// Blockers (see levels.ts for when each one starts):
//   hidden — grey until nothing lies on it (view only; the rules know its colour)
//   knot   — two strands that don't touch, chained together and pulled off together
//   frozen — one basket hole iced over for N pulls: every strand that comes off thaws it by one
//   lock   — a padlocked peg: strands on it stay put until the key strand is pulled

export interface StrandSpec { a: number; b: number; c: number; layer: number; knot?: number; hidden?: boolean; key?: boolean }
export interface LevelSpec { cols: number; rows: number; strands: StrandSpec[]; basket: number; lock?: number; frozen?: number }

export interface State {
  cols: number;
  rows: number;
  strands: StrandSpec[];
  gone: boolean[];
  basket: number[];
  cap: number;
  knitted: number;
  above: number[][];   // strand → strands that lie on top of it
  lost: boolean;
  frozen: number;      // pulls left before the iced basket hole opens (0 = open / none)
  lock: number;        // the padlocked peg, -1 = none
  unlocked: boolean;   // the key strand has come off
}

export type Ev =
  | { k: 'pull'; strand: number; c: number }
  | { k: 'knit'; c: number }
  | { k: 'thaw'; left: number }
  | { k: 'unlock'; peg: number }
  | { k: 'full' };

export const pegXY = (cols: number, p: number): [number, number] => [p % cols, Math.floor(p / cols)];

function cross(p1: [number, number], p2: [number, number], p3: [number, number], p4: [number, number]): boolean {
  const d = (a: [number, number], b: [number, number], c: [number, number]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Do two strands touch: segments cross, or they share a peg. */
export function touch(cols: number, s: StrandSpec, t: StrandSpec): boolean {
  if (s.a === t.a || s.a === t.b || s.b === t.a || s.b === t.b) return true;
  return cross(pegXY(cols, s.a), pegXY(cols, s.b), pegXY(cols, t.a), pegXY(cols, t.b));
}

export function fromSpec(spec: LevelSpec): State {
  const n = spec.strands.length;
  const above: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i !== j && spec.strands[j].layer > spec.strands[i].layer && touch(spec.cols, spec.strands[i], spec.strands[j])) above[i].push(j);
  }
  return {
    cols: spec.cols, rows: spec.rows, strands: spec.strands, gone: new Array(n).fill(false), basket: [], cap: spec.basket, knitted: 0, above, lost: false,
    frozen: spec.frozen ?? 0, lock: spec.lock ?? -1, unlocked: !spec.strands.some((t) => t.key),
  };
}

export function clone(s: State): State {
  return { ...s, gone: s.gone.slice(), basket: s.basket.slice() };
}

export const free = (s: State, i: number): boolean => !s.gone[i] && s.above[i].every((j) => s.gone[j]);
/** Strand i sits on the padlocked peg and the key is not in yet. */
export const lockedOn = (s: State, i: number): boolean => !s.unlocked && s.lock >= 0 && (s.strands[i].a === s.lock || s.strands[i].b === s.lock);
/** Free and not held by the lock. */
const loose = (s: State, i: number): boolean => free(s, i) && !lockedOn(s, i);
/** Basket holes usable right now (an iced hole is not). */
export const room = (s: State): number => s.cap - (s.frozen > 0 ? 1 : 0);
/** The strand knotted to `i`, if any. */
export const partner = (s: State, i: number): number => {
  const k = s.strands[i].knot;
  if (k === undefined) return -1;
  return s.strands.findIndex((t, j) => j !== i && t.knot === k);
};
export function canPull(s: State, i: number): boolean {
  if (s.lost || !loose(s, i)) return false;
  const p = partner(s, i);
  return p < 0 || s.gone[p] || loose(s, p);
}
/** Blocking strands still on top of `i` (and of its knot partner). */
export function blockers(s: State, i: number): number[] {
  const out = s.above[i].filter((j) => !s.gone[j]);
  const p = partner(s, i);
  if (p >= 0 && !s.gone[p]) for (const j of s.above[p]) if (!s.gone[j] && j !== i) out.push(j);
  return out;
}

export const remaining = (s: State): number => s.gone.filter((g) => !g).length;
export const won = (s: State): boolean => remaining(s) === 0 && s.basket.length === 0;

function put(s: State, c: number, evs: Ev[]): void {
  s.basket.push(c);
  if (s.basket.filter((x) => x === c).length >= 3) {
    let n = 0;
    s.basket = s.basket.filter((x) => (x === c && n < 3 ? (n++, false) : true));
    s.knitted++;
    evs.push({ k: 'knit', c });
  }
}

/** After all the balls of one pull are in: a basket at (or over) its size loses. */
function checkFull(s: State, evs: Ev[]): void {
  if (s.basket.length >= room(s)) {
    s.lost = true;
    evs.push({ k: 'full' });
  }
}

export function pull(s: State, i: number): Ev[] {
  const evs: Ev[] = [];
  if (!canPull(s, i)) return evs;
  const p = partner(s, i);
  const off = p >= 0 && !s.gone[p] ? [i, p] : [i];
  for (const j of off) {
    s.gone[j] = true;
    evs.push({ k: 'pull', strand: j, c: s.strands[j].c });
    put(s, s.strands[j].c, evs);
  }
  afterOff(s, off, evs);
  checkFull(s, evs);
  return evs;
}

/** Strands came off: the iced hole thaws by one per strand; the key opens the lock. */
function afterOff(s: State, off: number[], evs: Ev[]): void {
  if (s.frozen > 0) {
    s.frozen = Math.max(0, s.frozen - off.length);
    evs.push({ k: 'thaw', left: s.frozen });
  }
  if (!s.unlocked && off.some((j) => s.strands[j].key)) {
    s.unlocked = true;
    evs.push({ k: 'unlock', peg: s.lock });
  }
}

export const pullable = (s: State): number[] => s.strands.map((_, i) => i).filter((i) => canPull(s, i));
export const stuck = (s: State): boolean => !won(s) && !s.lost && pullable(s).length === 0;

// ------------------------------------------------------------ boosters

/** Scissors: cut any strand (blocked or not) straight into the basket. */
export function cut(s: State, i: number): Ev[] {
  const evs: Ev[] = [];
  if (s.gone[i] || s.lost) return evs;
  s.gone[i] = true;
  evs.push({ k: 'pull', strand: i, c: s.strands[i].c });
  put(s, s.strands[i].c, evs);
  afterOff(s, [i], evs);
  checkFull(s, evs);
  return evs;
}

/** +Slot / revive: one more place in the basket (and the level goes on). */
export function addSlot(s: State): void {
  s.cap = Math.min(6, Math.max(s.cap + 1, s.basket.length + 1));
  s.lost = false;
}

// ------------------------------------------------------------ bots

export function score(s: State, i: number): number {
  const p = partner(s, i);
  const cs = [s.strands[i].c, ...(p >= 0 && !s.gone[p] ? [s.strands[p].c] : [])];
  let v = 0;
  const b = s.basket.slice();
  for (const c of cs) {
    const have = b.filter((x) => x === c).length;
    v += have === 2 ? 6 : have === 1 ? 2.5 : -0.4 * b.length;
    b.push(c);
  }
  // uncovering others is good
  for (let j = 0; j < s.strands.length; j++) if (!s.gone[j] && s.above[j].includes(i)) v += 0.4;
  if (b.length >= room(s) && !cs.some((c) => s.basket.filter((x) => x === c).length >= 2)) v -= 20;
  return v;
}

export function rngOf(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function botRun(s0: State, rng: () => number, temp = 1): { win: boolean; path: number[]; progress: number } {
  const s = clone(s0);
  const path: number[] = [];
  for (let k = 0; k < 500; k++) {
    if (won(s) || s.lost) break;
    const ms = pullable(s);
    if (!ms.length) break;
    const vs = ms.map((i) => score(s, i));
    const mx = Math.max(...vs);
    const ws = vs.map((v) => Math.exp((v - mx) / temp));
    let r = rng() * ws.reduce((a, b) => a + b, 0);
    let pick = 0;
    for (; pick < ws.length - 1; pick++) if ((r -= ws[pick]) <= 0) break;
    path.push(ms[pick]);
    pull(s, ms[pick]);
  }
  return { win: won(s), path, progress: 1 - remaining(s) / s.strands.length };
}

/** A clearing order from careful play, or null (used for Hint and as proof). */
export function solve(s0: State, tries = 30): number[] | null {
  for (let r = 0; r < tries; r++) {
    const res = botRun(s0, rngOf(r * 11 + 3), r === 0 ? 0.05 : 0.3);
    if (res.win) return res.path;
  }
  return null;
}
