import type { CompileOptions } from '../program';
import type { Result, ShortenRewrite } from './harness';
/** A table of sections named &parts: its rename to &sections, if it plays the same notes. */
export declare function sections(source: string, result: Result, options?: CompileOptions): ShortenRewrite[];
