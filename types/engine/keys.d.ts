/**
 * MIDI in, the pure part (#207): which cells a keyboard can play, and what a key sounds on the one armed. A melody's
 * key goes through its table (`over=`, else its grid) to the nearest pitch the melody can play, or sounds as played;
 * a kit's members are played by their General MIDI drum notes, as MIDI out sends them (`midi.ts` `kitNotes`). Pressing
 * and releasing is the audio's business (`audio/player.ts` `press`/`release`); nothing here is written into a piece.
 */
import type { CompileResult, Shifts } from './program';
import { type OutOfTable } from './capture';
/**
 * What a key outside the melody's table does, one setting for playing and recording (#210, `capture.ts`): 'allow' sounds
 * it as played (tuned from A4; a take writes an accidental), 'snap' the nearest entry, 'ignore' nothing.
 */
export type KeyMode = OutOfTable;
/** A cell a keyboard can play: a voice or a kit an out plays (not a send), or a melody that plays one. */
export interface Armable {
    readonly cell: string;
    /** The voice (or the kit) it sounds on. */
    readonly voice: string;
    readonly kit: boolean;
}
/** What a keyboard plays on the cell armed. */
export type Keyboard = {
    readonly kind: 'voice';
    readonly cell: string;
    readonly voice: string;
    /** The frequency a key (a MIDI note) sounds at, or null for none. */
    key(note: number): number | null;
} | {
    readonly kind: 'kit';
    readonly cell: string;
    /** The first member (in the kit's order) whose General MIDI note is one of these, and its frequency. */
    drum(gm: readonly number[]): {
        readonly voice: string;
        readonly freq: number;
    } | null;
};
/** The cells a keyboard can play, in reading order: every voice or kit an out plays (not a send), and the melody that plays it. */
export declare function armable(result: CompileResult): Armable[];
/** A MIDI note's frequency, equal-tempered from A4 (note 69). */
export declare const keyFrequency: (note: number, a4?: number) => number;
/**
 * How loud a key struck at a velocity (1 … 127) sounds: synths mostly turn velocity into amplitude on a square law,
 * the inverse of what MIDI out sends (`midi.ts` `velocityOf`), so a note played in and sent out keeps its velocity.
 */
export declare function keyLevel(velocity: number): number;
/**
 * What a keyboard plays on a cell: a kit, its members by drum note; a melody, the voice it plays, each key at the
 * nearest pitch the melody can play (`mode` 'allow': as played; 'ignore': a key off the table plays nothing); a voice, the voice, through the first melody that
 * plays it, or as played when none does. Null: the cell plays nothing (a clock, a table, a mix, a send).
 */
export declare function keyboardOf(result: CompileResult, cell: string, shifts: Shifts, { a4, mode }?: {
    a4?: number;
    mode?: KeyMode;
}): Keyboard | null;
/** A drum pad (the on-screen pads, #255): a kit's member and the General MIDI note that plays it (`kitNotes`). */
export interface Pad {
    readonly member: string;
    readonly note: number;
}
/**
 * The pads of a kit (or of the melody that plays one): one per member, in the order the kit first names them, each
 * with the General MIDI drum note a key on channel 10 plays it by. Empty: the cell is no kit.
 */
export declare function kitPads(result: CompileResult, cell: string): Pad[];
/**
 * The keys (MIDI notes 0 … 127) a melody's scale can play, for the dots on the on-screen keys (#255): every pitch it
 * can play (its table, down to its grid's tuning, as a key plays it in `keyboardOf`) on the key nearest it, from A4. A
 * voice no melody plays, a kit, or a cell that plays nothing: null (no scale to show; every key sounds as played).
 */
export declare function scaleKeys(result: CompileResult, cell: string, shifts: Shifts, a4?: number): ReadonlySet<number> | null;
/**
 * A row of a cell as the note it plays (the piano roll's keys, #211): `value` is a number written in the cell (an
 * entry of its table, laps beyond climbing), read through its tables down to its grid's tuning as a played note is
 * (`realize.ts`), on the voice its out plays; a kit's row picks its member. A voice is read through the first melody
 * that plays it. Null: the cell plays nothing.
 */
export declare function rowNote(result: CompileResult, cell: string, value: number, shifts: Shifts): {
    readonly voice: string;
    readonly freq: number;
} | null;
