import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `use` or `from` line naming a renamed seed id, written with its word. */
export declare function renamedIds(source: string, resolve: Resolve | undefined): Rewrite<'renamed'>[];
