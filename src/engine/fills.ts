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
import type { CompileResult, ResolvedCell } from './program';
import type { Expr } from './ast';

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
  /** Where lap 0 sits on the clock it reads, as an `anchor=` writes it (11.55: 11:55). */
  readonly origin: number;
  /** Steps until it comes round (a day). */
  readonly cycle: number;
  /** Seconds a step: its fills' `step=1` is one of these (`step=84bpm` as the old spelling wrote it). */
  readonly stepSeconds: number;
  /** A fill's text at a lap: braid text (a mark's, a label). Pure: the same fill, lap and arguments answer the same text. */
  fill(name: string, lap: number, args: Readonly<Record<string, string>>): string;
}

/** The plugin-fragments cells ships, by the word `law=` names them with. */
export const BUILT_IN: ReadonlyMap<string, PluginFragment> = new Map([[FIVETO12.id, FIVETO12]]);

/** The built-ins by their fragment file's id (`five_to_twelve`): what a `from` line's copy names its fills by. */
export const BY_FRAGMENT: ReadonlyMap<string, PluginFragment> = new Map([...BUILT_IN.values()].map((f) => [f.fragment, f]));

/**
 * The built-in a cell's `law=` names, or null. Since #792 no compiled cell has `law=` (the old spelling is read as its
 * `from` line): kept for a frontend that called it (`engine/holes.ts`), it finds nothing; `lawAt` reads a program.
 */
export const lawOf = (params: Readonly<Record<string, number | string>> | undefined): PluginFragment | null =>
  (typeof params?.law === 'string' && BUILT_IN.get(params.law)) || null;

/** The stream fills of a program: each cell a `from` line's copy marks as a fill of a built-in with a lap (#792). */
const streamsIn = (result: CompileResult): { cell: ResolvedCell; law: PluginFragment }[] =>
  [...result.cells.values()].flatMap((cell) => {
    const law = cell.fill?.fragment ? BY_FRAGMENT.get(cell.fill.fragment) : undefined;
    return law && law.fills[cell.fill?.name ?? '']?.lap !== undefined ? [{ cell, law }] : [];
  });

/** The built-in law a program plays, or null: the first stream fill's (a piece's length and sections, `duration.ts`). */
export const lawIn = (result: CompileResult): PluginFragment | null => streamsIn(result)[0]?.law ?? null;

/** The built-in law that reads a clock (`from five_to_twelve &day`: `lawAt(result, 'day')`), or null: what a frontend draws on that clock (the sun). */
export const lawAt = (result: CompileResult, clock: string): PluginFragment | null => streamsIn(result).find((x) => x.cell.fill?.clock === clock)?.law ?? null;

/** Its shortest lap: the unit its notes are rendered in, one lap of each timed fill at a time. */
export const unitOf = (f: PluginFragment): number => Math.min(...Object.values(f.fills).flatMap((x) => (x.lap !== undefined && !x.mark ? [x.lap] : [])));

/** Its sections: each lap of a mark, where it starts (seconds from the start of its cycle) and its label. */
export function marksOf(f: PluginFragment): { at: number; label: string }[] {
  return Object.entries(f.fills).flatMap(([name, x]) =>
    x.mark && x.lap ? Array.from({ length: Math.round(f.cycle / x.lap) }, (_, k) => ({ at: k * x.lap! * f.stepSeconds, label: f.fill(name, k, {}) })) : [],
  );
}

/** The cells an expression of a mix names. */
const namedIn = (e: Expr): string[] => (e.k === 'ref' ? [e.ref.name] : e.k === 'sum' ? e.items.flatMap((x) => namedIn(x.e)) : e.k === 'prod' ? e.factors.flatMap(namedIn) : []);

/**
 * Whether a cell is a stream's (#792): a fill itself, or the head that names its fills (`&cycle [&cycle_notes *
 * &cycle_level]`); and if so, the clock its call site gave (null: none). Undefined for any other cell. What the old
 * `law=` cell was: an `anchor=` on it belongs on that clock (`roles.ts`), and it is no clock of the piece's (`duration.ts`).
 */
export function streamClockOf(cells: ReadonlyMap<string, ResolvedCell>, c: ResolvedCell): string | null | undefined {
  if (c.fill?.fragment) return c.fill.clock;
  const atom = c.units.length === 1 ? c.units[0]!.atom : null;
  if (atom?.kind !== 'mix') return undefined;
  for (const e of atom.exprs)
    for (const n of namedIn(e)) {
      const f = cells.get(n)?.fill;
      if (f?.fragment) return f.clock;
    }
  return undefined;
}
