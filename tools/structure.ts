/**
 * A text's structure, measured as decision 049 rules Shorten's measure (its question 2, the owner's ruling): each leaf a
 * braid writes, one per attribute value, one per cell, over the normal form, names and comments free. The rung that
 * builds it into Shorten is #157; until then this tool reports it, for a pull request that claims a text more compact
 * by structure (#177: BWV 847 by hand, 1,396 → 1,125).
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/structure.ts \
 *     [--cells] [--as-written] <input>...
 *
 * An input is `example:<key>` (examples/<key>.md), a piece or fragment file (`.md`, its cells block) or a `.cells` text.
 * `--cells` adds a row per cell; `--as-written` measures the text as it is, not `normalise(text)`.
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
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Atom, Braid, CellDecl, Expr, Token } from '../src/engine/ast';
import { isNote } from '../src/engine/ast';
import { normalise } from '../src/engine/normalise/index';
import { parse } from '../src/engine/parser';
import { isPieceFile, readPiece } from '../src/engine/piecefile';

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
export function cellsOf(text: string, { asWritten = false } = {}): CellStructure[] {
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
  const cells = cellsOf(text, options);
  const sum = (k: keyof Structure) => cells.reduce((n, c) => n + c[k], 0);
  return { cells: sum('cells'), leaves: sum('leaves'), attributes: sum('attributes'), total: sum('total') };
}

/** An input's cells text: an example by key, a piece or fragment file's cells block, or a `.cells` text. */
export function textOf(input: string): string {
  const path = input.startsWith('example:') ? `examples/${input.slice('example:'.length)}.md` : input;
  const file = readFileSync(path, 'utf8');
  if (!path.endsWith('.md')) return file;
  if (isPieceFile(file)) {
    const piece = readPiece(file);
    if ('text' in piece) return piece.text;
  }
  return /```cells\n([\s\S]*?)```/.exec(file)?.[1] ?? '';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const perCell = args.includes('--cells');
  const asWritten = args.includes('--as-written');
  const row = (name: string, s: Structure) =>
    `${name.padEnd(36)} ${String(s.cells).padStart(6)} ${String(s.leaves).padStart(7)} ${String(s.attributes).padStart(11)} ${String(s.total).padStart(7)}`;
  console.log(`${'input'.padEnd(36)} ${'cells'.padStart(6)} ${'leaves'.padStart(7)} ${'attributes'.padStart(11)} ${'total'.padStart(7)}`);
  for (const input of args.filter((a) => !a.startsWith('--'))) {
    const text = textOf(input);
    if (perCell) for (const c of cellsOf(text, { asWritten })) console.log(row(`  &${c.name}`, c));
    console.log(row(input, structureOf(text, { asWritten })));
  }
}
