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
    /** The names the line binds (`&bd`, `&sd`; the piece's `&kick` of `&kick=bd`), or null for `*` (every line). */
    readonly names: readonly string[] | null;
    /** What each of `names` takes from the fragment, in the same order (`&bd` of `&kick=bd`; the name itself where the line renames none), or null for `*`. */
    readonly takes: readonly string[] | null;
    /** The head's attributes, written before `from` (`label="my key"`, the flag `off`), as written. */
    readonly head: readonly string[];
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
/** What a `from` line says, as `fromLine` writes it: a reference without its place in a text, everything but the id and the names optional. */
export type FromLine = Pick<Reference, 'id' | 'names'> & Partial<Pick<Reference, 'takes' | 'head' | 'args' | 'main'>>;
/**
 * A `from` line written (#714), the inverse of `references`: the names, renamed where they take another
 * (`&kick=bd`), or `*`; the head's attributes; the id; the named arguments in parentheses; the main argument.
 * `references(fromLine(r))` reads `r` back, its span aside, for every `from` line a text writes. A frontend writes
 * what it took so, `&bassline from funk_bass &harm`, rather than the lines written out. Pure.
 */
export declare function fromLine({ names, takes, head, id, args, main }: FromLine): string;
