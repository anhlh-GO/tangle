// Knot Untangle — the game: tapping yarn off the pegs, the basket, the cat who
// knits every three balls into the level's item, HUD, boosters, popups and the
// tutorial. The rules live in sim.ts; the 3D board in scene3d.ts.

import FalconSDK from '@falcongames/game-client-sdk';
import { createFalconEvents, type FalconGame } from './falcon-game';
import { FONT, outlinedText, roundRect, shade, sparkle } from './art';
import { audio, haptic, setAudioPaused, sfx, unlockAudio } from './audio';
import { BLOCKER_AT, LEVEL_COUNT, TOY_INFO, YARN, diffOf, levelFor, toyOf } from './levels';
import { addSlot, blockers, canPull, clone, cut, free, fromSpec, lockedOn, partner, pull, room, solve, stuck, won, type Ev, type State } from './sim';
import { Scene3D } from './scene3d';
import undoJpg from './assets/b_undo.jpg';
import undoA from './assets/b_undo_a.png';
import scissorsJpg from './assets/b_scissors.jpg';
import scissorsA from './assets/b_scissors_a.png';
import slotJpg from './assets/b_slot.jpg';
import slotA from './assets/b_slot_a.png';
import trayJpg from './assets/tray.jpg';
import trayA from './assets/tray_a.png';
import gearJpg from './assets/b_gear.jpg';
import gearA from './assets/b_gear_a.png';
import popSettingsJpg from './assets/pop_settings.jpg';
import popSettingsA from './assets/pop_settings_a.png';
import popWinJpg from './assets/pop_win.jpg';
import popWinA from './assets/pop_win_a.png';
import popFullJpg from './assets/pop_full.jpg';
import popFullA from './assets/pop_full_a.png';

/**
 * A cut-out picture shipped small: colour as JPEG + its alpha as a grey PNG, joined into a canvas once
 * both have loaded (`ok`). Keeps the one-file build light.
 */
function maskedImage(jpg: string, mask: string, then?: (c: HTMLCanvasElement) => void): { c: HTMLCanvasElement; ok: boolean } {
  const out = { c: document.createElement('canvas'), ok: false };
  const a = new Image(), b = new Image();
  let n = 0;
  const done = () => {
    if (++n < 2) return;
    const c = out.c;
    c.width = a.width; c.height = a.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(b, 0, 0);
    const m = g.getImageData(0, 0, c.width, c.height);
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(a, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let k = 0; k < d.data.length; k += 4) d.data[k + 3] = m.data[k];
    g.putImageData(d, 0, 0);
    out.ok = true;
    then?.(c);
  };
  a.onload = done; b.onload = done;
  a.src = jpg; b.src = mask;
  return out;
}
const trayImg = maskedImage(trayJpg, trayA);
const TRAY_AR = 129 / 720;   // tray.png height / width
const gearImg = maskedImage(gearJpg, gearA);

// ---------------------------------------------------------------- popup pictures
// The popups are the reference pictures (cut out, colour as JPEG + alpha mask, 640 px wide);
// what changes with the game (toggles, toy name, basket balls, texts) is painted over them.
// Box coordinates below are in the 640-wide picture.
type Box = [number, number, number, number];   // x0, y0, x1, y1
const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
/** Paint over a box with the picture's own background: every row blends the colours just left and right of it. */
function blankBox(c: CanvasRenderingContext2D, [x0, y0, x1, y1]: Box): void {
  const w = x1 - x0, h = y1 - y0;
  const d = c.getImageData(x0 - 3, y0, w + 6, h);
  const W = w + 6;
  for (let y = 0; y < h; y++) {
    const L0 = (y * W + 1) * 4, R0 = (y * W + W - 2) * 4;
    for (let x = 3; x < W - 3; x++) {
      const t = (x - 1) / (W - 3), q = (y * W + x) * 4;
      for (let k = 0; k < 4; k++) d.data[q + k] = d.data[L0 + k] * (1 - t) + d.data[R0 + k] * t;
    }
  }
  c.putImageData(d, x0 - 3, y0);
}
const POP: Record<string, HTMLCanvasElement> = {};
async function buildPopups(): Promise<void> {
  const make = async (jpg: string, mask: string, variants: Record<string, Box[]>, cut: keyof typeof CUT) => {
    const [im, al] = await Promise.all([loadImg(jpg), loadImg(mask)]);
    const base = document.createElement('canvas');
    base.width = im.width; base.height = im.height;
    const g = base.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(im, 0, 0);
    const m = document.createElement('canvas');
    m.width = al.width; m.height = al.height;
    const mg = m.getContext('2d')!;
    mg.drawImage(al, 0, 0);
    const d = g.getImageData(0, 0, base.width, base.height), md = mg.getImageData(0, 0, m.width, m.height);
    for (let k = 0; k < d.data.length; k += 4) d.data[k + 3] = md.data[k];
    g.putImageData(d, 0, 0);
    for (const [name, boxes] of Object.entries(variants)) {
      const c = document.createElement('canvas');
      c.width = base.width; c.height = base.height;
      const cg = c.getContext('2d', { willReadFrequently: true })!;
      cg.drawImage(base, 0, 0);
      for (const b of boxes) blankBox(cg, cutBox(cut, b));
      POP[name] = c;
    }
  };
  await Promise.all([
    make(popSettingsJpg, popSettingsA, { settings: [] }, 'settings'),
    make(popWinJpg, popWinA, { win: [WIN_TEXT] }, 'win'),
    make(popFullJpg, popFullA, {
      full: [FULL_BALLS],
      fullNoSlot: [FULL_BALLS, FULL_SLOT_BTN],
      fullAd: [FULL_BALLS, FULL_FREE],
      stuck: [FULL_TITLE, FULL_BALLS, FULL_MSG, FULL_SLOT_IN],
    }, 'full'),
  ]);
}
// Boxes are measured on the original reference pictures; each cut-out keeps its crop origin and scale.
const CUT = { settings: { ox: 60, oy: 94, s: 0.60491 }, win: { ox: 76, oy: 30, s: 0.58554 }, full: { ox: 53, oy: 81, s: 0.57866 } };
const PIC_CUT: Record<string, keyof typeof CUT> = { settings: 'settings', win: 'win', full: 'full', fullNoSlot: 'full', fullAd: 'full', stuck: 'full' };
const cutBox = (k: keyof typeof CUT, [x0, y0, x1, y1]: Box): Box => {
  const c = CUT[k];
  return [Math.round((x0 - c.ox) * c.s), Math.round((y0 - c.oy) * c.s), Math.round((x1 - c.ox) * c.s), Math.round((y1 - c.oy) * c.s)];
};
// Settings
const SET_X = { x: 1048, y: 222, r: 70 };
const SET_TOGGLES: Box[] = [[735, 348, 995, 462], [735, 523, 995, 638], [735, 700, 995, 815]];
const SET_RESTART: Box = [220, 868, 933, 1022];
const SET_CLOSE: Box = [322, 1050, 832, 1178];
// All Untangled
const WIN_TEXT: Box = [280, 678, 970, 862];
const WIN_NEXT: Box = [270, 895, 975, 1075];
// Basket Full
const FULL_TITLE: Box = [320, 135, 900, 225];
const FULL_BALLS: Box = [110, 355, 1100, 545];
const FULL_MSG: Box = [190, 580, 1040, 668];
const FULL_SLOT_BTN: Box = [170, 700, 1050, 952];
const FULL_SLOT_IN: Box = [260, 730, 960, 890];
const FULL_FREE: Box = [490, 830, 615, 888];
const FULL_SLOT: Box = [205, 712, 1000, 912];
const FULL_RETRY: Box = [262, 940, 950, 1100];
void buildPopups();
import { adBadge, bubble, button, card, gearButton, inside, pointer, toast, type BoosterKey, type Rect } from './ui';

export { LEVEL_COUNT };

const arc0 = CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc = function (this: CanvasRenderingContext2D, x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean) {
  arc0.call(this, x, y, Math.max(0, r), a0, a1, ccw);
};
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scene = new Scene3D(document.getElementById('view') as HTMLCanvasElement);
const events = createFalconEvents();
type Ads = { enabled: boolean; showRewarded(): Promise<boolean>; maybeShowInterstitial(l: number): Promise<boolean> };
const ADS = (): Ads | undefined => (FalconSDK as unknown as { ads?: Ads }).ads;
const MAX_CAP = 6;   // the tray has exactly six holes
const HOLES = 6;
const GREY = '#b9b3c4';

// ---------------------------------------------------------------- save

interface Save { b: Record<BoosterKey, number>; seen: Record<string, boolean>; wardrobe: number[] }
const SAVE_KEY = 'knotuntangle_save';
const save: Save = { b: { undo: 2, scissors: 2, slot: 1 }, seen: {}, wardrobe: [] };
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
  if (s) { Object.assign(save.b, s.b); Object.assign(save.seen, s.seen); if (Array.isArray(s.wardrobe)) save.wardrobe = s.wardrobe; }
} catch { /* fresh */ }
function persist(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

const BOOSTERS: BoosterKey[] = ['undo', 'scissors', 'slot'];
const UNLOCK: Record<BoosterKey, number> = { undo: 3, scissors: 5, slot: 7 };
const B_DESC: Record<BoosterKey, string> = {
  undo: 'Take back your last pull.',
  scissors: 'Snip any strand — even one that is stuck underneath!',
  slot: 'One more place in the basket.',
};
const INTRO = {
  hidden: { title: 'Mystery Yarn', text: 'Grey yarn shows its color once nothing lies on top of it.' },
  frozen: { title: 'Frozen Slot', text: 'One basket slot is frozen. Every strand you pull melts it by 1. At 0 the slot opens!' },
  lock: { title: 'Lock & Key', text: 'Strands on the locked peg can\u2019t move. Pull the strand carrying the key to open it!' },
};

// ---------------------------------------------------------------- state

interface Leave { t: number; x0: number; y0: number; m: number; u: number; mx: number; my: number; lead: boolean; group: Ball[] }
interface Ball { c: number; x: number; y: number; x0: number; y0: number; t: number; dur: number; slot: number; leaving?: Leave; part?: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Floater { text: string; x: number; y: number; t: number; color: string; size: number }
type PopupKind = 'win' | 'full' | 'stuck' | 'settings' | 'intro';
interface Popup { kind: PopupKind; t: number; booster?: BoosterKey; blocker?: keyof typeof INTRO }

let level = 0;
let S: State = fromSpec(levelFor(0));
/** The toy's colour plan: each part's yarn, and for colour c the knit steps of its triples (part, fill-to). */
let plan: { color: number[]; steps: Map<number, { part: number; to: number }[][]> } = { color: [], steps: new Map() };
let knitLog: number[] = [];   // colour of every triple knitted so far
let revealed: boolean[] = [];
let balls: Ball[] = [];
let leavingBalls: Ball[] = [];
let history: { s: State; revealed: boolean[] }[] = [];
let ended = false;
let paused = false;
let busy = 0;
let runId = 0;
let clock = 0;
let particles: Particle[] = [];
let floaters: Floater[] = [];
let popup: Popup | null = null;
let toastMsg = { text: '', t: 0 };
let banner = { text: '', sub: '', t: 0 };
let armed: BoosterKey | null = null;
let hint = { strand: -1, t: 0 };
let streak = 0;
let lastKnit = -9;
const press = new Map<string, number>();
let popupButtons: { id: string; r: Rect }[] = [];
let introQueue: (() => void)[] = [];

const timers: { t: number; res: () => void }[] = [];
const wait = (s: number): Promise<void> => new Promise((res) => timers.push({ t: clock + s, res }));
const ease = (k: number): number => 1 - (1 - k) ** 3;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const totalTriples = (): number => S.strands.length / 3;

// ---------------------------------------------------------------- layout

interface Layout {
  W: number; H: number; colX: number; colW: number; u: number; hudY: number;
  gear: { x: number; y: number; r: number }; dots: { x: number; r: number }[]; bar: Rect;
  toy: Rect; basket: Rect; viewTop: number; viewBottom: number;
  barTop: number; boostY: number; boostR: number;
}
let L!: Layout;

function probeInset(side: 'top' | 'bottom'): number {
  const id = `sa-${side}`;
  let p = document.getElementById(id);
  if (!p) {
    p = document.createElement('div');
    p.id = id;
    p.style.cssText = `position:fixed;left:0;width:0;visibility:hidden;pointer-events:none;${side}:0;height:env(safe-area-inset-${side},0px)`;
    document.body.appendChild(p);
  }
  return p.getBoundingClientRect().height || 0;
}

/**
 * Laid out after the art-direction spec (reference 864 × 1738, normalised):
 * HUD 8%, toy 10–31%, tray 32–40%, board 42–84%, booster toolbar 86–100%.
 */
function layout(): Layout {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const colW = Math.min(W, H * 0.497);
  const colX = (W - colW) / 2;
  const u = Math.min(W, 0.62 * H);
  const sbh = Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sbh')) || 0, probeInset('top'));
  const sbb = probeInset('bottom');
  const hudY = Math.max(0.08 * H, sbh + 0.035 * H);
  const dy = hudY - 0.08 * H;                    // everything below follows the HUD down on notched phones
  const dr = colW * 0.045;
  const barTop = H - sbb - 0.14 * H;
  const toy = { x: colX + colW * 0.12, y: 0.1 * H + dy, w: colW * 0.76, h: 0.21 * H };
  const bw = colW * 0.86, bh = bw * TRAY_AR;
  const basket = { x: colX + (colW - bw) / 2, y: 0.36 * H + dy - bh / 2, w: bw, h: bh };
  const viewTop = 0.42 * H + dy;
  const viewBottom = Math.min(0.85 * H + dy, barTop - 0.008 * H);
  const boostR = Math.min(colW * 0.098, 0.048 * H);
  return {
    W, H, colX, colW, u, hudY,
    gear: { x: colX + colW * 0.11, y: hudY - 0.01 * H, r: colW * 0.06 },
    dots: [{ x: colX + colW * 0.29, r: dr }, { x: colX + colW * 0.66, r: dr }, { x: colX + colW * 0.79, r: dr }],
    bar: { x: colX + colW * 0.29, y: hudY - dr * 0.5, w: colW * 0.37, h: dr },
    toy, basket, viewTop, viewBottom,
    barTop, boostY: barTop + 0.066 * H - Math.min(0, sbb), boostR,
  };
}

/** The boosters, side by side on the bottom toolbar. */
function boosterAt(i: number): { x: number; y: number } {
  return { x: L.colX + L.colW * (0.21 + i * 0.29), y: L.boostY };
}

function holeXY(k: number): { x: number; y: number; r: number } {
  // hole centres measured on the tray picture (src/assets/tray.png)
  const b = L.basket;
  return { x: b.x + b.w * (0.0944 + k * 0.1614), y: b.y + b.h * 0.43, r: b.w * 0.06 };
}
/** Where the k-th ball sits: the k-th hole, skipping the frozen one while it is iced over. */
function slotXY(k: number): { x: number; y: number; r: number } {
  return holeXY(frozenHole >= 0 && S.frozen > 0 && k >= frozenHole ? k + 1 : k);
}
let frozenHole = -1;     // the iced-over basket hole (Frozen Slot blocker), -1 = none
let frozenN0 = 0;
let iceBump = 0;
let iceBreak = -1;       // shatter animation time, -1 = none
let shards: { x0: number; y0: number; t: number }[] = [];
let lastPullAt = { x: 0, y: 0 };

// ---------------------------------------------------------------- board

function depthOf(s: State): number[] {
  const n = s.strands.length;
  const order = [...Array(n).keys()].sort((a, b) => s.strands[a].layer - s.strands[b].layer);
  const depth = new Array(n).fill(0);
  for (const i of order) for (const j of s.above[i]) depth[j] = Math.max(depth[j], depth[i] + 1);
  return depth;
}

function colorOf(i: number): string { return revealed[i] ? YARN[S.strands[i].c].color : GREY; }

function buildBoard(): void {
  const knots: [number, number][] = [];
  S.strands.forEach((s, i) => { if (s.knot !== undefined) { const p = partner(S, i); if (p > i) knots.push([i, p]); } });
  scene.build(S.cols, S.rows, S.strands, depthOf(S), S.strands.map((_, i) => colorOf(i)), knots, S.lock, S.strands.map((t, i) => !!t.hidden && !revealed[i]));
  S.gone.forEach((g, i) => { if (g) scene.setGone(i, true); });
  if (S.lock >= 0) scene.setUnlocked(S.unlocked, true);
}

/** Grey strands show their colour once nothing lies on them. */
function revealFree(): void {
  S.strands.forEach((s, i) => {
    if (!revealed[i] && !S.gone[i] && free(S, i)) {
      revealed[i] = true;
      scene.setColor(i, YARN[s.c].color);
      const p = scene.toScreen(scene.midOf(i));
      burst(p.x, p.y, '#ffffff', 6, 0.6);
    }
  });
}

// ---------------------------------------------------------------- level flow

function startLevel(index: number): void {
  level = clamp(Math.floor(index), 0, LEVEL_COUNT - 1);
  runId++;
  timers.length = 0;
  S = fromSpec(levelFor(level));
  revealed = S.strands.map((s) => !s.hidden);
  frozenHole = S.frozen > 0 ? S.cap - 1 : -1;
  frozenN0 = S.frozen;
  iceBreak = -1;
  shards = [];
  scene.setToy(toyOf(level));
  plan = planToy();
  scene.setTints(plan.color.map((c) => (c >= 0 ? YARN[c].color : null)));
  knitLog = [];
  show = null;
  cutFx = null;
  drillFx = null;
  balls = [];
  leavingBalls = [];
  history = [];
  ended = false;
  paused = false;
  busy = 0;
  popup = null;
  armed = null;
  hint = { strand: -1, t: 0 };
  particles = [];
  floaters = [];
  streak = 0;
  L = layout();
  buildBoard();
  revealFree();
  const d = diffOf(level);
  banner = d === 'hard' ? { text: 'Hard Level!', sub: 'Mind the basket', t: 1.8 } : d === 'super' ? { text: 'Super Hard!', sub: 'Mind the basket', t: 1.8 } : { text: '', sub: '', t: 0 };
  setupTutorial();
  events.emit('levelStart', { index: level, difficulty: d, levelId: `L${level + 1}` });
}

function showToast(text: string): void { toastMsg = { text, t: 2 }; }

function burst(x: number, y: number, color: string, n: number, spread = 1): void {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = (50 + Math.random() * 170) * spread;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0, max: 0.45 + Math.random() * 0.4, color, size: L.u * (0.01 + Math.random() * 0.012) });
  }
}

// ---------------------------------------------------------------- moves

function play(evs: Ev[]): void {
  const run = runId;
  let delay = 0;
  for (const e of evs) {
    if (e.k === 'pull') {
      scene.setGone(e.strand, true);
      sfx.pull();
      haptic(10);
      const p = scene.toScreen(scene.midOf(e.strand));
      lastPullAt = p;
      // the 3D rope first winds itself into a ball (COIL), then that ball flies to the basket
      const b: Ball = { c: e.c, x: p.x, y: p.y - L.u * 0.03, x0: p.x, y0: p.y - L.u * 0.03, t: -COIL / 0.45, dur: 0.45, slot: balls.length };
      balls.push(b);
      busy++;
      delay = 0.5 + COIL;
      void wait(b.dur + COIL).then(() => { if (run === runId) { busy--; sfx.ball(); } });
    } else if (e.k === 'knit') {
      // the view basket mirrors the rules at once; the three land, merge into one ("match 3"), then knit
      const c = e.c;
      const group: Ball[] = [];
      for (const b of balls) if (b.c === c && group.length < 3) group.push(b);
      group.sort((a2, b2) => a2.slot - b2.slot);
      group.forEach((b, i) => { b.leaving = { t: -delay, x0: 0, y0: 0, m: 0, u: 0, mx: 0, my: 0, lead: i === 1, group }; });
      leavingBalls.push(...group);
      balls = balls.filter((b) => !b.leaving);
      balls.forEach((b, k) => { b.slot = k; });
      void wait(delay + MERGE).then(() => {
        if (run !== runId) return;
        const parts = knitToy(c);
        for (const b of group) b.part = parts[0] ?? -1;
        streak = clock - lastKnit < 3 ? streak + 1 : 1;
        lastKnit = clock;
        sfx.knit(streak);
        haptic(20);
        const lead = group[1];
        burst(lead.x, lead.y, YARN[c].color, 16, 1.1);
        floaters.push({ text: streak > 1 ? `Match x${streak}!` : 'Match!', x: lead.x, y: lead.y - L.basket.h * 0.7, t: 0, color: '#fff36b', size: L.u * 0.05 });
      });
    } else if (e.k === 'thaw') {
      if (frozenHole >= 0) {
        shards.push({ x0: lastPullAt.x, y0: lastPullAt.y, t: 0 });
        const left = e.left;
        void wait(0.38).then(() => {
          if (run !== runId) return;
          iceBump = 1;
          sfx.clack();
          if (left === 0) {
            iceBreak = 0;
            sfx.snip(); haptic(30);
            const h = holeXY(frozenHole);
            for (let k = 0; k < 22; k++) {
              const a = Math.random() * Math.PI * 2, v = L.u * (0.25 + Math.random() * 0.6);
              particles.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - L.u * 0.2, life: 0, max: 0.5 + Math.random() * 0.4, color: Math.random() < 0.5 ? '#e8f8ff' : '#9fdcff', size: L.u * (0.01 + Math.random() * 0.012) });
            }
            floaters.push({ text: 'Slot free!', x: h.x, y: h.y - L.basket.h * 0.7, t: 0, color: '#bff0ff', size: L.u * 0.045 });
          }
        });
      }
    } else if (e.k === 'unlock') {
      scene.setUnlocked(true);
      void wait(0.55).then(() => {
        if (run !== runId) return;
        sfx.booster(); haptic(25);
        const at = scene.lockPoint();
        if (at) { const q = scene.toScreen(at); burst(q.x, q.y, '#ffd34a', 16, 1); floaters.push({ text: 'Unlocked!', x: q.x, y: q.y - L.u * 0.06, t: 0, color: '#fff36b', size: L.u * 0.045 }); }
      });
    } else if (e.k === 'full') {
      void wait(0.7).then(() => {
        if (run !== runId) return;
        ended = true;
        sfx.lose();
        haptic(60);
        popup = { kind: 'full', t: 0 };
      });
    }
  }
  revealFree();
  hint = { strand: -1, t: 0 };
  void wait(0.6).then(() => { if (run === runId) checkEnd(run); });
}

/**
 * Colour the toy after the strands on the board: every colour covers a share of the toy
 * as big as its share of the strands. Parts of one design group stay one colour where
 * possible (a group whose design colour is on the board keeps it); every colour on the
 * board gets at least one part. Each triple of a colour then knits the next slice of
 * that colour's parts, bottom up (a slice may end half way up a part).
 */
function planToy(): typeof plan {
  const info = scene.partInfo();
  const n = info.length;
  const color = new Array<number>(n).fill(-1);
  const steps = new Map<number, { part: number; to: number }[][]>();
  const t = new Map<number, number>();
  for (const st of S.strands) t.set(st.c, (t.get(st.c) ?? 0) + 1 / 3);
  const cols = [...t.keys()].sort((a, b) => t.get(b)! - t.get(a)! || a - b);
  if (!n || !cols.length) return { color, steps };
  const N = S.strands.length / 3;
  const A = info.reduce((a, p) => a + p.area, 0);
  const have = new Map<number, number>(cols.map((c) => [c, 0]));
  const groups = new Map<number, number[]>();
  info.forEach((p, k) => { const g = groups.get(p.c) ?? []; g.push(k); groups.set(p.c, g); });
  const area = (ks: number[]) => ks.reduce((a, k) => a + info[k].area, 0);
  const order = [...groups.entries()].sort((a, b) => area(b[1]) - area(a[1]));
  for (const [dc, ks] of order) {
    let best = cols[0], bestV = -Infinity;
    for (const c of cols) {
      const v = (A * t.get(c)!) / N - have.get(c)! + (c === dc ? A * 0.12 : 0) - (have.get(c)! === 0 ? 0 : A * 0.02);
      if (v > bestV) { bestV = v; best = c; }
    }
    for (const k of ks) color[k] = best;
    have.set(best, have.get(best)! + area(ks));
  }
  // every colour on the board needs a part: take one from the colour with the most to spare
  for (const c of cols) {
    if (color.includes(c)) continue;
    const target = (A * t.get(c)!) / N;
    let pick = -1, pickV = Infinity;
    for (let k = 0; k < n; k++) {
      const o = color[k];
      if (color.filter((x) => x === o).length < 2) continue;
      const v = Math.abs(info[k].area - target) - (have.get(o)! - (A * t.get(o)!) / N);
      if (v < pickV) { pickV = v; pick = k; }
    }
    if (pick < 0) break;
    have.set(color[pick], have.get(color[pick])! - info[pick].area);
    color[pick] = c;
    have.set(c, info[pick].area);
  }
  // slice each colour's parts (bottom first) into one step per triple, by area
  for (const c of cols) {
    const ks = info.map((_, k) => k).filter((k) => color[k] === c).sort((a, b) => info[a].y - info[b].y);
    const tc = Math.round(t.get(c)!);
    const tot = area(ks);
    const list: { part: number; to: number }[][] = [];
    for (let j = 0; j < tc; j++) {
      const lo = (tot * j) / tc, hi = (tot * (j + 1)) / tc;
      const step: { part: number; to: number }[] = [];
      let acc = 0;
      for (const k of ks) {
        const a0 = acc, a1 = acc + info[k].area;
        acc = a1;
        if (a1 <= lo + 1e-9 || a0 >= hi - 1e-9) continue;
        step.push({ part: k, to: j === tc - 1 ? 1 : Math.min(1, (hi - a0) / Math.max(1e-9, a1 - a0)) });
      }
      list.push(step);
    }
    steps.set(c, list);
  }
  return { color, steps };
}

/** Knit the next slice of the toy for a triple of colour `c`. Returns the parts stitched. */
function knitToy(c: number, now = false): number[] {
  const j = knitLog.filter((x) => x === c).length;
  knitLog.push(c);
  const step = plan.steps.get(c)?.[j] ?? [];
  for (const s2 of step) scene.knitPart(s2.part, YARN[c].color, s2.to, now, UNWIND);
  return step.map((s2) => s2.part);
}
const UNWIND = 0.95;
const COIL = 0.42;   // = scene3d's COIL: the rope reels into a ball before it flies
const MERGE = 0.38;

/** Level-clear showcase: zoom the toy to the middle, spin it 360°, zoom back as the popup comes in. */
const SHOW = 2.9;
let show: { t: number } | null = null;
function showRect(): { k: number; x: number; y: number; w: number; h: number } {
  if (!show) return { k: 0, ...L.toy };
  const t = show.t;
  const kin = Math.min(1, t / 0.55), kout = Math.max(0, (t - (SHOW - 0.45)) / 0.45);
  const ease = (v: number) => v * v * (3 - 2 * v);
  const k = ease(kin) * (1 - ease(Math.min(1, kout)));
  const bw = Math.min(L.colW * 0.98, L.H * 0.52), bh = bw * 1.05;
  const big = { x: L.colX + (L.colW - bw) / 2, y: L.H * 0.47 - bh / 2, w: bw, h: bh };
  const lerp = (a: number, b: number) => a + (b - a) * k;
  return { k, x: lerp(L.toy.x, big.x), y: lerp(L.toy.y, big.y), w: lerp(L.toy.w, big.w), h: lerp(L.toy.h, big.h) };
}
function showSpin(): number {
  if (!show) return 0;
  const u = Math.min(1, Math.max(0, (show.t - 0.45) / (SHOW - 1.0)));
  return Math.PI * 2 * (u * u * (3 - 2 * u));
}
function drawShowcase(k: number): void {
  if (!show || k <= 0.01) return;
  ctx.globalAlpha = k;
  const name = TOY_INFO[toyOf(level)].name;
  const r = showRect();
  outlinedText(ctx, 'Completed!', L.colX + L.colW / 2, r.y - L.u * 0.02, L.u * 0.09 * (0.8 + 0.2 * k), '#fff36b', '#0b2563');
  outlinedText(ctx, name, L.colX + L.colW / 2, r.y + r.h + L.u * 0.04, L.u * 0.065, '#ffffff', '#0b2563');
  for (let i = 0; i < 6; i++) {
    const a = clock * 0.8 + i * 1.05, rr = r.w * (0.42 + 0.06 * Math.sin(clock * 3 + i));
    sparkle(ctx, r.x + r.w / 2 + Math.cos(a) * rr, r.y + r.h / 2 + Math.sin(a) * rr * 0.8, L.u * 0.025 * (0.6 + 0.4 * Math.sin(clock * 6 + i)), '#ffffff');
  }
  ctx.globalAlpha = 1;
}

function checkEnd(run: number): void {
  if (ended || run !== runId) return;
  if (won(S)) {
    ended = true;
    void wait(0.8).then(async () => {
      if (run !== runId) return;
      if (!save.wardrobe.includes(level)) { save.wardrobe.push(level); persist(); }
      // first the finished toy, big and turning a full circle (once the last knit is done); then the win popup
      while (leavingBalls.length) { await wait(0.1); if (run !== runId) return; }
      await wait(0.35);
      if (run !== runId) return;
      sfx.win();
      for (let k = 0; k < 80; k++) particles.push({ x: L.colX + Math.random() * L.colW, y: -20 - Math.random() * L.H * 0.3, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 200, life: 0, max: 2.6, color: YARN[k % 8].color, size: L.u * 0.016 });
      show = { t: 0 };
      void wait(SHOW).then(() => {
        if (run !== runId) return;
        popup = { kind: 'win', t: 0 };
        events.emit('win');
      });
    });
  } else if (stuck(S)) {
    ended = true;
    popup = { kind: 'stuck', t: 0 };
  }
}

function tryPull(i: number): void {
  if (!canPull(S, i)) {
    // say exactly one reason: something on top → chained to a stuck strand → locked peg
    scene.shake(i);
    sfx.nope();
    const p = partner(S, i), chained = p >= 0 && !S.gone[p];
    if (!free(S, i)) {
      for (const j of blockers(S, i)) scene.flash(j);
      showToast('Something lies on top of it!');
    } else if (lockedOn(S, i) || (chained && lockedOn(S, p) && free(S, p))) {
      scene.shakeLock();
      const k = S.strands.findIndex((t, j) => t.key && !S.gone[j]);
      if (k >= 0) scene.glow(k);
      showToast('Locked! Pull the strand with the key');
    } else if (chained) {
      scene.glow(i); scene.glow(p);
      scene.shakeChain(i);
      for (const j of blockers(S, p)) scene.flash(j);
      showToast('Chained! Free both strands first');
    }
    return;
  }
  history.push({ s: clone(S), revealed: revealed.slice() });
  if (history.length > 30) history.shift();
  play(pull(S, i));
  coachEvent('pull');
}

// ---------------------------------------------------------------- boosters

function boosterLocked(k: BoosterKey): number { return level + 1 < UNLOCK[k] ? UNLOCK[k] : 0; }

async function useBooster(k: BoosterKey, gift = false): Promise<void> {
  if ((ended && !gift) || busy || boosterLocked(k)) return;
  if (armed === k) { armed = null; return; }
  if (!gift && save.b[k] <= 0) {
    const ads = ADS();
    if (ads?.enabled) {
      paused = true;
      const ok = await ads.showRewarded().catch(() => false);
      paused = false;
      if (!ok) return;
      save.b[k] += 1;
    } else {
      save.b[k] += 2;
      showToast('Free refill: +2!');
    }
    persist();
    sfx.booster();
    return;
  }
  if (k === 'scissors') { armed = 'scissors'; freeSnip = gift; return; }
  if (k === 'undo') {
    const h = history.pop();
    if (!h) { showToast('Nothing to undo yet!'); return; }
    const cap = S.cap;
    S = h.s;
    S.cap = Math.max(S.cap, cap);
    revealed = h.revealed;
    const redo = knitLog.slice(0, S.knitted);
    knitLog = [];
    scene.resetToy();
    for (const c of redo) knitToy(c, true);
    balls = S.basket.map((c, i) => { const p = slotXY(i); return { c, x: p.x, y: p.y, x0: p.x, y0: p.y, t: 1, dur: 1, slot: i }; });
    leavingBalls = [];
    buildBoard();
  } else {
    if (S.cap >= MAX_CAP) { showToast('The basket is as big as it gets!'); return; }
    openSlot();
  }
  spend(k);
}
let freeSnip = false;

function spend(k: BoosterKey): void {
  save.b[k]--;
  persist();
  sfx.booster();
  try { (FalconSDK as unknown as { analytics?: { turn?: { useBooster?(k: string): void } } }).analytics?.turn?.useBooster?.(k); } catch { /* optional */ }
}

function snip(i: number): void {
  history.push({ s: clone(S), revealed: revealed.slice() });
  armed = null;
  if (!freeSnip) spend('scissors');
  freeSnip = false;
  ended = false;
  // the scissors fly from their button to the strand, snip twice, then the strand comes off
  const p = scene.toScreen(scene.midOf(i));
  const from = boosterAt(1);
  cutFx = { i, x: p.x, y: p.y, x0: from.x, y0: from.y, t: 0, clacks: 0, cut: false };
  busy++;
}
const CUT_FLY = 0.3, CUT_SNIP = 0.5, CUT_END = 0.25;
let cutFx: { i: number; x: number; y: number; x0: number; y0: number; t: number; clacks: number; cut: boolean } | null = null;
function updateCut(dt: number): void {
  const f = cutFx;
  if (!f) return;
  f.t += dt;
  const u = (f.t - CUT_FLY) / CUT_SNIP;
  // a clack each time the blades close (u = 0.2 and 0.6)
  const closes = u >= 0.6 ? 2 : u >= 0.2 ? 1 : 0;
  while (f.clacks < closes) { f.clacks++; sfx.clack(); haptic(12); burst(f.x, f.y, YARN[S.strands[f.i].c].color, 6, 0.5); }
  if (!f.cut && u >= 0.62) {
    f.cut = true;
    busy--;
    sfx.snip();
    burst(f.x, f.y, '#ffffff', 12, 0.9);
    floaters.push({ text: 'Snip!', x: f.x, y: f.y - L.u * 0.08, t: 0, color: '#fff36b', size: L.u * 0.05 });
    play(cut(S, f.i));
  }
  if (f.t > CUT_FLY + CUT_SNIP + CUT_END) cutFx = null;
}
/** Cartoon scissors (as on the booster): silver blades, pink ring handles. Blades point along `rot`. */
function drawScissors(x: number, y: number, s: number, open: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * open);
    // blade: from the pivot out along +x
    const g = ctx.createLinearGradient(0, -s * 0.12, 0, s * 0.12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#d9dde8');
    g.addColorStop(1, '#9aa1b5');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#5b6178';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, -side * s * 0.16);
    ctx.quadraticCurveTo(s * 0.55, -side * s * 0.2, s * 1.0, side * s * 0.0);
    ctx.lineTo(s * 0.92, side * s * 0.06);
    ctx.quadraticCurveTo(s * 0.45, side * s * 0.08, -s * 0.08, side * s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // handle: a pink ring behind the pivot
    ctx.strokeStyle = '#b8124f';
    ctx.lineWidth = s * 0.17;
    ctx.beginPath(); ctx.ellipse(-s * 0.5, -side * s * 0.16, s * 0.25, s * 0.19, -side * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff4f93';
    ctx.lineWidth = s * 0.12;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#ffc928';
  ctx.strokeStyle = '#a06a00';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawCut(): void {
  const f = cutFx;
  if (!f) return;
  const s = L.u * 0.11;
  const rot = Math.PI * 0.62;   // blades pointing down onto the strand, a little to the left
  if (f.t < CUT_FLY) {
    const k = f.t / CUT_FLY, e = 1 - (1 - k) * (1 - k);
    const x = f.x0 + (f.x - f.x0) * e, y = f.y0 + (f.y - s * 0.7 - f.y0) * e - Math.sin(Math.PI * k) * L.u * 0.15;
    drawScissors(x, y, s * (0.6 + 0.4 * e), 0.4, rot + (1 - e) * 2.5);
    return;
  }
  const u = Math.min(1, (f.t - CUT_FLY) / CUT_SNIP);
  // open → close (u 0.2) → open → close (0.6) and stay shut
  const open = u >= 0.6 ? 0.02 : 0.42 * (0.5 + 0.5 * Math.cos((u / 0.8) * Math.PI * 4));
  const end = Math.max(0, f.t - CUT_FLY - CUT_SNIP) / CUT_END;
  ctx.globalAlpha = 1 - end;
  drawScissors(f.x - Math.cos(rot) * s * 0.6, f.y - Math.sin(rot) * s * 0.6 - end * L.u * 0.08, s * (1 + end * 0.2), open + end * 0.3, rot);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- frozen slot

/** The iced-over basket hole: a chunky ice block with the pulls still needed, cracking as it melts. */
function drawFrozenSlot(): void {
  if (frozenHole < 0) return;
  const h = holeXY(frozenHole);
  const ice = S.frozen > 0;
  // little ice shards flying from each pulled strand to the block
  for (const sh of shards) {
    const e = 1 - (1 - sh.t) * (1 - sh.t);
    const x = sh.x0 + (h.x - sh.x0) * e, y = sh.y0 + (h.y - sh.y0) * e - Math.sin(Math.PI * sh.t) * L.u * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sh.t * 8);
    ctx.fillStyle = '#e8f8ff'; ctx.strokeStyle = '#5fb6e8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -h.r * 0.28); ctx.lineTo(h.r * 0.2, 0); ctx.lineTo(0, h.r * 0.28); ctx.lineTo(-h.r * 0.2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (!ice && iceBreak < 0) return;
  const k = iceBreak >= 0 ? iceBreak / 0.6 : 0;
  const sc = (1 + iceBump * 0.12) * (1 + k * 0.3);
  const w = h.r * 2.1 * sc, hh = h.r * 1.9 * sc;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.translate(h.x, h.y - h.r * 0.05);
  const g = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
  g.addColorStop(0, 'rgba(235,250,255,0.95)');
  g.addColorStop(1, 'rgba(130,205,245,0.92)');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#3f9ad6';
  ctx.lineWidth = Math.max(2, h.r * 0.1);
  roundRect(ctx, -w / 2, -hh / 2, w, hh, h.r * 0.45);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  roundRect(ctx, -w * 0.38, -hh * 0.42, w * 0.32, hh * 0.14, hh * 0.07);
  ctx.fill();
  // cracks: one more for every quarter melted
  const melted = frozenN0 > 0 ? 1 - S.frozen / frozenN0 : 1;
  ctx.strokeStyle = 'rgba(40,120,190,0.7)';
  ctx.lineWidth = Math.max(1, h.r * 0.05);
  const cracks = [[-0.45, -0.1, -0.1, 0.05, -0.2, 0.4], [0.45, -0.3, 0.1, -0.05, 0.25, 0.35], [-0.2, -0.45, -0.05, -0.15, 0.2, -0.3], [0.1, 0.45, -0.05, 0.2, -0.35, 0.3]];
  for (let c = 0; c < Math.min(4, Math.floor(melted * 4 + (iceBreak >= 0 ? 4 : 0))); c++) {
    const q = cracks[c];
    ctx.beginPath(); ctx.moveTo(q[0] * w, q[1] * hh); ctx.lineTo(q[2] * w, q[3] * hh); ctx.lineTo(q[4] * w, q[5] * hh); ctx.stroke();
  }
  if (ice) {
    const warn = S.basket.length >= room(S) - 1 && !ended;
    outlinedText(ctx, String(S.frozen), 0, hh * 0.04, h.r * (0.95 + iceBump * 0.3), warn && Math.sin(clock * 10) > 0 ? '#ffd0d0' : '#ffffff', '#1f6fb0');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- drill (+Slot)

const DRILL = 1.0;
let drillFx: { hole: number; t: number; popped: boolean } | null = null;
/** Open one more hole in the tray with a drill (rules first; the view catches up). */
function openSlot(): void {
  addSlot(S);
  for (const h of history) h.s.cap = S.cap;
  drillFx = { hole: S.cap - 1, t: 0, popped: false };
  sfx.drill();
}
function updateDrill(dt: number): void {
  const d = drillFx;
  if (!d) return;
  d.t += dt;
  const h = holeXY(d.hole);
  if (d.t > 0.22 && d.t < 0.72) {
    // wood chips fly out of the hole while it bores
    for (let k = 0; k < 2; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = L.u * (0.3 + Math.random() * 0.5);
      particles.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + Math.random() * 0.3, color: Math.random() < 0.5 ? '#c98a4b' : '#f2c48a', size: L.u * (0.006 + Math.random() * 0.008) });
    }
  }
  if (!d.popped && d.t >= 0.62) {
    d.popped = true;
    haptic(25);
    burst(h.x, h.y, '#ffffff', 10, 0.8);
    floaters.push({ text: '+1 Slot!', x: h.x, y: h.y - L.basket.h * 0.7, t: 0, color: '#9ff07a', size: L.u * 0.045 });
  }
  if (d.t >= DRILL) drillFx = null;
}
/** Is hole `k` still shown locked? (The drill's hole until the lock pops.) */
const holeLocked = (k: number): boolean => k >= S.cap || (!!drillFx && drillFx.hole === k && !drillFx.popped);
function drawDrill(): void {
  const d = drillFx;
  if (!d) return;
  const h = holeXY(d.hole);
  const s = h.r * 2.1;
  // drop in (0–0.22), bore with a wobble (0.22–0.72), lift away (0.72–1)
  const drop = d.t < 0.22 ? 1 - d.t / 0.22 : 0;
  const lift = d.t > 0.72 ? (d.t - 0.72) / (DRILL - 0.72) : 0;
  const boring = d.t > 0.22 && d.t < 0.72;
  const wob = boring ? Math.sin(d.t * 90) * h.r * 0.05 : 0;
  const tipY = h.y - drop * L.u * 0.25 - lift * L.u * 0.2 + (boring ? Math.min(1, (d.t - 0.22) / 0.4) * h.r * 0.25 : 0);
  ctx.save();
  ctx.globalAlpha = 1 - lift;
  ctx.translate(h.x + wob, tipY);
  // bit: a silver twist, stripes running down while it spins
  const bitH = s * 0.9, bitW = s * 0.2;
  ctx.fillStyle = '#c9ced9';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-bitW / 2, -bitH * 0.18); ctx.lineTo(-bitW / 2, -bitH); ctx.lineTo(bitW / 2, -bitH); ctx.lineTo(bitW / 2, -bitH * 0.18); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#7d8498';
  ctx.lineWidth = bitW * 0.28;
  const off = ((d.t * (boring ? 6 : 1.5)) % 1) * bitW * 0.9;
  for (let y = -bitH - bitW; y < bitW; y += bitW * 0.9) { ctx.beginPath(); ctx.moveTo(-bitW, y + off); ctx.lineTo(bitW, y + off - bitW * 0.6); ctx.stroke(); }
  ctx.restore();
  // chuck
  ctx.fillStyle = '#4b5068';
  roundRect(ctx, -s * 0.2, -bitH - s * 0.28, s * 0.4, s * 0.3, s * 0.06);
  ctx.fill();
  // body: chunky orange drill with a grip and a yellow trigger
  const g = ctx.createLinearGradient(-s * 0.45, 0, s * 0.45, 0);
  g.addColorStop(0, '#ffb24a');
  g.addColorStop(1, '#e8701a');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#8a3a06';
  ctx.lineWidth = s * 0.05;
  roundRect(ctx, -s * 0.42, -bitH - s * 0.95, s * 0.84, s * 0.7, s * 0.2);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, s * 0.12, -bitH - s * 1.55, s * 0.32, s * 0.7, s * 0.12);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd34a';
  roundRect(ctx, -s * 0.12, -bitH - s * 0.82, s * 0.24, s * 0.16, s * 0.06);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  roundRect(ctx, -s * 0.34, -bitH - s * 0.9, s * 0.5, s * 0.12, s * 0.06);
  ctx.fill();
  ctx.restore();
  if (boring) {
    // a dusty ring round the hole
    ctx.strokeStyle = `rgba(240,200,140,${0.5 + 0.3 * Math.sin(d.t * 40)})`;
    ctx.lineWidth = h.r * 0.12;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.08, h.r * 0.95, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---------------------------------------------------------------- tutorial

interface CoachStep { text: string; at?: () => { x: number; y: number } | null; allow?: (what: string) => boolean; until: 'tap' | 'pull'; t?: number }
let coach: { steps: CoachStep[]; i: number; t: number } | null = null;

function setupTutorial(): void {
  introQueue = [];
  const steps: CoachStep[] = [];
  if (level === 0 && !save.seen.t1) {
    const top = S.strands.reduce((b, s, i) => (s.layer > S.strands[b].layer ? i : b), 0);
    steps.push(
      { text: 'Tap the yarn on top to pull it off!', at: () => scene.toScreen(scene.midOf(top)), allow: (w) => w === `s${top}`, until: 'pull' },
      { text: 'Pulled yarn rolls into the basket. Three of one color — the cat knits them!', at: () => ({ x: L.basket.x + L.basket.w / 2, y: L.basket.y + L.basket.h * 0.6 }), until: 'tap', t: 6 },
      { text: 'Yarn underneath is stuck until nothing lies on it. Don’t let the basket fill up!', until: 'tap', t: 6 },
    );
    save.seen.t1 = true;
  }
  for (const k of BOOSTERS) {
    if (level + 1 === UNLOCK[k] && !save.seen[`b_${k}`]) {
      save.seen[`b_${k}`] = true;
      save.b[k] = Math.max(save.b[k], 2);
      introQueue.push(() => { popup = { kind: 'intro', t: 0, booster: k }; });
    }
  }
  for (const b of ['hidden', 'frozen', 'lock'] as const) {
    if (level + 1 === BLOCKER_AT[b] && !save.seen[`k_${b}`]) {
      save.seen[`k_${b}`] = true;
      introQueue.push(() => { popup = { kind: 'intro', t: 0, blocker: b }; });
      // after the card, a hand points at the real thing on the board
      const show = blockerCoach(b);
      if (show.length) introQueue.push(() => { coach = { steps: show, i: 0, t: 0 }; });
    }
  }
  persist();
  coach = steps.length ? { steps, i: 0, t: 0 } : null;
  if (!coach && banner.t <= 0) runQueue();
}
function blockerCoach(b: keyof typeof INTRO): CoachStep[] {
  const first = (f: (i: number) => boolean) => S.strands.findIndex((_, i) => !S.gone[i] && f(i));
  if (b === 'hidden') {
    const i = first((k) => !revealed[k]);
    return i < 0 ? [] : [{ text: 'This grey yarn is a mystery. Free it to see its color!', at: () => scene.toScreen(scene.midOf(i)), until: 'tap', t: 4 }];
  }
  if (b === 'frozen') return [{ text: `This slot is frozen. Pull ${S.frozen} strands to melt it!`, at: () => { const h = holeXY(frozenHole); return { x: h.x, y: h.y }; }, until: 'tap', t: 5 }];
  const k = first((j) => !!S.strands[j].key);
  return [
    { text: 'This peg is locked — its strands can\u2019t move.', at: () => { const q = scene.lockPoint(); return q ? scene.toScreen(q) : null; }, until: 'tap', t: 4 },
    ...(k >= 0 ? [{ text: 'Free the strand with the key to unlock it!', at: () => scene.toScreen(scene.midOf(k)), until: 'tap' as const, t: 4 }] : []),
  ];
}
function runQueue(): void { const f = introQueue.shift(); if (f) f(); }
function coachEvent(what: 'pull' | 'tap'): void {
  if (!coach || coach.steps[coach.i].until !== what) return;
  coach.i++;
  coach.t = 0;
  if (coach.i >= coach.steps.length) { coach = null; runQueue(); }
}
const coachAllows = (what: string): boolean => { const st = coach?.steps[coach.i]; return !st?.allow || st.allow(what); };

// ---------------------------------------------------------------- input

function onTap(x: number, y: number): void {
  unlockAudio();
  if (paused) return;
  if (popup) { void popupTap(x, y); return; }
  if (banner.t > 0.3) { banner.t = 0.3; return; }
  if (coach && coach.steps[coach.i].until === 'tap') { coachEvent('tap'); return; }
  if (Math.hypot(x - L.gear.x, y - L.gear.y) < L.gear.r * 1.5) { popup = { kind: 'settings', t: 0 }; sfx.tap(); return; }
  for (let k = 0; k < BOOSTERS.length; k++) {
    const bp = boosterAt(k);
    if (Math.hypot(x - bp.x, y - bp.y) < L.boostR * 1.25) {
      const key = BOOSTERS[k];
      press.set(key, 1);
      if (boosterLocked(key)) showToast(`Unlocks at level ${UNLOCK[key]}`);
      else if (!coach) void useBooster(key);
      return;
    }
  }
  if (ended && !(armed === 'scissors' && freeSnip)) return;
  const i = scene.pick(x, y);
  if (i < 0) { if (armed) armed = null; return; }
  if (armed === 'scissors') { snip(i); return; }
  if (!coachAllows(`s${i}`)) return;
  tryPull(i);
}

async function popupTap(x: number, y: number): Promise<void> {
  const p = popup!;
  if (p.t < 0.25) return;
  const hit = popupButtons.find((b) => inside(b.r, x, y));
  if (!hit) return;
  press.set(hit.id, 1);
  sfx.tap();
  const run = runId;
  await wait(0.12);
  if (run !== runId || popup !== p) return;
  const ads = ADS();
  switch (hit.id) {
    case 'next':
      popup = null;
      if (ads?.enabled) { paused = true; await ads.maybeShowInterstitial(level + 1).catch(() => false); paused = false; }
      startLevel((level + 1) % LEVEL_COUNT);
      break;
    case 'retry':
    case 'restart':
      popup = null;
      events.emit('lose', { canRevive: false });
      startLevel(level);
      break;
    case 'slot': {
      if (ads?.enabled) {
        paused = true;
        const ok = await ads.showRewarded().catch(() => false);
        paused = false;
        if (!ok || popup !== p) return;
      }
      popup = null;
      openSlot();
      ended = false;
      break;
    }
    case 'snip':
      popup = null;
      ended = false;
      armed = 'scissors';
      freeSnip = true;
      break;
    case 'close':
      popup = null;
      runQueue();
      break;
    case 'sound': case 'music': case 'haptic':
      audio.set(hit.id, !audio.get(hit.id));
      break;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  onTap(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && popupButtons[0]) { const b = popupButtons[0].r; onTap(b.x + b.w / 2, b.y + b.h / 2); }
});

// ---------------------------------------------------------------- update

function update(dt: number): void {
  clock += dt;
  updateCut(dt);
  updateDrill(dt);
  if (show) { show.t += dt; if (show.t >= SHOW) show = null; }
  iceBump = Math.max(0, iceBump - dt * 4);
  if (iceBreak >= 0) { iceBreak += dt; if (iceBreak > 0.6) iceBreak = -1; }
  for (const sh of shards) sh.t += dt / 0.38;
  shards = shards.filter((sh) => sh.t < 1);
  for (let k = timers.length - 1; k >= 0; k--) if (timers[k].t <= clock) timers.splice(k, 1)[0].res();
  for (const b of balls) {
    const s = slotXY(b.slot);
    if (b.t < 1) {
      b.t = Math.min(1, b.t + dt / b.dur);
      const e = ease(Math.max(0, b.t));
      b.x = b.x0 + (s.x - b.x0) * e;
      b.y = b.y0 + (s.y - b.y0) * e - Math.sin(Math.PI * Math.max(0, b.t)) * L.u * 0.12;
    } else {
      b.x += (s.x - b.x) * Math.min(1, dt * 10);
      b.y += (s.y - b.y) * Math.min(1, dt * 10);
    }
  }
  for (const b of leavingBalls) {
    const lv = b.leaving!;
    if (lv.t < 0) {
      // still landing in the basket
      lv.t += dt;
      if (b.t < 1) {
        b.t = Math.min(1, b.t + dt / b.dur);
        const s = slotXY(b.slot);
        const e = ease(Math.max(0, b.t));
        b.x = b.x0 + (s.x - b.x0) * e;
        b.y = b.y0 + (s.y - b.y0) * e - Math.sin(Math.PI * Math.max(0, b.t)) * L.u * 0.12;
      }
      if (lv.t >= 0) { lv.t = 0; lv.x0 = b.x; lv.y0 = b.y; }
      continue;
    }
    if (lv.m < 1) {
      // match 3: the outer two fly into the middle one, which swells
      if (lv.m === 0) { lv.x0 = b.x; lv.y0 = b.y; }
      if (!lv.mx) {
        const g = lv.group;
        const mid = g[1] ?? g[0];
        for (const o of g) { o.leaving!.mx = mid.x; o.leaving!.my = mid.y - L.basket.h * 0.25; }
      }
      lv.m = Math.min(1, lv.m + dt / MERGE);
      const e = lv.m * lv.m;
      b.x = lv.x0 + (lv.mx - lv.x0) * e;
      b.y = lv.y0 + (lv.my - lv.y0) * e - Math.sin(Math.PI * lv.m) * L.basket.h * 0.25;
      if (lv.m >= 1) { lv.x0 = b.x; lv.y0 = b.y; }
      continue;
    }
    // unwinding: the merged ball spins and shrinks while its thread runs up to the toy
    lv.u = Math.min(1, lv.u + dt / UNWIND);
    b.x = lv.x0;
    b.y = lv.y0 - Math.sin(Math.min(1, lv.u * 3) * Math.PI * 0.5) * L.basket.h * 0.25;
  }
  const arrived = leavingBalls.filter((b) => b.leaving!.u >= 1);
  if (arrived.length) {
    const t = scene.toyCenter();
    burst(t.x, t.y, YARN[arrived[0].c].color, 12, 1);
    leavingBalls = leavingBalls.filter((b) => b.leaving!.u < 1);
  }
  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(k, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  }
  for (let k = floaters.length - 1; k >= 0; k--) { floaters[k].t += dt; if (floaters[k].t > 1.2) floaters.splice(k, 1); }
  for (const [k, v] of press) { if (v <= 0) press.delete(k); else press.set(k, v - dt * 6); }
  if (hint.t > 0) hint.t -= dt;
  if (toastMsg.t > 0) toastMsg.t -= dt;
  if (banner.t > 0) { banner.t -= dt; if (banner.t <= 0 && !coach) runQueue(); }
  if (popup) popup.t += dt;
  if (coach) {
    coach.t += dt;
    const st = coach.steps[coach.i];
    if (st.t && coach.t > st.t) coachEvent('tap');
  }
  scene.update(dt);
  // gently show the strands that can come off when the basket is getting full
  const glowFree = armed === 'scissors' ? 0 : S.basket.length >= room(S) - 1 ? 0.12 + 0.08 * Math.sin(clock * 6) : 0;
  S.strands.forEach((_, i) => { if (!S.gone[i]) scene.setHighlight(i, (hint.t > 0 && hint.strand === i ? 0.5 + 0.3 * Math.sin(clock * 8) : 0) + (glowFree && canPull(S, i) ? glowFree : 0)); });
}

// ---------------------------------------------------------------- draw (2D)

function yarnBall(c: number, x: number, y: number, r: number): void {
  if (r <= 0.5) return;
  // the same wound rope ball as on the board, rendered in 3D
  const img = scene.ballSprite(YARN[c].color, r > 40 ? 256 : 128);
  const s = r * 2.25;
  ctx.fillStyle = 'rgba(60,30,10,0.22)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.08, y + r * 0.82, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
}

/** The yarn running from an unwinding ball up to where the toy is being stitched. */
function thread(b: Ball, t: number): void {
  const to = b.part !== undefined && b.part >= 0 ? scene.stitchPoint(b.part) ?? scene.toyCenter() : scene.toyCenter();
  const col = YARN[b.c].color;
  const mx = (b.x + to.x) / 2 + Math.sin(clock * 9 + b.slot) * L.u * 0.03;
  const my = Math.min(b.y, to.y) + (Math.max(b.y, to.y) - Math.min(b.y, to.y)) * 0.35;
  const w = slotXY(0).r * 0.22 * (t < 0.9 ? 1 : (1 - t) * 10);
  if (w <= 0.2) return;
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(col, -0.35);
  ctx.lineWidth = w + 2;
  ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(mx, my, to.x, to.y); ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.setLineDash([w * 0.9, w * 0.9]);
  ctx.lineDashOffset = -clock * 60;
  ctx.strokeStyle = shade(col, 0.4);
  ctx.lineWidth = w * 0.4;
  ctx.stroke();
  ctx.setLineDash([]);
}

function dot(x: number, y: number, r: number, n: number): void {
  ctx.fillStyle = '#1d3f8f';
  ctx.beginPath(); ctx.arc(x, y + r * 0.08, r * 1.08, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#5fb0ff');
  g.addColorStop(1, '#1f6fe0');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.45, r * 0.6, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  outlinedText(ctx, String(n), x, y + r * 0.04, r * 1.05, '#ffffff', '#123a8a');
}

function drawHud(): void {
  if (gearImg.ok) { const gs = L.gear.r * 2.27; ctx.drawImage(gearImg.c, L.gear.x - gs * 0.49, L.gear.y - gs * 0.49, gs, gs); } else gearButton(ctx, L.gear.x, L.gear.y, L.gear.r);
  // level progress: [N] ====%==== [N+1]   [N+2], with the next toys in grey above
  const b = L.bar;
  const k = S.knitted / Math.max(1, totalTriples());
  ctx.fillStyle = '#1d3f8f';
  roundRect(ctx, b.x, b.y - 2, b.w, b.h + 4, (b.h + 4) / 2);
  ctx.fill();
  ctx.fillStyle = '#2c3550';
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
  ctx.fill();
  if (k > 0) {
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    g.addColorStop(0, '#6cb8ff');
    g.addColorStop(1, '#2d7ff0');
    ctx.fillStyle = g;
    roundRect(ctx, b.x, b.y, Math.max(b.h, b.w * k), b.h, b.h / 2);
    ctx.fill();
  }
  outlinedText(ctx, `${Math.round(k * 100)}%`, b.x + b.w * 0.55, b.y + b.h / 2, b.h * 0.72, '#ffffff', '#1d2540');
  L.dots.forEach((d, i) => dot(d.x, L.hudY, d.r, level + 1 + i));
  const px = Math.round(L.colW * 0.15 * Math.min(2, window.devicePixelRatio || 1));
  for (let i = 1; i <= 2; i++) {
    const t = scene.thumb(toyOf(level + i), px);
    const sz = L.colW * 0.13;
    ctx.drawImage(t, L.dots[i].x - sz / 2, L.hudY - L.dots[i].r - sz * 0.92, sz, sz);
  }
  const d = diffOf(level);
  if (d === 'hard' || d === 'super') {
    // a glossy red (purple: super) pill under the bar, as in the reference
    const tw = b.w * 0.62, th = b.h * 0.85, tx = b.x + b.w / 2 - tw / 2, ty = b.y + b.h + b.h * 0.25;
    ctx.fillStyle = d === 'super' ? '#4a137f' : '#9c0f2b';
    roundRect(ctx, tx, ty + th * 0.08, tw, th, th / 2);
    ctx.fill();
    const hg = ctx.createLinearGradient(0, ty, 0, ty + th);
    hg.addColorStop(0, d === 'super' ? '#b06bff' : '#ff5a72');
    hg.addColorStop(1, d === 'super' ? '#7a1fd6' : '#e0173f');
    ctx.fillStyle = hg;
    roundRect(ctx, tx, ty, tw, th, th / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, tx + th * 0.3, ty + th * 0.1, tw - th * 0.6, th * 0.3, th * 0.15);
    ctx.fill();
    outlinedText(ctx, d === 'super' ? 'SUPER HARD' : 'HARD', b.x + b.w / 2, ty + th * 0.52, th * 0.62, '#ffffff', '#5a0a1c');
  }
  // the basket: the wooden tray from the reference picture, six carved holes
  const bk = L.basket;
  const full = S.basket.length >= room(S) - 1;
  if (full && !ended) {
    ctx.save();
    ctx.shadowColor = `rgba(255,60,60,${0.55 + 0.3 * Math.sin(clock * 8)})`;
    ctx.shadowBlur = bk.h * 0.35;
    ctx.fillStyle = 'rgba(255,80,80,0.5)';
    roundRect(ctx, bk.x + bk.w * 0.01, bk.y + bk.h * 0.04, bk.w * 0.98, bk.h * 0.9, bk.h * 0.25);
    ctx.fill();
    ctx.restore();
  }
  if (trayImg.ok) ctx.drawImage(trayImg.c, bk.x, bk.y, bk.w, bk.h);
  for (let k2 = 0; k2 < HOLES; k2++) {
    if (!holeLocked(k2)) continue;
    // not open yet: a dimmed hole with a little lock (+Slot opens it)
    const s2 = holeXY(k2);
    ctx.fillStyle = 'rgba(60,30,10,0.35)';
    ctx.beginPath(); ctx.ellipse(s2.x, s2.y, s2.r * 1.05, s2.r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    const lr = s2.r * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, s2.x - lr * 0.75, s2.y - lr * 0.25, lr * 1.5, lr * 1.15, lr * 0.25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = lr * 0.28;
    ctx.beginPath(); ctx.arc(s2.x, s2.y - lr * 0.25, lr * 0.45, Math.PI, 0); ctx.stroke();
  }
  drawFrozenSlot();
  for (const ball of balls) if (ball.t >= 0) yarnBall(ball.c, ball.x, ball.y, slotXY(0).r * 0.92 * (ball.t < 1 ? 0.7 + 0.3 * ball.t : 1));
  for (const ball of leavingBalls) {
    if (ball.t < 0) continue;   // still reeling in on the board
    const lv = ball.leaving!;
    const R0 = slotXY(0).r * 0.92;
    if (lv.m < 1) {
      const grow = lv.lead ? 1 + lv.m * 0.3 : 1 - lv.m * 0.45;
      yarnBall(ball.c, ball.x, ball.y, R0 * grow);
      continue;
    }
    if (!lv.lead) continue;
    if (lv.u > 0) thread(ball, lv.u);
    const pop = 1.3 + Math.sin(Math.min(1, lv.u * 6) * Math.PI) * 0.15;
    yarnBall(ball.c, ball.x, ball.y, R0 * pop * (1 - lv.u * 0.8));
  }
}

/** The booster art is the reference cut-out (button + its label, `src/assets/b_*.png`); the count badge
 *  is painted over the one in the picture. Locked = a grey-purple copy, white lock and a "Lv.N" badge. */
const B_IMG = {} as Record<BoosterKey, { on: HTMLCanvasElement | HTMLImageElement; off: HTMLCanvasElement | null; ok: boolean }>;
for (const [k, jpg, mask] of [['undo', undoJpg, undoA], ['scissors', scissorsJpg, scissorsA], ['slot', slotJpg, slotA]] as [BoosterKey, string, string][]) {
  const e = B_IMG[k] = { on: document.createElement('canvas') as HTMLCanvasElement | HTMLImageElement, off: null as HTMLCanvasElement | null, ok: false as boolean };
  e.on = maskedImage(jpg, mask, (img) => {
    // locked look: a grey-purple copy
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2];
      d.data[i] = l * 0.62 + 52; d.data[i + 1] = l * 0.58 + 46; d.data[i + 2] = l * 0.6 + 82;
    }
    g.putImageData(d, 0, 0);
    e.off = c;
    e.ok = true;
  }).c;
}
const B_R = 0.498, B_CY = 0.462, B_BX = 0.327, B_BY = -0.338, B_BR = 0.152;   // measured on the cut-outs (× image width)

function boosterArt(k: BoosterKey, x: number, y: number, r: number, count: number, lockedAt: number, press: number, pulse: number, armed: boolean): void {
  const e = B_IMG[k];
  if (!e?.ok) return;
  const s = (1 - 0.08 * press) * (1 + 0.05 * pulse);
  const w = (r / B_R) * s, img = lockedAt && e.off ? e.off : e.on;
  const h = (w * img.height) / img.width;
  ctx.save();
  if (armed) { ctx.fillStyle = 'rgba(255,240,120,0.6)'; ctx.beginPath(); ctx.arc(x, y, r * 1.25 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(15,15,60,0.22)';
  ctx.beginPath(); ctx.ellipse(w * 0.02, w * 0.06, w * 0.5, w * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(img, -w / 2, -h * B_CY, w, h);
  const bx = w * B_BX, by = w * B_BY, br = w * B_BR;
  if (lockedAt) {
    // dim the icon, white lock in the middle, level badge where the count was
    ctx.fillStyle = 'rgba(92,86,140,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, w * 0.4, 0, Math.PI * 2); ctx.fill();
    const q = w * 0.5;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, -q * 0.3, -q * 0.22, q * 0.6, q * 0.46, q * 0.1);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = q * 0.12;
    ctx.beginPath(); ctx.arc(0, -q * 0.24, q * 0.2, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#8f89b6';
    ctx.beginPath(); ctx.arc(0, -q * 0.02, q * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4e4a7e';
    roundRect(ctx, bx - br * 1.45, by - br * 0.8, br * 2.9, br * 1.6, br * 0.8);
    ctx.fill();
    ctx.fillStyle = '#a7a2cc';
    roundRect(ctx, bx - br * 1.32, by - br * 0.68, br * 2.64, br * 1.3, br * 0.65);
    ctx.fill();
    outlinedText(ctx, `Lv.${lockedAt}`, bx, by, br * 1.0, '#ffffff', '#4e4a7e');
  } else {
    // repaint the badge: red with the count, or green "+" when empty
    const red = count > 0;
    ctx.fillStyle = red ? '#ffb3bd' : '#c4f7b0';
    ctx.beginPath(); ctx.arc(bx, by, br * 1.08, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
    g.addColorStop(0, red ? '#ff5a6e' : '#6fe85a');
    g.addColorStop(1, red ? '#d9103a' : '#19a72a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, br * 0.94, 0, Math.PI * 2); ctx.fill();
    outlinedText(ctx, red ? String(count) : '+', bx, by + br * 0.04, br * 1.35, '#ffffff', red ? '#8a0a1f' : '#0a4115');
  }
  ctx.restore();
}

function drawBoosters(): void {
  // no toolbar panel: just the three buttons on the background
  BOOSTERS.forEach((k, i) => {
    const p = boosterAt(i);
    const pulse = !boosterLocked(k) && k === 'slot' && S.basket.length >= room(S) - 1 && S.cap < MAX_CAP && !ended ? Math.sin(clock * 8) : 0;
    boosterArt(k, p.x, p.y, L.boostR, save.b[k], boosterLocked(k), press.get(k) ?? 0, pulse, armed === k);
  });
}

function drawParticles(): void {
  for (const p of particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    sparkle(ctx, p.x, p.y, p.size * (0.6 + a), p.color);
  }
  ctx.globalAlpha = 1;
  for (const f of floaters) {
    const k = f.t / 1.2;
    const s = f.size * (k < 0.15 ? 0.5 + (k / 0.15) * 0.6 : 1.1 - Math.min(0.1, k - 0.15));
    ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    outlinedText(ctx, f.text, f.x, f.y - k * L.u * 0.08, s, f.color, '#6e1037');
  }
  ctx.globalAlpha = 1;
}

function popupRect(h: number): Rect {
  const w = Math.min(L.colW * 0.86, L.u * 0.9);
  return { x: L.colX + (L.colW - w) / 2, y: L.H * 0.5 - (w * h) / 2, w, h: w * h };
}
function addButton(id: string, r: Rect, label: string, tone: Parameters<typeof button>[3], sub?: string, ad = false): void {
  button(ctx, r, label, tone, sub, press.get(id) ?? 0);
  if (ad) adBadge(ctx, r.x + r.w - r.h * 0.2, r.y + r.h * 0.12, r.h * 0.22);
  popupButtons.push({ id, r });
}

// ---------------------------------------------------------------- popup picture helpers

interface Pic { name: string; x: number; y: number; w: number; h: number; f: number; k: number; ox: number; oy: number }
/** Place popup picture `name` centred in the column, `wk` of the column wide. Null until it has loaded. */
function popupPic(name: string, wk: number): Pic | null {
  const c = POP[name];
  if (!c) return null;
  const w = Math.min(L.colW * wk, L.u * 0.98, (L.H * 0.8 * c.width) / c.height);
  const h = (w * c.height) / c.width;
  const cut = CUT[PIC_CUT[name]], f = w / c.width;
  // k: screen px per px of the original reference picture
  return { name, x: L.colX + (L.colW - w) / 2, y: L.H * 0.5 - h / 2, w, h, f, k: f * cut.s, ox: cut.ox, oy: cut.oy };
}
function drawPic(P: Pic): void { ctx.drawImage(POP[P.name], P.x, P.y, P.w, P.h); }
const boxAt = (P: Pic, [x0, y0, x1, y1]: Box): Rect => ({ x: P.x + (x0 - P.ox) * P.k, y: P.y + (y0 - P.oy) * P.k, w: (x1 - x0) * P.k, h: (y1 - y0) * P.k });
const atY = (P: Pic, y: number): number => P.y + (y - P.oy) * P.k;
/** A tap area over a button in the picture; pressed = a quick dark flash on it. */
function hotspot(id: string, r: Rect, round = false): void {
  const k = press.get(id) ?? 0;
  if (k > 0) {
    ctx.fillStyle = `rgba(0,20,60,${0.18 * k})`;
    if (round) { ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, Math.PI * 2); } else roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fill();
  }
  popupButtons.push({ id, r });
}
/** Text shrunk to fit `maxW`. */
function fitText(text: string, x: number, y: number, size: number, maxW: number, fill: string, stroke: string): void {
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  outlinedText(ctx, text, x, y, w > maxW ? (size * maxW) / w : size, fill, stroke);
}
/** The settings switch, as in the reference: grey OFF / green ON pill, white knob. */
function toggle(r0: Rect, on: boolean): void {
  const r = { x: r0.x - 2, y: r0.y - 2, w: r0.w + 4, h: r0.h + 4 };
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, on ? '#5fe35a' : '#8c90a6');
  g.addColorStop(1, on ? '#2ea82e' : '#a3a7bb');
  ctx.fillStyle = on ? '#1f7a24' : '#6d7189';
  roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fill();
  ctx.fillStyle = g;
  roundRect(ctx, r.x + r.h * 0.05, r.y + r.h * 0.05, r.w - r.h * 0.1, r.h * 0.9, r.h * 0.45);
  ctx.fill();
  const kx = on ? r.x + r.w - r.h * 0.5 : r.x + r.h * 0.5, ky = r.y + r.h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.arc(kx + r.h * 0.03, ky + r.h * 0.06, r.h * 0.42, 0, Math.PI * 2); ctx.fill();
  const kg = ctx.createRadialGradient(kx - r.h * 0.12, ky - r.h * 0.15, r.h * 0.05, kx, ky, r.h * 0.42);
  kg.addColorStop(0, '#ffffff');
  kg.addColorStop(1, '#e4e7f0');
  ctx.fillStyle = kg;
  ctx.beginPath(); ctx.arc(kx, ky, r.h * 0.42, 0, Math.PI * 2); ctx.fill();
  outlinedText(ctx, on ? 'ON' : 'OFF', on ? r.x + r.w * 0.36 : r.x + r.w * 0.66, ky, r.h * 0.38, '#ffffff', on ? '#0a4115' : '#4a4e62');
}

function drawPopup(): void {
  popupButtons = [];
  if (!popup) return;
  const p = popup;
  const k = Math.min(1, p.t / 0.25);
  ctx.fillStyle = `rgba(20,30,70,${(p.kind === 'win' ? 0.3 : 0.55) * k})`;
  ctx.fillRect(0, p.kind === 'win' ? L.basket.y - 4 : 0, L.W, L.H);
  const s = Math.max(0.01, 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2);
  ctx.save();
  ctx.translate(L.colX + L.colW / 2, L.H / 2);
  ctx.scale(s, s);
  ctx.translate(-(L.colX + L.colW / 2), -L.H / 2);
  const ads = !!ADS()?.enabled;
  const cx = L.colX + L.colW / 2;
  if (p.kind === 'win') {
    const P = popupPic('win', 0.88);
    if (P) {
      P.y = Math.max(P.y, L.basket.y - P.h * 0.04);
      drawPic(P);
      const item = TOY_INFO[toyOf(level)].name;
      fitText(`${item} knitted!`, cx, atY(P, 727), 85 * P.k, 676 * P.k, '#ffd83a', '#0b2563');
      fitText(`Toy box ${save.wardrobe.length}/${LEVEL_COUNT}`, cx, atY(P, 822), 57 * P.k, 642 * P.k, '#ffffff', '#0b2563');
      hotspot('next', boxAt(P, WIN_NEXT));
    }
  } else if (p.kind === 'full' || p.kind === 'stuck') {
    const fullB = p.kind === 'full';
    const can = S.cap < MAX_CAP;
    const P = popupPic(!fullB ? 'stuck' : !can ? 'fullNoSlot' : ads ? 'fullAd' : 'full', 0.9);
    if (P) {
      drawPic(P);
      // the basket as it is
      const n = Math.max(1, S.basket.length), gap = Math.min(165, 930 / n) * P.k;
      S.basket.forEach((c, i) => yarnBall(c, cx + (i - (n - 1) / 2) * gap, atY(P, 445), Math.min(76, (gap / P.k) * 0.46) * P.k));
      if (!fullB) {
        outlinedText(ctx, 'All Tangled Up!', cx, atY(P, 182), 86 * P.k, '#ffffff', '#0b2563');
        fitText('Nothing can come off right now!', cx, atY(P, 625), 59 * P.k, 828 * P.k, '#ffffff', '#0b2563');
        const r = boxAt(P, FULL_SLOT_IN);
        const ic = B_IMG.scissors;
        // the scissors button art without its label (top 80% of the picture)
        if (ic?.ok) { const sw = ic.on.width, sh = ic.on.height * 0.8, w = r.h * 1.1; ctx.drawImage(ic.on, 0, 0, sw, sh, r.x + r.w - w * 1.0, r.y - r.h * 0.08, w, (w * sh) / sw); }
        outlinedText(ctx, 'Free Snip', r.x + r.w * 0.4, r.y + r.h * 0.38, 69 * P.k, '#ffffff', '#0a4115');
        outlinedText(ctx, 'Cut one strand', r.x + r.w * 0.4, r.y + r.h * 0.78, 38 * P.k, '#fff36b', '#0a4115');
        hotspot('snip', boxAt(P, FULL_SLOT));
      } else if (can) {
        if (ads) {
          const r = boxAt(P, FULL_FREE);
          outlinedText(ctx, '\u25B6 Ad', r.x + r.w / 2, r.y + r.h / 2, 45 * P.k, '#fff36b', '#0a4115');
        }
        hotspot('slot', boxAt(P, FULL_SLOT));
      }
      hotspot('retry', boxAt(P, FULL_RETRY));
    }
  } else if (p.kind === 'settings') {
    const P = popupPic('settings', 0.92);
    if (P) {
      drawPic(P);
      (['sound', 'music', 'haptic'] as const).forEach((key, i) => {
        const r = boxAt(P, SET_TOGGLES[i]);
        toggle(r, audio.get(key));
        popupButtons.push({ id: key, r });
      });
      hotspot('restart', boxAt(P, SET_RESTART));
      hotspot('close', boxAt(P, SET_CLOSE));
      hotspot('close', boxAt(P, [SET_X.x - SET_X.r, SET_X.y - SET_X.r, SET_X.x + SET_X.r, SET_X.y + SET_X.r]), true);
    }
  } else if (p.kind === 'intro') {
    const r = popupRect(0.95);
    if (p.booster) {
      card(ctx, r, 'New Booster!');
      boosterArt(p.booster, cx, r.y + r.h * 0.3, r.w * 0.15, save.b[p.booster], 0, 0, Math.sin(clock * 4), false);
      bubble(ctx, B_DESC[p.booster], cx, r.y + r.h * 0.64, r.w * 0.85, r.w * 0.05, 1);
    } else if (p.blocker) {
      const info = INTRO[p.blocker];
      card(ctx, r, info.title);
      ctx.lineCap = 'round';
      introArt(p.blocker, cx, r.y + r.h * 0.33, r.w);
      bubble(ctx, info.text, cx, r.y + r.h * 0.64, r.w * 0.85, r.w * 0.046, 1);
    }
    addButton('close', { x: cx - r.w * 0.25, y: r.y + r.h * 0.8, w: r.w * 0.5, h: r.w * 0.13 }, 'Got it!', 'green');
  }
  ctx.restore();
}

/** The picture on a blocker's intro card. */
function introArt(b: keyof typeof INTRO, cx: number, cy: number, w: number): void {
  const rope = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = w * 0.05;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w * 0.038;
    ctx.stroke();
  };
  if (b === 'hidden') {
    rope(cx - w * 0.32, cy + w * 0.06, cx - w * 0.08, cy - w * 0.06, GREY);
    outlinedText(ctx, '?', cx - w * 0.2, cy, w * 0.07, '#6d6880', '#ffffff');
    outlinedText(ctx, '\u2192', cx, cy, w * 0.08, '#ffffff', '#0b2563');
    rope(cx + w * 0.08, cy + w * 0.06, cx + w * 0.32, cy - w * 0.06, YARN[3].color);
  } else if (b === 'frozen') {
    const r = w * 0.065;
    for (let k = 0; k < 3; k++) {
      const x = cx + (k - 1) * w * 0.17;
      ctx.fillStyle = '#7a4420'; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
      if (k === 2) {
        ctx.fillStyle = 'rgba(170,225,250,0.95)'; ctx.strokeStyle = '#3f9ad6'; ctx.lineWidth = 3;
        roundRect(ctx, x - r * 1.15, cy - r * 1.05, r * 2.3, r * 2.1, r * 0.45); ctx.fill(); ctx.stroke();
        outlinedText(ctx, '4', x, cy, r * 1.1, '#ffffff', '#1f6fb0');
      }
    }
  } else {
    rope(cx - w * 0.36, cy + w * 0.06, cx - w * 0.12, cy - w * 0.04, YARN[2].color);
    // key on the left strand, padlock on the right
    ctx.fillStyle = '#ffc23a'; ctx.strokeStyle = '#a06a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - w * 0.3, cy - w * 0.05, w * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    roundRect(ctx, cx - w * 0.28, cy - w * 0.06, w * 0.1, w * 0.022, 3); ctx.fill(); ctx.stroke();
    outlinedText(ctx, '\u2192', cx, cy, w * 0.08, '#ffffff', '#0b2563');
    ctx.fillStyle = '#ffc23a';
    roundRect(ctx, cx + w * 0.14, cy - w * 0.04, w * 0.16, w * 0.13, w * 0.025); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9ced9'; ctx.lineWidth = w * 0.022;
    ctx.beginPath(); ctx.arc(cx + w * 0.22, cy - w * 0.04, w * 0.05, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#3a2508'; ctx.beginPath(); ctx.arc(cx + w * 0.22, cy + w * 0.02, w * 0.014, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCoach(): void {
  if (!coach || popup) return;
  const st = coach.steps[coach.i];
  const a = Math.min(1, coach.t / 0.25);
  const at = st.at?.() ?? null;
  const by = at && at.y > L.H * 0.6 ? L.viewTop + L.u * 0.1 : L.basket.y - L.u * 0.09;
  const br = bubble(ctx, st.text, L.colX + L.colW / 2, by, L.colW * 0.86, L.u * 0.042, a);
  if (at) pointer(ctx, at.x, at.y, L.u * 0.07, clock);
  if (st.until === 'tap') outlinedText(ctx, 'Tap to continue', L.colX + L.colW / 2, br.y + br.h + L.u * 0.03, L.u * 0.03, '#ffffff', '#6e1037');
}

function drawBanner(): void {
  if (banner.t <= 0 || !banner.text) return;
  const t = 1.8 - banner.t;
  const k = t < 0.3 ? ease(t / 0.3) : banner.t < 0.3 ? banner.t / 0.3 : 1;
  const y = L.H * 0.45;
  ctx.fillStyle = `rgba(60,20,40,${0.45 * k})`;
  ctx.fillRect(0, y - L.u * 0.14, L.W, L.u * 0.28);
  const x = L.colX + L.colW / 2 + (1 - k) * L.W * (t < 0.3 ? -1 : 1);
  outlinedText(ctx, banner.text, x, y - L.u * 0.02, L.u * 0.11, banner.text.startsWith('Super') ? '#e9b3ff' : '#ff8a8a', '#3a0f26');
  outlinedText(ctx, banner.sub, x, y + L.u * 0.08, L.u * 0.045, '#ffffff', '#3a0f26');
}

function draw(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  L = layout();
  scene.setView(L.colX + L.colW * 0.05, L.viewTop, L.colW * 0.9, L.viewBottom - L.viewTop, cw, ch, dpr);
  const sr = showRect();
  scene.setToyView(sr.x, sr.y, sr.w, sr.h);
  scene.showcase(sr.k, showSpin());
  scene.render();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.globalAlpha = 1 - sr.k;
  drawHud();
  drawDrill();
  drawBoosters();
  ctx.globalAlpha = 1;
  drawShowcase(sr.k);
  drawParticles();
  drawCut();
  if (armed === 'scissors' && !popup) toast(ctx, 'Tap any strand to snip it', L.colX + L.colW / 2, L.viewTop + L.u * 0.03, L.u * 0.035, 1);
  drawCoach();
  drawBanner();
  if (toastMsg.t > 0) toast(ctx, toastMsg.text, L.colX + L.colW / 2, L.basket.y - L.u * 0.04, L.u * 0.036, Math.min(1, toastMsg.t * 3));
  drawPopup();
}

// ---------------------------------------------------------------- loop

let last = performance.now();
function frame(now: number): void {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (canvas.clientWidth < 1 || canvas.clientHeight < 1) return;
  try {
    if (!L) L = layout();
    if (!paused) update(dt);
    draw();
  } catch (err) {
    console.error('draw failed', err, (err as Error)?.stack);
    ctx.reset?.();
  }
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- dev hooks

if (import.meta.env.DEV) {
  (window as unknown as { __knot: unknown }).__knot = {
    booster: (k: BoosterKey) => { void useBooster(k, true); },
    closePopup: () => { popup = null; coach = null; introQueue = []; },
    blk: () => ({ key: S.strands.findIndex((t) => t.key), chained: S.strands.map((t, i) => (t.knot !== undefined ? i : -1)).filter((i) => i >= 0), locked: S.strands.map((_, i) => (lockedOn(S, i) ? i : -1)).filter((i) => i >= 0), free: S.strands.map((_, i) => (free(S, i) && !S.gone[i] ? i : -1)).filter((i) => i >= 0) }),
    showPopup: (kind: 'win' | 'full' | 'stuck' | 'settings', basket?: number[]) => { if (basket) S.basket = basket; popup = { kind, t: 0 }; },
    plan: () => ({ color: plan.color, steps: [...plan.steps.entries()], knitLog, parts: scene.partInfo() }),
    info: () => ({ level: level + 1, colors: S.strands.map((t) => t.c), strands: S.strands.length, gone: S.gone.filter(Boolean).length, basket: S.basket, cap: S.cap, frozen: S.frozen, unlocked: S.unlocked, lock: S.lock, knitted: S.knitted, lost: S.lost, ended, popup: popup?.kind ?? null, popupT: popup?.t ?? 0, paused, banner: banner.t, coach: coach?.i ?? null, free: S.strands.map((_, i) => i).filter((i) => canPull(S, i)) }),
    skipCoach: () => { coach = null; banner.t = 0; },
    tap: (i: number) => { const p = scene.toScreen(scene.midOf(i)); onTap(p.x, p.y); },
    pullDirect: (i: number) => tryPull(i),
    async auto(): Promise<boolean> {
      coach = null;
      banner.t = 0;
      const sol = solve(S);
      if (!sol) return false;
      for (const i of sol) {
        while (busy || popup) await new Promise((r) => setTimeout(r, 40));
        if (ended) break;
        tryPull(i);
        await new Promise((r) => setTimeout(r, 120));
      }
      return true;
    },
    hint: () => { const sol = solve(S); if (sol) hint = { strand: sol[0], t: 3 }; },
  };
}

/** What the studio layer attaches to. See falcon-game.ts for every member. */
export const game: FalconGame = {
  getLevelCount: () => LEVEL_COUNT,
  startLevel,
  on: events.on,
  pause: () => { paused = true; setAudioPaused(true); },
  resume: () => { paused = false; setAudioPaused(false); last = performance.now(); },
  getProgress: () => Math.round((100 * S.gone.filter(Boolean).length) / Math.max(1, S.strands.length)),
  audio: { set: (k, on) => audio.set(k, on), get: (k) => audio.get(k) },
};
