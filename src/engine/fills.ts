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
  /**
   * The work one call may do, a count its code keeps (states expanded, steps), passed to it: past it, it refuses (decision
   * 085 §8). The fragment file's frontmatter declares it (`fuel:`), a built-in's manifest here. A braid fill must; there
   * is no default. It decides only whether the fill refuses, never which answer it gives.
   */
  readonly fuel?: number;
}

/**
 * A fill refused (decision 085 §8): no text, and why. Said as a warning on the piece's `from` line, `<id> refused: <why>`,
 * and the fill plays nothing, as a lap not filled in time does; the rest of the piece plays. At the WASM boundary, a
 * negative length with the reason at the pointer. A thrown error is no refusal: it is a bug in the code.
 */
export interface Refusal {
  readonly refused: string;
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
  /** The wire grammar its code reads its arguments in (the fragment's `wire:`; `docs/language/plugin-wire.md`): one newer than cells speaks is refused. Absent: 1. */
  readonly wire?: number;
  /** Seconds a step: its fills' `step=1` is one of these (`step=84bpm` as the old spelling wrote it). */
  readonly stepSeconds: number;
  /**
   * A fill's text at a lap (a braid's, lap 0): braid text (a mark's, a label), or a refusal. Pure: the same fill, lap,
   * arguments and fuel answer the same. A call site's fills are called one after another in the order of `fills`, so a
   * solver whose one search answers several may keep its last answer (085 §8.1).
   */
  fill(name: string, lap: number, args: Readonly<Record<string, string>>, fuel?: number): string | Refusal;
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
    x.mark && x.lap ? Array.from({ length: Math.round(f.cycle / x.lap) }, (_, k) => ({ at: k * x.lap! * f.stepSeconds, label: textOf(f.fill(name, k, {})) })) : [],
  );
}

/** A fill's answer as text: a refusal's is none (it plays nothing, 085 §8). */
export const textOf = (answer: string | Refusal): string => (typeof answer === 'string' ? answer : '');

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
