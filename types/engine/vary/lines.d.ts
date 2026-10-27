import { type Meter } from '../meter';
import { type CompileResult } from '../program';
/** One note of a line: its step on the line's grid, the voice it strikes, its own level as written, its level in all. */
export interface LineNote {
    readonly step: number;
    /** The voice, as written: `&hh` (a pitched line's: the voice it is a product with, `&bassV`, or `''` for none). */
    readonly voice: string;
    /** Its own level as written (`.25` of `&hh:0:.25`), or null: none, at 1. */
    readonly own: string | null;
    /** Its level: its own times its level cell's at its step. */
    readonly level: number;
    /** A pitched line's note: what it plays; absent on a line of hits. */
    readonly pitch?: Pitch;
    /** A held note's length in steps (`7@2`: 2), written back as it was; absent for a note one step long. */
    readonly hold?: number;
}
/**
 * A pitched note: its step as written (a degree, or a splice), then mirrored and moved by the operators, so it plays
 * `sign · value + by` degrees of the table it reads (`inverse(…)` mirrors a splice in its own table, `degree(…)` moves it
 * there, as the language reads them).
 */
export interface Pitch {
    /** As written: a degree (`2`), or the splice (`&bassNext^$-1`). */
    readonly written: number | string;
    readonly sign: 1 | -1;
    readonly by: number;
    /** What its step plays as written, as the compiler flattens it: the table read and its shift, the value, its accidental, its grid steps. */
    readonly table: string;
    readonly value: number;
    readonly alter: number;
    readonly transpose: number;
}
/** The pitch moved: mirrored (`sign` −1) and then moved `by` degrees, after what it already was. */
export declare const moved: (p: Pitch, sign: 1 | -1, by: number) => Pitch;
/** What a pitch plays, for S2: its table, its degree there, its accidental and its grid steps. */
export declare const pitchKey: (p: Pitch) => string;
/**
 * A pitch's text: a degree as a number, its accidental kept and, mirrored, flipped (`4b` mirrored about 0 is `-4#`), as
 * `inverse(…)` reads one; a splice wrapped in `inverse(…)` and moved by `^n` (on a bare reference) or `degree(…, n)`.
 */
export declare function pitchText(p: Pitch): string;
/** How a line's trigger is written: steps, a subsequence on one step, or a Euclid of one voice. */
type Form = 'steps' | 'seq' | 'euclid';
/** A line of a fragment's card, as read. */
export interface Line {
    /** The line, as the card names it: its trigger cell, `&hat` (a product's first cell, `&euclid`). */
    readonly name: string;
    /** Its trigger cell's name, bare. */
    readonly trigger: string;
    readonly form: Form;
    /** Its Euclid as written (its form `euclid`): k hits in n, turned right by r. */
    readonly euclid?: {
        readonly voice: string;
        readonly k: number;
        readonly n: number;
        readonly r: number;
    };
    /** The card it is an entry of, bare, and that card's entries as written (`&euclid * &euclidLevel`), its own among them. */
    readonly card: {
        readonly name: string;
        readonly entries: readonly string[];
        readonly entry: string;
    };
    /** Its cell of levels (`map=amp`), bare, and its steps as written, one a step of the line; absent, none. */
    readonly levels?: {
        readonly cell: string;
        readonly tokens: readonly string[];
    };
    /** How many steps its lap holds: the grid it rotates on. */
    readonly steps: number;
    /** Its notes, in the order it plays them (by step, then pitch: `pitchOf`). */
    readonly notes: readonly LineNote[];
    /** A step's length in whole notes (its tap's, over a subsequence's steps), or null where its tap is none of the meter's. */
    readonly stepWhole: number | null;
    /** The meter it taps, or null. */
    readonly meter: Meter | null;
    /** A pitched line's table (its `over=`, bare) and voice: its notes carry their pitch; absent, a line of hits. */
    readonly pitched?: {
        readonly table: string | null;
        readonly voice: string;
    };
}
/** A voice's pitch, as the lines are ordered by it: its General MIDI drum note, else past every drum. */
export declare const pitchOf: (voice: string) => number;
/** The steps of n a Euclid strikes, turned right by r, as the parser reads `x(k,n,r)` (`parser/braid.ts`). */
export declare const euclidHits: (k: number, n: number, r: number) => number[];
/** A tap's length in whole notes on a meter: a note value (`16n`), a bar (`1m`), a pulse; null for any other. */
export declare function tapWhole(tap: string | undefined, meter: Meter | null): number | null;
/**
 * The lines of a fragment, read off its text and its compile (the fragment under its workbench): every entry of every
 * card (a MIDI card, a sound card) whose trigger is a cell this module reads, in the order the cards write them. An
 * entry that is a mix of its own (a drum bar's `&groove`, which the workbench's card sends: #291) is read as a card is,
 * its entries the lines, in its place. A fragment with no card (#291: where its notes go is the workbench's) is read
 * through what nothing in it reads: a mix of its own is read as a card, after the cards, and a pitched line (a cell of
 * degrees over a table) as a line with no voice of its own, after those.
 */
export declare function linesOf(source: string, result: CompileResult): Line[];
/**
 * A line with these notes, each step's token as `written` writes it: a rest, a hit, a chord of hits, a degree; null on
 * a step a held note holds through (a held note is written held, `7@2`, the steps it holds through left out).
 */
export declare function stepTokens(line: Line, notes: readonly LineNote[]): (string | null)[];
/**
 * A line with these notes, as the braids to write: each cell's tokens. Its steps as plain steps on its grid (a step of
 * two hits a chord, `[&bd,&hh]`); a subsequence or a Euclid as a subsequence on its one step, but a Euclid turned
 * (`rotated`), which stays a Euclid with the next turn. Its levels as given. A line left with no note leaves its card (a
 * product with nothing to sound is an error), its cell kept, all rests, so the fragment defines what it did; null where
 * the card would be left with no entry.
 */
export declare function written(line: Line, notes: readonly LineNote[], levels?: readonly string[], rotated?: boolean): Map<string, string[]> | null;
export {};
