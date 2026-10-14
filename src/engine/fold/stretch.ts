/**
 * An isometry (docs/notes/fold.md, #345): a dilation inside a line. A run of steps whose lengths all share a factor k is
 * the same steps k times faster, spliced k times slower: `&m@2` for `0@2 2@2 4@2`. `dilate.ts` does it to a whole
 * line; this to a passage of one, so a phrase at half speed among others is a cell at its own speed, and the same
 * passage at two speeds (augmentation) one cell. The language plays a splice `@k` as its steps each k long. A run
 * written alike (the same steps, at another pitch) is spliced from the same cell. β judges each as any symbol.
 */
import type { Folded, Kid, Rule, Tok, Tool } from './ir';
import { elementText, isElement, scaled } from './transpose';

/** A run worth a cell: this many steps at least (measured, #345: 12 folds the MIDI library and the examples shortest and
 * brings back the most phrases; shorter runs hide phrases the variants would find). */
const SHORTEST = 12;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const durOf = (t: Tok) => Number(/^[rdn](\d+)/.exec(t.key)![1]);

/** Each line's runs of elements whose lengths share a factor, spliced from cells of them at their own speed. */
export const stretch: Tool = (f: Folded, see) => {
  const rules = new Map(f.rules);
  // (a cell for each run written alike: its steps relative to its first pitch)
  const cells = new Map<string, string>();
  let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
  let made = 0;
  const lines = f.lines.map((line) => {
    // (a line all of whose lengths share a factor is dilate.ts's)
    if (line.toks.every((t) => isElement(t.key)) && line.toks.reduce((g, t) => gcd(g, durOf(t)), 0) >= 2) return line;
    const out: Tok[] = [];
    const toks = line.toks;
    for (let i = 0; i < toks.length;) {
      // the longest run from here whose lengths share a factor of 2 or more
      let g = 0;
      let j = i;
      while (j < toks.length && isElement(toks[j]!.key) && gcd(g, durOf(toks[j]!)) >= 2) g = gcd(g, durOf(toks[j++]!));
      const run = toks.slice(i, j);
      if (run.length < SHORTEST || !run.some((t) => t.base !== null)) {
        out.push(toks[i]!);
        i++;
        continue;
      }
      const base = run.find((t) => t.base !== null)!.base!;
      const kids: Kid[] = run.map((t) => ({ key: scaled(t.key, 1 / g), off: t.base === null ? null : t.base - base }));
      // (the same steps at another speed are the same cell: augmentation)
      const id = kids.map((k) => `${k.key}/${k.off}`).join(' ');
      // (worth it: the steps written out against the cell's name with @k, and the cell written once if it is new)
      const writtenOut = run.reduce((n, t) => n + elementText(t.key, t.base).length + 1, 0);
      const body = kids.reduce((n, k) => n + elementText(k.key, k.off).length + 1, 0);
      const known = cells.get(id);
      if (!known && writtenOut - (5 + 2 + 4) - (5 + body) <= 0) {
        out.push(toks[i]!);
        i++;
        continue;
      }
      let key = known;
      if (!key) {
        key = `s${next++}`;
        const rule: Rule = { key, kids };
        rules.set(key, rule);
        cells.set(id, key);
      }
      out.push({ key, base, stretch: g });
      made++;
      i = j;
    }
    return { ...line, toks: out };
  });
  if (!made) return null;
  const now: Folded = { ...f, lines, rules };
  see?.(() => now);
  return now;
};
