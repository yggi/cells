/**
 * Foldings: a piece's cyclic patterns, heard at every level, and the same pattern found at more than one. A necklace is
 * `n` slots round a cycle with some marked: the strokes of a bell in its twelve pulses, the notes of a scale in the
 * twelve semitones. Seen as its steps (the gaps between marks) it doesn't depend on where the cycle starts, so the
 * West African bell x.x.xx.x.x.x and the major scale are one necklace, 2 2 1 2 2 2 1 (examples/bell.cells writes them
 * as one scan). The same necklace at two levels is a piece folded the same way at two scales: a fixed point of
 * renormalization (docs/notes/multiscale.md), and a candidate for one cell where the code has two.
 */
import type { Played } from '../realize';
/** `n` slots round a cycle, the marked ones (ascending, in [0, n)). */
export interface Necklace {
    readonly n: number;
    readonly marks: readonly number[];
}
/** The gaps between marks, round the cycle, starting at the first mark. */
export declare function steps(x: Necklace): number[];
/**
 * The necklace's name, the same whatever slot the cycle starts at and however many times round it repeats: its steps
 * (one repeat) from the rotation that reads largest (the major scale and the standard bell both read "2 2 2 1 2 2 1",
 * the rotation that starts at the scale's fourth degree).
 */
export declare function canonical(x: Necklace): string;
/**
 * Maximally even (Clough & Douthett 1991): the marks as evenly spread as `n` slots allow; for each span of d marks,
 * the slots it covers take at most two sizes, one apart. The diatonic scale, the bell, the pentatonic, the tresillo
 * x..x..x. are; the clave son isn't.
 */
export declare function maximallyEven(x: Necklace): boolean;
/**
 * The rhythm of onsets (s) folded round a cycle of `cycle` seconds with `pulse` seconds a slot: a slot is marked when
 * an onset lands on it in at least half the turns heard (a fill or a variation doesn't change the pattern). Onsets off
 * the pulse grid by more than a quarter pulse leave the pattern null: the pulse doesn't fit them.
 */
export declare function rhythm(onsets: readonly number[], cycle: number, pulse: number, from?: number): Necklace | null;
/** The pitch classes heard (frequencies, A = 440 Hz), as a necklace of the twelve semitones. */
export declare function pitchClasses(freqs: readonly number[]): Necklace | null;
/** The finest pulse heard: the most common gap (to the millisecond) between successive onsets of any voice. */
export declare function pulseOf(onsets: readonly number[]): number | null;
/** A level to fold at: a cycle (s) with its pulse (s), named for what writes or hears it (a cell, a ridge). */
export interface Level {
    readonly name: string;
    readonly cycle: number;
    readonly pulse: number;
}
/**
 * The levels to fold a piece at: any clocked cell's turn as the cycle, with any cell's step (or the finest pulse heard,
 * unless a written one is within 2 % of it) as the pulse, whole slots a cycle, 3 to `most`, the cycle within `longest`
 * seconds. The bell's bar is &beat's turn, its pulse &pulse's step: no one cell has both. Spans in seconds (a cell's
 * step and turn: layout/tower.ts `towerSpans`, as decades there).
 */
export declare function levelsOf(spans: readonly {
    readonly name: string;
    readonly step: number;
    readonly turn: number;
}[], heard: number | null, longest: number, most?: number): Level[];
/** A necklace heard: in whose notes, at which level (or in pitch) and at what pulse (s; a semitone in pitch), and its name. */
export interface Folding {
    readonly voice: string;
    readonly level: string;
    readonly kind: 'rhythm' | 'pitch';
    readonly pulse: number;
    readonly necklace: Necklace;
    readonly name: string;
    readonly even: boolean;
}
/**
 * Every folding of a piece's notes: each voice's rhythm round each level, and each voice's pitch classes. Trivial
 * ones (one mark, every slot, or marks evenly spaced) are left out: every pulse is a necklace of those.
 */
export declare function foldings(events: readonly Pick<Played, 'at' | 'voice' | 'freq'>[], levels: readonly Level[]): Folding[];
/**
 * The same necklace at more than one scale: groups of foldings with one name heard at two pulses or more, or in rhythm
 * and in pitch (the same pattern repeated round a longer cycle at the same pulse is one scale), largest first.
 */
export declare function alike(fs: readonly Folding[]): {
    name: string;
    even: boolean;
    where: Folding[];
}[];
