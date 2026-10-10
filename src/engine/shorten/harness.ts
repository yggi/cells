/**
 * What every Shorten rule shares: the cells it may rewrite, how a suggestion's
 * saving is measured, and the note-for-note check a rule runs before it offers
 * a rewrite whose sound depends on its tables.
 */
import { compileSource } from '../compile';
import { ROOT, codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { declWords, spansLines } from '../edit';
import { flatten } from '../flatten';

export interface Suggestion {
  readonly id: string;
  readonly kind: 'run' | 'phrase' | 'fraction' | 'same' | 'default' | 'progression' | 'degree' | 'pan' | 'arrange';
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  /** Characters saved (a migration, `arrange`, may cost some). */
  readonly saving: number;
  readonly apply: (source: string) => string;
}

export type Result = ReturnType<typeof compileSource>;

/** A cell whose steps are written out one by one: its name, its braid's tokens, and whether its numbers are grid steps. */
export interface Candidate {
  readonly name: string;
  readonly tokens: string[];
  /** Transposable: its numbers are steps of a grid (no table between them and it). */
  readonly grid: boolean;
}

/** The cells whose steps are written out one by one, and safe to rewrite. */
export function candidates(source: string): { result: Result; cells: Candidate[] } {
  const r = compileSource(source);
  const readAsTable = new Set([...r.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
  const out: Candidate[] = [];
  for (const c of r.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.kit || c.note || c.map) continue;
    if (readAsTable.has(c.name) || spansLines(source, c.name)) continue;
    const w = declWords(source, c.name);
    if (!w || w.braid.length < 2 || w.braid.some((t) => t.startsWith('[') && t.includes('&'))) continue;
    const over = c.over ? r.cells.get(c.over) : null;
    if (over?.implicit && over.kit) continue; // a braid of voices: its steps are names, not numbers
    out.push({ name: c.name, tokens: w.braid, grid: readsGrid(r, c.name) });
  }
  return { result: r, cells: out };
}

/** The code's length: runs of spaces count as one (the padding that keeps comments aligned isn't code). */
export const size = (source: string) => source.replace(/[ \t]+/g, ' ').length;

/** A suggestion with its saving measured on its result; null when it saves nothing (or its rewrite fails). */
export const measured = (source: string, s: Omit<Suggestion, 'saving'>): Suggestion | null => {
  try {
    const next = s.apply(source);
    const saving = size(source) - size(next);
    return saving > 0 && next !== source ? { ...s, saving } : null;
  } catch {
    return null;
  }
};

/** Do these cells play the same notes (value, place, length) in both programs? */
export function sameNotes(a: string, b: string, names: readonly string[]): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!rb.ok) return false;
    const notes = (r: Result, n: string) =>
      flatten(r, n, codeShifts(r))
        .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
        .join(' ');
    return names.every((n) => notes(ra, n) === notes(rb, n));
  } catch {
    return false;
  }
}

/**
 * Are a cell's numbers steps of a grid wherever it is read? Its own over=, else the tables of every cell
 * that splices it (a motif without over= reads through its player's: a scale's degrees, maybe).
 */
function readsGrid(r: Result, name: string, path: readonly string[] = []): boolean {
  const c = r.cells.get(name);
  if (!c || path.includes(name)) return false;
  if (c.over) return !!r.cells.get(c.over)?.root;
  const users = [...r.cells.values()].filter((u) => u.units.some((x) => x.atom.kind === 'ref' && x.atom.name === name));
  return users.length === 0 ? !!r.cells.get(ROOT)?.root : users.every((u) => readsGrid(r, u.name, [...path, name]));
}

/**
 * How many seconds two spellings are compared over: Shorten's check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export const SAMENESS_SECONDS = 60;

/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export function samePiece(a: string, b: string, until = SAMENESS_SECONDS): boolean {
  try {
    const play = (src: string) => {
      const r = compileSource(src);
      if (!r.ok) return null;
      return eventsBetween(plan(r, codeShifts(r)), 0, until)
        .map(
          (e) =>
            `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(5)).join(',')} ${JSON.stringify([e.bends, e.levels, e.params ?? null, e.env ?? null])}`,
        )
        .sort()
        .join('\n');
    };
    const x = play(a);
    return x !== null && x === play(b);
  } catch {
    return false;
  }
}
