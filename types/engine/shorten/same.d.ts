import { type CompileOptions } from '../program';
import { type Result, type ShortenRewrite } from './harness';
/** Cells written exactly alike: one is enough — its users read the other. A merge of voices is checked (`keepsVoices`). */
export declare function sameCells(source: string, result: Result, options?: CompileOptions): ShortenRewrite[];
