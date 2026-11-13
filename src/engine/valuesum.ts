/**
 * A mix of cells with no voice is the sum of their values (decision 079): `&drift [&section * .5 + &song * .3 + &set * .2]`,
 * each term a cell and its gain, its weight, and any number a constant added. It is a line like any other, read where a
 * moving parameter, a style's axis or a pick reads a cell (`series.ts`, `styles.ts`). A mix with a voice is a sound,
 * as it was (decision 006): the two are told apart by whether a sound is in it.
 */
import type { CellDecl, Expr, Token } from './ast';
import { VOICE_PARAMS } from './attributes';

/** One term of a sum: a cell and its weight. */
export interface SumTerm {
  readonly cell: string;
  readonly weight: number;
}

/** A sum of values: its terms, and a constant added to them. */
export interface ValueSum {
  readonly terms: readonly SumTerm[];
  readonly constant: number;
}

/** A declaration's one mix chord, or null. */
const chordOf = (d: CellDecl | undefined): readonly Expr[] | null =>
  d && !d.gate && d.map?.kind !== 'sample' && d.map?.kind !== 'midi' && d.braid.kind === 'list' && d.braid.tokens.length === 1 && d.braid.tokens[0]!.atom.kind === 'mix'
    ? d.braid.tokens[0]!.atom.exprs
    : null;

/** An item of the sum as a term (a cell, alone or times numbers) or a number; null where it is neither. */
function itemOf(e: Expr, sign: 1 | -1): { term: SumTerm } | { constant: number } | null {
  if (e.k === 'num') return { constant: sign * e.value };
  if (e.k === 'ref') return e.ref.pick || e.level !== undefined ? null : { term: { cell: e.ref.name, weight: sign } };
  if (e.k === 'prod') {
    const refs = e.factors.filter((f) => f.k === 'ref');
    if (refs.length !== 1 || refs[0]!.k !== 'ref' || refs[0]!.ref.pick || !e.factors.every((f) => f.k === 'ref' || f.k === 'num')) return null;
    const weight = e.factors.reduce<number>((w, f) => (f.k === 'num' ? w * f.value : w), sign);
    return { term: { cell: refs[0]!.ref.name, weight } };
  }
  return null;
}

/** Does an atom hold numbers alone: a note, a rest, a choice, or a subsequence of them (no cell spliced, no sound)? */
const numeric = (atom: Token['atom']): boolean =>
  atom.kind === 'note' || atom.kind === 'rest' || atom.kind === 'choice' || (atom.kind === 'seq' && atom.layers.every((l) => l.every((t) => numeric(t.atom))));

/**
 * Is the cell a line of values: a line of numbers alone, read through no table, a level (map=lin, amp, db), or a sum of
 * values? Anything that splices a cell, sounds, names a sound or reads through a table is not (a pattern of drum hits is
 * a sound, read through its kit).
 */
export function isValueLine(name: string, decls: ReadonlyMap<string, CellDecl>, seen: ReadonlySet<string> = new Set()): boolean {
  const d = decls.get(name);
  // (read through a table, over=, a line is a pattern: a kit's hits are a sound, compile reads drum hits so)
  if (!d || d.gate || d.over || Object.keys(d.params).some((k) => VOICE_PARAMS.has(k))) return false;
  if (chordOf(d)) return valueSumOf(name, decls, seen) !== null;
  if (d.map && d.map.kind !== 'lin' && d.map.kind !== 'amp' && d.map.kind !== 'db') return false;
  return d.braid.kind === 'list' && d.braid.tokens.length > 0 && d.braid.tokens.every((t) => numeric(t.atom));
}

/**
 * A declaration as a sum of values, or null: one chord, a sum (or one weighted term) of cells and numbers, each cell a
 * line of values (`isValueLine`), and not a bare cell alone (`[&a]`, which names what it mixes). Anything else is a mix
 * of sounds, as it was (decision 006).
 */
export function valueSumOf(name: string, decls: ReadonlyMap<string, CellDecl>, seen: ReadonlySet<string> = new Set()): ValueSum | null {
  const exprs = chordOf(decls.get(name));
  if (!exprs || exprs.length !== 1 || seen.has(name)) return null;
  // (a weight or a constant named is the number it names, decision 088)
  const e = inlineNumbers(exprs[0]!, decls);
  const items = e.k === 'sum' ? e.items : [{ e, sign: 1 as const }];
  const terms: SumTerm[] = [];
  let constant = 0;
  for (const it of items) {
    const x = itemOf(it.e, it.sign);
    if (!x) return null;
    if ('term' in x) terms.push(x.term);
    else constant += x.constant;
  }
  if (!terms.length || (terms.length === 1 && terms[0]!.weight === 1 && constant === 0)) return null;
  const inner = new Set([...seen, name]);
  return terms.every((t) => isValueLine(t.cell, decls, inner)) ? { terms, constant } : null;
}

/**
 * Notes with their levels (decision 087, #740): a cell whose one chord is a product with no sound in it and a pitch, a
 * melody and its levels named (`&cycle [&notes * &level]`). It is no instrument and no value: in a product with a sound
 * it is its own product, as written in parentheses (`[&cycle * &glass]` is `[(&notes * &level) * &glass]`; law L17),
 * and `inlineNotes` writes it so before a mix is typed.
 *
 * `sounds` says whether a cell that is not a mix is a sound (a voice, a gate, a kit read, a tape's read head, a wave):
 * the compiler's sorts know, this module doesn't; a mix among the factors is read here, as notes in turn or not at all. A product of numbers and levels alone (no pitch) is not notes: it stays what it was.
 */
export function notesProductOf(
  name: string,
  decls: ReadonlyMap<string, CellDecl>,
  sounds: (name: string) => boolean,
  seen: ReadonlySet<string> = new Set(),
): Extract<Expr, { k: 'prod' }> | null {
  const exprs = chordOf(decls.get(name));
  if (!exprs || exprs.length !== 1 || seen.has(name) || valueSumOf(name, decls) !== null) return null;
  const e = exprs[0]!;
  if (e.k !== 'prod') return null;
  const inner = new Set([...seen, name]);
  // (its factors: cells and numbers, each cell no sound, a named product of notes itself allowed; at least one a pitch line)
  let pitch = false;
  for (const f of e.factors) {
    if (f.k === 'num') continue;
    if (f.k !== 'ref') return null;
    const d = decls.get(f.ref.name);
    if (!d) return null;
    // (a cell that is one number is that number, decision 088: no pitch)
    if (bare(f) && numberCellOf(d) !== null) continue;
    // (a mix among its factors: notes named in turn, or else an instrument or a sum of values, which it can't hold)
    if (chordOf(d)) {
      if (!notesProductOf(f.ref.name, decls, sounds, inner)) return null;
      pitch = true;
    } else if (sounds(f.ref.name)) return null;
    else if (!(d.map && (d.map.kind === 'amp' || d.map.kind === 'db' || d.map.kind === 'adsr' || d.map.kind === 'lin'))) pitch = true;
  }
  return pitch ? e : null;
}

/**
 * A cell that is one number and nothing else (decision 088): its value, or null. No clock, no table, no map, no move
 * and no sound, its braid one plain number (a note by name is a pitch, not a number). Named in a mix it is the number
 * it holds: a gain in a product, semitones in a sum (law L18).
 */
export function numberCellOf(d: CellDecl | undefined): number | null {
  if (!d || d.off || d.gate || d.step || d.over || d.map || d.base || d.tonic || d.env || d.pitch) return null;
  if (d.shift !== null || d.stride !== null || d.cycle !== null || Object.keys(d.params).length) return null;
  if (d.braid.kind !== 'list' || d.braid.tokens.length !== 1) return null;
  const t = d.braid.tokens[0]!;
  if (t.atom.kind !== 'note' || t.atom.pitched || t.atom.alter !== 0) return null;
  if (t.repeat !== 1 || t.subdivide !== 1 || t.elongate !== 1 || t.chance !== undefined || t.level !== undefined) return null;
  return t.atom.value;
}

/**
 * A mix's expression with every bare reference to a cell that is one number written as that number (decision 088):
 * naming a number plays as the number. A reference that picks or moves it stays a reference, read as it was.
 */
export function inlineNumbers(e: Expr, decls: ReadonlyMap<string, CellDecl>): Expr {
  if (e.k === 'num') return e;
  if (e.k === 'sum') return { ...e, items: e.items.map((it) => ({ ...it, e: inlineNumbers(it.e, decls) })) };
  if (e.k === 'prod') return { ...e, factors: e.factors.map((f) => inlineNumbers(f, decls)) };
  const value = bare(e) ? numberCellOf(decls.get(e.ref.name)) : null;
  return value === null ? e : { k: 'num', value, span: e.ref.span };
}

/** A bare reference: no pick, slot, shift, degree, transposition or hit's level; only such a one names notes whole. */
const bare = (e: Extract<Expr, { k: 'ref' }>) => !e.ref.pick && !e.ref.slot && !e.ref.shift && !e.ref.degree && !e.ref.transpose && e.level === undefined;

/**
 * A mix's expression with every bare reference to notes with their levels written as its product, as in parentheses
 * (decision 087), its own references in turn; `named` collects the cells inlined, `moved` the references that name
 * one but move or pick it (not yet: an error says so).
 */
export function inlineNotes(
  e: Expr,
  decls: ReadonlyMap<string, CellDecl>,
  sounds: (name: string) => boolean,
  found: { named: string[]; moved: Extract<Expr, { k: 'ref' }>[] } = { named: [], moved: [] },
  seen: ReadonlySet<string> = new Set(),
): Expr {
  if (e.k === 'num') return e;
  if (e.k === 'sum') return { ...e, items: e.items.map((it) => ({ ...it, e: inlineNotes(it.e, decls, sounds, found, seen) })) };
  if (e.k === 'prod') return { ...e, factors: e.factors.map((f) => inlineNotes(f, decls, sounds, found, seen)) };
  const product = notesProductOf(e.ref.name, decls, sounds, seen);
  if (!product) return e;
  if (!bare(e)) {
    found.moved.push(e);
    return e;
  }
  found.named.push(e.ref.name);
  return inlineNotes(product, decls, sounds, found, new Set([...seen, e.ref.name]));
}
