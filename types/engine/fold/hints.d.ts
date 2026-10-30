import type { Line } from './ir';
/** A span of a line: its steps [from, to) on the grid, and the base the repeat is at there (null: no pitch, drums). */
export interface Span {
    readonly line: string;
    readonly from: number;
    readonly to: number;
    readonly base: number | null;
}
/**
 * How a span is its hint's first: the same, moved by `by` (semitones or degrees, as the lines are), or, read with
 * `retrograde`, the first backwards and moved by `by`.
 */
export type Transform = {
    readonly kind: 'same';
} | {
    readonly kind: 'transposed';
    readonly by: number;
} | {
    readonly kind: 'reversed';
    readonly by: number;
};
/** What the lines are read for: their repeats forwards, and with `retrograde` backwards too. */
export interface HintOptions {
    readonly retrograde?: boolean;
}
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
 * The repeats Fold finds in the lines: Re-Pair's symbols name the shapes that come back (`pairs.ts`), and each shape of
 * `MIN_NOTES` notes or more is a hint at every place it stands (two or more), wherever Re-Pair's greedy pairing put it,
 * but not one that stands only inside a longer repeat as often as it does; most covered first (its length times its
 * places), its places apart (none overlapping another). The lines' values may be semitones or degrees of a scale (`6#`): a transform is in what they are. With
 * `retrograde`, each line is read backwards as well, and a place found so is a `reversed` place of a hint that stands
 * forwards somewhere (one read only backwards is the forward reading's hint, said once).
 */
export declare function hints(lines: readonly Line[], { retrograde }?: HintOptions): Hint[];
/**
 * The repeats in braids as written, each a list of its steps' tokens (Shorten's cells), in token places: one hint each,
 * its spans `[from, to)` indices of the tokens. A token is one step of its line, a held number (`7@2`) as long as it is
 * held, so a number moves and everything else (a rest, a chord, a reference, a degree with an accidental) is matched as
 * written. Shorten and the folder read one finder (#158).
 */
export declare function writtenHints(braids: readonly {
    readonly name: string;
    readonly tokens: readonly string[];
}[]): Hint[];
