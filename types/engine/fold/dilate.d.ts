/**
 * An isometry (docs/notes/fold.md): a dilation. A line whose every length (notes, rests) is a multiple of k is the same
 * line on a clock k times slower: `step=&tempo/2` and `0 2 4` for `0@2 2@2 4@2`. A symbol two lines share then plays at
 * each one's clock, so the same phrase at two speeds is one cell: the move is the same at every scale.
 */
import type { Tool } from './ir';
/** Each line on the slowest clock its lengths allow. */
export declare const dilate: Tool;
