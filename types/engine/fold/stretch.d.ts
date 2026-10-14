/**
 * An isometry (docs/notes/fold.md, #345): a dilation inside a line. A run of steps whose lengths all share a factor k is
 * the same steps k times faster, spliced k times slower: `&m@2` for `0@2 2@2 4@2`. `dilate.ts` does it to a whole
 * line; this to a passage of one, so a phrase at half speed among others is a cell at its own speed, and the same
 * passage at two speeds (augmentation) one cell. The language plays a splice `@k` as its steps each k long. A run
 * written alike (the same steps, at another pitch) is spliced from the same cell. β judges each as any symbol.
 */
import type { Tool } from './ir';
/** Each line's runs of elements whose lengths share a factor, spliced from cells of them at their own speed. */
export declare const stretch: Tool;
