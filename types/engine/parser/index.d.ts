import type { ParseResult } from '../ast';
export { meterLevels } from './generators';
export { SHOWS } from './cell';
export declare function parse(whole: string): ParseResult;
/** A piece's card: the first note with a title= — its title, its description (the label, as plain text), its tags. */
export interface PieceMeta {
    readonly title: string;
    readonly description: string;
    readonly tags: readonly string[];
    /** Its tier of the tutorial (tier=), if it is one of its pieces. */
    readonly tier: number | null;
    /** The note it's on. */
    readonly cell: string;
}
export declare function pieceMeta(source: string): PieceMeta | null;
