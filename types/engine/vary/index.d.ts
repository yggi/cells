import type { Rewrite } from '../rewrite';
import { type Anchor } from './anchors';
export { backbeatOf, type Anchor } from './anchors';
/** The operators: the rhythm ones (rung 1). The pitched ones, transpose, invert and reverse, join at rung 2. */
export type Operator = 'rotate' | 'drop' | 'add';
/** The operators a frontend gets where it names none, in their order. */
export declare const RHYTHM_OPERATORS: readonly Operator[];
/** One change to one line: a rewrite of the tool `vary`, whose `apply` gives the varied fragment. */
export interface Variation extends Rewrite<Operator> {
    /** The line it varies, as the card names it: `&hat`. */
    readonly line: string;
    /** For a frontmatter's `by:`: the operator, the line and its amount (a step), `drop &hat 6`, `rotate &hat`. */
    readonly by: string;
}
/** The frontend's policy: cells knows none of it. */
export interface VaryOptions {
    /** The text the fragment is read under (the host's `&bar`): its meter sets the backbeat. */
    readonly workbench?: string;
    /** Which operators, in this order for each line; by default the rhythm ones. */
    readonly operators?: readonly Operator[];
    /** Lines left alone for the frontend's own reasons, beside the anchors (Jambot: `&fill`). */
    readonly keep?: readonly string[];
    /** The fewest notes the fragment keeps over its lap (Jambot: 3, `GROOVE_FEWEST`); by default 1. */
    readonly fewest?: number;
}
/** A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line and the backbeat's. */
export declare const anchorsOf: (fragment: string, workbench?: string) => readonly Anchor[];
/** Every variation by one operator on one line, in Jambot's order, none playing the notes of its source or of one before it. */
export declare function variations(fragment: string, options?: VaryOptions): readonly Variation[];
/** The index a draw in [0, 1) takes of n: ⌊draw · n⌋, the one Jambot's `pick(draw, ones)` takes for every draw. */
export declare function drawn(draw: number, n: number): number;
/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export declare function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null;
