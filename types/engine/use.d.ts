import type { Diagnostic, Span } from './ast';
import type { CompileOptions, Resolve, Used } from './program';
/** How deep `use` nests: a kit in a groove in a section in a piece is 3. */
export declare const USE_DEPTH = 8;
/** Does this text have a `use` line? (Cheap: a text without one compiles as it always has.) */
export declare const hasUse: (text: string) => boolean;
/** A fragment's hash: `e1:` and the hash of its text up to layout (its lines' code, one to a line). */
export declare const fragmentHash: (text: string) => string;
/** The expansion of a text, as the compiler reads it. */
export interface Expansion {
    /** The piece's own text as written, then the used lines (so the piece's lines keep their numbers). */
    readonly text: string;
    /** Its `use` lines, compiled: what each resolved to, gave and was overridden in. */
    readonly uses: readonly Used[];
    /** Every name a `use` gave (bare). */
    readonly given: ReadonlySet<string>;
    /** What the expansion says: an unresolved id, a cycle, a depth past `USE_DEPTH`, a collision, a changed version. */
    readonly diagnostics: readonly Diagnostic[];
    /** For each line of `text` past the piece's own, the `use` line it came through. */
    readonly through: (line: number) => Span | null;
}
/** The expansion of a text (see the module's comment), its `use` lines resolved by `options`. */
export declare function expansion(text: string, { resolve, locked }?: CompileOptions): Expansion;
/**
 * A piece's expansion written out (decision 054; #177's `inline`, Cell studio's "write out"): its own lines, its `use`
 * lines gone, then the used lines it doesn't define. A `use` that doesn't resolve stays, so nothing is lost.
 */
export declare function expand(text: string, resolve: Resolve, locked?: CompileOptions['locked']): string;
