import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each meter with a bare swing=: the same swing with its level named, if it plays the same notes. */
export declare function swings(source: string, result: Result, options?: CompileOptions): Rewrite<'swing'>[];
