import { type Meter } from '../meter';
import type { CompileResult } from '../program';
/** One note of a line: its step on the line's grid, the voice it strikes, its own level as written, its level in all. */
export interface LineNote {
    readonly step: number;
    /** The voice, as written: `&hh`. */
    readonly voice: string;
    /** Its own level as written (`.25` of `&hh:0:.25`), or null: none, at 1. */
    readonly own: string | null;
    /** Its level: its own times its level cell's at its step. */
    readonly level: number;
}
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
}
/** A voice's pitch, as the lines are ordered by it: its General MIDI drum note, else past every drum. */
export declare const pitchOf: (voice: string) => number;
/** The steps of n a Euclid strikes, turned right by r, as the parser reads `x(k,n,r)` (`parser/braid.ts`). */
export declare const euclidHits: (k: number, n: number, r: number) => number[];
/**
 * The lines of a fragment, read off its text and its compile (the fragment under its workbench): every entry of every
 * card (a MIDI card, a sound card) whose trigger is a cell this module reads, in the order the cards write them.
 */
export declare function linesOf(source: string, result: CompileResult): Line[];
/**
 * A line with these notes, as the braids to write: each cell's tokens. Its steps as plain steps on its grid (a step of
 * two hits a chord, `[&bd,&hh]`); a subsequence or a Euclid as a subsequence on its one step, but a Euclid turned
 * (`rotated`), which stays a Euclid with the next turn. Its levels as given. A line left with no note leaves its card (a
 * product with nothing to sound is an error), its cell kept, all rests, so the fragment defines what it did; null where
 * the card would be left with no entry.
 */
export declare function written(line: Line, notes: readonly LineNote[], levels?: readonly string[], rotated?: boolean): Map<string, string[]> | null;
export {};
