import type { CompileOptions } from '../program';
import { type Candidate, type Result, type ShortenRewrite } from './harness';
export declare function phrases(source: string, cells: readonly Candidate[], result: Result, options?: CompileOptions): ShortenRewrite[];
