/**
 * Parser for the cell language: one cell per line, attributes and a braid in any order; a line
 * ending in +, *, a comma or [ continues on the next. Errors are collected per line (a bad line
 * drops its cell, the rest is read). Every form it reads is in docs/language/reference.md,
 * generated from the tables in these modules (syntax.ts):
 *
 *   scanner.ts     a line: names, numbers, references (picks, shifts, ^n), unnamed cells &( … )
 *   cell.ts        a cell's line: the attributes (KEYS, then parameters) and its braid
 *   braid.ts       steps (numbers, rests, chords, choices, cells) and their modifiers
 *   generators.ts  scan(…), euclid(…), sin(…), meter(…), spell(…)
 *   free.ts        free(…): a number left to the performer
 *   values.ts      step= / loop= (rates, units, clocks) and map= (kinds, grids, tables)
 *   mix.ts         a mix chord, kept as an expression (compile types it: algebra.ts)
 */
import type { CellDecl, Diagnostic, ParseResult } from '../ast';
import { IDENT, LineError, LineScanner, stripComment } from './scanner';
import { parseCell } from './cell';

export { meterLevels } from './generators';
export { SHOWS } from './cell';

export function parse(source: string): ParseResult {
  const cells: CellDecl[] = [];
  const diagnostics: Diagnostic[] = [];
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
    const s: LineScanner = new LineScanner(text, lineNo, 0, [], parts, diagnostics);
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
    }
  });
  return { cells, diagnostics };
}

/** A piece's card: the first note with a title= — its title, its description (the label, as plain text), its tags. */
export interface PieceMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** The note it's on. */
  readonly cell: string;
}

export function pieceMeta(source: string): PieceMeta | null {
  const d = parse(source).cells.find((c) => c.title);
  if (!d) return null;
  const plain = (d.label ?? '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tags = (d.tags ?? '')
    .split(',')
    .map((t) => t.trim()) // (as written: names keep their capitals — Bach, Wendy Carlos)
    .filter(Boolean)
    // (once each, whatever the case: the first spelling stays)
    .filter((t, i, all) => all.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i);
  // (a description that opens with the title doesn't need to say it twice)
  const description = plain.toLowerCase().startsWith(d.title!.toLowerCase()) ? plain.slice(d.title!.length).replace(/^[\s,.:;—–-]+/, '') : plain;
  return { title: d.title!, description, tags: [...new Set(tags)], cell: d.name };
}
