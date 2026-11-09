/**
 * A text's references (yggi/cell-studio#621, rung C1, #638): each `from` line that takes from a fragment, read as the
 * parser reads it (`readFrom`) and never resolved, with the span of its id, so a frontend can paint the id as a link,
 * complete it, or draw what a text takes from, without compiling. A signature line (a `from` with no id) is not a
 * reference, nor a `from` inside a comment or a label's quotes. Pure.
 */
import type { Span } from './ast';
/** One `from` line's reference to a fragment. */
export interface Reference {
    /** The fragment's id as written: a word (`gm_kit`), or what double quotes hold (`"my riff"`). */
    readonly id: string;
    /** Where the id is written: its line (1-based), its column (1-based) and its length, quotes included where it has them. */
    readonly span: Span;
    /** The names the line takes (`&bd`, `&sd`), or null for `*` (every line). */
    readonly names: readonly string[] | null;
    /** The named arguments, in parentheses (`swing=8n:.64`), as written; null where there are none. */
    readonly args: readonly {
        readonly name: string;
        readonly value: string;
    }[] | null;
    /** The main argument as written (`&key`, `D`), or null. */
    readonly main: string | null;
}
/** Every `from` line of a text that takes from a fragment, in the order written. */
export declare function references(text: string): Reference[];
