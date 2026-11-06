/**
 * The core of a text (decision 069, #482): what it plays, written in the core grammar of decision 068, for a machine
 * reader (a hash, the learned layer, a comparison of two pieces), never for a frontend's editor. Four passes, each step
 * checked by S1 (`soundsIdentical`) against the text it starts from:
 *
 *  1. Normalise: one spelling per sugar family, so the core is the same for every text Normalise makes alike
 *     (`toCore(normalise(x)) = toCore(x)`);
 *  2. de-sugar (`desugar.ts`): the rows the letters settle; the rest are reported (`left`), not guessed;
 *  3. the core fold (`fold.ts`): phrases, alike cells, defaults, and the lines nothing reads;
 *  4. minify (`minify.ts`): the names it may rename, short, the fold's among them.
 *
 * Idempotent: the core of a core is itself. It has no inverse: comments and names go. Built in rungs (#482): the rows
 * that read the compiled program (taps as `pulse*k`, a subsequence on its tap's chain, keys, meters, gates, `pitch=`)
 * are the next. Named `core`, not `compile`, beside `compile.ts` (decision 069 says `compile/`). Pure.
 */
import { type NormaliseOptions } from '../normalise';
export { FAMILIES, LEFT, type Family } from './desugar';
export { meaningfulNames, minify } from './minify';
export { coreFold } from './fold';
/** A text's core: the text, the steps that made it, and the rows of the table still written in it (not yet rewritten, #482). */
export interface Core {
    readonly source: string;
    readonly steps: readonly string[];
    readonly left: readonly {
        readonly key: string;
        readonly rows: string;
        readonly why: string;
    }[];
}
/** The core of a text (decision 069): the passes again until the text stops changing, so the core of a core is itself. */
export declare function toCore(source: string, options?: NormaliseOptions): Core;
