import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each gate written the old way: its rewrite, if it plays the same notes. */
export declare function gates(source: string, result: Result, options?: CompileOptions): Rewrite<'gate'>[];
