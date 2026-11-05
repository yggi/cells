import { type CompileOptions } from '../program';
import { type Result, type ShortenRewrite } from './harness';
/** Cells written exactly alike: one is enough — its users read the other. Every merge is checked (`keepsVoices` for voices, S1 for the rest). */
export declare function sameCells(source: string, result: Result, options?: CompileOptions): ShortenRewrite[];
