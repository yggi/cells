/**
 * Literate cells (decision 051, #195): a Markdown file's cells code is the join of all its ```` ```cells ```` blocks, in
 * file order, and everything else (headings, paragraphs, fences of other languages) is prose. This is the one reader of
 * that form; a piece file (`piecefile.ts`), a fragment file (`repository/files.ts`), Normalise and `npm run structure`
 * each take their code from it.
 *
 * The code is the blocks' lines concatenated with a newline: a line two blocks both give is two lines (the union of
 * lines is for combining fragments, decision 047). `map` says, for each code line, the block it came from and its line in
 * the file, so a diagnostic of the code (its line) is a position in the file (`fileLine`). `layout` is everything the
 * code is not, kept byte for byte, so `rewrite` can put a changed code back into the blocks it came from.
 */
import type { YamlProblem } from '../repository/yaml';
/** Where a line of the code is in the file. */
export interface CodeLine {
    /** The block it is in, counted from 0. */
    readonly block: number;
    /** Its line in the file, counted from 1. */
    readonly line: number;
}
/** What the code is not: the blocks' lines, and the file's lines between them, kept as they are. */
export interface Layout {
    /** Each block's lines (the code, without its fences). */
    readonly blocks: readonly (readonly string[])[];
    /**
     * The file's lines around the blocks, one more than there are blocks: `gaps[0]` is everything before the first block's
     * first line (after the frontmatter, up to and with the opening fence), `gaps[k]` what lies between block k-1 and block k
     * (the closing fence, prose, the next opening fence), `gaps[n]` the closing fence of the last. Empty for a raw text.
     */
    readonly gaps: readonly (readonly string[])[];
}
/** A file's code. */
export interface Literate {
    /** The code: the blocks joined with a newline. */
    readonly text: string;
    readonly map: readonly CodeLine[];
    readonly layout: Layout;
    /** The Markdown after the last block, without the blank lines around it; empty for none. */
    readonly prose: string;
    /** The file's lines before the body (the frontmatter, fences and all), as the file has them; empty for none. */
    readonly head: readonly string[];
    /** The file's lines after the last block's closing fence, as the file has them (the prose and its blank lines). */
    readonly tail: readonly string[];
    /** No fence anywhere and no frontmatter: the whole file is the code (a `.cells` text, pasted text). */
    readonly raw: boolean;
}
export interface LiterateProblems {
    readonly problems: readonly YamlProblem[];
}
/**
 * The cells blocks among a file's lines, from the line `from` (0-based, after the frontmatter): or a problem naming its
 * line. A fence of another language is prose, and a ```` ```cells ```` line inside it is no block.
 */
export declare function readBlocks(lines: readonly string[], from: number): Literate | LiterateProblems;
/**
 * A Markdown file's code: after its frontmatter if it has one (a line `---` first, to the next), from the cells blocks;
 * with no frontmatter and no fence, all of it. The frontmatter is not read here (`readYaml`), only skipped.
 */
export declare function readLiterate(source: string): Literate | LiterateProblems;
/** A line of the code, as a line of the file; a line past the code is left as it is. */
export declare const fileLine: (map: readonly CodeLine[], line: number) => number;
/** The longest middle of a rewrite aligned line by line: 2,000 × 2,000 lines. */
export declare const MAX_TABLE = 4000000;
/**
 * The layout with this code put back in: each line a rewrite keeps stays in the block it was in, a line it removes is gone
 * (a block left empty keeps its fences). A line it adds goes into the block it is nearest to: where lines were removed, the
 * block of the first of them (a line changed stays where it was); between two lines kept, the block of the one before (the
 * earlier block where they lie in two); and the first block when it opens the code. The prose and the fences
 * are never touched. A layout of one block takes the code whole.
 */
export declare function rewrite(layout: Layout, text: string): Layout;
/**
 * The body of a file the writers make: the layout's gaps and blocks in order, then the prose. Blank lines before the first
 * block and around the prose are written as one, as they have always been; prose before or between blocks is kept as it is.
 */
export declare function writeBody(layout: Layout, prose: string): string;
/** The whole file from a layout (a rewrite of this file's), every line outside the blocks as the file had it. */
export declare function renderFile(file: Literate, layout: Layout): string;
