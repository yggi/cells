export declare const PER_OCTAVE = 12;
/** Samples a second at most, and in all over a window (a day at 3 a second). */
export declare const MOST_RATE = 50;
/** How a window is sampled and which periods are looked at. */
export interface Grid {
    readonly window: number;
    readonly rate: number;
    /** Seconds, fastest first, 12 an octave. */
    readonly periods: readonly number[];
    /** The signal goes round: a loop's rounds, transformed circularly (no edges); its samples a power of two. */
    readonly periodic?: boolean;
}
/** A scalogram: `rows[i][c]`, the power at `periods[i]` around the moment (c + ½)/columns × window. */
export interface Scalogram {
    readonly window: number;
    readonly periods: readonly number[];
    readonly rows: readonly Float32Array[];
    /** Transformed circularly (a loop): no edges, every moment clear. */
    readonly periodic?: boolean;
}
/**
 * The grid for a window of `window` seconds: 50 samples a second, fewer for a long one (at most 2^18 in all); the
 * periods from 1/16 s (a long window: 8 samples, clear of the aliasing a few samples a second leave) to a third of the
 * window (beyond that the window's edges are all there is). `periodic`: for a loop's rounds, transformed circularly;
 * the rate then makes the samples a power of two (the FFT's length): the rate asked, or up to twice it.
 */
export declare function grid(window: number, most?: number, periodic?: boolean): Grid;
/**
 * The scalogram of `x` (sampled on `g`): the power |W(s, t)|² at each period, normalised by scale (Liu et al. 2007) so
 * that an impulse train's levels compare across periods, at min(samples, 4096) moments. The signal's mean is taken
 * away first, so the window's edges aren't a step. On a periodic grid the signal goes round (a loop): no padding, no
 * edges.
 */
export declare function transform(x: Float64Array, g: Grid): Scalogram;
/** Two scalograms of the same grid, added (the powers of signals that don't beat against each other). */
export declare const sum: (a: Scalogram, b: Scalogram) => Scalogram;
/** How far the window's edges reach into a period's row, as a fraction of the window: `k` × the Morlet's e-folding time √2·s. */
export declare const reach: (period: number, window: number, k?: number) => number;
/** Each row against its own mean over the moments the window's edges leave clear (twice their reach): 1 is the mean. */
export declare function byRow(s: Scalogram): Float32Array[];
/**
 * A scalogram of `rounds` turns of a loop, folded into one turn of `cycle` seconds: each moment of the turn the mean
 * power over the rounds, of those where that period is clear of the window's edges (twice `reach`; a periodic
 * scalogram has none); where none is, NaN: not heard clearly (a period too slow for three rounds). Listened to over three rounds, seen as one: a slow level the loop
 * itself makes shows, and the window's edges don't.
 */
export declare function fold(s: Scalogram, cycle: number, rounds: number): Scalogram;
/**
 * The levels a scalogram hears throughout: the peaks of its mean power over time (the moments clear of the window's
 * edges; NaN left out) above a twentieth of the highest, of periods the window holds six times at least, strongest
 * first, at most `most`: each a period and its mean against the highest's.
 */
export declare function ridges(s: Scalogram, most?: number): {
    period: number;
    strength: number;
}[];
