// HUD and popup pieces in the studio's royal look: gold-rimmed blue panels,
// chunky glossy buttons, booster pucks, red ribbon cards, the coach bubble and
// the pointing hand. Drawing only.

import { FONT, outlinedText, roundRect, shade } from './art';

export interface Rect { x: number; y: number; w: number; h: number }
export const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Gold rim + coloured inside + glossy band. */
export function panel(ctx: CanvasRenderingContext2D, r: Rect, top = '#6aa8ff', bot = '#2350c8', rad = r.h * 0.3, gloss = true): void {
  ctx.fillStyle = 'rgba(20,30,90,0.35)';
  roundRect(ctx, r.x, r.y + r.h * 0.08, r.w, r.h, rad);
  ctx.fill();
  ctx.fillStyle = '#5b3410';
  roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, rad + 2);
  ctx.fill();
  const gold = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  gold.addColorStop(0, '#fff09a');
  gold.addColorStop(0.5, '#ffcf3d');
  gold.addColorStop(1, '#d88a12');
  ctx.fillStyle = gold;
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();
  const b = Math.max(2, r.h * 0.09);
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  roundRect(ctx, r.x + b, r.y + b, r.w - b * 2, r.h - b * 2, rad - b);
  ctx.fill();
  if (!gloss) return;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, r.x + b * 2, r.y + b * 1.6, r.w - b * 4, (r.h - b * 2) * 0.38, (rad - b) * 0.7);
  ctx.fill();
}

const TONES = {
  green: ['#9ff07a', '#2fae2f', '#0a4115'],
  orange: ['#ffc46b', '#f07a12', '#6b2a00'],
  blue: ['#8cc8ff', '#2f72e0', '#0d2b6b'],
  red: ['#ff8a96', '#d4102e', '#5e0716'],
} as const;
export type Tone = keyof typeof TONES;

export function button(ctx: CanvasRenderingContext2D, r: Rect, label: string, tone: Tone, sub?: string, press = 0): void {
  const [top, bot, line] = TONES[tone];
  const k = 1 - 0.06 * press;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.scale(k, k);
  ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
  const rad = r.h * 0.32;
  ctx.fillStyle = line;
  roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 7, rad + 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  roundRect(ctx, r.x + r.h * 0.18, r.y + r.h * 0.1, r.w - r.h * 0.36, r.h * 0.32, rad * 0.6);
  ctx.fill();
  if (sub) {
    outlinedText(ctx, label, r.x + r.w / 2, r.y + r.h * 0.4, r.h * 0.38, '#ffffff', line);
    outlinedText(ctx, sub, r.x + r.w / 2, r.y + r.h * 0.76, r.h * 0.22, '#fff36b', line);
  } else {
    outlinedText(ctx, label, r.x + r.w / 2, r.y + r.h / 2, r.h * 0.42, '#ffffff', line);
  }
  ctx.restore();
}

/** Video-ad badge drawn on a button corner. */
export function adBadge(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - s, y - s * 0.7, s * 2, s * 1.4, s * 0.35);
  ctx.fill();
  ctx.fillStyle = '#2f72e0';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y - s * 0.45);
  ctx.lineTo(x + s * 0.5, y);
  ctx.lineTo(x - s * 0.35, y + s * 0.45);
  ctx.closePath();
  ctx.fill();
}

export type BoosterKey = 'undo' | 'scissors' | 'slot';

export function boosterIcon(ctx: CanvasRenderingContext2D, key: BoosterKey, r: number): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (key === 'undo') {
    for (const [c, w] of [['#0b2563', 0.36], ['#ffffff', 0.2]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = r * w;
      ctx.beginPath();
      ctx.arc(r * 0.05, r * 0.1, r * 0.4, Math.PI * 1.05, Math.PI * 2.35);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0b2563';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(-r * 0.66, -r * 0.02);
    ctx.lineTo(-r * 0.3, -r * 0.52);
    ctx.lineTo(-r * 0.06, r * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (key === 'scissors') {
    ctx.strokeStyle = '#0b2563';
    ctx.lineWidth = r * 0.1;
    ctx.fillStyle = '#e8edf7';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * 0.35);
      ctx.beginPath();
      ctx.moveTo(-r * 0.05, -r * 0.65);
      ctx.lineTo(r * 0.07, -r * 0.65);
      ctx.lineTo(r * 0.06, r * 0.05);
      ctx.lineTo(-r * 0.04, r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#ff4f6a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * r * 0.24, r * 0.38, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2350c8';
      ctx.beginPath();
      ctx.arc(s * r * 0.24, r * 0.38, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4f6a';
    }
  } else {
    // a basket with a plus
    ctx.fillStyle = '#d9a066';
    ctx.strokeStyle = '#6b3f00';
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.1);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.lineTo(r * 0.38, r * 0.42);
    ctx.lineTo(-r * 0.38, r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(107,63,0,0.6)';
    for (const x of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(x * r, -r * 0.1); ctx.lineTo(x * r * 0.8, r * 0.42); ctx.stroke(); }
    ctx.fillStyle = '#ff7ac8';
    ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.18, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3fd24a';
    ctx.strokeStyle = '#0a4115';
    ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.4, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    outlinedText(ctx, '+', r * 0.42, -r * 0.4, r * 0.4, '#ffffff', '#0a4115');
  }
}

/** A round booster puck with count badge; locked shows "Lv.N". */
export function boosterButton(
  ctx: CanvasRenderingContext2D, key: BoosterKey, label: string, x: number, y: number, r: number,
  count: number, lockedAt: number, press: number, pulse: number, armed = false,
): void {
  const k = (1 - 0.1 * Math.max(0, press)) * (1 + 0.05 * pulse);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = 'rgba(20,30,90,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.98, r * 0.9, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  if (armed) {
    ctx.fillStyle = 'rgba(255,240,120,0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5b3410';
  ctx.beginPath();
  ctx.arc(0, r * 0.1, r + 2, 0, Math.PI * 2);
  ctx.fill();
  const gold = ctx.createLinearGradient(0, -r, 0, r);
  gold.addColorStop(0, lockedAt ? '#e2e2e8' : '#fff09a');
  gold.addColorStop(0.5, lockedAt ? '#b8b8c4' : '#ffc22e');
  gold.addColorStop(1, lockedAt ? '#8a8a98' : '#c47c0e');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  const inner = ctx.createLinearGradient(0, -r, 0, r);
  inner.addColorStop(0, lockedAt ? '#a9adbd' : '#6aa8ff');
  inner.addColorStop(1, lockedAt ? '#6c7086' : '#2350c8');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.38, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (lockedAt) {
    ctx.fillStyle = '#4a4e62';
    roundRect(ctx, -r * 0.3, -r * 0.12, r * 0.6, r * 0.48, r * 0.1);
    ctx.fill();
    ctx.strokeStyle = '#4a4e62';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(0, -r * 0.14, r * 0.2, Math.PI, 0);
    ctx.stroke();
    outlinedText(ctx, `Lv.${lockedAt}`, 0, r * 0.68, r * 0.34, '#ffffff', '#2b2e40');
  } else {
    boosterIcon(ctx, key, r * 0.92);
    const bx = r * 0.7, by = -r * 0.66, br = r * 0.33;
    ctx.fillStyle = count > 0 ? '#5e0716' : '#0a4115';
    ctx.beginPath(); ctx.arc(bx, by, br + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = count > 0 ? '#e8213f' : '#3fd24a';
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    outlinedText(ctx, count > 0 ? String(count) : '+', bx, by, br * 1.25, '#ffffff', count > 0 ? '#5e0716' : '#0a4115');
  }
  ctx.restore();
  outlinedText(ctx, label, x, y + r * 1.38, r * 0.4, '#ffffff', '#0b2563');
}

export function gearButton(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#5b3410';
  ctx.beginPath(); ctx.arc(x, y + r * 0.1, r + 2, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, '#6aa8ff');
  g.addColorStop(1, '#2350c8');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffcf3d';
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const rr = k % 2 ? r * 0.4 : r * 0.56;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f72e0';
  ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, Math.PI * 2); ctx.fill();
}

/** Popup card in the game's look: thick navy frame, light blue body, a blue title pill. */
export function card(ctx: CanvasRenderingContext2D, r: Rect, title: string): void {
  const rad = r.w * 0.08;
  ctx.fillStyle = 'rgba(20,20,80,0.3)';
  roundRect(ctx, r.x, r.y + r.w * 0.025, r.w, r.h, rad);
  ctx.fill();
  ctx.fillStyle = '#23266e';
  roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, rad + 4);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#d4ecff');
  g.addColorStop(1, '#93c9f7');
  ctx.fillStyle = g;
  roundRect(ctx, r.x, r.y, r.w, r.h, rad);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  roundRect(ctx, r.x + 5, r.y + 5, r.w - 10, r.h - 10, rad - 4);
  ctx.stroke();
  const tw = r.w * 0.78, th = r.w * 0.15, tx = r.x + (r.w - tw) / 2, ty = r.y - th * 0.45;
  ctx.fillStyle = '#23266e';
  roundRect(ctx, tx - 3, ty - 3, tw + 6, th + 8, th / 2 + 3);
  ctx.fill();
  const tg = ctx.createLinearGradient(0, ty, 0, ty + th);
  tg.addColorStop(0, '#5ab2ff');
  tg.addColorStop(1, '#1c66d6');
  ctx.fillStyle = tg;
  roundRect(ctx, tx, ty, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, tx + th * 0.3, ty + th * 0.12, tw - th * 0.6, th * 0.3, th * 0.15);
  ctx.fill();
  outlinedText(ctx, title, r.x + r.w / 2, ty + th / 2, th * 0.52, '#ffffff', '#23266e');
}

export function toast(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number): void {
  ctx.font = `${size}px ${FONT}`;
  const w = Math.max(size * 6, ctx.measureText(text).width + size * 1.8);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = 'rgba(15, 20, 60, 0.85)';
  roundRect(ctx, x - w / 2, y - size, w, size * 2, size);
  ctx.fill();
  outlinedText(ctx, text, x, y, size, '#ffffff', '#0b2563');
  ctx.globalAlpha = 1;
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, size: number, width: number): string[] {
  ctx.font = `${size}px ${FONT}`;
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > width && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Speech bubble of the coach. Returns its rect. */
export function bubble(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number, alpha: number): Rect {
  const lines = wrap(ctx, text, size, maxW - size * 1.6);
  ctx.font = `${size}px ${FONT}`;
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = Math.min(maxW, tw + size * 1.8);
  const h = lines.length * size * 1.25 + size * 1.1;
  const r = { x: cx - w / 2, y: cy - h / 2, w, h };
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = 'rgba(20,30,90,0.3)';
  roundRect(ctx, r.x, r.y + 4, w, h, size * 0.8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, r.x, r.y, w, h, size * 0.8);
  ctx.fill();
  ctx.strokeStyle = '#2f72e0';
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.stroke();
  lines.forEach((l, k) => {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0b2563';
    ctx.fillText(l, cx, r.y + size * 0.55 + size * 1.25 * (k + 0.5));
  });
  ctx.globalAlpha = 1;
  return r;
}

/** A cartoon glove pointing up at (x, y); `t` animates the tap. */
export function pointer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const bob = Math.abs(Math.sin(t * 4)) * s * 0.35;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.8 - ((t * 1.3) % 0.7)})`;
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.arc(x, y, s * (0.25 + ((t * 1.3) % 0.7) * 0.7), 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(x + s * 0.12, y + s * 0.15 + bob);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0b2563';
  ctx.lineWidth = s * 0.08;
  // finger
  roundRect(ctx, -s * 0.13, 0, s * 0.26, s * 0.75, s * 0.13);
  ctx.fill();
  ctx.stroke();
  // fist
  roundRect(ctx, -s * 0.3, s * 0.55, s * 0.72, s * 0.62, s * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2f72e0';
  roundRect(ctx, -s * 0.32, s * 1.12, s * 0.76, s * 0.2, s * 0.08);
  ctx.fill();
  ctx.restore();
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff36b'): void {
  if (r <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
    const rr = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color.startsWith('#') ? color : '#fff36b', -0.5);
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();
}
