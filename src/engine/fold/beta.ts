/**
 * β (docs/notes/fold.md, #234's α and β): a symbol written back where it is used when it doesn't pay — when writing it
 * once (`&m3 …`) and naming it at each use (`&m3^$5`) costs more characters than writing it out at each use. The
 * description length is the judge (MDL): what pairs folds, β unfolds where the fold is dearer than the notes.
 */
import type { Folded, Kid, Rule, Tok, Tool } from './ir';
import { kidsOf, tokText } from './print';
import { isElement, isLook, scaled } from './transpose';

/** A use of a symbol: how many times in a row (a run, printed once as `x!n`, is written out n times if the symbol goes),
 * and how much slower (`&m@2`). */
type Use = { run: number; stretch: number };

/** A symbol's uses: each place it is named (in the lines and in other symbols). */
function uses(f: Folded): Map<string, Use[]> {
  const n = new Map<string, Use[]>();
  const count = (toks: readonly Tok[]) => {
    toks.forEach((t, i) => {
      if (isElement(t.key) || isLook(t.key)) return;
      const runs = n.get(t.key) ?? [];
      const prev = toks[i - 1];
      if (prev && prev.key === t.key && prev.base === t.base && prev.stretch === t.stretch) runs[runs.length - 1]!.run++;
      else runs.push({ run: 1, stretch: t.stretch ?? 1 });
      n.set(t.key, runs);
    });
  };
  for (const l of f.lines) count(l.toks);
  // (a variant names its phrase once, and its own steps are elements)
  for (const r of f.rules.values()) count(r.of ? [{ key: r.of, base: null }] : kidsOf(r));
  return n;
}

/** A symbol's tokens written out, at a base, `stretch` times slower: its elements that much longer, its symbols spliced
 * that much slower. */
function expand(r: Rule, base: number | null, stretch = 1): Tok[] {
  return r.kids.map((k) => {
    const at = k.off === null ? null : (base ?? 0) + k.off;
    if (isElement(k.key)) return { key: stretch === 1 ? k.key : scaled(k.key, stretch), base: at };
    const s = (k.stretch ?? 1) * stretch;
    return { key: k.key, base: at, ...(s !== 1 ? { stretch: s } : {}) };
  });
}

/** A token as a symbol's child. */
const kidOf = (t: Tok): Kid => ({ key: t.key, off: t.base, ...(t.stretch ? { stretch: t.stretch } : {}) });

/** Characters: a token list as written (each followed by a space). */
const written = (toks: readonly Tok[], names: ReadonlyMap<string, string>) => toks.reduce((n, t) => n + tokText(t, names).length + 1, 0);

/** Inline every symbol that doesn't pay, the cheapest saving first, until all that is left pays. */
export const beta: Tool = (f: Folded, see) => {
  let now = f;
  let changed = false;
  for (;;) {
    const n = uses(now);
    // (names as they'd be printed: about three characters; a reference with a shift adds four)
    const names = new Map([...now.rules.keys()].map((k) => [k, 'm00']));
    let worst: { key: string; gain: number } | null = null;
    for (const [key, r] of now.rules) {
      const body = written(kidsOf(r), names);
      const ref = 4 + 1 + (r.kids.some((c) => c.off !== null) ? 4 : 0);
      // (a variant is written as its changes over its phrase: `base=&m1 =!3 12@2`)
      const def = r.of
        ? 22 +
          written(
            kidsOf(r).filter((_, i) => r.patched![i]),
            names,
          )
        : 1 + 3 + 1 + body;
      // (each place: written out, its run n times over, against its name once, `!n` added for a run; slower, written
      // out at its own length, its name with `@k`)
      const at = (stretch: number) => (stretch === 1 ? body : written(expand(r, 0, stretch), names));
      const gain = (n.get(key) ?? []).reduce((g, u) => g + u.run * at(u.stretch) - ref - (u.stretch > 1 ? 2 : 0) - (u.run > 1 ? 2 : 0), 0) - def;
      if (gain <= 0 && (!worst || gain < worst.gain)) worst = { key, gain };
    }
    if (!worst) break;
    const gone = now.rules.get(worst.key)!;
    const inline = (toks: readonly Tok[]): Tok[] => toks.flatMap((t) => (t.key === worst!.key ? expand(gone, t.base, t.stretch ?? 1) : [t]));
    const rules = new Map<string, Rule>();
    for (const [key, r] of now.rules) {
      if (key === worst.key) continue;
      if (r.of) {
        // (a symbol that goes from a phrase goes from its copies' kept steps too, each step of it kept; a variant of
        // what goes is written out: its steps are all there)
        const kids: Rule['kids'][number][] = [];
        const patched: boolean[] = [];
        r.kids.forEach((k, i) => {
          for (const t of k.key === worst!.key ? expand(gone, k.off, k.stretch ?? 1) : [{ key: k.key, base: k.off, ...(k.stretch ? { stretch: k.stretch } : {}) }]) {
            kids.push(kidOf(t));
            patched.push(r.patched![i]!);
          }
        });
        rules.set(key, r.of === worst.key ? { key, kids } : { ...r, kids, patched });
      } else rules.set(key, { key, kids: inline(kidsOf(r)).map(kidOf) });
    }
    now = { lines: now.lines.map((l) => ({ ...l, toks: inline(l.toks) })), rules, looks: now.looks };
    changed = true;
    const seen = now;
    see?.(() => seen);
  }
  return changed ? now : null;
};
