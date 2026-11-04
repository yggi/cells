import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** A table of sections named &parts: its rename to &sections, if it plays the same notes. */
export declare function sections(source: string, result: Result, options?: CompileOptions): Rewrite<'section'>[];
