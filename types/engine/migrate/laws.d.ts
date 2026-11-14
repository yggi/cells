import type { Rewrite } from '../rewrite';
/** Each line that writes a built-in law with `law=` and `over=`: written as the `from` line that takes it. */
export declare function laws(source: string): Rewrite<'law'>[];
