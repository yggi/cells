import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `* from` a collection, written as the cells of it the piece uses. */
export declare function narrowestFroms(source: string, resolve: Resolve | undefined): Rewrite<'narrowest'>[];
