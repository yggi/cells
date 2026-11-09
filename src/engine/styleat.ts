/**
 * The style a piece plays at a time (#576 rung 5): each axis of `&style`, the section's style, as a voice reading
 * `&style[axis]` would read it then. A held axis is its value; a moving one (`bite=.2..0.9 * &drift`, a sum of cells,
 * a window of sliders, a mix of styles, a range of styles gliding over the piece) is its cell's value at that moment, as
 * `styles.ts` lays it. A frontend that plays a score's style itself (Jambot's radio, at each section's start) reads it so.
 *
 * It reads by asking: one line a style's axis is read on is added to the text for each axis, and its cell's series read
 * as a moving parameter reads it (`levelSeries`). The lines sound nothing, and what they warn of isn't said.
 */
import { compileSource } from './compile';
import { codeShifts, DEFAULT_ENV, type CompileOptions, type CompileResult, type Env } from './program';
import { plan, type Plan } from './realize';
import { levelSeries, valueThen } from './series';
import { AXES, STYLE } from './style';

/** The probe line's cell for an axis. */
const probe = (i: number) => `styleAtAxis${i}`;

/** The last piece read, kept: a score read at each section compiles once. */
let last: { key: readonly unknown[]; plan: Plan | null } | null = null;

/** The piece with a line reading each axis of `cell`, compiled and planned; null where it doesn't compile. */
function planned(source: string, cell: string, env: Env, options: CompileOptions): Plan | null {
  // (the same text, cell, env and options, each the same value: an option's function is the same by identity)
  const key = [source, cell, env, ...Object.entries(options).flat()];
  if (last && last.key.length === key.length && last.key.every((k, i) => k === key[i])) return last.plan;
  const lines = AXES.map((a, i) => `&${probe(i)} lpf=0..1 * &${cell}[${a.name}]`).join('\n');
  const result: CompileResult = compileSource(`${source.replace(/\n*$/, '')}\n${lines}\n`, env, options);
  const p = result.ok ? plan(result, codeShifts(result), result.off) : null;
  last = { key, plan: p };
  return p;
}

/**
 * The style `source` plays at `seconds`: a point, one value per axis (`AXES`, in their order), read from `&style` or the
 * cell named; null where the piece doesn't compile. Where no line writes the cell, it is the centre of style space, as
 * a voice reading it plays. Sliders (`free(…)`) read at their values as written.
 */
export function styleAt(source: string, seconds: number, options: CompileOptions & { readonly env?: Env; readonly cell?: string } = {}): readonly number[] | null {
  const { env = DEFAULT_ENV, cell = STYLE, ...compile } = options;
  const p = planned(source, cell, env, compile);
  if (!p) return null;
  const at = Math.max(0, seconds);
  return AXES.map((_, i) => {
    const factor = p.result.cells.get(probe(i))?.paramCells.lpf?.factors[0];
    // (read over a span past it, as paramAt reads: a span of nothing ends on a point that may be the next lap's)
    return factor === undefined ? NaN : valueThen(levelSeries(p, p.seriesOf(factor), at, at + 1), at, (x) => x.level);
  });
}
