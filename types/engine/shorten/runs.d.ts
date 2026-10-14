import { type Candidate, type Suggestion } from './harness';
/** Runs: the same step written again and again. */
export declare function runs(source: string, cells: readonly Candidate[]): Suggestion[];
