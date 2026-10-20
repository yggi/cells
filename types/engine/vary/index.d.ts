import type { Rewrite } from '../rewrite';
import { type Anchor } from './anchors';
export { backbeatOf, type Anchor } from './anchors';
/** The operators: the rhythm ones (rung 1) and the pitched ones (rung 2). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse';
/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export declare const RHYTHM_OPERATORS: readonly Operator[];
/** The pitched operators, in their order: for a bass, a lead. */
export declare const PITCHED_OPERATORS: readonly Operator[];
/** Transposition's amounts where a frontend names none, in degrees of the table read. */
export declare const DEGREES: readonly number[];
/** One change to one line: a rewrite of the tool `vary`, whose `apply` gives the varied fragment. */
export interface Variation extends Rewrite<Operator> {
    /** The line it varies, as the card names it: `&hat`. */
    readonly line: string;
    /** For a frontmatter's `by:`: the operator, the line and its amount (a step, degrees), `drop &hat 6`, `rotate &hat`, `transpose &bass -1`. */
    readonly by: string;
}
/** The frontend's policy: cells knows none of it. */
export interface VaryOptions {
    /** The text the fragment is read under (the host's `&bar`, `key`, `&harm`): its meter sets the backbeat, its harmony the roots. */
    readonly workbench?: string;
    /** Which operators, in this order for each line; by default the rhythm ones. */
    readonly operators?: readonly Operator[];
    /** Lines left alone for the frontend's own reasons, beside the anchors (Jambot: `&fill`). */
    readonly keep?: readonly string[];
    /** The fewest notes the fragment keeps over its lap (Jambot: 3, `GROOVE_FEWEST`); by default 1. */
    readonly fewest?: number;
    /** Transposition's amounts, in degrees of the table read; by default −2, −1, 1, 2. */
    readonly degrees?: readonly number[];
}
/** A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line, the backbeat's, the roots on chord changes. */
export declare const anchorsOf: (fragment: string, workbench?: string) => readonly Anchor[];
/** Every variation by one operator on one line, in Jambot's order, none playing the notes of its source or of one before it. */
export declare function variations(fragment: string, options?: VaryOptions): readonly Variation[];
/** The index a draw in [0, 1) takes of n: ⌊draw · n⌋, the one Jambot's `pick(draw, ones)` takes for every draw. */
export declare function drawn(draw: number, n: number): number;
/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export declare function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null;
