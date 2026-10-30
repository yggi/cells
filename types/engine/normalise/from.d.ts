import type { Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** Each `use` line the piece can say as a `from` line, so said (Migrate, decision 064). */
export declare function fromUses(source: string, resolve?: Resolve): Rewrite<'from'>[];
