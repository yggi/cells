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
/**
 * A progression's variation as a form on the progression it varies (decision 052, point 7, for rung 3): a copy of it,
 * `base=`, changed on the steps the variation changes, `=` keeping one step and `=!k` k (`base=&harm =!2 [1,3,5]`,
 * `base=&harm [[0,2,4] [2,4#,6]]`), steps past the last change kept; a cell that plays it (`&harm2 base=&harm …`) reads
 * the progression's table and grid. Null where it would be longer than the varied progression written out.
 */
export declare function progressionReference(p: Progression, slots: readonly Slot[], written: readonly string[]): {
    form: string;
    line: (name: string) => string;
} | null;
