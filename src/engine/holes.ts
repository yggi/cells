/**
 * Plugin-fragments (decision 085): a fragment whose cells have holes, `fill()`, that its code fills with braid text. A
 * hole with a lap is a stream, filled lap by lap (lap n starts at n × its length, so any moment is found directly);
 * one without is a braid, filled once; a mark is a section, its text the label. The language reads what the code
 * writes: its notes go through the fragment's tables like any braid's.
 *
 * Rung 1 of #691 (#693): the built-ins only, run in-process (TypeScript, pure), named by `law=` until the `from`
 * spelling (rung 5). Cells never runs foreign code; a host does, behind this same interface.
 */
import { FIVETO12 } from './fiveto12';

/** A hole of a plugin-fragment. */
export interface Hole {
  /** Its lap, in steps: filled once a lap (a stream). None: filled once (a braid). */
  readonly lap?: number;
  /** A section per lap, its text the label: not a cell. */
  readonly mark?: true;
}

/** A plugin-fragment as cells reads it: its holes, the cells around them, and the code that fills them. */
export interface PluginFragment {
  readonly id: string;
  /** Its holes, by the name of the cell each one is (a mark's, by its own name). */
  readonly holes: Readonly<Record<string, Hole>>;
  /** Its cells, each hole written `fill()`; a timed hole's cell steps once a step (`step=1`) until rung 5 times it by its clock. */
  readonly block: string;
  /**
   * What it plays, as the terms of a product a voice joins (`&notes * &level`). (Its head, `&cycle [&notes * &level]`,
   * would be a product with no voice, which the mix algebra refuses: rung 5 spells it.)
   */
  readonly plays: string;
  /** Where lap 0 sits on the clock it reads, as an `anchor=` writes it (11.55: 11:55). */
  readonly origin: number;
  /** Steps until it comes round (a day). */
  readonly cycle: number;
  /** Seconds a step (until rung 5, where its head's `step=` is the rate). */
  readonly stepSeconds: number;
  /** A hole's text at a lap: braid text (a mark's, a label). Pure: the same hole, lap and arguments answer the same text. */
  fill(hole: string, lap: number, args: Readonly<Record<string, string>>): string;
}

/** The plugin-fragments cells ships, by the word `law=` names them with. */
export const BUILT_IN: ReadonlyMap<string, PluginFragment> = new Map([[FIVETO12.id, FIVETO12]]);

/** The built-in a cell's `law=` names, or null. */
export const lawOf = (params: Readonly<Record<string, number | string>> | undefined): PluginFragment | null =>
  (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;

/** Its shortest lap: the unit its notes are rendered in, one lap of each timed hole at a time. */
export const unitOf = (f: PluginFragment): number => Math.min(...Object.values(f.holes).flatMap((h) => (h.lap !== undefined && !h.mark ? [h.lap] : [])));

/** Its sections: each lap of a mark hole, where it starts (seconds from the start of its cycle) and its label. */
export function marksOf(f: PluginFragment): { at: number; label: string }[] {
  return Object.entries(f.holes).flatMap(([name, h]) =>
    h.mark && h.lap ? Array.from({ length: Math.round(f.cycle / h.lap) }, (_, k) => ({ at: k * h.lap! * f.stepSeconds, label: f.fill(name, k, {}) })) : [],
  );
}

/**
 * The cells of one unit's lap, its holes filled: each timed hole at the lap of its own that holds this unit's (a key's
 * mode for each of its bars), a braid hole at lap 0; marks are left out (they aren't cells).
 */
export function filledAt(f: PluginFragment, unitLap: number, args: Readonly<Record<string, string>> = {}): string {
  const unit = unitOf(f);
  const laps = Math.round(f.cycle / unit);
  const k = ((unitLap % laps) + laps) % laps;
  return f.block
    .split('\n')
    .map((line) => {
      const m = /^&([A-Za-z_][A-Za-z0-9_]*)\b/.exec(line);
      const h = m && f.holes[m[1]!];
      if (!h || !line.includes('fill()')) return line;
      return line.replace('fill()', f.fill(m[1]!, h.lap ? Math.floor((k * unit) / h.lap) : 0, args));
    })
    .join('\n');
}
