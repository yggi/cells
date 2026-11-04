import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each grid whose size is written as cycle=: its map with the size in it. */
export declare function grids(source: string, result: Result, _options?: CompileOptions): Rewrite<'grid'>[];
