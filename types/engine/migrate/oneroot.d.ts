import type { CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';
/** Each second meter with a tempo of its own: the tap of the root that says its tempo. */
export declare function oneRoot(source: string, result: Result): Rewrite<'one root'>[];
