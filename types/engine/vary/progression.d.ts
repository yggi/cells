import type { Meter } from '../meter';
import { type CompileResult } from '../program';
/** A tone of a stack: a degree of the table read, and its accidental in the table's grid steps (−1, 0, 1). */
export interface Tone {
    readonly degree: number;
    readonly alter: number;
}
/** A chord: its tones, as written. */
export type Chord = readonly Tone[];
/** A progression's step: one chord, or its two halves. */
export type Slot = readonly Chord[];
/** A progression as read: its cell, the table its degrees read, its steps on the meter, each a slot. */
export interface Progression {
    /** Its cell, as a line is named: `&harm`. */
    readonly name: string;
    /** The table it reads, bare: `key`. */
    readonly table: string;
    readonly slots: readonly Slot[];
    /** A step's length in whole notes. */
    readonly stepWhole: number;
    readonly meter: Meter | null;
    /** Its steps that sound in a cadence bar: no operator moves them. */
    readonly cadence: readonly number[];
}
/** A progression's candidate variation: the operator, its amounts (for `by`), its slots, and what it does, in words. */
export interface Candidate {
    readonly operator: 'rotate' | 'reverse' | 'third' | 'dominant';
    readonly amounts: readonly number[];
    readonly slots: readonly Slot[];
    readonly what: string;
}
/** A third's amounts, in degrees of the table read: a third down, a third up. */
export declare const THIRDS: readonly number[];
/** The bars of a phrase whose last bar cadences. */
export declare const PHRASE_BARS = 4;
/** A progression's steps as a braid: each slot's text, a run of one written `!n`. */
export declare function progressionBraid(slots: readonly Slot[]): string[];
/**
 * The progressions among a fragment's own cells: each a harmony no line plays (`played`), stepped on the meter, some
 * step of which is a stack, its braid read as slots. Those written otherwise are left out.
 */
export declare function progressionsOf(text: string, result: CompileResult, own: ReadonlySet<string>, played: ReadonlySet<string>): Progression[];
/** A progression's chords as recognition compares them: each tone at its onset, keyed as `harmoniesOf` keys an event. */
export declare function progressionNotes(p: Progression, slots: readonly Slot[], k: number): {
    at: number;
    key: string;
}[];
/** What a progression plays, for S2: each chord's onset and length, its tones sorted as they sound. */
export declare function progressionKey(p: Progression, slots: readonly Slot[]): string;
/**
 * Every candidate variation of a progression by the operators asked, in their order: for each, its rotation, its
 * retrograde, its thirds by step and then by `THIRDS`, its dominants by step. Each moves no cadence step. Whether a
 * candidate plays other notes than its source and the ones before it is the caller's to judge.
 */
export declare function progressionCandidates(p: Progression, operators: readonly string[], result: CompileResult): Candidate[];
