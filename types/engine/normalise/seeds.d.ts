import { type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** Each chancy cell the text declares that writes no seed, written with its content key as its seed. */
export declare function seeds(source: string, result: CompileResult): Rewrite<'seed'>[];
