import type { ParseResult } from '../ast';
export { meterLevels, SIGNATURES } from './generators';
export { SHOWS } from './cell';
export { readFrom, readUse, USE_FORM, writeUse, type FromForm, type UseForm } from './use';
export declare function parse(whole: string): ParseResult;
/**
 * A piece's card: its title, its description, its tags and its tier. From a file (`piecefile.ts`, decision 047): the
 * frontmatter's title, tags, tier and description (else the label of a card its text still has: a note named `&piece`,
 * as a text written before the description moved there). From a text written the old way: the first note with a
 * title=, its title=, label=, tags= and tier= (a warning says they now go in the frontmatter, and Shorten moves them
 * there).
 */
export interface PieceMeta {
    readonly title: string;
    readonly description: string;
    readonly tags: readonly string[];
    /** Its tier of the tutorial (tier=), if it is one of its pieces. */
    readonly tier: number | null;
    /** The note it's on (in a file, its text's `&piece`), or null for none: a file says it all in its frontmatter. */
    readonly cell: string | null;
}
/** A label as plain text: fields dropped, formatting stripped, \n a space. */
export declare const plainLabel: (label: string) => string;
/** The name of the card a text keeps when its file's frontmatter doesn't say what the piece is yet (display.md). */
export declare const CARD = "piece";
/** A piece's card, from a file or from a text written the old way; null without a title. */
export declare function pieceMeta(source: string): PieceMeta | null;
