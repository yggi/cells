import type { Result, ShortenRewrite } from './harness';
/** Each gate written the old way: its rewrite, if it plays the same notes. */
export declare function gates(source: string, result: Result): ShortenRewrite[];
