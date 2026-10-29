import type { Line } from './ir';
/** A span of a line: its steps [from, to) on the grid, and the base the repeat is at there (null: no pitch, drums). */
export interface Span {
    readonly line: string;
    readonly from: number;
    readonly to: number;
    readonly base: number | null;
}
/** How a span is its hint's first: the same, or moved by `by` (semitones or degrees, as the lines are). */
export type Transform = {
    readonly kind: 'same';
} | {
    readonly kind: 'transposed';
    readonly by: number;
};
/** A repeat: spans alike, each with how it is the first (the first is `same`), and how sure Fold is. */
export interface RepeatHint {
    readonly kind: 'repeat';
    /** The folder's symbol for what repeats (`m3`): the same name for every span of one hint. */
    readonly symbol: string;
    readonly spans: readonly Span[];
    readonly transforms: readonly Transform[];
    /** 1: the folder's symbols are exact as tokens. */
    readonly confidence: number;
    /** Its length, in steps: every span's. */
    readonly length: number;
}
export type Hint = RepeatHint;
/** The fewest notes a repeat holds (chosen, #158): two notes moved alike are only an interval, which any line has. */
export declare const MIN_NOTES = 3;
/**
 * The repeats Fold finds in the lines: one hint a symbol Re-Pair makes of `MIN_NOTES` notes or more, each of its places
 * (two or more), and not one that stands only inside a longer repeat as often as it does; most covered first (its length
 * times its places). The lines' values may be semitones or degrees of a scale (`6#`): a transform is
 * in what they are.
 */
export declare function hints(lines: readonly Line[]): Hint[];
