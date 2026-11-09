import type { Rewrite } from '../rewrite';
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
/** A line's code on the new axes (its style cells, inline ones too, and its picks of `[artic]` and `[energy]`), or null. */
export declare function restyled(code: string): string | null;
/** Is a line's code written on the old axes: a style cell by name or a pick of a retired axis? (by order is ambiguous) */
export declare const writesOldAxes: (code: string) => boolean;
/** Each line with a style on the old axes: written on the new. */
export declare function axes(source: string): Rewrite<'axes'>[];
export {};
