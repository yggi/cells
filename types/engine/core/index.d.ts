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
 * With no interface the core is what plays and nothing more: a gate is its products, a role and a performer go (decision
 * 077 §1). Cored up to an interface (`interface`, §2), each interface cell keeps its name, stays a cell and is a root of the
 * fold; a step that would lose one isn't taken.
 *
 * Idempotent: the core of a core is itself. It has no inverse: comments and names go. Built in rungs (#482): the rows
 * that read the compiled program (taps as `pulse*k`, a subsequence on its tap's chain, keys, meters, gates, `pitch=`)
 * are the next. Named `core`, not `compile`, beside `compile.ts` (decision 069 says `compile/`). Pure.
 */
import { type NormaliseOptions } from '../normalise';
export { FAMILIES, LEFT, stillWritten, type CoreContext, type Family } from './desugar';
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
/**
 * What a text is cored up to (decision 077 §2): names (`&tempo`, or bare), or a preset. `signature`: its signature's heads
 * and parameters (a fragment cored and still usable by its `from` line, 065); `roles`: its role cells and the gates each
 * lists (a score cored up to its gates, for the band's performers to fill in). None: the core is what plays, and nothing else.
 */
export type Interface = readonly string[] | 'signature' | 'roles';
/** The options of `toCore`: Normalise's, and the interface the text is cored up to. */
export interface CoreOptions extends NormaliseOptions {
    readonly interface?: Interface;
}
/**
 * The names an interface keeps, bare: the ones it names that the text defines, and the gates a kept role lists (what reads
 * a gate by name keeps it a cell).
 */
export declare function interfaceOf(text: string, spec?: Interface): Set<string>;
/** The core of a text (decision 069), up to its interface (077): the passes again until the text stops changing, so the core of a core is itself. */
export declare function toCore(source: string, options?: CoreOptions): Core;
