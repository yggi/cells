/**
 * An isometry (docs/notes/fold.md): a dilation. A line whose every length (notes, rests) is a multiple of k is the same
 * line on a clock k times slower: `step=&tempo/2` and `0 2 4` for `0@2 2@2 4@2`. A symbol two lines share then plays at
 * each one's clock, so the same phrase at two speeds is one cell: the move is the same at every scale.
 */
import type { Folded, Tok, Tool } from './ir';
import { isElement } from './transpose';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Each line on the slowest clock its lengths allow. */
export const dilate: Tool = (f: Folded) => {
  let made = 0;
  const lines = f.lines.map((line) => {
    if (line.toks.some((t) => !isElement(t.key))) return line;
    const k = line.toks.reduce((g, t) => gcd(g, Number(/^[rdn](\d+)/.exec(t.key)![1])), 0);
    if (k <= 1) return line;
    made++;
    const toks: Tok[] = line.toks.map((t) => ({ ...t, key: t.key.replace(/^([rdn])(\d+)/, (_, kind: string, d: string) => `${kind}${Number(d) / k}`) }));
    return { name: line.name, toks, scale: (line.scale ?? 1) * k };
  });
  return made ? { ...f, lines } : null;
};
