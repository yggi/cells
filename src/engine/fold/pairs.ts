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

/** The pair that comes most often (not overlapping itself: a a a is one a a), and how often. */
function commonest(lines: readonly (readonly Tok[])[]): { key: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const toks of lines) {
    let last = '';
    let lastAt = -2;
    for (let i = 0; i + 1 < toks.length; i++) {
      const k = pairOf(toks[i], toks[i + 1]).key;
      if (k === last && lastAt === i - 1) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      last = k;
      lastAt = i;
    }
  }
  let best: { key: string; count: number } | null = null;
  for (const [key, count] of counts) if (count >= 2 && (!best || count > best.count)) best = { key, count };
  return best;
}

/**
 * Fold the commonest pair into a symbol, again and again, while one comes twice: in the lines and in the symbols'
 * own steps alike (the same move at every level), but not in a phrase that variants copy (`base=` counts its steps as
 * written), nor in a variant.
 */
export const pairs: Tool = (f: Folded) => {
  const copied = new Set([...f.rules.values()].flatMap((r) => (r.of ? [r.of] : [])));
  const inside = [...f.rules.values()].filter((r) => !r.of && !copied.has(r.key)).map((r) => r.key);
  // (the lines, then the symbols' steps as tokens at their offsets)
  let seqs: Tok[][] = [...f.lines.map((l) => [...l.toks]), ...inside.map((k) => f.rules.get(k)!.kids.map((c) => ({ key: c.key, base: c.off })))];
  const rules = new Map(f.rules);
  let made = 0;
  let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
  for (let best = commonest(seqs); best; best = commonest(seqs)) {
    const name = `s${next++}`;
    let rule: Rule | null = null;
    seqs = seqs.map((toks) => {
      const out: Tok[] = [];
      for (let i = 0; i < toks.length; i++) {
        if (i + 1 < toks.length) {
          const p = pairOf(toks[i], toks[i + 1]);
          if (p.key === best!.key) {
            rule ??= {
              key: name,
              kids: [
                { key: toks[i].key, off: p.offA },
                { key: toks[i + 1].key, off: p.offB },
              ],
            };
            out.push({ key: name, base: p.base });
            i++;
            continue;
          }
        }
        out.push(toks[i]);
      }
      return out;
    });
    rules.set(name, rule!);
    made++;
  }
  if (!made) return null;
  inside.forEach((k, i) => rules.set(k, { key: k, kids: seqs[f.lines.length + i].map((t) => ({ key: t.key, off: t.base })) }));
  return { lines: f.lines.map((l, i) => ({ ...l, toks: seqs[i] })), rules, looks: f.looks };
};
