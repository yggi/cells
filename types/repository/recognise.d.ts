/**
 * Recognition (decision 055, #224): given a heard text (a bar or a section the Muse wrote) and a library (the seed and a
 * learned layer's filed fragments), which fragments it is, by which of decision 052's operators, and how far: the
 * homeostat's sensor (yggi/jambot#237). A fragment's reading and its variations' are kept by text, so a recogniser warmed
 * on a library compiles only the heard text; the cache changes no answer. Stateless as the repository is (decision 048):
 * the share of bars recognised, and the ladder it drives, are the frontend's. Pure.
 */
import { type Operator, type VaryOptions } from '../engine/vary';
import type { Fragment } from './fragments';
/** Every operator, in decision 052's order: what recognition tries where a frontend names none. */
export declare const ALL_OPERATORS: readonly Operator[];
/** One step of a path: an operator on one line, as a variation's `by` names it (`drop &hat 6`). */
export interface PathStep {
    readonly operator: Operator;
    readonly line: string;
    readonly by: string;
}
/** A fragment the heard text is, by a path of operators (none: the fragment itself), and how far from what that path plays. */
export interface Recognised {
    readonly fragment: Fragment;
    /** The operators that map the fragment towards the heard text, first to last: none, one or two. */
    readonly path: readonly PathStep[];
    /**
     * The bar of the fragment's lap the heard text was matched from, 0 where the heard text is as long as the lap or
     * longer: a heard bar of a two-bar clave is matched against each of its bars, and the nearest is reported.
     */
    readonly bar: number;
    /** The notes that differ: those the heard text plays that the path doesn't, and those it plays that the heard text doesn't (S2, decision 050). */
    readonly distance: number;
}
/** What a recognition may say: the workbench both are read under, the tolerance, the depth, and Vary's options. */
export interface RecogniseOptions extends Omit<VaryOptions, 'operators'> {
    /** The operators a path may use, in this order; by default all eight. */
    readonly operators?: readonly Operator[];
    /** The most notes that may differ, a whole number ≥ 0 (the licence's); by default 0, the notes exactly. */
    readonly tolerance?: number;
    /** The longest path: 0 (the fragments themselves), 1 (one operator, the default) or 2. */
    readonly depth?: 0 | 1 | 2;
}
export interface Recogniser {
    /**
     * The fragments of the library the heard text is within the tolerance, nearest first (by distance, then the shorter
     * path, then the library's order), each by its nearest path; none where nothing is within it. A fragment that plays
     * no notes Vary reads (a meter) is never recognised, nor is a heard text that plays none. Throws on a tolerance that
     * isn't a whole number ≥ 0, or a depth that isn't 0, 1 or 2.
     *
     * A heard text that writes a variation by its reference (#293: it uses the fragment, `use &hat from funk_drums`, and
     * writes a line as one of its variations' forms on it, `&hat2 base=&hat =!6 ~`, or a mix's entry, `&hat[<<]`) is
     * read as that path, with no search: the fragments it refers to so, in the library's order, each at distance 0, and
     * nothing else. Its notes aren't compared, nor is it compiled.
     */
    recognise(text: string, library: readonly Fragment[], options?: RecogniseOptions): Recognised[];
}
/** A recogniser: it keeps each fragment's readings by its text and the options read under, which changes no answer. */
export declare function createRecogniser(): Recogniser;
