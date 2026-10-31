/**
 * The default performer (decision 063 §2, #392): each of cells' events in a bar read as Jambot's host reads it
 * (`playSection`, yggi/jambot `packages/score/src/section-play.ts`), given the feel (`feel.ts`) at its performer's widths,
 * and said as played. Lifted from yggi/cell-studio src/session/perform.ts @ d5e7634, which a frontend applies after
 * `realize` to a bar of events, its frame made from what it knows of the bar (a host's `bar` message, its own plan).
 *
 * - **Its part and role** are its performer's role, or read off the output cells names it by (`readerOf`, the feel
 *   contract's minor 2; #511).
 * - **Its note and velocity** are what cells' MIDI out sends of it, on the host's channels (1 the lead, 2 the bass, 3
 *   the pad and the stab, 10 the drums): the velocity MIDI rounds from its level, the note a drum's or its key.
 * - **Its step and length** are its onset and end in the bar's steps through the swing undone (`writtenAt`): the step
 *   rounded, the length from the onset to the end.
 *
 * The feel moves its velocity and length, never its onset: its level is scaled so that MIDI's velocity is the feel's,
 * and it ends where the host ends it, at its step plus the feel's length, through the swing.
 */
import { type Routes } from '../midi';
import type { CompileResult } from '../program';
import type { Played } from '../realize';
import { readingOf, type FeelFrame, type Widths } from './feel';
/** A bar in its text's own time: the song's bar, its frame, and where it starts and how long it lasts (seconds). */
export interface TextBar {
    readonly bar: number;
    readonly frame: FeelFrame;
    readonly start: number;
    readonly seconds: number;
}
/** An event as the performers play it, as Jambot's log says one (`PlayedEvent`): its bar, part, drum role, step, note, velocity and length in steps. */
export interface Performance {
    readonly bar: number;
    readonly part: string;
    readonly role?: string;
    readonly step: number;
    readonly note: number;
    readonly velocity: number;
    readonly length: number;
}
/**
 * One of cells' events in a bar as the performers play it, and what it is as played; the event as it is, and no
 * performance, where it is none of the feel's (no part or role it reads, a drone, sent on none of the host's channels).
 */
export declare function perform(e: Played, route: (e: Played) => Routes, at: TextBar, read?: (output: string | undefined) => ReturnType<typeof readingOf>, widths?: (output: string | undefined) => Widths): {
    event: Played;
    performance: Performance | null;
};
/**
 * Each event's performer's widths, by its output (decision 063 §2): the `licence=` and `accents=` on the gate it is played
 * through (`Output.via`, or in a stack `through`), each 1 where unwritten, so a performer plays as the contract's does.
 */
export declare function widthsOf(result: Pick<CompileResult, 'outputs' | 'cells'>): (output: string | undefined) => Widths;
