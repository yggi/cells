/**
 * A piece's notes as signals in time, for the scalogram (`wavelet.ts`; docs/notes/scalogram.md). What a note is worth
 * is the open question, so there are several, each hearing another kind of boundary:
 * - `impulses`: each note an impulse of its gain.
 * - `envelope`: each note held for its length at its gain: sound against silence, the breaks.
 * - `voices`: `impulses` per voice, their powers summed (no beating between voices that don't share a pulse): density.
 * - `change`: an impulse only where a voice moves to a new pitch, weighed by the interval (to an octave), or enters
 *   after a rest (an octave's worth): drops, entries.
 * - `harmony`: an impulse where a pitch class sounds that hasn't for `HARMONY_MEMORY` seconds: a key, a mode, a chord
 *   that changes under the same rhythm.
 */
import type { Played } from '../realize';
import { type Grid, type Scalogram } from './wavelet';
export declare const SIGNALS: readonly ["impulses", "envelope", "voices", "change", "harmony"];
export type Signal = (typeof SIGNALS)[number];
/** What a signal needs of a note. */
export type Onset = Pick<Played, 'at' | 'dur' | 'voice' | 'freq' | 'gains'>;
/** The signals sampled on `g` (only those asked for), each a sample array. */
export declare function sampled(events: readonly Onset[], g: Grid, which?: readonly Signal[]): Partial<Record<Exclude<Signal, 'voices'>, Float64Array>> & {
    byVoice?: Float64Array[];
};
/** The scalograms of the signals asked for (all by default), on grid `g`. */
export declare function scalograms(events: readonly Onset[], g: Grid, which?: readonly Signal[]): Partial<Record<Signal, Scalogram>>;
