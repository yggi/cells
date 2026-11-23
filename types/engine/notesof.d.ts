/**
 * A plan's MIDI notes, in one call (#715): what a frontend that sends or reads a piece's notes did in six, `windowAt` →
 * `router(channelTable)` → `routesOf` → `midiNote`, each note then read back with the part and drum role its text declares
 * (`readerOf`) and the output and voice it came from. The notes are the ones MIDI out sends and `pieceMidi` writes
 * (`engine/midi.ts`: the same channel table, routes, keys and velocities); a note on no MIDI key, or on no card, is none.
 * Pure.
 */
import { type MidiNote, type OutputChoice } from './midi';
import { type Reading } from './perform/feel';
import type { Plan } from './realize';
/** A note as MIDI sends it, and where it came from. */
export interface PlayedNote extends MidiNote {
    /** The output it plays (`Output.id`): its line, for a kit's member `kit:voices:<line>:…`. */
    readonly output: string | undefined;
    /** The voice cell that sounds it. */
    readonly voice: string;
    /** The part and drum role the text declares for its output (`readerOf`), or null where it declares none of the feel's. */
    readonly reading: Reading | null;
}
/** What `notesOf` is asked: the span in seconds (`from` 0 by default, to `to`), and the outputs the channel table is made for. */
export interface NotesOptions {
    readonly from?: number;
    readonly to: number;
    /** The outputs the channels are laid for (`channelTable`'s: one MIDI out with every card on by default). */
    readonly outputs?: readonly OutputChoice[];
}
/**
 * The MIDI notes a plan plays from `from` to `to` seconds, in the order it plays them, each with its channel, key,
 * velocity, start and end in seconds, and the output, voice and reading it comes from. A note starts in the span or
 * not at all; a note on two cards is two (`routesOf`).
 */
export declare function notesOf(p: Plan, { from, to, outputs }: NotesOptions): PlayedNote[];
