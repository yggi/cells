/**
 * Where a piece's form changes, heard in its scalograms (`wavelet.ts`, `signals.ts`; docs/notes/scalogram.md): three
 * finders of boundaries, and a score against the boundaries the code writes. Measured over the library, swells find
 * the most (about 60 % of the sections at 56–72 % precision, chance 19 %), cones are the most precise, novelty the least.
 */
import { type Scalogram } from './wavelet';
/** A boundary found: when (s), the slowest and fastest periods that show it, its score, and its path down the periods. */
export interface Boundary {
    readonly at: number;
    readonly top: number;
    readonly bottom: number;
    readonly score: number;
    readonly path: readonly (readonly [number, number])[];
}
/**
 * The cones in a scalogram: lines of maxima chained from slow periods down to fast ones, converging on a moment (Mallat
 * & Hwang 1992: a singularity, here a change of section, leaves a cone of maxima pointing at it).
 * - **A maximum**: at a period, a moment louder than `loud` × the row's mean and the loudest within a quarter period
 *   either side, clear of the window's edges.
 * - **A chain**: from each maximum not yet taken, slowest first, the nearest maximum one period faster within a quarter
 *   period (wider, a chain wanders from one cone into the next at the slow periods), down to `fastest` (a cone ends
 *   where the beat begins).
 * - **Kept**: a chain spanning at least `octaves` octaves; its score is its loudness in dB summed along the way; its
 *   apex is where it ends. Cones with apexes within `merge` seconds of each other are one, the best scored.
 */
export declare function cones(s: Scalogram, { fastest, octaves, merge, loud }?: {
    fastest?: number | undefined;
    octaves?: number | undefined;
    merge?: number | undefined;
    loud?: number | undefined;
}): Boundary[];
/**
 * Swells at the scale of `span` seconds (a boundary between sections that long): each scalogram in dB against its
 * period's mean, averaged over the periods from `span`/8 to `span`/2 (every scalogram counted alike), and the peaks of
 * that curve in time, best first, one within `span`/4 of another. A boundary that doesn't reach down to the beat (a
 * cone cut short) still swells there.
 */
export declare function swells(ss: readonly Scalogram[], span: number): Boundary[];
/**
 * Where the music changes at the scale of `span` seconds (Foote 2000's novelty, on the scalograms): at each moment, the
 * distance between the mean spectrum over `span`/2 before and over `span`/2 after (each period up to `span`/2 in dB
 * against its mean), and its peaks, best first. It finds a lasting change of texture, not a moment.
 */
export declare function novelty(ss: readonly Scalogram[], span: number): Boundary[];
/**
 * Boundaries found against the ones written. Only those found that reach up to `tall` seconds count; of them the best
 * as many as are written: the share that lands within `tolerance` of a written one (precision), the share of written
 * ones one lands on (recall), and what chance would give (the share of the window within `tolerance` of a written one).
 */
export declare function score(found: readonly Boundary[], written: readonly number[], window: number, tolerance: number, tall?: number): {
    precision: number;
    recall: number;
    chance: number;
    hits: Set<Boundary>;
};
/** A piece's sections (`sections` in engine/duration.ts: one round of the selector's steps) repeated over a window: a
 * loop's cycle is several rounds, a round as long as its last section is guessed to be (as long as the one before). */
export declare function sectionsOver(one: readonly {
    at: number;
    label: string;
}[], window: number): {
    at: number;
    label: string;
}[];
