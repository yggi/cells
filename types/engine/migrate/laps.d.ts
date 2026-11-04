import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each table stepped by a cell whose cycle= is a whole number of its lengths: that many laps. */
export declare function laps(source: string, result: Result): Rewrite<'laps'>[];
