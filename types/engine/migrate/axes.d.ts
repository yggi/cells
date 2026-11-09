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
/** An old point on the new axes: `drive` the mean of articulation and energy; `bright` given, or the mode's found at it. */
export declare function newPoint(p: OldPoint, bright?: boolean): {
    sync: number;
    harm: number;
    drive: number;
    bright?: number;
};
/** A line's code on the new axes (its style cells, inline ones too, and its picks of `[artic]` and `[energy]`), or null. */
export declare function restyled(code: string): string | null;
/** Is a line's code written on the old axes: a style cell by name or a pick of a retired axis? (by order is ambiguous) */
export declare const writesOldAxes: (code: string) => boolean;
/** Each line with a style on the old axes: written on the new. */
export declare function axes(source: string): Rewrite<'axes'>[];
export {};
