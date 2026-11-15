/**
 * Plugin-fragments (decision 085): a fragment some of whose cells are fills, `fill()`, that its code fills with braid
 * text. (A fill, not a hole: decision 047's holes are what a fragment uses and doesn't define, `repository/holes.ts`.)
 * A fill with a lap is a stream, filled lap by lap (lap n starts at n × its length, so any moment is found directly);
 * one without is a braid, filled once; a mark is a section, its text the label. The language reads what the code
 * writes: its notes go through the fragment's tables like any braid's.
 *
 * A built-in's fragment file (`fragments/laws/fiveto12.md`, `runtime: builtin`, decision 090) is resolved by the host's
 * library like any fragment; this module holds its code, run in-process (TypeScript, pure), by its id. Cells never runs
 * foreign code; a host does, behind this same interface.
 */
import { FIVETO12 } from './fiveto12';

/** A fill of a plugin-fragment: a cell whose braid its code writes. */
export interface Fill {
  /** Its lap, in steps: filled once a lap (a stream). None: filled once (a braid). */
  readonly lap?: number;
  /** A section per lap, its text the label: not a cell. */
  readonly mark?: true;
}

/** A plugin-fragment as cells reads it: its fills, the cells around them, and the code that fills them. */
export interface PluginFragment {
  /** Its word: `law=fiveto12` and its code's key. */
  readonly id: string;
  /** The id of its fragment file, what a piece takes it from (`from five_to_twelve`): pieces and fragments share one namespace, and an example is `fiveto12`. */
  readonly fragment: string;
  /** Its fills, by the name of the cell each one is (a mark's, by its own name). */
  readonly fills: Readonly<Record<string, Fill>>;
  /** Its cells, each fill written `fill()`; a timed fill's cell steps once a step (`step=1`) until rung 5 times it by its clock. */
  readonly block: string;
  /**
   * Its head: the cell of its block a piece plays on its voice (`cycle`, its block's `&cycle [&notes * &level]`: notes
   * with their levels, a product with no voice, decision 087), its places on its lines (`pan=` on a line, #739).
   */
  readonly head: string;
  /** Where lap 0 sits on the clock it reads, as an `anchor=` writes it (11.55: 11:55). */
  readonly origin: number;
  /** Steps until it comes round (a day). */
  readonly cycle: number;
  /** Seconds a step (until rung 5, where its head's `step=` is the rate). */
  readonly stepSeconds: number;
  /** A fill's text at a lap: braid text (a mark's, a label). Pure: the same fill, lap and arguments answer the same text. */
  fill(name: string, lap: number, args: Readonly<Record<string, string>>): string;
}

/** The plugin-fragments cells ships, by the word `law=` names them with. */
export const BUILT_IN: ReadonlyMap<string, PluginFragment> = new Map([[FIVETO12.id, FIVETO12]]);

/** The built-in a cell's `law=` names, or null. */
export const lawOf = (params: Readonly<Record<string, number | string>> | undefined): PluginFragment | null =>
  (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;

/** Its shortest lap: the unit its notes are rendered in, one lap of each timed fill at a time. */
export const unitOf = (f: PluginFragment): number => Math.min(...Object.values(f.fills).flatMap((x) => (x.lap !== undefined && !x.mark ? [x.lap] : [])));

/** Its sections: each lap of a mark, where it starts (seconds from the start of its cycle) and its label. */
export function marksOf(f: PluginFragment): { at: number; label: string }[] {
  return Object.entries(f.fills).flatMap(([name, x]) =>
    x.mark && x.lap ? Array.from({ length: Math.round(f.cycle / x.lap) }, (_, k) => ({ at: k * x.lap! * f.stepSeconds, label: f.fill(name, k, {}) })) : [],
  );
}

/**
 * The cells of one unit's lap, filled: each timed fill at the lap of its own that holds this unit's (a key's mode for
 * each of its bars), a braid fill at lap 0; marks are left out (they aren't cells).
 */
export function filledAt(f: PluginFragment, unitLap: number, args: Readonly<Record<string, string>> = {}): string {
  const unit = unitOf(f);
  const laps = Math.round(f.cycle / unit);
  const k = ((unitLap % laps) + laps) % laps;
  return f.block
    .split('\n')
    .map((line) => {
      const m = /^&([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line);
      const x = m && f.fills[m[1]!];
      if (!x || !line.includes('fill()')) return line;
      return line.replace('fill()', f.fill(m[1]!, x.lap ? Math.floor((k * unit) / x.lap) : 0, args));
    })
    .join('\n');
}
