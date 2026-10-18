import type { ParseResult } from '../ast';
export { meterLevels, SIGNATURES } from './generators';
export { SHOWS } from './cell';
export declare function parse(whole: string): ParseResult;
/**
 * A piece's card: its title, its description (the label of its card, as plain text), its tags and its tier. From a file
 * (`piecefile.ts`, decision 047): the frontmatter's title, tags, tier and description (else the label of the text's first note). From a
 * text written the old way: the first note with a title=, its title=, label=, tags= and tier= (a warning says they now go
 * in the frontmatter, and Shorten moves them there).
 */
export interface PieceMeta {
    readonly title: string;
    readonly description: string;
    readonly tags: readonly string[];
    /** Its tier of the tutorial (tier=), if it is one of its pieces. */
    readonly tier: number | null;
    /** The note it's on (in a file, the text's first note), or null for none. */
    readonly cell: string | null;
}
/** A piece's card, from a file or from a text written the old way; null without a title. */
export declare function pieceMeta(source: string): PieceMeta | null;
