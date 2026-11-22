/** The axes before decision 076, in their order. */
export declare const OLD_AXES: readonly ["sync", "harm", "artic", "energy"];
type OldPoint = Readonly<Record<(typeof OLD_AXES)[number], number>>;
/** The seed library's mode fragments' association points on the old axes, as they were at v0.21.0, with their modes. */
export declare const OLD_MODES: readonly {
    readonly mode: string;
    readonly point: OldPoint;
}[];
/** The mode the library found nearest an old point (the first of a tie, as the repository's query takes it). */
export declare function oldMode(p: OldPoint): string;
/**
 * The library's styles as they were at v0.21.0, on the old axes, each with its mood placed by hand (#572): its mode's
 * brightness tempered by the tension heard in it (`moodOf`, `docs/notes/572-axes-atlas.md`), on a grid of twentieths.
 */
export declare const OLD_STYLES: readonly {
    readonly id: string;
    readonly mood: number;
    readonly point: OldPoint;
}[];
/** How near a style an old point is placed for it, and takes its mood: half the repository's miss distance (0.3). */
export declare const NEAR_STYLE = 0.15;
/** An old point's mood: the nearest style's, where one is within `NEAR_STYLE`; else its mode's (`moodOf`). */
export declare function oldMood(p: OldPoint): number;
/** An old point on the new axes: `bite` its articulation, and `mood` (`oldMood`), unless a point speaks to no mood. */
export declare function newPoint(p: OldPoint, mood?: boolean): {
    sync: number;
    harm: number;
    bite: number;
    mood?: number;
};
export {};
