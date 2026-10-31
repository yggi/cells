/**
 * A bar's swing (yggi/music-commons `contracts/swing`, version 1), as a performer reads cells' playing back onto its
 * bar's grid (#392): where a written step of a bar grouped in eighths is played, and its inverse, where a played position
 * is written. Lifted from yggi/cell-studio src/session/swing.ts @ d5e7634 (written there from the hub's README, with no
 * import from Jambot); `swing.test.ts` meets the hub's vectors. Jambot reads each of cells' events so (`leanMap`'s `written`, `section-play.ts`), and the feel keys an event
 * by the step it is written on.
 *
 * Positions are in steps from the bar's downbeat, two to the eighth; past the bar's end, the next bar swings as this one.
 */

/** A level of swing: its note value and the share of each of its spans the span's first half holds (1/2 straight). */
export interface SwingLevel {
  readonly level: '8n' | '16n';
  readonly share: number;
}

/** The levels, finest first: the order they are applied in. */
const LEVELS = ['16n', '8n'] as const;

/** The spans a level leans in a bar, each `[start, length]`: every 2 steps for 16n; for 8n each group of two eighths, a group of three left straight. */
function spansOf(level: SwingLevel['level'], groups: readonly number[]): [number, number][] {
  const steps = 2 * groups.reduce((a, b) => a + b, 0);
  if (level === '16n') return Array.from({ length: steps / 2 }, (_, i) => [2 * i, 2]);
  let start = 0;
  return groups.flatMap((size) => {
    const span: [number, number][] = size === 2 ? [[start, 4]] : [];
    start += 2 * size;
    return span;
  });
}

/** A position through one level: within a span, its middle is played at `share` of it, the positions between following linearly (`back`: the inverse). */
function through(x: number, groups: readonly number[], { level, share }: SwingLevel, back: boolean): number {
  const span = spansOf(level, groups).find(([s, l]) => x >= s && x < s + l);
  if (!span) return x;
  const [start, length] = span;
  const within = x - start;
  const [from, to] = back ? [share * length, length / 2] : [length / 2, share * length];
  return start + (within < from ? (within * to) / from : to + ((within - from) * (length - to)) / (length - from));
}

/** Each level of a swing in the order it is applied in (finest first), or undone in (coarsest first). */
const ordered = (swing: readonly SwingLevel[], back: boolean) => {
  const levels = LEVELS.flatMap((l) => swing.filter((s) => s.level === l));
  return back ? levels.reverse() : levels;
};

/** Over bars: the bar a position falls in, and the map within it. */
function overBars(x: number, groups: readonly number[], f: (within: number) => number): number {
  const steps = 2 * groups.reduce((a, b) => a + b, 0);
  const bar = Math.floor(x / steps);
  return bar * steps + f(x - bar * steps);
}

/** Where a written position of a bar is played, in steps from its downbeat. */
export const swungAt = (written: number, groups: readonly number[], swing: readonly SwingLevel[]): number =>
  overBars(written, groups, (x) => ordered(swing, false).reduce((y, l) => through(y, groups, l, false), x));

/** Where a played position of a bar is written: `swungAt` undone. */
export const writtenAt = (played: number, groups: readonly number[], swing: readonly SwingLevel[]): number =>
  overBars(played, groups, (x) => ordered(swing, true).reduce((y, l) => through(y, groups, l, true), x));
