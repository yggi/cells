/**
 * A text's structure, measured as decision 049 rules Shorten's measure (its question 2, the owner's ruling): each leaf a
 * braid writes, one per attribute value, one per cell, over the normal form, names and comments free. Shorten ranks by
 * it (#157); `npm run structure` reports it (`tools/structure.ts`, #182). Lifted from tools/structure.ts (#182) so the
 * language can read it. Pure.
 *
 * - **A leaf** is what the parser reads as one step of a braid: a number, a rest, a reference (`&x^$7`, `&x[0]`), `x!n`
 *   and `x@n` one leaf; a chord or a choice its entries; a subsequence its leaves; a mix its cells and numbers. A
 *   `scan(…)` its written numbers (`1!432` one), a `meter("4/4")` or a wave (`sin(16)`) one.
 * - **A copy** (`base=&x`, decision 026) is measured as written, its own steps (`=!3 12@2`: two leaves), not the braid
 *   the parser resolves it to; its `base=` is an attribute value.
 * - **An attribute value** is each `key=value` a line writes (in an unnamed cell `&( … )` too), and each flag (`off`,
 *   `oneshot`). How a cell is shown and named costs nothing: `label=` `show=` `tags=` `title=` `tier=` `about=` `size=`.
 * - **A cell** is every cell declared, an unnamed one too, but a note (a cell that only explains: `isNote`).
 */
import type { Atom, Braid, CellDecl, Expr, Token } from './ast';
import { isNote } from './ast';
import { normalise } from './normalise/index';
import { parse } from './parser';

/** What a text's structure is made of, and their sum (decision 049's measure). */
export interface Structure {
  readonly cells: number;
  readonly leaves: number;
  readonly attributes: number;
  readonly total: number;
}

/** A cell's share of the measure. */
export interface CellStructure extends Structure {
  readonly name: string;
}

/** The attributes that only show or name a cell: they cost nothing. */
const FREE = new Set(['label', 'show', 'tags', 'title', 'tier', 'about', 'size']);

const exprLeaves = (e: Expr): number =>
  e.k === 'ref' || e.k === 'num' ? 1 : e.k === 'sum' ? e.items.reduce((n, i) => n + exprLeaves(i.e), 0) : e.factors.reduce((n, f) => n + exprLeaves(f), 0);

function atomLeaves(a: Atom): number {
  switch (a.kind) {
    case 'chord':
      return a.notes.length;
    case 'choice':
      return a.values.length;
    case 'seq':
      return a.layers.reduce((n, layer) => n + tokenLeaves(layer), 0);
    case 'mix':
      return a.exprs.reduce((n, e) => n + exprLeaves(e), 0);
    default:
      return 1;
  }
}

const tokenLeaves = (tokens: readonly Token[]): number => tokens.reduce((n, t) => n + atomLeaves(t.atom), 0);

/** A braid's leaves; a scan's as written (`1!432` one), from its span in the text. */
function braidLeaves(braid: Braid, lines: readonly string[]): number {
  switch (braid.kind) {
    case 'blank':
      return 0;
    case 'wave':
      return 1;
    case 'scan': {
      const { line, col, len } = braid.span;
      const written = (lines[line - 1] ?? '').slice(col - 1, col - 1 + len).replace(/^scan\(|\)$/g, '');
      return written.split(/[\s,]+/).filter(Boolean).length;
    }
    case 'list':
      return braid.signature ? 1 : tokenLeaves(braid.tokens);
  }
}

/** Each logical line (a line ending in `+ * , [` goes on), its comment and its quoted strings gone, by its first line. */
function logicalLines(text: string): Map<number, string> {
  const out = new Map<number, string>();
  let start = 0;
  let carry: string | null = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/"[^"]*"/g, '""').replace(/#.*$/, '');
    if (carry === null) start = i + 1;
    carry = carry === null ? line : `${carry} ${line}`;
    if (!/[+*,[]\s*$/.test(carry)) {
      out.set(start, carry);
      carry = null;
    }
  });
  if (carry !== null) out.set(start, carry);
  return out;
}

/** The attribute values a line writes: each `key=` but the free ones, and each flag. */
const attributesOf = (line: string): number =>
  [...line.matchAll(/(?:^|[\s(])([A-Za-z][A-Za-z0-9]*)=/g)].filter((m) => !FREE.has(m[1]!)).length + [...line.matchAll(/(?:^|\s)(off|oneshot)(?=\s|$)/g)].length;

/** A text's cells, each with its share of the measure, in the order declared (an unnamed cell's share is its line's). */
export function structureByCell(text: string, { asWritten = false } = {}): CellStructure[] {
  const source = asWritten ? text : normalise(text).source;
  // (a copy as written: its base= taken out, so the parser keeps its own steps, = among them, unresolved)
  const written = source.replace(/(^|[\s(])base=&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+)?/gm, '$1');
  const lines = written.split('\n');
  const cells = parse(written).cells.filter((d: CellDecl) => !isNote(d));
  const logical = logicalLines(source);
  const firstOnLine = new Set<number>();
  return cells.map((d) => {
    const leaves = braidLeaves(d.braid, lines);
    // (a line's attributes are its first cell's: an unnamed cell on it shares the line)
    const line = d.span.line;
    const attributes = !d.lambda && !firstOnLine.has(line) && logical.has(line) ? attributesOf(logical.get(line)!) : 0;
    if (!d.lambda) firstOnLine.add(line);
    return { name: d.name, cells: 1, leaves, attributes, total: 1 + leaves + attributes };
  });
}

/** A text's structure: its cells', summed. */
export function structureOf(text: string, options: { asWritten?: boolean } = {}): Structure {
  const cells = structureByCell(text, options);
  const sum = (k: keyof Structure) => cells.reduce((n, c) => n + c[k], 0);
  return { cells: sum('cells'), leaves: sum('leaves'), attributes: sum('attributes'), total: sum('total') };
}
