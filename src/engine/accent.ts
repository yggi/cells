/**
 * `metric_accent` (#799): a built-in plugin-fragment whose one fill is a braid (decision 085, 090), a line of levels a
 * role multiplies its hits by (`&euclid * &euclidLevel`), written from the bar's metric weights rather than by hand.
 *
 * - **The weights:** the bar's meter's grades, one a step (yggi/music-commons `contracts/meter`, version 2, as
 *   `meterLevels` writes them), each weighed by how high it stands (#906): the downbeat 1, a group's or the half bar's
 *   start .8, a beat between .6, an eighth .4, a sixteenth .2. **`meter`** is the bar's meter: a signature or sizes
 *   (`3/4`, `7/8`, `2+2+3`), 4/4 by default, or a meter cell (`meter=&bar`), handed as its levels, a number a step, so
 *   the accents are the piece's own meter's. **`steps`** is how many steps the bar has: 0, the default, a sixteenth a
 *   step (16 in 4/4, 12 in 3/4, 14 in 7/8); any other count a whole number of steps a pulse. So 3/4 stresses its beats,
 *   not 6/8's half bar, and 5/4, 7/8 and 10/8 their groups; 4/4 in sixteenths weighs as it always did.
 * - **`sync`**, 0 to 1, leans each step toward the weight of the step after it: an anticipation, the note before a
 *   strong beat taking its stress.
 * - **`density`**, 0 to 1, keeps the steps whose weight is at least 1 − density (1: every step; 0: the downbeat).
 * - **The level** of a step kept runs from `floor`, its lightest, to `peak`, the downbeat's; a step not kept is 0.
 *
 * Pure: the same arguments answer the same text. Its work is a step each, its fuel 64: a bar of more refuses.
 */
import type { PluginFragment } from './fills';
import { groupingOf, meterLevels } from './parser/generators';

/** A grade's weight, from the bar down: the downbeat 1, a group's start .8, a beat between .6, an eighth .4, finer .2. */
const WEIGHT: Readonly<Record<string, number>> = { '*': 1, '+': 0.8, '-': 0.6, ':': 0.6, ';': 0.6, '.': 0.4, ',': 0.2 };
/** A meter's number for a step (0 the bar … 4 finer, as a meter cell's braid writes it) as its grade. */
const GRADE = '*+-.,';

/**
 * A meter cell's levels, a number a step (`0 3 3 1 3 1 3`: 7/8 in eighths), as grades at `steps` steps: each of its
 * steps split in two, four or eight, the halves a tier finer down to the sixteenth (,). Where `steps` is 0, a sixteenth
 * a step: its steps are eighths where it grades any (3), else quarters.
 */
function gradesOfLevels(levels: readonly number[], steps: number): string | null {
  const n = levels.length;
  const total = steps || n * (levels.includes(3) ? 2 : 4);
  const k = total / n;
  if (!Number.isInteger(k) || (k & (k - 1)) !== 0) return null;
  const depth = Math.log2(k);
  return levels
    .flatMap((v) =>
      Array.from({ length: k }, (_, j) => {
        if (j === 0) return GRADE[v]!;
        // (a sub-step's tier: the sixteenth at the finest split, a tier coarser at each split above it)
        const d = depth - Math.log2(j & -j);
        return GRADE[Math.max(v + 1, 4 - (depth - d))]!;
      }),
    )
    .join('');
}

/** A meter's grades at `steps` steps (0: a sixteenth a step), from a signature, sizes or a meter cell's levels; null where it is none. */
export function meterGrades(meter: string, steps = 0): string | null {
  const levels = meter.trim().split(/\s+/);
  if (levels.every((v) => /^[0-4]$/.test(v))) return gradesOfLevels(levels.map(Number), steps);
  const g = groupingOf(meter.trim());
  if (!g) return null;
  const total = steps || (g.pulses * 16) / g.unit;
  const sub = total / g.pulses;
  if (!Number.isInteger(sub) || sub < 1) return null;
  const grades = meterLevels(meter.trim(), sub);
  return grades.length === total ? grades : null;
}

/** Each step's weight, 1 at the downbeat down to .2 at a sixteenth: a meter's grades (`meterGrades`) weighed. */
export function metricWeights(meter: string, steps = 0): number[] | null {
  const grades = meterGrades(meter, steps);
  return grades ? [...grades].map((g) => WEIGHT[g]!) : null;
}

const FUEL = 64;
const number = (args: Readonly<Record<string, string>>, name: string): number => Number(args[name]);
const level = (x: number): string => String(+x.toFixed(3));

export const METRIC_ACCENT: PluginFragment = {
  id: 'metric_accent',
  fragment: 'metric_accent',
  fills: { accent: { fuel: FUEL } },
  origin: 0,
  cycle: 0,
  stepSeconds: 0,
  fill(name, _lap, args, fuel = FUEL) {
    if (name !== 'accent') return { refused: `it has no fill ${name}` };
    const steps = number(args, 'steps');
    const meter = args.meter ?? '4/4';
    const [density, sync, peak, floor] = ['density', 'sync', 'peak', 'floor'].map((k) => number(args, k));
    if (!Number.isInteger(steps) || steps < 0) return { refused: `steps=${args.steps} is no count of steps` };
    for (const [k, v] of Object.entries({ density, sync, peak, floor })) if (!(v! >= 0 && v! <= 1)) return { refused: `${k}=${args[k]} is out of 0 to 1` };
    const w = metricWeights(meter, steps);
    if (!w)
      return {
        refused: `meter=${meter} is no meter it can weigh at ${steps ? `${steps} step${steps === 1 ? '' : 's'}` : 'a sixteenth a step'}: a signature (7/8), sizes (2+2+3) or a meter cell (&bar), its steps a whole number a pulse`,
      };
    if (w.length > fuel) return { refused: `${w.length} steps need more than its fuel, ${fuel}` };
    const leaned = w.map((x, i) => (1 - sync!) * x + sync! * w[(i + 1) % w.length]!);
    return leaned.map((x) => (x >= 1 - density! - 1e-9 ? level(floor! + (peak! - floor!) * x) : '0')).join(' ');
  },
};
