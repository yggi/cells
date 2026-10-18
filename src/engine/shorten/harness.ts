/**
 * What every Shorten rule shares: the cells it may rewrite, and how a rewrite's saving is measured, so it is offered
 * as a suggestion. The note-for-note check a rule runs before it offers a rewrite is the tools' own (`../sameness`),
 * re-exported here as it was before #155.
 */
import { compileSource } from '../compile';
import { ROOT } from '../program';
import { declWords, spansLines } from '../edit';
import type { Rewrite } from '../rewrite';

export { samePiece, sameNotes, SAMENESS_SECONDS } from '../sameness';

export interface Suggestion {
  readonly id: string;
  readonly kind: 'run' | 'phrase' | 'fraction' | 'same' | 'default' | 'progression' | 'degree' | 'pan' | 'gate' | 'alias' | 'tap' | 'swing' | 'section' | 'card';
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  /** Characters saved. */
  readonly saving: number;
  /** The rewrite: the text, shorter or migrated; for a `card`, the piece as a file (decision 047). */
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

/** What a rewrite saves (characters, `size`), or null when it changes nothing or its rewrite fails. */
export const saves = (source: string, r: Pick<Rewrite, 'apply'>): number | null => {
  try {
    const next = r.apply(source);
    return next === source ? null : size(source) - size(next);
  } catch {
    return null;
  }
};

/** A Shorten rule's rewrite: offered as a suggestion of the rule's kind. */
export type ShortenRewrite = Rewrite<Suggestion['kind']>;

/** A rewrite offered as a suggestion, its saving measured on its result (a rule has checked it changes the text). */
export const suggestion = (source: string, r: ShortenRewrite): Suggestion => ({
  id: r.id,
  kind: r.rule,
  title: r.title,
  before: r.before,
  after: r.after,
  saving: saves(source, r) ?? 0,
  apply: r.apply,
});

/** A suggestion with its saving measured on its result; null when it saves nothing (or its rewrite fails). Kept for the public subpath. */
export const measured = (source: string, s: Omit<Suggestion, 'saving'>): Suggestion | null => {
  const saving = saves(source, s);
  return saving !== null && saving > 0 ? { ...s, saving } : null;
};

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
