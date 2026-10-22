import type { CompileOptions } from '../program';
import { type Candidate, type Result, type ShortenRewrite } from './harness';
/** Phrases written more than once (exactly, backwards, or transposed): one cell, used where they were. */
export declare function phrases(source: string, cells: readonly Candidate[], result: Result, options?: CompileOptions): ShortenRewrite[];
