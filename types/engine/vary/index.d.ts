import type { Rewrite } from '../rewrite';
import { type Anchor } from './anchors';
export { backbeatOf, type Anchor } from './anchors';
/** The operators: the rhythm ones (rung 1) and the pitched ones (rung 2). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse' | 'bend' | 'trim';
/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export declare const RHYTHM_OPERATORS: readonly Operator[];
/** The pitched operators, in their order: for a bass, a lead. */
export declare const PITCHED_OPERATORS: readonly Operator[];
/** Transposition's amounts where a frontend names none, in degrees of the table read. */
export declare const DEGREES: readonly number[];
/** A bend's amounts, in degrees of the table read from the note before the last: 1 or 2, either way (yggi/jambot#424). */
export declare const BENDS: readonly number[];
/** The fewest notes a trimmed line keeps: its last note left out, at least two stay (the lead's shapes, yggi/jambot#424). */
export declare const TRIM_FEWEST = 2;
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
export declare const variations: (fragment: string, options?: VaryOptions) => readonly Variation[];
/**
 * One note as recognition compares it (#224, decision 055): its onset in whole notes from its lap's start (null where
 * its line's grid is none of the meter's, its line's own step then in `key`), and the rest of what it is for S2: its
 * length (its line's step), the sound it strikes (a drum's General MIDI note, else its voice) and a pitched note's pitch,
 * its voice by its place among the pitched voices (`&bassV` is the first), as S1 numbered voices before decision 057.
 */
export interface HeardNote {
    readonly at: number | null;
    readonly key: string;
}
/**
 * A fragment's notes on its workbench and each variation's, as recognition compares them, with the lap they come round
 * after and the bar, in whole notes (null where a line's grid is none of the meter's). A harmony the fragment defines
 * itself (a braid of stacks no card plays, `&harm`) counts its chords' degrees as notes, beside its lines, so a vamp is
 * recognised as a bass line is. Null notes where the fragment doesn't compile on its workbench. One compile, as
 * `variations`.
 */
export interface Readings {
    readonly notes: readonly HeardNote[] | null;
    readonly span: number | null;
    readonly bar: number | null;
    readonly variations: readonly {
        readonly variation: Variation;
        readonly notes: readonly HeardNote[];
    }[];
}
/** `variations`, each with its notes as recognition compares them, and the source's. */
export declare function readVariations(fragment: string, options?: VaryOptions): Readings;
/** The index a draw in [0, 1) takes of n: ⌊draw · n⌋, the one Jambot's `pick(draw, ones)` takes for every draw. */
export declare function drawn(draw: number, n: number): number;
/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export declare function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null;
