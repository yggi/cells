import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';
/** The rewrite of every such member: each its note=, written. */
export declare function notes(source: string, result: CompileResult): Rewrite<'notes'>[];
