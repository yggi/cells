import { type CompileOptions } from '../program';
/** One family: its rows of decision 068's table (418's note), and its rewrite of a whole text (the text itself when it finds nothing). */
export interface Family {
    readonly key: string;
    readonly rows: string;
    readonly rewrite: (text: string, options: CompileOptions) => string;
}
/** The families written as functions of the text alone. */
export declare const FAMILIES: readonly Family[];
/** Is a row still written in a text: its test on the code, strings and comments aside (a label may say `step=8n`). */
export declare const stillWritten: (row: (typeof LEFT)[number], text: string) => boolean;
/** The rows that need what the text means, not its letters, with why: reported where they are still written, not rewritten (#482's next rungs). */
export declare const LEFT: readonly {
    key: string;
    rows: string;
    test: RegExp | ((text: string) => boolean);
    why: string;
}[];
