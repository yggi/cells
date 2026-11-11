import type { Sounding } from './style';
/** The modes a mood is read from, in the order a tie is broken: the plain major and minor first. */
export declare const MODES: readonly ["ionian", "aeolian", "dorian", "mixolydian", "harmonic_minor", "lydian", "phrygian", "locrian"];
export type ReadMode = (typeof MODES)[number];
/** What `readMood` found: the mood, the mode and tonic it is read from, and how far to trust it (0 to 1). */
export interface MoodReading {
    readonly mood: number;
    readonly mode: ReadMode;
    /** The tonic's pitch class, 0 C to 11 B. */
    readonly tonic: number;
    readonly confidence: number;
}
/** The mood the pitched notes read as (but the drums'), absent where none is pitched or none sounds. */
export declare function readMood(notes: readonly Sounding[]): MoodReading | undefined;
