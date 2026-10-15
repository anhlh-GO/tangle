// Synthesized sounds (no audio files): yarn zipping off pegs, balls thumping into
// the basket, a chime when three are knitted, a soft music-box loop. Flags persist in localStorage.

type Key = 'sound' | 'music' | 'haptic';

const STORE = 'mcd_audio';
const flags: Record<Key, boolean> = { sound: true, music: true, haptic: true };
try {
  const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
  if (saved) Object.assign(flags, saved);
} catch { /* storage blocked: keep defaults */ }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** Call from a user gesture: browsers only start audio after one. */
export function unlockAudio(): void {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    } catch { return; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  startMusic();
}

const ready = (): boolean => !!ctx && ctx.state === 'running' && !!master;

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slide = 0): void {
  if (!flags.sound || !ready()) return;
  const t = ctx!.currentTime + delay;
  const osc = ctx!.createOscillator();
  const gain = ctx!.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Filtered noise whose pitch glides from f0 to f1 (whooshes, rewinds, reels). */
function sweep(dur: number, vol: number, f0: number, f1: number, delay = 0): void {
  if (!flags.sound || !ready()) return;
  const t = ctx!.currentTime + delay;
  const len = Math.ceil(ctx!.sampleRate * dur);
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  const f = ctx!.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2.5;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx!.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

function noise(dur: number, vol: number, freq: number, delay = 0): void {
  if (!flags.sound || !ready()) return;
  const t = ctx!.currentTime + delay;
  const len = Math.ceil(ctx!.sampleRate * dur);
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  const f = ctx!.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx!.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

export const sfx = {
  /** A strand slides off its pegs: a soft zip. */
  pull(): void { noise(0.18, 0.08, 1800); tone(500, 0.18, 'sine', 0.1, 0, 1.8); },
  /** A ball drops in the basket. */
  ball(): void { tone(220, 0.12, 'sine', 0.16, 0, 0.6); },
  /** Three balls knitted away; `n` raises the pitch for streaks. */
  knit(n: number): void {
    const b = 523 * Math.pow(1.06, Math.min(n, 10));
    [1, 1.26, 1.5, 2].forEach((m, i) => tone(b * m, 0.28, 'triangle', 0.12, i * 0.06));
  },
  snip(): void { noise(0.05, 0.15, 5000); noise(0.05, 0.12, 4000, 0.07); },
  /** One clack of the scissor blades. */
  clack(): void { noise(0.04, 0.16, 6000); tone(1400, 0.05, 'square', 0.03); },
  /** The drill boring a hole: a buzzing whirr, then a pop. */
  drill(): void {
    for (let k = 0; k < 6; k++) noise(0.1, 0.07, 1200 + k * 150, k * 0.08);
    tone(140, 0.5, 'sawtooth', 0.035, 0, 1.4);
    tone(660, 0.12, 'triangle', 0.1, 0.52, 1.6);
  },
  nope(): void { tone(180, 0.14, 'square', 0.06, 0, 0.8); tone(150, 0.14, 'square', 0.05, 0.08, 0.8); },
  warn(): void { tone(880, 0.08, 'square', 0.05); },
  tap(): void { tone(900, 0.04, 'sine', 0.08); },
  booster(): void { tone(300, 0.4, 'sine', 0.15, 0, 3); tone(900, 0.25, 'triangle', 0.08, 0.1); },
  win(): void { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, i * 0.09)); },
  /** A popup slides in: an airy whoosh up with a soft pop. */
  popup(): void { sweep(0.22, 0.07, 500, 2600); tone(660, 0.12, 'sine', 0.08, 0.12, 1.3); },
  /** A popup closes. */
  close(): void { sweep(0.16, 0.05, 2200, 500); },
  /** A settings switch flips. */
  toggle(on: boolean): void { tone(on ? 700 : 520, 0.06, 'square', 0.04); tone(on ? 1050 : 390, 0.08, 'sine', 0.08, 0.05); },
  /** Three of a colour gather into one ball before they knit. */
  match(): void { [880, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'sine', 0.09, i * 0.05)); sweep(0.3, 0.05, 800, 3000); },
  /** A grey mystery strand shows its colour. */
  reveal(): void { [1320, 1760, 2349].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.04)); },
  /** The rope winds itself into a ball. */
  coil(): void { sweep(0.35, 0.05, 400, 1400); },
  /** The basket is almost full. */
  alarm(): void { tone(988, 0.09, 'square', 0.05); tone(784, 0.12, 'square', 0.05, 0.11); },
  /** Undo: a quick rewind. */
  undo(): void { sweep(0.3, 0.08, 2400, 300); tone(600, 0.22, 'triangle', 0.08, 0.05, 0.5); },
  /** A booster is picked and waits for a target (scissors). */
  arm(): void { tone(1200, 0.06, 'square', 0.04); tone(1600, 0.1, 'sine', 0.07, 0.06); },
  /** The frozen slot cracks a little. */
  crack(): void { noise(0.06, 0.12, 5200); tone(2600, 0.05, 'triangle', 0.04, 0.01, 0.6); },
  /** The ice over a slot shatters. */
  shatter(): void { noise(0.3, 0.16, 6000); [2093, 2637, 3136, 3951].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, i * 0.04)); },
  /** A locked strand rattles its padlock. */
  rattle(): void { for (let k = 0; k < 3; k++) { noise(0.03, 0.1, 3500, k * 0.06); tone(1900, 0.03, 'square', 0.025, k * 0.06); } },
  /** The key turns and the padlock springs open. */
  unlock(): void { noise(0.05, 0.1, 3000); tone(1400, 0.05, 'square', 0.05, 0.08); [1047, 1568, 2093].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, 0.18 + i * 0.07)); },
  /** The finished toy zooms in and spins. */
  showcase(): void { sweep(0.6, 0.06, 300, 2400); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.5, 'sine', 0.06, 0.25 + i * 0.12)); },
  /** Board zoom step. */
  zoom(inn: boolean): void { tone(inn ? 900 : 600, 0.05, 'sine', 0.06, 0, inn ? 1.4 : 0.7); },
  lose(): void { [440, 370, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.14)); },
};

// ---------------------------------------------------------------- music box

// Chill lo-fi loop: slow 7th-chord pads through a soft low-pass, a quiet bass, and a few
// sparse plucked notes picked from the chord — calm enough to sit under the game.
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];   // Fmaj7 Em7 Dm7 Cmaj7
const BEAT = 60 / 70;
let musicTimer = 0;
let nextBeat = 0;
let beat = 0;
let musicBus: GainNode | null = null;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function startMusic(): void {
  if (musicTimer || !ctx || !master) return;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1100;
  lp.Q.value = 0.5;
  musicBus = ctx.createGain();
  musicBus.gain.value = flags.music ? 1 : 0;
  musicBus.connect(lp).connect(master);
  nextBeat = ctx.currentTime + 0.3;
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  musicTimer = window.setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    while (nextBeat < ctx.currentTime + 0.5) {
      const on = flags.music && !paused;
      const chord = CHORDS[Math.floor(beat / 8) % CHORDS.length];
      if (on) {
        if (beat % 8 === 0) {
          for (const m of chord) pad(hz(m), nextBeat, BEAT * 8.4, 0.016);
          soft(hz(chord[0] - 12), nextBeat, BEAT * 3.5, 0.035);
        }
        if (beat % 8 === 4) soft(hz(chord[0] - 12), nextBeat, BEAT * 3.5, 0.025);
        // a few soft plucks from the chord, an octave up, never on every beat
        if (rand() < 0.38) pluck(hz(chord[Math.floor(rand() * chord.length)] + 12), nextBeat + (rand() < 0.3 ? BEAT / 2 : 0), 0.03);
      }
      nextBeat += BEAT;
      beat++;
    }
  }, 120);
}

/** A slow swelling pad note: two slightly detuned soft oscillators. */
function pad(f: number, at: number, len: number, vol: number): void {
  if (!ctx || !musicBus) return;
  for (const [type, det] of [['triangle', -4], ['sine', 5]] as const) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = det;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 1.6);
    g.gain.setValueAtTime(vol, at + len - 1.8);
    g.gain.linearRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(musicBus);
    o.start(at);
    o.stop(at + len + 0.1);
  }
}
/** A round, quiet sine (bass). */
function soft(f: number, at: number, len: number, vol: number): void {
  if (!ctx || !musicBus) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(musicBus);
  o.start(at);
  o.stop(at + len + 0.05);
}
/** A gentle plucked note (like a muted electric piano). */
function pluck(f: number, at: number, vol: number): void {
  if (!ctx || !musicBus) return;
  for (const [mul, v] of [[1, 1], [2, 0.18]] as const) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f * mul;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol * v, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    o.connect(g).connect(musicBus);
    o.start(at);
    o.stop(at + 1.5);
  }
}

let paused = false;
export function setAudioPaused(p: boolean): void {
  paused = p;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(p || !flags.music ? 0 : 1, ctx.currentTime, 0.15);
}

/** Vibrate: one pulse (ms) or a pattern [on, off, on…]. */
export function haptic(ms: number | number[]): void {
  if (flags.haptic && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch { /* not allowed */ }
  }
}

export const audio = {
  set(key: Key, on: boolean): void {
    flags[key] = on;
    if (key === 'music' && ctx && musicBus) musicBus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.15);
    try { localStorage.setItem(STORE, JSON.stringify(flags)); } catch { /* ignore */ }
  },
  get(key: Key): boolean { return flags[key]; },
};
