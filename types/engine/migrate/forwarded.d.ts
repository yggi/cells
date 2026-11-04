import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `use` of a fragment that only forwards, written as the use it forwards to. */
export declare function forwardedUses(source: string, resolve: Resolve | undefined): Rewrite<'forwarded'>[];
