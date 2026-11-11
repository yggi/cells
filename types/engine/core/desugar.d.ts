import { type CompileOptions } from '../program';
/** One family: its rows of decision 068's table (418's note), and its rewrite of a whole text (the text itself when it finds nothing). */
export interface Family {
    readonly key: string;
    readonly rows: string;
    readonly rewrite: (text: string, options: CoreContext) => string;
}
/** What a family reads: the compile options, and the interface the text is cored up to (decision 077 §2), its names bare. */
export interface CoreContext extends CompileOptions {
    readonly keep?: ReadonlySet<string>;
}
/** The families written as functions of the text alone. */
export declare const FAMILIES: readonly Family[];
/**
 * Repetition as a count (decision 077 §3): every maximal run of alike steps written `x!n` (`0 0 0 2` is `0!3 2`, `~ ~` is
 * `~!2`, `0!2 0` is `0!3`), at every depth, and `x*n` as `[x!n]`, n of x within one step. A cell read by its units (picked,
 * rotated, or counting its own laps, `cycle=`) stays as written, where `x!n` and `x x` are two things; a run is of steps
 * on one line, alike as written; a step that says its count otherwise (`0!2@3`) is a step of its own.
 */
export declare function counts(text: string): string;
/** Is a row still written in a text: its test on the code, strings and comments aside (a label may say `step=8n`). */
export declare const stillWritten: (row: (typeof LEFT)[number], text: string) => boolean;
/** The rows that need what the text means, not its letters, with why: reported where they are still written, not rewritten (#482's next rungs). */
export declare const LEFT: readonly {
    key: string;
    rows: string;
    test: RegExp | ((text: string) => boolean);
    why: string;
}[];
