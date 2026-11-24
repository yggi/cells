/**
 * A number read from a cell as the piece is built (decisions 105 and 106, after 093 and 101): the one reader of a cell's
 * value where a text reads one before it plays, and the one phase that fills every place that reads one. A place that
 * fills cells (`NUMBER_PLACES`, `fills`) reads `&k` with a placeholder and the scanner records where the cell's name
 * stands in its line (`BuiltHole`); `fillBuilt` reads each cell, a cell that is one number or a sum of numbers alone
 * (`constantOf`), checks the place's own limits, writes the value into the line and reads the line again, so a place
 * reads a cell exactly as it reads the number written. It runs before anything reads the cells' lines (slots, styles),
 * so the line it hands on is the line a text of the number would have been. A generator's argument (decision 101,
 * `meters`) and `even`'s (093, `evens`) read the same way, through `builtNumber`.
 */
import type { BuiltHole, BuiltLine, CellDecl, ParseResult, Ref, Span } from '../ast';
import { rereadLine } from '../parser';
import { LineError } from '../parser/scanner';
import { NUMBER_PLACES, type NumberPlace } from '../parser/numbers';
import { constantOf } from '../valuesum';

/** What a read says of a cell: its number, or why not, and where it is said (a name read that no cell declares, a fill not answered yet). */
export type Read = { readonly value: number; readonly cell: CellDecl } | { readonly unknown: Ref } | { readonly blank: true } | { readonly problem: string; readonly at: Span };

/**
 * What a place that reads a cell as the piece is built reads, or why not: said once, wherever a place asks. `read` is
 * how the message names the place (`seed=`, `even(…)'s phase`).
 */
export function builtProblem(read: string, c: CellDecl): string {
  return c.step
    ? `&${c.name} is read as ${read}: a stepped one is not yet a form; write one number (&${c.name} 3)`
    : `&${c.name} is read as ${read}: a cell that is one number, filled as the piece is built (&${c.name} 3)`;
}

/** The number a cell holds, read as the piece is built: its value, or why not (a cell no line declares, a fill not answered yet, a stepped cell, no constant). */
export function readBuilt(decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): Read {
  const c = decls.get(ref.name);
  if (!c) return { unknown: ref };
  // (a fill not answered yet, a fragment read alone: its plugin answers it in a piece, #792)
  if (c.fill && c.braid.kind === 'blank') return { blank: true };
  const value = constantOf(decls, c.name);
  return value === null ? { problem: builtProblem(read, c), at: c.span } : { value, cell: c };
}

/** What a phase that says things reads a cell as: `builtNumber`'s ctx, a context's `error` and `unknownCell`. */
export interface Said {
  readonly error: (message: string, span: Span) => void;
  readonly unknownCell: (name: string, span: Span) => void;
}

/** `readBuilt`, said: null where the cell is no number, the reason given to `said`, as it is where a generator or `even` reads one. */
export function builtNumber(said: Said, decls: ReadonlyMap<string, CellDecl>, ref: Ref, read: string): { readonly value: number; readonly cell: CellDecl } | null {
  const got = readBuilt(decls, ref, read);
  if ('value' in got) return got;
  if ('unknown' in got) said.unknownCell(got.unknown.name, got.unknown.span);
  else if ('problem' in got) said.error(got.problem, got.at);
  return null;
}

/** What a place's own limits say of a value, or null where it holds: a count is whole, a share within its range. */
export function placeProblem(place: NumberPlace, value: number): string | null {
  if (place.whole && !place.rounds && !Number.isInteger(value)) return `it takes a whole number, not ${value}`;
  if ((place.min !== undefined && value < place.min) || (place.max !== undefined && value > place.max)) return `it takes ${place.min ?? 'any'} to ${place.max ?? 'any'}, not ${value}`;
  return null;
}

/** The places that fill cells, by the form each is written as. */
const FILLING = new Map(Object.values(NUMBER_PLACES).flatMap((p: NumberPlace) => (p.fills ? [[p.form, p] as const] : [])));

/** A number as a line writes it: no exponent, no more places than a text of it would hold. */
const numberText = (v: number) => String(Math.round(v * 1e9) / 1e9).replace(/^(-?)0\./, '$10.');

/** Where a position of the line as filled stands in the line as written: a hole's text answers with its start. */
function unfilled(holes: readonly { readonly from: number; readonly to: number; readonly length: number }[]): (p: number) => number {
  // (each hole's place in the filled text: the holes before it have moved it by what they added)
  let shift = 0;
  const places = holes.map((h) => {
    const start = h.from + shift;
    shift += h.length - (h.to - h.from);
    return { ...h, start, end: start + h.length, after: shift };
  });
  return (p) => {
    let moved = 0;
    for (const h of places) {
      if (p < h.start) break;
      if (p < h.end) return h.from;
      moved = h.after;
    }
    return p - moved;
  };
}

const isSpan = (x: unknown): x is Span => !!x && typeof x === 'object' && typeof (x as Span).line === 'number' && typeof (x as Span).col === 'number' && typeof (x as Span).len === 'number';

/** A declaration with every span of its line given back in the line as written (the line was read again with its numbers in). */
function respanned<T>(x: T, line: number, back: (p: number) => number, seen = new Map<unknown, unknown>()): T {
  if (!x || typeof x !== 'object') return x;
  if (seen.has(x)) return seen.get(x) as T;
  if (Array.isArray(x)) {
    const out: unknown[] = [];
    seen.set(x, out);
    for (const v of x) out.push(respanned(v, line, back, seen));
    return out as T;
  }
  if (isSpan(x) && x.line === line) {
    const from = back(x.col - 1);
    const to = back(x.col - 1 + x.len);
    return { ...x, col: from + 1, len: Math.max(1, to - from) } as T;
  }
  const out: Record<string, unknown> = {};
  seen.set(x, out);
  for (const [k, v] of Object.entries(x)) out[k] = respanned(v, line, back, seen);
  return out as T;
}

/** One line read again with its holes' values written in: its cell and its unnamed cells, or the reason it could not. */
function filledLine(b: BuiltLine, texts: readonly { readonly hole: BuiltHole; readonly text: string }[]): { decl: CellDecl; lambdas: readonly CellDecl[] } | { problem: string } {
  const sorted = [...texts].sort((a, c) => c.hole.from - a.hole.from);
  let filled = b.text;
  for (const t of sorted) filled = filled.slice(0, t.hole.from) + t.text + filled.slice(t.hole.to);
  try {
    const again = rereadLine(b, filled);
    // (the line's single physical line, its spans given back where they were written; a continued line keeps the filled ones)
    if (b.parts.length > 1) return again;
    const back = unfilled([...texts].sort((a, c) => a.hole.from - c.hole.from).map((t) => ({ from: t.hole.from, to: t.hole.to, length: t.text.length })));
    return { decl: respanned(again.decl, b.line, back), lambdas: again.lambdas.map((l) => respanned(l, b.line, back)) };
  } catch (e) {
    if (!(e instanceof LineError)) throw e;
    return { problem: `${b.text.trim()}, filled as ${filled.trim()}: ${e.message}` };
  }
}

/**
 * Every line that read a cell as the piece is built, read again with the cell's value in its place: the first phase of a
 * compile, before the slots and the styles are read, so the line the rest reads is the line a number would have made. A
 * hole whose cell is not one number is an error that says what is read, its line kept as it was; a cell no line declares,
 * or a fill not answered yet, leaves the line for `unreadHoles`, which says what stays (a template's hole).
 */
export function fillBuilt(parsed: ParseResult): ParseResult {
  if (!parsed.cells.some((c) => c.built)) return parsed;
  const decls = new Map(parsed.cells.map((c) => [c.name, c] as const));
  const diagnostics = [...parsed.diagnostics];
  const out: CellDecl[] = [];
  const gone = new Set<string>();
  const made = new Map<string, CellDecl[]>();
  for (const d of parsed.cells) {
    const b = d.built;
    if (!b) continue;
    const texts: { hole: BuiltHole; text: string }[] = [];
    let ok = true;
    for (const h of b.holes) {
      const place = FILLING.get(h.form)!;
      const got = readBuilt(decls, h.ref, place.fills!.read);
      if ('problem' in got) diagnostics.push({ severity: 'error', message: got.problem, span: got.at });
      if (!('value' in got)) {
        ok = false;
        continue;
      }
      const problem = placeProblem(place, got.value);
      if (problem) {
        diagnostics.push({ severity: 'error', message: `&${h.ref.name} is read as ${place.fills!.read}: ${problem} (${place.form})`, span: h.ref.span });
        ok = false;
        continue;
      }
      texts.push({ hole: h, text: numberText(place.whole || place.rounds ? Math.round(got.value) : got.value) });
    }
    if (!ok) continue;
    const again = filledLine(b, texts);
    if ('problem' in again) {
      diagnostics.push({ severity: 'error', message: again.problem, span: d.span });
      continue;
    }
    for (const l of b.lambdas) gone.add(l);
    made.set(d.name, [{ ...again.decl, valueReads: [...(again.decl.valueReads ?? []), ...b.holes.map((h) => h.ref.name)] }, ...again.lambdas]);
  }
  for (const d of parsed.cells) {
    if (gone.has(d.name)) continue;
    const replaced = made.get(d.name);
    if (replaced) out.push(...replaced);
    else out.push(d);
  }
  return { ...parsed, cells: out, diagnostics };
}

/**
 * What stays after `fillBuilt`: a hole whose cell no line declares is the text's, a template's (`seed=&seed` in a
 * fragment read alone), said as any unknown cell is; the rest it said already.
 */
export function unreadHoles(said: Said, decls: ReadonlyMap<string, CellDecl>): void {
  for (const d of decls.values())
    for (const h of d.built?.holes ?? []) if (!decls.has(h.ref.name)) said.unknownCell(h.ref.name, h.ref.span);
}
