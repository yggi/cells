/**
 * Motifs: the same short figure heard more than once, and at more than one time scale. A figure is `length` notes in
 * a voice, read as its intervals (semitones) and its rhythm relative to its first gap (so it is the same played twice
 * as slow): the shape a canon augments, a fugue's subject in long notes, a bass that plays the tune's outline. Found
 * in the notes heard (Played), so in a MIDI file as well as in a piece: a target for Shorten (one cell, played at two
 * rates) and for the multiscale view (a figure at two heights of the tower).
 */
import type { Played } from '../realize';
/** A figure heard: where (voice, from its first note to its last, its lowest and highest pitch, Hz) and its scale (its
 * first gap, s). */
interface Occurrence {
    readonly voice: string;
    readonly at: number;
    readonly to: number;
    readonly lo: number;
    readonly hi: number;
    readonly scale: number;
}
/** A motif: its shape (intervals; rhythm), every time it is heard, and the scales it is heard at (distinct, ascending). */
export interface Motif {
    readonly shape: string;
    readonly heard: readonly Occurrence[];
    readonly scales: readonly number[];
}
/**
 * Every figure of `length` notes heard at least `times` times (across voices and time), with its scales. A rhythm is
 * rounded to quarters of its first gap, an interval to the semitone; a figure that stays on a note for two steps or
 * more isn't one (every pulse would be), nor one that leaps an octave or more. Most heard first, then most scales.
 */
export declare function motifs(events: readonly Pick<Played, 'at' | 'voice' | 'freq'>[], { length, times }?: {
    length?: number | undefined;
    times?: number | undefined;
}): Motif[];
/** The motifs heard at time scales `ratio` or more apart (augmented, diminished: not a tempo that drifts), the widest first. */
export declare function multiscale(ms: readonly Motif[], ratio?: number): Motif[];
export {};
