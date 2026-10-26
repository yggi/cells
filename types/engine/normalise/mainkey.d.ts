import { type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `over=key`, written as the cell it reads. */
export declare function mainKey(source: string, result: CompileResult): Rewrite<'main key'>[];
