import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** The rewrite of every such line: each its part= or role=, written. */
export declare function parts(source: string, result: CompileResult): Rewrite<'parts'>[];
