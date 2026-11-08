import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `from` line of a fragment that only forwards, written as the line it forwards to. */
export declare function forwardedUses(source: string, resolve: Resolve | undefined): Rewrite<'forwarded'>[];
