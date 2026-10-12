/**
 * `base=` (decision 026): a cell written as a copy of another, changed where it says — an overdub, a delta. Resolved as
 * the text is parsed, so compile sees plain cells: `&answer base=&subject^$7 _!3 12@2` is the subject a fifth up, its
 * fourth step 12 held 2 instead.
 *
 *  - **Its braid** goes over the base's step by step (a run `x!n` counts as n steps): `_` keeps the base's step as it
 *    is, `_@n` keeps its pitch held n, a value replaces it, and what goes past the base's end is added. Nothing written:
 *    the base as it is.
 *  - **Transposed**: `base=&x^$n` moves what it keeps n grid steps (a cell that reads no table: semitones), `^n` n steps
 *    of its table (a degree); what the cell writes itself is as it sounds.
 *  - **Its attributes**: what it doesn't set, the base's — its table, its clock, its shift, a voice's sound — not its
 *    label, notes, laps or `off`.
 *
 * A base of a base works; a base that comes round to the cell itself is an error on `base=`; one that names no cell is
 * left on the cell, for compile to say (`Unknown cell`), as it does of every reference.
 */
import type { Atom, CellDecl, Diagnostic, ParseResult, Ref, Token } from '../ast';

/** What a cell takes from its base when it sets none of its own. */
const INHERITED = ['over', 'shift', 'step', 'map', 'stride', 'cycle', 'env', 'pitch', 'show', 'chance', 'seed', 'size'] as const;

/** A braid's tokens, a run `x!n` as n tokens. */
const steps = (tokens: readonly Token[]): Token[] => tokens.flatMap((t) => (t.repeat > 1 ? Array.from({ length: t.repeat }, () => ({ ...t, repeat: 1 })) : [t]));

/** An atom moved: grid steps (`^$n`: a note's value, a splice's transpose) or degrees (`^n`: a value, a splice's values). */
function moved(a: Atom, ref: Ref): Atom {
  const grid = ref.transpose ?? 0;
  const degree = ref.degree ?? 0;
  if (!grid && !degree) return a;
  const by = grid + degree;
  switch (a.kind) {
    case 'note':
      return { ...a, value: a.value + by };
    case 'chord':
      return { ...a, notes: a.notes.map((n) => n + by) };
    case 'choice':
      return { ...a, values: a.values.map((n) => n + by) };
    case 'ref':
      return grid ? { ...a, transpose: (a.transpose ?? 0) + grid } : { ...a, values: { mul: a.values?.mul ?? 1, add: (a.values?.add ?? 0) + degree * (a.values?.mul ?? 1) } };
    default:
      return a;
  }
}

/** The cells of a parse with every `base=` resolved into a plain cell; an error where one can't be. */
export function applyBases(p: ParseResult): ParseResult {
  if (!p.cells.some((c) => c.base || keeps(c))) return p;
  const byName = new Map(p.cells.map((c) => [c.name, c]));
  const diagnostics: Diagnostic[] = [...p.diagnostics];
  const done = new Map<string, CellDecl>();
  const resolving = new Set<string>();
  const error = (c: CellDecl, message: string) => diagnostics.push({ severity: 'error', message, span: c.base?.span ?? c.span });

  const resolve = (c: CellDecl): CellDecl => {
    const hit = done.get(c.name);
    if (hit) return hit;
    let out = c;
    if (c.base) {
      const base = byName.get(c.base.name);
      // (no such cell: left as it is, for compile to say, as of any unknown cell)
      if (!base) out = c;
      else if (resolving.has(c.name)) error(c, `base=&${c.base.name} comes round to &${c.name} itself`);
      else {
        resolving.add(c.name);
        out = overdub(c, resolve(base), c.base, (m) => error(c, m));
        resolving.delete(c.name);
      }
    } else if (keeps(c)) diagnostics.push({ severity: 'error', message: `_ keeps a step of the base: only in a cell with base= (&${c.name} base=&other _ 4 _)`, span: c.span });
    done.set(c.name, out);
    return out;
  };
  return { ...p, cells: p.cells.map(resolve), diagnostics };
}

/** Does a cell's braid keep steps (`_`)? */
const keeps = (c: CellDecl) => c.braid.kind === 'list' && c.braid.tokens.some((t) => t.atom.kind === 'rest' && t.atom.keep);

/** A cell over its base: the base's braid changed where the cell says, the base's attributes where it sets none. */
function overdub(c: CellDecl, base: CellDecl, ref: Ref, fail: (message: string) => void): CellDecl {
  const inherited: Record<string, unknown> = {};
  for (const k of INHERITED) if (c[k] == null && base[k] != null) inherited[k] = base[k];
  const params = { ...base.params, ...c.params };
  const paramSpans = { ...base.paramSpans, ...c.paramSpans };
  const paramCells = base.paramCells || c.paramCells ? { ...base.paramCells, ...c.paramCells } : undefined;
  const paramClocks = base.paramClocks || c.paramClocks ? { ...base.paramClocks, ...c.paramClocks } : undefined;
  if (ref.transpose && (c.over ?? base.over)) fail(`base=&${ref.name}^$${ref.transpose}: a cell that reads a table moves by its degrees (^n), not yet by grid steps`);

  let braid = c.braid;
  if (base.braid.kind === 'list') {
    const under = steps(base.braid.tokens);
    const over = c.braid.kind === 'list' ? steps(c.braid.tokens) : [];
    const tokens: Token[] = [];
    for (let i = 0; i < Math.max(under.length, over.length); i++) {
      const b = under[i];
      const o = over[i];
      const keep = !o || (o.atom.kind === 'rest' && o.atom.keep);
      if (!keep) {
        tokens.push(o);
        continue;
      }
      if (!b) {
        fail(`_ past the end of &${base.name} (${under.length} steps): nothing to keep`);
        continue;
      }
      const atom = moved(b.atom, ref);
      // (_@n: the base's pitch, held n)
      tokens.push(o && o.elongate !== 1 ? { ...b, atom, elongate: o.elongate } : { ...b, atom });
    }
    braid = { kind: 'list', tokens };
  } else if (c.braid.kind === 'blank') braid = base.braid;
  else if (keeps(c)) fail(`&${base.name} is a ${base.braid.kind}(…), not a braid: _ keeps steps of a braid`);

  return {
    ...c,
    ...inherited,
    params,
    paramSpans,
    ...(paramCells ? { paramCells } : {}),
    ...(paramClocks ? { paramClocks } : {}),
    braid,
  };
}
