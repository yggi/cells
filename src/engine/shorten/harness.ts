/**
 * What every Shorten rule shares: the cells it may rewrite, and how a rewrite's saving is measured, so it is offered
 * as a suggestion. The note-for-note check a rule runs before it offers a rewrite is the tools' own (`../sameness`),
 * re-exported here as it was before #155.
 */
import { compileSource } from '../compile';
import { ROOT, type CompileOptions } from '../program';
import { declWords, spansLines } from '../edit';
import type { Rewrite } from '../rewrite';
import { structureOf } from '../measure';
import { parse } from '../parser';

export { samePiece, sameNotes, SAMENESS_SECONDS } from '../sameness';

export interface Suggestion {
  readonly id: string;
  /** (`gate`, `tap`, `swing` and `section` are Migrate's since v0.16 and never offered: kept in the type so a frontend's switch on them still typechecks) */
  readonly kind: 'run' | 'phrase' | 'fraction' | 'same' | 'default' | 'progression' | 'degree' | 'pan' | 'gate' | 'alias' | 'tap' | 'swing' | 'section' | 'card';
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  /** The structure saved (decision 049's measure, `structure`): leaves, attribute values and cells. Characters before #157. */
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

/** The cells whose steps are written out one by one, and safe to rewrite: the piece's own (a used line is its fragment's, #241). */
export function candidates(source: string, options: CompileOptions = {}): { result: Result; cells: Candidate[] } {
  const r = compileSource(source, undefined, options);
  const used = usedNames(r);
  const readAsTable = new Set([...r.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
  const out: Candidate[] = [];
  for (const c of r.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.kit || c.note || c.map || used.has(c.name)) continue;
    if (readAsTable.has(c.name) || spansLines(source, c.name)) continue;
    const w = declWords(source, c.name);
    if (!w || w.braid.length < 2 || w.braid.some((t) => t.startsWith('[') && t.includes('&'))) continue;
    const over = c.over ? r.cells.get(c.over) : null;
    if (over?.implicit && over.kit) continue; // a braid of voices: its steps are names, not numbers
    out.push({ name: c.name, tokens: w.braid, grid: readsGrid(r, c.name) });
  }
  return { result: r, cells: out };
}

/** The names a piece's `use` lines gave it (bare): their lines are the fragments', not the piece's to rewrite. */
export const usedNames = (r: Result): ReadonlySet<string> => new Set((r.uses ?? []).flatMap((u) => u.gave.map((n) => n.replace(/^&/, ''))));

/** The code's length: runs of spaces count as one (the padding that keeps comments aligned isn't code). Shorten's measure until #157. */
export const size = (source: string) => source.replace(/[ \t]+/g, ' ').length;

/**
 * A text's structure, Shorten's measure (decision 049, question 2; #157): each leaf a braid writes, one per attribute
 * value, one per cell, names and comments free (`structureOf`). Taken as written: a rewrite of Shorten's changes the
 * structure and never the spelling, so the normal form (which the measure is defined over, so that two authors'
 * spellings compare) moves with it and the saving is the same; it costs a parse, where normalising costs a compile a round.
 */
export const structure = (source: string) => structureOf(source, { asWritten: true }).total;

/** What a rewrite saves (structure, `structure`), or null when it changes nothing or its rewrite fails. */
export const saves = (source: string, r: Pick<Rewrite, 'apply'>): number | null => {
  try {
    const next = r.apply(source);
    // (a rewrite the parser refuses saves nothing: its broken line would measure as empty)
    return next === source || parse(next).broken?.length ? null : structure(source) - structure(next);
  } catch {
    return null;
  }
};

/**
 * What a respelling saves in characters (`size`): for the rules that write the same structure another way, kept in
 * Shorten until #27 rules their rows (`alias`, `fraction`, `progression`; decision 049), offered where they are shorter.
 */
export const savesChars = (source: string, r: Pick<Rewrite, 'apply'>): number | null => {
  try {
    const next = r.apply(source);
    return next === source || parse(next).broken?.length ? null : size(source) - size(next);
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
