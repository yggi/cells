/** Small music-theory helpers. Nothing here is special-cased in the language; it's used for naming and colour. */
/** Floor-mod that is always non-negative. */
export declare const mod: (n: number, m: number) => number;
export declare const NOTE_NAMES: readonly ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export interface Mode {
    readonly name: string;
    readonly intervals: readonly number[];
}
/** The diatonic modes, darkest to brightest — the order even(7,12) walks as its phase rises. */
export declare const MODES: readonly Mode[];
/**
 * The scales `scale(name, tonic)` knows, by name: each its steps up the 12 (a scan), and the name it is shown by. The
 * seven modes by their own names, the two everyone knows by theirs, and a few beyond the diatonic.
 */
export declare const SCALES: Readonly<Record<string, {
    readonly steps: readonly number[];
    readonly name: string;
}>>;
/**
 * The diatonic modes as words a braid reads (#363, decision 065): each its phase, darkest to brightest, as a note name
 * reads as its pitch class. `major` and `minor` are ionian's and aeolian's. The words belong to the diatonic necklace,
 * `even(7, 12, phase)`, its tonic fixed: one phase brighter raises one note a semitone, a fifth round the circle.
 */
export declare const MODE_WORDS: Readonly<Record<string, number>>;
/** The steps of the diatonic mode at a phase (0 the darkest), up the 12: what `scale(&mode, …)` reads. */
export declare const diatonicSteps: (phase: number) => number[];
/** A scale's name for a phase of the seven modes (0 the darkest): what `scale(tonic, phase)` is now written as. */
export declare function scaleOfPhase(phase: number): string;
/** Name a set by its shape above its first note: a diatonic mode, or one of the scales beyond it (Blues …). */
export declare function modeName(values: readonly number[]): string | null;
/**
 * Maximally even placement of k onsets in n slots (Bresenham), with phase p:
 *   position(i) = floor((i·n + p) / k)
 * Raising p by 1 moves exactly one onset one slot later, so for (7, 12) it
 * walks the modes darkest → brightest; p = k lifts the whole set one slot.
 */
export declare function even(k: number, n: number, phase?: number, i?: number): number[];
export declare function agogic(n: number, d: number): number[];
/**
 * Hue for a pitch, ordered around the circle of fifths so that
 * closely related pitches get neighbouring colours.
 */
export declare function pitchHue(semitones: number): number;
/** A frequency as a MIDI note number, A4 = 440 Hz = 69, unrounded: 261.63 → 60.0, 450 → 69.39. */
export declare function midiOf(freq: number): number;
/** Scientific pitch name of a frequency, A4 = 440 Hz: 261.63 → C4, 65.41 → C2. Sharps as ♯. */
export declare function noteName(freq: number): string;
/**
 * The intervals between successive entries of a set of positions on a lap,
 * the last one closing the lap: [0 2 4 5 7 9 11] on 12 → 2 2 1 2 2 2 1. The
 * inverse of a scan.
 */
export declare function intervals(positions: readonly number[], lap: number): number[];
/**
 * How bright the mode that starts on each of a set's positions is, against the others': the sum of its steps up from
 * there round the lap, scaled 0 (darkest: Locrian of the major scale's seven) … 1 (brightest: Lydian); all 0.5 when
 * they are alike.
 */
export declare function modeBrightness(positions: readonly number[], lap: number): number[];
/** A scan: running totals from 0 (the positions), and their sum (the lap). */
export declare function scan(steps: readonly number[]): {
    positions: number[];
    lap: number;
};
/**
 * A note by name, as semitones from C4: `C` (octave 4 when left out), `F#`, `Bb3`, `C5`. Null if it isn't one. In a
 * braid a name is a pitch (where a number is an index into the cell's table); as a tonic, a pitch class.
 */
export declare function pitchOfName(name: string): number | null;
