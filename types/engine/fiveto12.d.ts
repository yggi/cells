/**
 * The "5 to 12" cycle: a day of music, anchored to the clock at 11:55.
 *
 * The day: 12 blocks of 2 hours, one mode each — down from Ionian to Locrian (the nadir), up again
 * from Phrygian to Lydian (the earned zenith). A block: 12 keys of 10 minutes — descending, by fifths
 * (C G D … F); ascending, by fourths (C F B♭ … G: a new dawn, strange but full of hope). A key: 840
 * steps at 84 a minute — 70 bars of 12/8.
 *
 * A key's law: use all 7, 2 times, full circle, in 5 different ways.
 *  - 7: every bar sounds all 7 degrees of the mode, once each — nothing outside it.
 *  - the bell: a bar's 7 onsets sit where its mode's notes sit in the 12 (the 12/8 bell is the
 *    diatonic scale as rhythm).
 *  - 5 ways: five dimensions — melody (a degree), rhythm (the bell), harmony (1 … 7 voices in thirds),
 *    dynamics (ppp … fff), space (7 places) — each reading the key's row at its own offset
 *    (counterpoint). Phrase k (7 bars) foregrounds dimension k with its operation: translation,
 *    rotation, inversion, retrograde, multiplication (the Apple: ×5 mod 7 — it never leaves the mode).
 *  - full circle: in a phrase, each bar starts the row on the next degree.
 *  - 2 times: bars 36 … 70 are bars 35 … 1, in retrograde-inversion.
 *
 * Everything is a function of the step of the day: nothing to play through, any moment computed.
 */
export declare const BAR = 12;
export declare const KEY: number;
export declare const BLOCK: number;
export declare const DAY: number;
export declare const SECONDS_PER_STEP: number;
/** When the law's day begins: 11:55, in seconds of the day (its first block, the false zenith, starts here). */
export declare const START: number;
/** The modes, as rotations of the major scale's steps: 0 Ionian … 6 Locrian. */
export declare const MODE_NAMES: string[];
/** The day's modes, block by block (from 11:55). */
export declare const DAY_MODES: number[];
export declare const BLOCK_NAMES: string[];
/**
 * The law's day as plain data, for a view of it (a plugin's `view.law`): when each block and key begins, in seconds
 * of the day from `start`; each block's mode and brightness; each key's tonic (0 = C), block by block.
 */
export declare function dayLaw(): {
    start: number;
    blockSeconds: number;
    keySeconds: number;
    modeNames: string[];
    blockNames: string[];
    blocks: {
        mode: number;
        brightness: number;
    }[];
    tonics: number[][];
};
/** A mode's degrees as semitones above its tonic (parallel: on the same tonic). */
export declare function modeSemis(mode: number): number[];
/** Where a step of the day is: block, key in the block, bar in the key, step in the bar. */
export declare function place(step: number): {
    block: number;
    key: number;
    bar: number;
    inBar: number;
    mode: number;
    tonic: number;
};
/** A key's tonic (0 = C): the descent moves by fifths, the ascent by fourths — every block from C. */
export declare function tonicOf(block: number, key: number): number;
/** The row of a key: the 7 degrees in fifths order, turned by its place in the block, moved by its mode. */
export declare function rowOf(block: number, key: number): number[];
/** One onset of a bar: where (step in the bar), how long, which degree, and its other dimensions. */
export interface Onset {
    readonly at: number;
    readonly dur: number;
    readonly degree: number;
    /** Voices sounding, stacked in thirds above the degree (1 … 7). */
    readonly density: number;
    /** 0 ppp … 6 fff. */
    readonly dynamic: number;
    /** 0 hard left … 6 hard right. */
    readonly space: number;
}
/** A bar of a key (0 … 69): the first half as stated; the second, the first's retrograde-inversion. */
export declare function barOf(block: number, key: number, bar: number): Onset[];
/** A note to sound: its step of the day, length in steps, semitones above C4, level, pan (−1 … 1). */
export interface LawNote {
    readonly step: number;
    readonly dur: number;
    readonly semis: number;
    readonly level: number;
    readonly pan: number;
}
/** Every note starting in steps [from, to) of the day (whole bars' onsets, stacks included). */
export declare function notesBetween(from: number, to: number): LawNote[];
