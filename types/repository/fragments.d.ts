/**
 * The repository of fragments (decision 041): a fragment is cells text with an index entry, an id and an association, the
 * places in style space it is found at, each of which may name the facet it is found under. A query takes a style point
 * and k and returns the k fragments nearest to it, over their points of the facet it names. Fragments come in groups
 * (decision 043): a query weighs how often two were used together with what is already chosen, beside the distance
 * (decision 046), as strongly as the frontend asks (`pull`); how well a group is known saturates, and what was used lately
 * is the frontend's workbench, not the repository's (#151).
 *
 * The repository is built from the seed library and keeps nothing a jam learns (decision 047, point 7; decision 048): a
 * query may be handed a learned layer (`LearnedLayer`: fragments the frontend filed, association points use added,
 * counts of use together), merged with the seed at that query and never stored, so a repository answers the same query
 * with the same layer alike, every time. What changes a layer (filing, use) is `learned.ts`, which returns a new one.
 *
 * The repository doesn't know the axes, nor the facets. A style point maps axis names to numbers, and the frontend names
 * them (Jambot's `sync`, `harm`, …): a distance compares only the axes a query and a point share, so an axis no fragment
 * has is ignored. A facet is a name too (`meter`, `rhythm`), compared and never read: a hint of what a fragment is
 * associated as there (a bell a rhythm in one style, a scale in another), not a classifier. What a fragment can fill is
 * read off its text by the fit (`fit.ts`, decision 047), never off its facets: a query given the workbench ranks only the
 * fragments that fit it.
 */
import type { FragmentFile } from './files';
/** A place in style space: axis names to numbers. */
export type StylePoint = Readonly<Record<string, number>>;
/** One place a fragment is associated with, and how strongly: a weight > 0 (use adds such places, `learned.ts`). */
export interface WeightedPoint {
    readonly point: StylePoint;
    readonly weight: number;
    /** The facet it is associated as here (`meter`, `rhythm`): a hint a query names. With none, the point counts for every facet. */
    readonly facet?: string;
}
/** A fragment: cells text and its index entry. */
export interface Fragment {
    /** Names it in the repository: unique, never empty. */
    readonly id: string;
    /** The cells text, never empty. */
    readonly text: string;
    /** The places in style space it is found at, one or more. */
    readonly association: readonly WeightedPoint[];
}
/** A fragment a query found, how far it is from the query's point, and the score it was ranked by. */
export interface Found {
    readonly fragment: Fragment;
    /** Its distance from the query's point (`fragmentDistance`): the style alone. */
    readonly distance: number;
    /** What it is ranked by: the distance less the pull of its uses with what is already chosen (`coUseScore`); the distance when it has none. */
    readonly score: number;
}
/**
 * What a frontend has learned (decision 048): plain data, JSON as it stands, kept by the frontend (files, a database, a
 * store) and handed to each query. cells never stores it, and `learned.ts` returns a new one for each change.
 */
export interface LearnedLayer {
    /** Fragments the frontend filed (the composer's on a miss, the Muse's), each as a file reads and writes (`writeFragment`). Use moves their associations in place. */
    readonly filed: readonly FragmentFile[];
    /** Association points use added to fragments the layer doesn't hold itself (the seed's), each naming its fragment. */
    readonly points: readonly LearnedPoint[];
    /** How often two fragments were used together, each pair once. */
    readonly together: readonly UsedPair[];
}
/** An association point use added to a fragment the layer doesn't hold (a seed fragment): its id, and the point. */
export interface LearnedPoint extends WeightedPoint {
    readonly id: string;
}
/** How often two fragments were used together: their ids, in code-unit order, and the count, a whole number > 0. */
export interface UsedPair {
    readonly ids: readonly [string, string];
    readonly count: number;
}
/** A layer with nothing learned: a query handed it answers as one handed none. */
export declare const EMPTY_LAYER: LearnedLayer;
/** The seed and a learned layer merged, as a query sees them. */
export interface Merged {
    /** The seed's fragments, then the filed ones, each with the points use added to it after its own. */
    readonly fragments: readonly Fragment[];
    /** The ids of the filed fragments. */
    readonly filed: ReadonlySet<string>;
    /** How often each pair was used together, both ways round: id → id → count. */
    readonly together: ReadonlyMap<string, ReadonlyMap<string, number>>;
    /** Ids the layer names (a point, a pair) that neither the seed nor the layer holds, left out (a seed fragment a later release dropped). */
    readonly unheld: readonly string[];
}
/** What a query may say beside its point: the facet it asks for, the fragments already chosen, the workbench, the learned layer. */
export interface QueryOptions {
    /** Measure each fragment over its points of this facet and those that name none, and rank only fragments that have one; every point of every fragment where it says none. */
    readonly facet?: string;
    /** The ids already chosen (on the composer's workbench): a fragment used with them often ranks nearer. An id the repository doesn't hold counts no use. */
    readonly chosen?: readonly string[];
    /**
     * How strongly use together with what is chosen pulls (`coUseScore`), a number ≥ 0: `CO_USE_PULL` where it says none, 0
     * for none (a query that ranks as one with nothing chosen). The frontend sets it from where it is on its novelty ladder
     * (decision 043, point 5): strong to repeat and vary, weak or 0 to fetch nearby and far. cells knows no ladder.
     */
    readonly pull?: number;
    /**
     * The workbench, a cells text: rank only the fragments that fit it (`fitOf`: their uses defined there, no name defined
     * twice, their clock's needs met, the union compiled with no new diagnostic). Each fragment is tested in the order it
     * ranks, until k fit; the repository caches each compile by its text.
     */
    readonly workbench?: string;
    /** What the frontend has learned, merged with the seed for this query only (`merge`); none, or `EMPTY_LAYER`, ranks the seed alone. */
    readonly layer?: LearnedLayer;
}
export interface Repository {
    /** The seed: the fragments it was built from. */
    readonly fragments: readonly Fragment[];
    /**
     * The k fragments that rank first, by score (`coUseScore`), then a filed fragment before a seed one, then by id; each
     * with its distance (`fragmentDistance`, over its points of the facet asked for) and its score, which is the distance
     * when nothing is chosen or the pull is 0. A fragment that shares no axis with the point is infinitely far, and comes
     * last. `axisWeights` weighs the axes against each other (1 where it says nothing): the frontend knows that its tempo is
     * not on the scale of its other axes. Throws on a malformed layer (`layerProblems`), or a pull that isn't a number ≥ 0.
     */
    query(point: StylePoint, k: number, axisWeights?: StylePoint, options?: QueryOptions): Found[];
    /** The seed and a layer merged, as a query sees them; throws on a malformed layer, or one that files a seed's id. */
    merge(layer: LearnedLayer): Merged;
}
/** The pull of use together a query has where it names none (`QueryOptions.pull`): λ in `coUseScore`. */
export declare const CO_USE_PULL = 0.1;
/** The count of uses together past which more add nothing: a group used together 10 times is known (#151). */
export declare const CO_USE_KNOWN = 10;
/**
 * How far a known group pulls, in units of the pull: 0.01 in distance at the default, half Jambot's hold distance, a
 * thirtieth of its miss distance (0.3). Over the lock-in measure's 256 runs (`lockin.ts`, `lockin.slow.test.ts`) use
 * together then adds 1.5 points to the rhythms' share among a run's 3 most used, on top of use moves' 2.5, 4.05 in all,
 * under the bound of 5 with twice its standard error (#162); at 0.2 the total is 5.1, at 0.05 3.4. Any pull adds some,
 * since among fragments that fit the style about as well a known group wins the tie, and stays (#151).
 */
export declare const CO_USE_REACH = 0.1;
/**
 * A fragment's score: its distance less pull · reach · ln(1 + min(n, known)) / ln(1 + known), n its uses with the
 * fragments already chosen, summed over them (decision 046, amended by #151). The logarithm makes each doubling of uses
 * pull the same, until the group is known; past that, more uses add nothing, so a group a long jam keeps never pulls past
 * `CO_USE_REACH` · pull and the style stays in charge. The sum is taken before it, so how many fragments are chosen
 * doesn't change what a count can do. With a pull of 0, or no uses, the score is the distance.
 */
export declare const coUseScore: (distance: number, uses: number, pull?: number) => number;
/** What is wrong with an index entry, each problem a sentence; none for a well-formed one. */
export declare function fragmentProblems(entry: Fragment): string[];
/** What is wrong with a learned layer's shape, each problem a sentence; none for a well-formed one. Which ids it may name is the seed's (`merge`). */
export declare function layerProblems(layer: LearnedLayer): string[];
/**
 * How far apart two points are, over the axes both have: the root of the weighted mean of the squared differences, so
 * that sharing more axes doesn't make a point farther. Infinite when they share none.
 */
export declare function pointDistance(a: StylePoint, b: StylePoint, axisWeights?: StylePoint): number;
/** A fragment's association points a query of this facet measures: those of the facet and those that name none; all, for no facet. */
export declare const pointsOf: (fragment: Fragment, facet?: string) => readonly WeightedPoint[];
/**
 * How far a fragment is from a point: the nearest of its association's points (of the facet, where one is named), each
 * distance divided by that point's weight. Infinite when it has no point of that facet.
 */
export declare function fragmentDistance(fragment: Fragment, point: StylePoint, axisWeights?: StylePoint, facet?: string): number;
/** The order of two ids, by code unit: how a layer writes a pair, and a query breaks a tie. */
export declare const byId: (a: string, b: string) => number;
/**
 * A repository of these fragments, the seed; it throws on a malformed entry or an id given twice, naming each problem. It
 * keeps nothing between calls but a cache of compiles by text (`cachedFit`), which changes no answer.
 */
export declare function createRepository(entries: readonly Fragment[]): Repository;
