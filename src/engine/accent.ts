/**
 * `metric_accent` (#799): a built-in plugin-fragment whose one fill is a braid (decision 085, 090), a line of levels a
 * role multiplies its hits by (`&euclid * &euclidLevel`), written from the bar's metric weights rather than by hand.
 *
 * - **The weights:** a bar of `steps` (16: sixteenths of a 4/4 bar) is split by its factors, twos first, then threes
 *   (12 is 2 · 2 · 3: four beats of three). A step's weight is how high in that hierarchy it starts: the downbeat 1, the
 *   half bar next, then the beats, down to the finest steps.
 * - **`sync`**, 0 to 1, leans each step toward the weight of the step after it: an anticipation, the note before a
 *   strong beat taking its stress.
 * - **`density`**, 0 to 1, keeps the steps whose weight is at least 1 − density (1: every step; 0: the downbeat).
 * - **The level** of a step kept runs from `floor`, its lightest, to `peak`, the downbeat's; a step not kept is 0.
 *
 * Pure: the same arguments answer the same text. Its work is a step each, its fuel 64: a bar of more refuses.
 */
import type { PluginFragment } from './fills';

/** The factors a bar of `steps` is split by, from the bar down: twos, then threes; null where it has another. */
function factors(steps: number): number[] | null {
  const out: number[] = [];
  let n = steps;
  while (n % 2 === 0 && n > 1) (out.push(2), (n /= 2));
  while (n % 3 === 0 && n > 1) (out.push(3), (n /= 3));
  // (a compound bar groups its beats in threes under its twos: 12 is 2 · 2 · 3)
  return n === 1 ? out : null;
}

/** Each step's weight, 1 at the downbeat down to 1 / (levels + 1) at the finest. */
export function metricWeights(steps: number): number[] | null {
  const fs = factors(steps);
  if (!fs) return null;
  const levels = fs.length;
  return Array.from({ length: steps }, (_, i) => {
    let size = steps;
    let depth = 0;
    for (const f of fs) {
      if (i % size === 0) break;
      size /= f;
      depth++;
    }
    return (levels + 1 - depth) / (levels + 1);
  });
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
    const [density, sync, peak, floor] = ['density', 'sync', 'peak', 'floor'].map((k) => number(args, k));
    if (!Number.isInteger(steps) || steps < 1) return { refused: `steps=${args.steps} is no count of steps` };
    if (steps > fuel) return { refused: `${steps} steps need more than its fuel, ${fuel}` };
    for (const [k, v] of Object.entries({ density, sync, peak, floor })) if (!(v! >= 0 && v! <= 1)) return { refused: `${k}=${args[k]} is out of 0 to 1` };
    const w = metricWeights(steps);
    if (!w) return { refused: `a bar of ${steps} steps splits into neither twos nor threes` };
    const leaned = w.map((x, i) => (1 - sync!) * x + sync! * w[(i + 1) % steps]!);
    return leaned.map((x) => (x >= 1 - density! - 1e-9 ? level(floor! + (peak! - floor!) * x) : '0')).join(' ');
  },
};
