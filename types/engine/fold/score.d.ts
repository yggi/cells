/**
 * The score's size: the characters of the cells that hold notes and time (braids, tables, meters, kits), without
 * labels, comments, tags, spaces in runs or blank lines; voices, mixes, effects and notes about the piece left out
 * (a flat piece has stock voices, so they don't compare).
 */
export declare function bare(source: string): number;
/** What a piece plays over [0, seconds): key and start, in order. */
export declare function heard(source: string, seconds: number): {
    key: number;
    at: number;
}[];
/** Do two pieces play the same notes (the same keys, each start within 10 ms)? If not, how they differ. */
export declare function same(a: {
    key: number;
    at: number;
}[], b: {
    key: number;
    at: number;
}[]): boolean;
export declare function differ(a: {
    key: number;
    at: number;
}[], b: {
    key: number;
    at: number;
}[]): string;
/** Each phrase cell's signature: its onsets and lengths (steps from its first), and its top line's contour. */
export declare function phrases(source: string): Map<string, string>;
