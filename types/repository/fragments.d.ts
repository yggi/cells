/** A place in style space: axis names to numbers. */
export type StylePoint = Readonly<Record<string, number>>;
/** One place a fragment is associated with, and how strongly: a weight > 0 (use moves it, later). */
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
/** What a query may say beside its point: the facet it asks for, and the fragments already chosen. */
export interface QueryOptions {
    /** Measure each fragment over its points of this facet and those that name none, and rank only fragments that have one; every point of every fragment where it says none. */
    readonly facet?: string;
    /** The ids already chosen (on the composer's workbench): a fragment used with them often ranks nearer. An id the repository doesn't hold counts no use. */
    readonly chosen?: readonly string[];
    /**
     * The workbench, a cells text: rank only the fragments that fit it (`fitOf`: their uses defined there, no name defined
     * twice, their clock's needs met, the union compiled with no new diagnostic). Each fragment is tested in the order it
     * ranks, until k fit; the repository caches each compile by its text.
     */
    readonly workbench?: string;
}
export interface Repository {
    readonly fragments: readonly Fragment[];
    /**
     * The k fragments that rank first, by score (`coUseScore`), then by id; each with its distance (`fragmentDistance`,
     * over its points of the facet asked for) and its score, which is the distance when nothing is chosen. A fragment that shares no axis with
     * the point is infinitely far, and comes last. `axisWeights` weighs the axes against each other (1 where it says
     * nothing): the frontend knows that its tempo is not on the scale of its other axes.
     */
    query(point: StylePoint, k: number, axisWeights?: StylePoint, options?: QueryOptions): Found[];
    /** Records that these fragments were used together: the count of every pair among them goes up by one (an id given twice counts once). Throws on an id it doesn't hold. */
    used(ids: readonly string[]): void;
    /** How often two fragments were used together (0 for a fragment with itself). */
    usedTogether(a: string, b: string): number;
}
/**
 * How far the uses of a fragment with what is already chosen pull it nearer: λ in `coUseScore`, in units of distance per
 * e-fold of uses. At 0.1, fewer than 10 uses (λ·ln 10 ≈ 0.23) never reverse two fragments 0.3 apart, Jambot's miss
 * distance, and the 20th does (λ·ln 21 ≈ 0.304): the style leads, and the groups a jam keeps reorder what is near it.
 */
export declare const CO_USE_PULL = 0.1;
/**
 * A fragment's score: its distance less λ·ln(1 + n), n its uses with the fragments already chosen, summed over them
 * (decision 046). The logarithm makes each doubling of uses pull the same, so a pair used often doesn't lock the query
 * onto it; the sum is taken before it, so how many fragments are chosen doesn't change what a count can do.
 */
export declare const coUseScore: (distance: number, uses: number) => number;
/** What is wrong with an index entry, each problem a sentence; none for a well-formed one. */
export declare function fragmentProblems(entry: Fragment): string[];
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
/** A repository of these fragments; it throws on a malformed entry or an id given twice, naming each problem. */
export declare function createRepository(entries: readonly Fragment[]): Repository;
