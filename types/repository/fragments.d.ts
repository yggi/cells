/**
 * The repository of fragments, its first step (decision 041): a fragment is cells text with an index entry, an id and an
 * association, the places in style space it is found at. A query takes a style point and k and returns the k fragments
 * nearest to it. In memory only: no hash, no canonical form, no persistence (#49's later steps).
 *
 * The repository doesn't know the axes. A style point maps axis names to numbers, and the frontend names them (Jambot's
 * `sync`, `harm`, …): a distance compares only the axes a query and a point share, so an axis no fragment has is ignored.
 */
/** A place in style space: axis names to numbers. */
export type StylePoint = Readonly<Record<string, number>>;
/** One place a fragment is associated with, and how strongly: a weight > 0 (use moves it, later). */
export interface WeightedPoint {
    readonly point: StylePoint;
    readonly weight: number;
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
/** A fragment a query found, and how far it is from the query's point. */
export interface Found {
    readonly fragment: Fragment;
    readonly distance: number;
}
export interface Repository {
    readonly fragments: readonly Fragment[];
    /**
     * The k fragments nearest to a point, nearest first (ties by id), each with its distance (`fragmentDistance`). A
     * fragment that shares no axis with the point is infinitely far, and comes last. `axisWeights` weighs the axes
     * against each other (1 where it says nothing): the frontend knows that its tempo is not on the scale of its other axes.
     */
    query(point: StylePoint, k: number, axisWeights?: StylePoint): Found[];
}
/** What is wrong with an index entry, each problem a sentence; none for a well-formed one. */
export declare function fragmentProblems(entry: Fragment): string[];
/**
 * How far apart two points are, over the axes both have: the root of the weighted mean of the squared differences, so
 * that sharing more axes doesn't make a point farther. Infinite when they share none.
 */
export declare function pointDistance(a: StylePoint, b: StylePoint, axisWeights?: StylePoint): number;
/** How far a fragment is from a point: the nearest of its association's points, each distance divided by that point's weight. */
export declare function fragmentDistance(fragment: Fragment, point: StylePoint, axisWeights?: StylePoint): number;
/** A repository of these fragments; it throws on a malformed entry or an id given twice, naming each problem. */
export declare function createRepository(entries: readonly Fragment[]): Repository;
