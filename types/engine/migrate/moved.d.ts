import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `from` line that takes a moved fragment, written as a take of the part from its document. */
export declare function movedIds(source: string, resolve: Resolve | undefined): Rewrite<'moved'>[];
