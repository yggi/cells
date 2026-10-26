import type { Rewrite } from '../rewrite';
/** Each `use` line not in its one spelling, respelled. */
export declare function uses(source: string): Rewrite<'use'>[];
