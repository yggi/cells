/**
 * `metric_accent` (#799): a built-in plugin-fragment whose one fill is a braid (decision 085, 090), a line of levels a
 * role multiplies its hits by (`&euclid * &euclidLevel`), written from the bar's metric weights rather than by hand.
 *
 * - **The weights:** a bar of `steps` (16: sixteenths of a 4/4 bar) is split by its factors, twos first, then threes
 *   (12 is 2 · 2 · 3: four beats of three). A step's weight is how high in that hierarchy it starts: the downbeat 1, the
 *   half bar next, then the beats, down to the finest steps.
 * - **`sync`**, 0 to 1, leans each step toward the weight of the step after it: an anticipation, the note before a
 *   strong beat taking its stress.
 * - **`density`**, 0 to 1, keeps the steps whose weight is at least 1 − density (1: every step; 0: the downbeat).
 * - **The level** of a step kept runs from `floor`, its lightest, to `peak`, the downbeat's; a step not kept is 0.
 *
 * Pure: the same arguments answer the same text. Its work is a step each, its fuel 64: a bar of more refuses.
 */
import type { PluginFragment } from './fills';
/** Each step's weight, 1 at the downbeat down to 1 / (levels + 1) at the finest. */
export declare function metricWeights(steps: number): number[] | null;
export declare const METRIC_ACCENT: PluginFragment;
