/**
 * Folded lines as cells (docs/notes/fold.md): each symbol a cell of its own (its children at their offsets, a symbol
 * spliced `&name^$k`), each line a braid of its tokens; a run of one token `x!n`. And the cost model the β tool judges
 * by: what a symbol costs written once against what it saves where it is used. Pure: text out.
 */
import type { Folded, Rule, Tok } from './ir';
/** A token as braid text at its base: an element, or a symbol or a figuration spliced (`&s3`, `&s3^$-5`; in degrees,
 * `caret` `^`: `&s3^2`). */
export declare function tokText(t: Tok, names: ReadonlyMap<string, string>, caret?: string): string;
/** A symbol's children as tokens at their offsets (its base 0). */
export declare const kidsOf: (r: Rule) => Tok[];
/** The order the symbols are first used in (each before what it is used in, as printed: `prefix`1, 2 … in that order). */
export declare function useOrder(f: Folded): string[];
/**
 * The folded lines as cells: the symbols in the order they are first used (each before the lines, named `prefix`1, 2 …
 * in that order), each figuration as its figure (one cell for figures alike), its table stepped a block at a time on
 * `clock` and the run reading it, and each line's braid and its clock (a step every k grid steps: `step=pulse/k`, a tap of the tempo map).
 * `caret`: how a symbol moves, `^$` semitones (the grid) or `^` degrees (lines folded over a scale). `fixed`: the
 * symbols' names given (a fold's story, fold/story.ts: each named as the finished fold names it, in that order).
 */
export declare function printFolded(f: Folded, prefix?: string, clock?: string, caret?: string, fixed?: ReadonlyMap<string, string>): {
    defs: string[];
    lines: Map<string, string>;
    scales: Map<string, number>;
};
