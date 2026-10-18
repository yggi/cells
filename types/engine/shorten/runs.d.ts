import { type Candidate, type ShortenRewrite } from './harness';
/** Runs: the same step written again and again. */
export declare function runs(source: string, cells: readonly Candidate[]): ShortenRewrite[];
