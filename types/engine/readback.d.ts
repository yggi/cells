/**
 * A text read back: where its bars start and the chord in force at each moment, with no line of the frontend's (#715). A
 * frontend that wants them added lines of its own to every text it compiled, a cell stepping `1m` and a voice, each read
 * through a MIDI card on channels it reserved, and found each bar's start in the notes of one and the chord in the other.
 * `readBack` writes those lines itself, under names the text doesn't use, as sound outputs that no card sends, compiles the
 * text with them, and returns the plan (to play the text's own notes: `notesOf`, none of them is one) with what they read.
 *
 * The bar starts are where the main meter's `1m` tap comes round, through its swing, bends and tempo, in seconds. The chord
 * is the notes a cell sounds through a voice on C4, as the cell is read through one (`[&harm * &voice]`): a played table turns
 * for the lines read through it (cells v0.6.0), so the cell named is read as the text plays it. No cell is read by its
 * name unless the caller names it (decision 075). Pure.
 */
import type { CompileOptions } from './program';
import { type Plan } from './realize';
/** What a text read back is asked: the seconds read, the chord cell's name if one is to be read, and how its `from` lines resolve. */
export interface ReadBackOptions {
    /** The seconds read, from 0: the bar starts and chords before it. */
    readonly to: number;
    /** The cell to read as a chord (`&harm` or `harm`): none, none read. A name the text doesn't define reads none. */
    readonly chord?: string;
    /** How the text's `from` lines read (`CompileOptions.resolve`). */
    readonly resolve?: CompileOptions['resolve'];
}
/** The notes a cell sounds at one moment: the MIDI keys it sounds through a voice on C4, from `at` seconds. */
export interface ChordRead {
    readonly at: number;
    readonly notes: readonly number[];
}
/** A text compiled with its reading, and what was read: the plan, each bar's start in seconds, and the chords. */
export interface ReadBack {
    /** The plan of the text and its reading lines: the text's own notes are those of `notesOf`, the reading's none. */
    readonly plan: Plan;
    /** Where each bar starts, in seconds, in order, from the first. */
    readonly barStarts: readonly number[];
    /** The chord cell's notes at each moment it sounds, in order of time: the keys of one onset sorted. */
    readonly chords: readonly ChordRead[];
}
/**
 * The text compiled with its reading, and its bar starts and chords read from `0` to `to` seconds. The text is not changed: its
 * own notes are those `notesOf` gives of the plan, since the reading's outputs have no card.
 */
export declare function readBack(text: string, { to, chord, resolve }: ReadBackOptions): ReadBack;
