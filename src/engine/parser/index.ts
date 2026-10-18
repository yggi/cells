/**
 * Parser for the cell language: one cell per line, attributes and a braid in any order; a line
 * ending in +, *, a comma or [ continues on the next. Errors are collected per line (a bad line
 * drops its cell, the rest is read). Every form it reads is in docs/language/reference.md,
 * generated from the tables in these modules (syntax.ts):
 *
 *   scanner.ts     a line: names, numbers, references (picks, shifts, ^n, ^$n), unnamed cells &( … )
 *   cell.ts        a cell's line: the attributes (KEYS, then parameters) and its braid
 *   braid.ts       steps (numbers, rests, chords, choices, cells) and their modifiers
 *   generators.ts  scan(…), euclid(…), sin(…), meter(…), spell(…)
 *   free.ts        free(…): a number left to the performer
 *   values.ts      step= / loop= (rates, units, clocks) and map= (kinds, grids, tables)
 *   mix.ts         a mix chord, kept as an expression (compile types it: algebra.ts)
 */
import { applyBases } from './base';
import { isNote } from '../ast';
import { isPieceFile, readPiece } from '../piecefile';
import type { CellDecl, Diagnostic, ParseResult } from '../ast';
import { IDENT, LineError, LineScanner, stripComment } from './scanner';
import { parseBody, parseCell, SHOWS } from './cell';
import { splitPlugins } from '../plugins';
import { BUILTIN_PLUGINS } from '../builtinPlugins';

export { meterLevels, SIGNATURES } from './generators';
export { SHOWS } from './cell';

export function parse(whole: string): ParseResult {
  const cells: CellDecl[] = [];
  // (plugin blocks are not cells: split off and blanked, so the lines keep their numbers)
  const { text: source, plugins, diagnostics: pluginDiagnostics } = splitPlugins(whole, [...SHOWS, ...BUILTIN_PLUGINS.map((p) => p.name)]);
  const diagnostics: Diagnostic[] = [...pluginDiagnostics];
  const broken: string[] = [];
  // a line ending in + * , or [ (outside comments) continues on the next one
  const lines: { text: string; line: number; parts: { line: number; start: number }[] }[] = [];
  let carry: { text: string; line: number; parts: { line: number; start: number }[] } | null = null;
  source.split('\n').forEach((raw, idx) => {
    const text = stripComment(raw);
    if (carry) {
      carry.text += ' ';
      carry.parts.push({ line: idx + 1, start: carry.text.length });
      carry.text += text;
    } else carry = { text, line: idx + 1, parts: [{ line: idx + 1, start: 0 }] };
    if (!/[+*,[]\s*$/.test(carry.text)) {
      lines.push(carry);
      carry = null;
    }
  });
  if (carry) lines.push(carry);
  lines.forEach(({ text, line: lineNo, parts }) => {
    const s: LineScanner = new LineScanner(text, lineNo, 0, [], parts, diagnostics, 0, parseBody);
    if (s.done()) return;
    try {
      const start = s.i;
      const word = s.match(IDENT);
      if (word === 'step' && s.peek() === '(') s.fail('step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm', start, 4);
      else if (word === 'out' && /^\s*[(=]/.test(s.text.slice(s.i))) s.fail('out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix', start, 3);
      else if (word === 'cell') s.fail('The cell keyword is gone: a line starting with &name declares a cell', start, 4);
      else if (word === null) {
        s.i = start;
        const decl = parseCell(s);
        cells.push(decl, ...s.lambdas);
      } else s.fail(`A line declares a cell: &name …`, start, word.length);
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      diagnostics.push({ severity: 'error', message: e.message, span: { line: lineNo, col: e.col + 1, len: e.len } });
      const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      if (name) broken.push(name);
    }
  });
  // (base=: each copy resolved into a plain cell, decision 026)
  return applyBases({ cells, diagnostics, broken, plugins });
}

/**
 * A piece's card: its title, its description (the label of its card, as plain text), its tags and its tier. From a file
 * (`piecefile.ts`, decision 047): the frontmatter's title, tags, tier and description (else the label of the text's first note). From a
 * text written the old way: the first note with a title=, its title=, label=, tags= and tier= (a warning says they now go
 * in the frontmatter, and Shorten moves them there).
 */
export interface PieceMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its tier of the tutorial (tier=), if it is one of its pieces. */
  readonly tier: number | null;
  /** The note it's on (in a file, the text's first note), or null for none. */
  readonly cell: string | null;
}

/** A label as plain text: fields dropped, formatting stripped, \n a space. */
const plainLabel = (label: string) =>
  label
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function card(title: string, label: string, tagList: readonly string[], tier: number | null, cell: string | null): PieceMeta {
  const plain = plainLabel(label);
  const tags = tagList
    .map((t) => t.trim()) // (as written: names keep their capitals — Bach, Wendy Carlos)
    .filter(Boolean)
    // (once each, whatever the case: the first spelling stays)
    .filter((t, i, all) => all.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i);
  // (a description that opens with the title doesn't need to say it twice)
  const description = plain.toLowerCase().startsWith(title.toLowerCase()) ? plain.slice(title.length).replace(/^[\s,.:;—–-]+/, '') : plain;
  return { title, description, tags, tier, cell };
}

/** A piece's card, from a file or from a text written the old way; null without a title. */
export function pieceMeta(source: string): PieceMeta | null {
  if (isPieceFile(source)) {
    const file = readPiece(source);
    if ('problems' in file) return null;
    const { title, tags, tier, description } = file.frontmatter;
    if (typeof title !== 'string') return null;
    const note = parse(file.text).cells.find(isNote);
    const tagList = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
    // (the frontmatter's description, else the label of the text's first note)
    return card(title, typeof description === 'string' ? description : (note?.label ?? ''), tagList, typeof tier === 'number' ? tier : null, note?.name ?? null);
  }
  const d = parse(source).cells.find((c) => c.title);
  if (!d) return null;
  return card(d.title!, d.label ?? '', (d.tags ?? '').split(','), d.tier ?? null, d.name);
}
