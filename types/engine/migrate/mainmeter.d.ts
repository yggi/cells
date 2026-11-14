import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each bare tap of a piece with several meters: the tap of the first, named. */
export declare function mainMeters(source: string, result: Result): Rewrite<'main meter'>[];
