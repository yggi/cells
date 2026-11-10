import type { Resolve } from '../engine/program';
/** What `extract` is told: the new fragment's id, how to read the library, and how long the piece must play the same. */
export interface ExtractOptions {
    readonly id: string;
    readonly resolve: Resolve;
    /** How long S1 compares the piece before and after, in seconds: 16 by default. */
    readonly seconds?: number;
}
/** Lines of a piece as a fragment, and the piece taking it. */
export interface Extraction {
    /** The fragment's text: its signature line, then the lines as written. */
    readonly fragment: string;
    /** The piece with the `from` line in the lines' place. */
    readonly piece: string;
    /** The `from` line written. */
    readonly line: string;
    /** The signature: its heads, its main parameter (null: none), the cells the copy keeps to itself, and the sounds it reads by name. */
    readonly heads: readonly string[];
    readonly main: string | null;
    readonly private: readonly string[];
    readonly sounds: readonly string[];
    /** Does the piece play the same, before and after (S1)? */
    readonly same: boolean;
    /** The id of a library fragment that reads the same (`sameText`), or null. */
    readonly known: string | null;
}
/** Why lines can't be a fragment yet. */
export interface NoExtraction {
    readonly why: string;
}
/**
 * The lines of `text` numbered in `lines` (1-based; a declaration is taken whole where its first line is one of them),
 * written as a fragment, and the piece taking it (see the module's comment).
 */
export declare function extract(text: string, lines: readonly number[], options: ExtractOptions): Extraction | NoExtraction;
