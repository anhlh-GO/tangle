// Fit every level to its difficulty band (BAND / AIM in src/levels.ts): search the
// seed, how stirred the colour order is (`mix`) and the basket size, until careful
// play clears the level every time and a careless bot wins at the target rate.
//   node scripts/tune.ts              report only
//   node scripts/tune.ts --write      write src/tuned.ts
//   node scripts/tune.ts --range=5-9
import { writeFileSync } from 'node:fs';
import { AIM, BAND, LEVEL_COUNT, generate, planOf, type Tune } from '../src/levels.ts';
import { TUNED } from '../src/tuned.ts';
import { botRun, fromSpec, rngOf } from '../src/sim.ts';

const RUNS = 60;
const SEEDS = Number(process.argv.find((a) => a.startsWith('--seeds='))?.slice(8) ?? 8);
const args = process.argv.slice(2);
const range = args.find((a) => a.startsWith('--range='))?.slice(8).split('-').map(Number) ?? [1, LEVEL_COUNT];
const out: Tune[] = [...TUNED];

function evaluate(i: number, t: Tune) {
  let spec;
  try { spec = generate(i, t); } catch { return null; }
  const s = fromSpec(spec);
  let careful = 0;
  for (let r = 0; r < 6; r++) if (botRun(s, rngOf(r * 13 + 5), 0.25).win) careful++;
  let wins = 0, prog = 0;
  for (let r = 0; r < RUNS; r++) { const res = botRun(s, rngOf(r * 31 + 7), 1.2); if (res.win) wins++; else prog += res.progress; }
  const p = planOf(i);
  const rate = wins / RUNS;
  const [lo, hi] = BAND[p.diff];
  let d = rate < lo ? lo - rate : rate > hi ? rate - hi : Math.abs(rate - AIM[p.diff]) * 0.05;
  if (careful < 6) d += (6 - careful) * 0.2;   // careful play must clear it every time: no level that just jams
  return { t, rate, careful, d, strands: spec.strands.length, lossAt: wins < RUNS ? prog / (RUNS - wins) : 1 };
}

for (let i = range[0] - 1; i < range[1]; i++) {
  const p = planOf(i);
  const [lo, hi] = BAND[p.diff];
  let best: NonNullable<ReturnType<typeof evaluate>> | null = null;
  const baskets = p.diff === 'easy' ? [6, 5] : p.diff === 'normal' ? [5, 6] : [5, 4, 6];
  const mixes = p.diff === 'easy' ? [0.1, 0.3] : [0.3, 0.6, 1.0];
  search: for (const basket of baskets) for (const mix of mixes) {
    for (let seed = 1; seed <= (i === 0 ? 1 : SEEDS); seed++) {
      const r = evaluate(i, { seed, mix, basket });
      if (!r) continue;
      if (!best || r.d < best.d) best = r;
      if (r.d < 0.015) break search;
    }
  }
  if (!best) { console.log(`L${i + 1}: nothing playable`); continue; }
  out[i] = best.t;
  console.log(`L${i + 1} ${p.diff.padEnd(6)} ${p.colors}c ${p.cols}x${p.rows} strands ${best.strands} basket ${best.t.basket} mix ${best.t.mix} seed ${best.t.seed}  bot ${Math.round(best.rate * 100)}% [${lo * 100 | 0}-${hi * 100 | 0}] careful ${best.careful}/6  lossAt ${Math.round(best.lossAt * 100)}%${best.d >= 0.05 ? '  OFF' : ''}`);
}

if (args.includes('--write')) {
  const body = out.map((t) => `  { seed: ${t.seed}, mix: ${t.mix}, basket: ${t.basket} },`).join('\n');
  writeFileSync(new URL('../src/tuned.ts', import.meta.url), `// Written by scripts/tune.ts --write\nimport type { Tune } from './levels.ts';\n\nexport const TUNED: Tune[] = [\n${body}\n];\n`);
  console.log('wrote src/tuned.ts');
}
