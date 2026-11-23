/**
 * A variation's origin and its lineage (decision 052, points 4 and 9): a filed variation records the fragment it varies
 * (`varies: <id>`) and what was done to it (`by: <operator> <line> [<amount> …]`), the frontmatter's two keys, and a
 * lineage is the chain of `varies` from a filing back to its root, a seed or a fragment filed as heard. `variationMeta`
 * writes the two keys a frontend files a variation with; `ancestry` reads the chain back, and `familyOf` the root's every
 * descendant the layer holds, so a frontend's ladder (Jambot's boredom, its rejection) treats a variation as its family's.
 * Only the learned layer's filings carry `varies`: a seed's chain ends at it. A chain that comes round to an id already
 * on it (a layer edited by hand) ends there. Pure.
 */
import type { Meta } from './files';
import type { LearnedLayer } from './fragments';
/** The frontmatter's keys for a variation's origin (decision 052, point 4). */
export declare const VARIES = "varies";
export declare const BY = "by";
/** The meta a variation is filed with: the fragment it varies and its `by:` (`variationMeta('funk_drums', v)`), to pass to `fileFragment` with the rest. */
export declare function variationMeta(varies: string, variation: {
    readonly by: string;
}): Meta;
/** The fragment a filing varies and how, from the layer: its `varies` and `by`, or null where it varies none (a seed, a fragment filed as heard). */
export declare function originOf(layer: LearnedLayer, id: string): {
    readonly varies: string;
    readonly by: string | null;
} | null;
/**
 * A fragment's ancestry: its id, then the fragment it varies, and so on to its root, each with the `by:` that made the
 * one before it from it (none on the first). A seed, or a filing that varies none, is its own root: `[{ id }]`.
 */
export declare function ancestry(layer: LearnedLayer, id: string): readonly {
    readonly id: string;
    readonly by?: string;
}[];
/** A fragment's root: the last of its ancestry, a seed or a filing that varies none. */
export declare const rootOf: (layer: LearnedLayer, id: string) => string;
/**
 * A fragment's family: its root first, then every filing of the layer whose root is that one, in the order filed. A
 * fragment the layer neither holds nor descends from is a family of one (Jambot's `familyOf`, in the language).
 */
export declare function familyOf(layer: LearnedLayer, id: string): readonly string[];
