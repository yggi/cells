/**
 * The isometry (docs/notes/fold.md): two neighbours into one. The pair heard most often, anywhere in any line, becomes a
 * symbol, its every place replaced by it; then again, pairs of symbols becoming symbols, until no pair comes twice:
 * Re-Pair (Larsson & Moffat 2000), grammar induction as Sequitur's. Its levels are the piece's scales, built from the
 * bottom (a motif, a phrase, a section, the form) by one move. A pair is compared as shapes: the second's base against
 * the first's (`transpose.ts`), so a phrase and its transposition are one symbol at two bases.
 */
import type { Folded, Rule, Tok, Tool } from './ir';

/** A pair's key, and the base the symbol takes (the first base in it) with each child's offset from it. */
function pairOf(a: Tok, b: Tok): { key: string; base: number | null; offA: number | null; offB: number | null } {
  const base = a.base ?? b.base;
  const offA = a.base === null ? null : a.base - base!;
  const offB = b.base === null ? null : b.base - base!;
  return { key: `${a.key}/${offA}|${b.key}/${offB}`, base, offA, offB };
}

/** The pair that comes most often (not overlapping itself: a a a is one a a), and how often; never a pair with a step
 * that is held (`held`: a step of a phrase that one of its copies changes). */
function commonest(lines: readonly (readonly Tok[])[], held: readonly (readonly boolean[] | null)[]): { key: string; count: number } | null {
  const counts = new Map<string, number>();
  lines.forEach((toks, l) => {
    const h = held[l];
    let last = '';
    let lastAt = -2;
    for (let i = 0; i + 1 < toks.length; i++) {
      if (h && (h[i] || h[i + 1])) continue;
      const k = pairOf(toks[i]!, toks[i + 1]!).key;
      if (k === last && lastAt === i - 1) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      last = k;
      lastAt = i;
    }
  });
  let best: { key: string; count: number } | null = null;
  for (const [key, count] of counts) if (count >= 2 && (!best || count > best.count)) best = { key, count };
  return best;
}

/**
 * Fold the commonest pair into a symbol, again and again, while one comes twice: in the lines and in the symbols'
 * own steps alike (the same move at every level). In a phrase that variants copy, only where every copy keeps both
 * steps (`base=` counts the phrase's steps as written: a pair folded there is folded in each copy too, one kept step
 * for two); never in a variant's own steps.
 */
export const pairs: Tool = (f: Folded, see) => {
  const copiesOf = new Map<string, Rule[]>();
  for (const r of f.rules.values()) if (r.of) copiesOf.set(r.of, [...(copiesOf.get(r.of) ?? []), r]);
  const inside = [...f.rules.values()].filter((r) => !r.of).map((r) => r.key);
  // (the lines, then the symbols' steps as tokens at their offsets)
  let seqs: Tok[][] = [...f.lines.map((l) => [...l.toks]), ...inside.map((k) => f.rules.get(k)!.kids.map((c) => ({ key: c.key, base: c.off })))];
  // (a copied phrase's steps that one of its copies changes are held: no pair takes them)
  let held: (boolean[] | null)[] = [
    ...f.lines.map(() => null),
    ...inside.map((k) => {
      const copies = copiesOf.get(k);
      return copies ? f.rules.get(k)!.kids.map((_, i) => copies.some((v) => v.patched![i])) : null;
    }),
  ];
  // (each copy's steps, merged as its phrase's are)
  const copies = new Map([...copiesOf].map(([k, vs]) => [k, vs.map((v) => ({ ...v, kids: [...v.kids], patched: [...v.patched!] }))]));
  const rules = new Map(f.rules);
  let made = 0;
  let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
  for (let best = commonest(seqs, held); best; best = commonest(seqs, held)) {
    const name = `s${next++}`;
    let rule: Rule | null = null;
    const nextHeld: (boolean[] | null)[] = [];
    seqs = seqs.map((toks, l) => {
      const h = held[l];
      const vs = l >= f.lines.length ? copies.get(inside[l - f.lines.length]!) : undefined;
      const out: Tok[] = [];
      const outHeld: boolean[] = [];
      const kept = vs?.map(() => ({ kids: [] as Rule['kids'][number][], patched: [] as boolean[] }));
      for (let i = 0; i < toks.length; i++) {
        if (i + 1 < toks.length && !(h && (h[i] || h[i + 1]))) {
          const p = pairOf(toks[i]!, toks[i + 1]!);
          if (p.key === best!.key) {
            rule ??= {
              key: name,
              kids: [
                { key: toks[i]!.key, off: p.offA },
                { key: toks[i + 1]!.key, off: p.offB },
              ],
            };
            out.push({ key: name, base: p.base });
            outHeld.push(false);
            // (in each copy, the same two kept steps: one, the symbol at the copy's own base)
            vs?.forEach((v, c) => {
              const [a, b] = [v.kids[i]!, v.kids[i + 1]!];
              const q = pairOf({ key: a.key, base: a.off }, { key: b.key, base: b.off });
              kept![c]!.kids.push({ key: name, off: q.base });
              kept![c]!.patched.push(false);
            });
            i++;
            continue;
          }
        }
        out.push(toks[i]!);
        outHeld.push(h?.[i] ?? false);
        vs?.forEach((v, c) => {
          kept![c]!.kids.push(v.kids[i]!);
          kept![c]!.patched.push(v.patched![i]!);
        });
      }
      vs?.forEach((v, c) => Object.assign(v, kept![c]));
      nextHeld.push(h ? outHeld : null);
      return out;
    });
    held = nextHeld;
    rules.set(name, rule!);
    made++;
    see?.(now);
  }
  return made ? now() : null;

  /** The lines and the symbols as folded so far. */
  function now(): Folded {
    const out = new Map(rules);
    inside.forEach((k, i) => out.set(k, { key: k, kids: seqs[f.lines.length + i]!.map((t) => ({ key: t.key, off: t.base })) }));
    for (const vs of copies.values()) for (const v of vs) out.set(v.key, { ...v, kids: [...v.kids], patched: [...v.patched!] });
    return { lines: f.lines.map((l, i) => ({ ...l, toks: seqs[i]! })), rules: out, looks: f.looks };
  }
};
