import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each meter with a beat=: the meter that counts its beats, where it plays the same. */
export declare function beats(source: string, result: Result, options?: CompileOptions): Rewrite<'beats'>[];
