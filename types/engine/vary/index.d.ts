import { type Resolve } from '../program';
import type { Rewrite } from '../rewrite';
import { type Anchor } from './anchors';
import { type Reference } from './reference';
export { backbeatOf, type Anchor } from './anchors';
export type { Reference } from './reference';
export { THIRDS, PHRASE_BARS } from './progression';
/** The operators: the rhythm ones (rung 1), the pitched ones (rung 2) and the harmony's own (rung 3). */
export type Operator = 'rotate' | 'drop' | 'add' | 'transpose' | 'invert' | 'reverse' | 'bend' | 'trim' | 'third' | 'dominant' | 'swap' | 'substitute' | 'shift' | 'split';
/** The operators a frontend gets where it names none, in their order: the rhythm ones. */
export declare const RHYTHM_OPERATORS: readonly Operator[];
/** The pitched operators, in their order: for a bass, a lead. */
export declare const PITCHED_OPERATORS: readonly Operator[];
/**
 * The operators on a progression (rung 3), in their order: the line's rotate and reverse a level up, each phrase between
 * its cadences, then a chord a third away and a secondary dominant. A progression is varied by these alone, and only
 * where a frontend asks for one of them: rotate and reverse act on a progression only beside `third` or `dominant`.
 */
export declare const HARMONY_OPERATORS: readonly Operator[];
/**
 * The operators on a form's letters or a song plan's sections (point 10), the slot operators every level shares
 * (`slots.ts`): rotate and reverse between its anchors, swap two adjacent slots, substitute a slot by another it holds.
 * A form is varied only where a frontend asks for `swap` or `substitute`, as a progression where it asks for one of its own.
 */
export declare const FORM_OPERATORS: readonly Operator[];
/**
 * One slot moved n degrees of the table it reads, n each of `degrees` (#910): a note of a pitched line
 * (`shift &bass 2 1`), a chord of a progression (`shift &harm 1 -1`; its `third` is its shift by a third), a letter of
 * a form on a grid (`&a` to `&a^1`, a sequence: `shift &chorus 1 2`). Asked by name: no list of a level's holds it.
 */
export declare const SHIFT: Operator;
/**
 * One slot split in two halves (#912), the second filled by the level's rule: a pitched line's note and its neighbour n
 * degrees away, n each of `NEIGHBOURS` (`split &bass 2 1`: `0 ~ 1 2` to `0 ~ [1 2] 2`, an ornament); a progression's
 * chord and the next chord's secondary dominant (its `dominant` is this split); a form's letter on a grid and each other
 * letter of the form (`split &chorus 1 2`: `&a &a &b &a` to `&a [&a &b] &b &a`). Asked by name: no level's list holds it.
 */
export declare const SPLIT: Operator;
/** A split's neighbours on a pitched line, in degrees of its table: the one below and the one above. */
export declare const NEIGHBOURS: readonly number[];
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
    /**
     * The varied line as forms on the line it varies (#293), for a text that keeps what was varied: `&hat[<<]`,
     * `&bassline^-1`, `&hat[:6] ~ &hat[7:]`; absent where the line can't be spliced or the forms would be longer than the
     * line written out (`reference.ts`).
     */
    readonly reference?: Reference;
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
    /**
     * The library a fragment's `from` lines take from (a groove's drums, `&bd, &sd from gm_kit`, decision 075): the host's
     * resolver. A fragment read without one compiles only where it takes nothing.
     */
    readonly resolve?: Resolve;
    /**
     * A mask over a line of slots (a progression, a form, a song plan), by its name (`&harm` or `harm`): the slots no
     * operator moves, in place of the level's own anchors (a progression's cadence, a form's first and last slot); a
     * negative counts from the end, −1 the last. `{ '&harm': [] }` fixes none; `{ '&chorus': [0, 1, -1] }` keeps a form's
     * first two letters and its last. The same at every scale.
     */
    readonly fixed?: {
        readonly [line: string]: readonly number[];
    };
}
/**
 * A fragment's anchors on its workbench, derived from its text (decision 052, point 3): the kick's line, the backbeat's,
 * the roots on chord changes, and a progression's cadence (each step in the last bar of a four-bar phrase, point 8).
 */
export declare const anchorsOf: (fragment: string, workbench?: string, resolve?: Resolve) => readonly Anchor[];
/**
 * Every line's fixed steps on its workbench, in the mask's own shape (`VaryOptions.fixed`, #909): its lines', its
 * progressions' and its forms', as the options give them (the frontend's `keep` and mask, else each level's anchors).
 * Handed back as the mask, it varies the fragment as it is varied with none: `variations(text, { ...o, fixed: fixedStepsOf(text, o) })`.
 */
export declare function fixedStepsOf(fragment: string, options?: VaryOptions): {
    readonly [line: string]: readonly number[];
};
/** Every variation by one operator on one line, in Vary's order, none playing the notes of its source or of one before it. */
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
/**
 * The variation a `by:` names (decision 052, point 9): `drop &hat 6`, `transpose &bass -1`, `third &harm 2 -2`, made on
 * the fragment's text under the same options as `variations`, without making the others: only that line's variations by
 * that operator. So a filed variation's text is rebuilt from its source, its `by:` and the options it was made with
 * (Jambot's rebuilt layer, a lineage replayed). Null where the text gives none of that name (its line anchored or kept,
 * or the variation playing its source). One `variations` leaves out as playing the notes of a variation before it, by
 * another operator or line, is still given here.
 */
export declare function variationBy(fragment: string, by: string, options?: VaryOptions): Variation | null;
/** The variation `drawn` picks of the n `variations` gives; null where there is none. A draw outside [0, 1) is an error. */
export declare function varied(fragment: string, draw: number, options?: VaryOptions): Variation | null;
