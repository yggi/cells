import { type Candidate, type Result, type ShortenRewrite } from './harness';
/** Fractions: every step held a multiple of some n — divide it out, and slow the clock instead. */
export declare function fractions(source: string, cells: readonly Candidate[], result: Result): ShortenRewrite[];
