import type { CompileResult, Resolve } from '../program';
import type { Rewrite } from '../rewrite';
/** A `from` line's code with `name=value` added to its arguments: in its parentheses, or in new ones after its id. */
export declare function withArgument(code: string, name: string, value: string): string | null;
/** Each `from` line that took a name by name, written with it as an argument. */
export declare function argumentsByName(source: string, result: CompileResult, resolve: Resolve | undefined): Rewrite<'arguments'>[];
