/**
 * A mix of cells with no voice is the sum of their values (decision 079): `&drift [&section * .5 + &song * .3 + &set * .2]`,
 * each term a cell and its gain, its weight, and any number a constant added. It is a line like any other, read where a
 * moving parameter, a style's axis or a pick reads a cell (`series.ts`, `styles.ts`). A mix with a voice is a sound,
 * as it was (decision 006): the two are told apart by whether a sound is in it.
 */
import type { CellDecl, Expr, Token } from './ast';
import { VOICE_MAKERS } from './attributes';

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
  if (!d || d.gate || d.over || Object.keys(d.params).some((k) => VOICE_MAKERS.has(k))) return false;
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
  const e = exprs[0]!;
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
