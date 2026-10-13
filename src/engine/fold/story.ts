/**
 * A fold's story (#390): how a piece folded comes about, told from its result, not from the search that found it (the
 * folder's moves, `Watch`, go back and forth and start over). From the lines written out to the fold taken, a cell at
 * a time, each before what is made of it: motifs, then the phrases made of them, then the sections. Each frame is the
 * piece as it would be with only the cells so far, so each plays the same notes as the last (β's own move, `inline`,
 * undone in turn). Replayed, the code edited a frame at a time, the graph forms as the piece folds. Pure.
 */
import type { Folded, Line, Tok } from './ir';
import { inline } from './beta';
import { kidsOf, useOrder } from './print';
import { isElement, isLook, tokensOf } from './transpose';

/** A frame of a story: the folded lines as they are by then, and what changed to get there (a symbol that came, its uses). */
export interface StoryFrame {
  readonly folded: Folded;
  /** The symbol that came in this frame (null: the first two, the lines written out and then on their clocks and figures). */
  readonly came: string | null;
  /** Where it is used: in the lines and other symbols, a run counted once. */
  readonly uses: number;
}

/** How high a symbol stands: 1 above what it is made of (elements 0); a copy above the phrase it copies. */
function heights(f: Folded): Map<string, number> {
  const h = new Map<string, number>();
  const of = (key: string): number => {
    if (isElement(key) || isLook(key)) return 0;
    const known = h.get(key);
    if (known !== undefined) return known;
    h.set(key, 0); // (no symbol is made of itself; a guard all the same)
    const r = f.rules.get(key)!;
    const below = [...r.kids.map((k) => k.key), ...(r.of ? [r.of] : [])];
    const v = 1 + Math.max(0, ...below.map(of));
    h.set(key, v);
    return v;
  };
  for (const k of f.rules.keys()) of(k);
  return h;
}

/** A symbol's uses in the lines and the other symbols (a run of it counted once, as it is written `x!n`). */
function usesOf(f: Folded, key: string): number {
  const count = (toks: readonly Tok[]) => toks.filter((t, i) => t.key === key && !(i > 0 && toks[i - 1]!.key === key && toks[i - 1]!.base === t.base)).length;
  return f.lines.reduce((n, l) => n + count(l.toks), 0) + [...f.rules.values()].reduce((n, r) => n + count(r.of === key ? [{ key, base: null }] : kidsOf(r)), 0);
}

/**
 * The story of a fold: the lines written out (`lines`, as the folder started from them), then on their clocks and
 * figurations with no symbol yet, then a symbol a frame, the lowest first (each before what uses it; at one height,
 * in the order the piece first uses them), to the fold itself (`f`), the last frame.
 */
export function storyOf(lines: readonly Line[], f: Folded): StoryFrame[] {
  const h = heights(f);
  // (the symbols in the order they come: by height, then by first use; a symbol no line reaches is never printed)
  const order = useOrder(f);
  const first = new Map(order.map((k, i) => [k, i]));
  const coming = [...order].sort((a, b) => h.get(a)! - h.get(b)! || first.get(a)! - first.get(b)!);
  // undone from the top: the last to come goes first
  const back: Folded[] = [f];
  for (const key of [...coming].reverse()) back.push(inline(back[back.length - 1]!, key));
  const bare = back[back.length - 1]!;
  const frames: StoryFrame[] = [{ folded: { lines: lines.map((l) => ({ name: l.name, toks: tokensOf(l) })), rules: new Map() }, came: null, uses: 0 }];
  // (the clocks and figurations: a frame of their own, where there are any)
  if (bare.looks?.size || bare.lines.some((l) => (l.scale ?? 1) !== 1)) frames.push({ folded: bare, came: null, uses: 0 });
  coming.forEach((key, i) => {
    const folded = back[back.length - 2 - i]!;
    frames.push({ folded, came: key, uses: usesOf(folded, key) });
  });
  return frames;
}
