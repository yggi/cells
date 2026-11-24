import type { BuiltLine, CellDecl, ParseResult } from '../ast';
export { groupingOf, meterLevels } from './generators';
export { readFrom, USE_RETIRED, type FromForm } from './use';
/**
 * A line that read cells as the piece is built, read again with their values written in (decision 106): its cell and the
 * unnamed cells it declares. Warnings aren't said twice (the first reading said them); an error is the line's own, a
 * `LineError` the caller says with the line as filled.
 */
export declare function rereadLine(built: BuiltLine, filled: string): {
    readonly decl: CellDecl;
    readonly lambdas: readonly CellDecl[];
};
/** A text, parsed. */
export declare function parse(whole: string): ParseResult;
/**
 * A piece's card: its title, its description, its tags and its tier. From a file (`piecefile.ts`, decision 047): the
 * frontmatter's title, tags, tier and description (else the label of a card its text still has: a note named `&piece`,
 * as a text written before the description moved there). A text with no file has none: the card's `title=` and `tier=` are retired (#643).
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
/** A piece's card, from a file; null for a text, which has none, and for a file without a title. */
export declare function pieceMeta(source: string): PieceMeta | null;
