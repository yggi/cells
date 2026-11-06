import { type LearnedLayer, type StylePoint } from './fragments';
/** The presets a draw's runs start from, in order: run `i` of a draw starts at the `i`th. */
export declare const LOCK_IN_PRESETS: Readonly<Record<string, StylePoint>>;
/** Runs in a draw: one from each preset. */
export declare const DRAW: number;
/** Sections in a run. */
export declare const SECTIONS = 1250;
export declare const FACETS: readonly ["meter", "rhythm"];
export type Facet = (typeof FACETS)[number];
/**
 * The bound (decision 048, point 6; amended by #162 and #533): of the sections the baseline leaves outside its runs' 3
 * most used, learning may bring at most 40 % in, over draws 0–31 (256 runs, 320,000 sections), on each facet and for each
 * way of learning, with room for the measure's own noise: the pooled value plus twice its standard error (the spread of
 * its 32 draws of 8 over √32) is at most 0.4. Relative, so a fragment that makes the library more varied (the baseline
 * less concentrated) doesn't count against learning: the old bound, 5 points added, read the cinquillo as more lock-in
 * where learning played less concentrated than before (#533).
 */
export declare const LOCK_IN_BOUND = 0.4;
/** How the composer learns in a run: whether its uses move associations, whether it counts and weighs use together. */
export interface Learning {
    readonly move: boolean;
    readonly together: boolean;
}
/** One run with nothing learned: the seed's first of each facet at each section, and whether it was a miss. */
export interface Baseline {
    readonly start: string;
    readonly seed: number;
    readonly alone: Record<Facet, string[]>;
    readonly missed: Record<Facet, boolean[]>;
}
/** One run as it learned. */
export interface LearnedRun {
    /** The fragment of each facet kept at each section. */
    readonly kept: Record<Facet, string[]>;
    /** Fragments filed new, and filings whose text was held already (identity). */
    readonly filedNew: number;
    readonly filedHeld: number;
    /** The section a new fragment was first filed (its first use), and the first a filed fragment was found again by a query. */
    readonly firstFiled: number | null;
    readonly firstFoundAgain: number | null;
    readonly layer: LearnedLayer;
}
/** Draws `from` to `to` (each of 8 runs): each run's baseline, and the same run under each way of learning given, in order. */
export interface Draws {
    readonly baselines: readonly Baseline[][];
    readonly learned: readonly (readonly LearnedRun[][])[];
}
export declare function lockInDraws(from: number, to: number, learnings: readonly Learning[]): Draws;
/** The share of sections whose fragment is among the 3 most used of the run. */
export declare function topThree(ids: readonly string[]): number;
/** What learning added, on a facet, to the share among each run's 3 most used: in points of the share. */
export declare const added: (base: readonly Baseline[], runs: readonly LearnedRun[], facet: Facet) => number;
/** The lock-in of one way of learning over draws, on a facet (what it took of the share outside the 3 most used): per draw of 8, pooled over all of them, and the pooled value's standard error from the draws' spread. */
export interface LockIn {
    readonly perDraw: readonly number[];
    readonly pooled: number;
    readonly standardError: number;
}
export declare function lockIn(base: readonly Baseline[][], runs: readonly LearnedRun[][], facet: Facet): LockIn;
/** The share of sections, where the seed alone found something, whose fragment learning changed. */
export declare function drift(base: readonly Baseline[], runs: readonly LearnedRun[], facet: Facet): number;
