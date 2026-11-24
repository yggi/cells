/**
 * `metric_accent` (#799): a built-in plugin-fragment whose one fill is a braid (decision 085, 090), a line of levels a
 * role multiplies its hits by (`&euclid * &euclidLevel`), written from the bar's metric weights rather than by hand.
 *
 * - **The weights:** the bar's meter's grades, one a step (yggi/music-commons `contracts/meter`, version 2, as
 *   `meterLevels` writes them), each weighed by how high it stands (#906): the downbeat 1, a group's or the half bar's
 *   start .8, a beat between .6, an eighth .4, a sixteenth .2. **`meter`** is the bar's meter: a signature or sizes
 *   (`3/4`, `7/8`, `2+2+3`), 4/4 by default, or a meter cell (`meter=&bar`), handed as its levels, a number a step, so
 *   the accents are the piece's own meter's. **`steps`** is how many steps the bar has: 0, the default, a sixteenth a
 *   step (16 in 4/4, 12 in 3/4, 14 in 7/8); any other count a whole number of steps a pulse. So 3/4 stresses its beats,
 *   not 6/8's half bar, and 5/4, 7/8 and 10/8 their groups; 4/4 in sixteenths weighs as it always did.
 * - **`sync`**, 0 to 1, leans each step toward the weight of the step after it: an anticipation, the note before a
 *   strong beat taking its stress.
 * - **`density`**, 0 to 1, keeps the steps whose weight is at least 1 − density (1: every step; 0: the downbeat).
 * - **The level** of a step kept runs from `floor`, its lightest, to `peak`, the downbeat's; a step not kept is 0.
 *
 * Pure: the same arguments answer the same text. Its work is a step each, its fuel 64: a bar of more refuses.
 */
import type { PluginFragment } from './fills';
/** A meter's grades at `steps` steps (0: a sixteenth a step), from a signature, sizes or a meter cell's levels; null where it is none. */
export declare function meterGrades(meter: string, steps?: number): string | null;
/** Each step's weight, 1 at the downbeat down to .2 at a sixteenth: a meter's grades (`meterGrades`) weighed. */
export declare function metricWeights(meter: string, steps?: number): number[] | null;
export declare const METRIC_ACCENT: PluginFragment;
