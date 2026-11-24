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
import type { CellDecl, Diagnostic, ParseResult, TakeLine } from '../ast';
import { IDENT, LineError, LineScanner, placeIn, stripComment } from './scanner';
import { parseBody, parseCell } from './cell';
import { splitPlugins } from '../plugins';
import { FROM_FORM, isUse, readFrom, USE_RETIRED } from './use';

export { groupingOf, meterLevels } from './generators';
export { readFrom, USE_RETIRED, type FromForm } from './use';

/** A text, parsed. */
export function parse(whole: string): ParseResult {
  const cells: CellDecl[] = [];
  const takes: TakeLine[] = [];
  const offers: string[] = [];
  // (plugin blocks are not cells: split off and blanked, so the lines keep their numbers)
  const { text: source, plugins, diagnostics: pluginDiagnostics } = splitPlugins(whole);
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
  lines.forEach(({ text: written, line: lineNo, parts }) => {
    const text = written;
    const s: LineScanner = new LineScanner(text, lineNo, 0, [], parts, diagnostics, 0, parseBody);
    if (s.done()) return;
    // a use line (decisions 054, 059): retired, an error, read the old way or not (#588)
    if (isUse(text)) {
      const col = text.search(/\S/);
      diagnostics.push({ severity: 'error', message: USE_RETIRED, span: { line: lineNo, col: col + 1, len: text.trimEnd().length - col } });
      return;
    }
    // a from line (decision 065): its cells are the expansion's (use.ts), a signature none of the text's own
    const from = readFrom(text);
    if (from !== undefined) {
      const col = text.search(/\S/);
      const span = { line: lineNo, col: col + 1, len: text.trimEnd().length - col };
      if (from === null) diagnostics.push({ severity: 'error', message: FROM_FORM, span });
      else if (from.kind === 'use') takes.push({ id: from.id, names: from.names, span });
      else if (from.kind === 'signature') offers.push(...from.names.map((n) => n.slice(1)));
      // (a declaration's attributes, decision 089: style= and facet= on any, a template's optional parameter on a signature)
      if (from && from.kind !== 'use')
        for (const a of from.attributes ?? []) {
          const name = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(a)?.[1];
          if (!name || name === 'style' || name === 'facet') continue;
          const optional = from.kind === 'signature' ? from.optional.map((o) => o.slice(1)) : [];
          if (!optional.includes(name))
            diagnostics.push({
              severity: 'error',
              message:
                from.kind === 'declaration'
                  ? `${name}=: a collection's declaration says where it is found, style= and facet= (decision 089)`
                  : `${name}= is no optional parameter of this template: a declaration's arguments are its optional parameters (${optional.length ? optional.map((o) => `${o}=`).join(' ') : 'it has none'}), beside style= and facet=`,
              span,
            });
        }
      return;
    }
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
      diagnostics.push({ severity: 'error', message: e.message, span: { ...placeIn(parts, e.col), len: e.len } });
      const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      if (name) broken.push(name);
    }
  });
  // (base=: each copy resolved into a plain cell, decision 026)
  return applyBases({ cells, diagnostics, broken, plugins, ...(takes.length ? { takes } : {}), ...(offers.length ? { offers } : {}) });
}

/**
 * A piece's card: its title, its description, its tags and its tier. From a file (`piecefile.ts`, decision 047): the
 * frontmatter's title, tags, tier and description (else the label of a card its text still has: a note named `&piece`,
 * as a text written before the description moved there). A text with no file has none: the card's `title=` and `tier=` are retired (#643).
 */
export interface PieceMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its tier of the tutorial (tier=), if it is one of its pieces. */
  readonly tier: number | null;
  /** The note it's on (in a file, its text's `&piece`), or null for none: a file says it all in its frontmatter. */
  readonly cell: string | null;
}

/** A label as plain text: fields dropped, formatting stripped, \n a space. */
export const plainLabel = (label: string): string =>
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

/** The name of the card a text keeps when its file's frontmatter doesn't say what the piece is yet (display.md). */
export const CARD = 'piece';

/** A piece's card, from a file; null for a text, which has none, and for a file without a title. */
export function pieceMeta(source: string): PieceMeta | null {
  if (isPieceFile(source)) {
    const file = readPiece(source);
    if ('problems' in file) return null;
    const { title, tags, tier, description } = file.frontmatter;
    if (typeof title !== 'string') return null;
    const note = parse(file.text).cells.find((c) => c.name === CARD && isNote(c));
    const tagList = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
    // (the frontmatter's description, else the label of the card the text still has)
    return card(title, typeof description === 'string' ? description : (note?.label ?? ''), tagList, typeof tier === 'number' ? tier : null, note?.name ?? null);
  }
  return null;
}
