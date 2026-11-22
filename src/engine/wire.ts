/**
 * What a plugin-fragment's code is handed for an argument (decision 085 §8.3, #749; `docs/language/plugin-wire.md`):
 * the argument's core, written in the wire grammar, version 1. A number or a word is passed as written. Anything else
 * is compiled where its `from` line stands and written as the steps it plays: references written in, picks, shifts,
 * repeats and transpositions applied, the sugar gone (`flatten`), so a plugin parses no more of the language than this
 * and a renamed text (L1) hands it the same arguments. An argument read over a key is handed that key too, resolved to
 * semitones, so a plugin holds no scale table. What the grammar can't carry (chance, `free()`, a note by name, a key
 * that moves) is refused, with why.
 */
import { parse } from './parser';
import { compile } from './compiler';
import { DEFAULT_ENV, codeShifts, type CompileResult } from './program';
import { flatten, stepsOf, type StepEvent } from './flatten';
import { entries, resolveIn, semitones, tableChain } from './helix';
import { readsOf } from './reads';
import type { CellDecl } from './ast';

/** The wire grammar's version (`wire: 1`): a change to what it may hold bumps it. */
export const WIRE = 1;

/** The name an argument is compiled under: no cell of a text can have it (a name starts with a letter or `_`, and this has two). */
const ARG = '__wire_arg';

/** A number or a word: passed as written (`12`, `3/4`, `-2`, `dorian`, `C4`). */
const PLAIN = /^(-?\d+(\.\d+)?(\/\d+)?|[A-Za-z_][A-Za-z0-9_#-]*)$/;

/** An argument as the wire hands it: its text, and the key it is read over (semitones from C, tonic first), if any. */
export interface WireArg {
  readonly text: string;
  readonly key?: string;
}

/** A number as the wire writes it: an integer, or a fraction of small terms (`3/2`); null where it is neither. */
function written(x: number): string | null {
  for (let d = 1; d <= 64; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) return d === 1 ? String(n) : `${n}/${d}`;
  }
  return null;
}

/** A step's pitch as the wire writes it: its degree, then its accidental as `#`s or `b`s (a `^$n` folded in). */
const pitch = (e: StepEvent): string | null => {
  const v = written(e.value);
  const alter = e.alter + (e.transpose ?? 0);
  if (v === null || !Number.isInteger(alter)) return null;
  return `${v}${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}`;
};

/**
 * An argument's core in the wire grammar, or why it can't be one. `context` is the text its `from` line stands in, its
 * `from` lines left out (what they give is not yet there to read: a fill as an argument is #749's next step).
 */
export function wireArg(value: string, context: string): WireArg | { refused: string } {
  if (PLAIN.test(value)) return { text: value };
  if (/\bfree\(/.test(value)) return { refused: 'free() is a hand, and a plugin is handed no hands (wire 1)' };
  let result: CompileResult;
  let decls: ReadonlyMap<string, CellDecl>;
  try {
    const parsed = parse(`${context}\n&${ARG} ${value}`);
    decls = new Map(parsed.cells.map((d) => [d.name, d]));
    result = compile(parsed, DEFAULT_ENV);
  } catch (e) {
    return { refused: `${value} doesn't read: ${e instanceof Error ? e.message : String(e)}` };
  }
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length || !result.cells.has(ARG)) return { refused: `${value} doesn't read: ${errors[0]?.message ?? 'no cell'}` };
  // (a fill is handed as its answer, 085 §8.3: one with none, a stream's laps or a refused fill, can't be)
  const unanswered = [...result.cells.values()].find((c) => c.fill && new RegExp(`&${c.name}(?![A-Za-z0-9_])`).test(value));
  if (unanswered) return { refused: `&${unanswered.name} is a fill with no answer to hand (a stream's, or one refused): a braid fill is handed answers (wire 1)` };
  const shifts = codeShifts(result);
  const events = flatten(result, ARG, shifts);
  const lap = stepsOf(result, ARG, null);
  // (what the grammar can't carry: chance, a note by name, a hand)
  if (events.some((e) => e.chance !== undefined || e.options || e.chosen)) return { refused: `${value} draws by chance, and a plugin can't draw cells' (wire 1)` };
  if (events.some((e) => e.named)) return { refused: `${value} names a note: write it as a degree (wire 1)` };
  if (events.some((e) => e.laps || e.via || e.reads)) return { refused: `${value} changes from lap to lap, or reads a value as it moves: a braid fill is filled once (wire 1)` };
  if (events.some((e) => (result.cells.get(e.cell)?.frees.length ?? 0) > 0)) return { refused: 'free() is a hand, and a plugin is handed no hands (wire 1)' };
  // (its steps in order, a chord where several start together and last as long; the gaps rests)
  const starts = [...new Set(events.map((e) => e.step))].sort((a, b) => a - b);
  const out: string[] = [];
  let at = 0;
  for (const s of starts) {
    const here = events.filter((e) => e.step === s);
    const duration = here[0]!.duration;
    if (here.some((e) => Math.abs(e.duration - duration) > 1e-9) || s < at - 1e-9) return { refused: `${value} overlaps its own notes: a flat braid can't write it (wire 1)` };
    if (s > at + 1e-9) out.push(`~${length(s - at)}`);
    const pitches = here.map(pitch);
    if (pitches.some((p) => p === null) || written(duration) === null || written(s) === null) return { refused: `${value} has a step the wire can't write` };
    out.push(`${pitches.length === 1 ? pitches[0] : `[${pitches.join(', ')}]`}${length(duration)}`);
    at = s + duration;
  }
  if (lap > at + 1e-9) out.push(`~${length(lap - at)}`);
  const text = out.join(' ');
  // (the key it is read over: one table for every step, still, resolved to semitones from C, tonic first)
  const tables = [...new Set(events.map((e) => `${e.table}|${e.tableShift}`))];
  if (tables.length > 1) return { refused: `${value} is read over ${tables.length} keys: a plugin is handed one (wire 1)` };
  const table = events[0]?.table;
  const cell = table ? result.cells.get(table) : undefined;
  if (!table || !cell || cell.root) return { text };
  if (moves(tableChain(result, table), decls)) return { refused: `${value} is read over a key that moves, and a plugin is handed one key (wire 1)` };
  const tableShift = events[0]!.tableShift;
  const key = Array.from({ length: entries(result, table, 0).length }, (_, i) => {
    const r = resolveIn(result, table, tableShift, i, 0, shifts);
    return written(semitones(result, r.root, r.position)) ?? String(semitones(result, r.root, r.position));
  }).join(' ');
  return { text, key };
}

/** A length as the wire writes it after a step: nothing for 1, else `@n`. */
const length = (x: number): string => (Math.abs(x - 1) < 1e-9 ? '' : `@${written(x) ?? x}`);

/** Whether a key moves: a cell it is read through, or any it reads (a `scale(…)`'s tonic or mode), steps. */
function moves(chain: readonly string[], decls: ReadonlyMap<string, CellDecl>): boolean {
  const seen = new Set<string>();
  for (const queue = [...chain]; queue.length;) {
    const n = queue.shift()!;
    if (seen.has(n)) continue;
    seen.add(n);
    const d = decls.get(n);
    if (!d) continue;
    if (d.step) return true;
    queue.push(...readsOf(d).map((r) => r.name));
  }
  return false;
}
