import { type FromForm } from './parser/use';
import type { Diagnostic, Span } from './ast';
import type { CompileOptions, Origin, Resolve, Take } from './program';
/** How deep `from` lines nest: a kit in a groove in a section in a piece is 3. */
export declare const FROM_DEPTH = 8;
/**
 * A part of a document (decision 082): the signature that names `head` (bare), then every line its heads and optional
 * parameters read, wherever it sits, taken through the closure as a collection's names are; never its main parameter's
 * line (the document's own, what it plays with as a piece), nor another signature's. A text of one signature is its
 * own part. Null where no signature names the head.
 */
export declare function partOf(text: string, head: string): string | null;
/** A line that takes a fragment over a name (#692): the id it takes and its named arguments, as written (`ternary`, `{ answer: '&wonder' }`). */
export interface UseOver {
    readonly id: string;
    readonly args: Readonly<Record<string, string>>;
}
/**
 * Each line of a text that takes a fragment with `&head` as its main argument (attributes on it aside), in the order written (#692): how a
 * document plays its part, such as Kinderlieder's `&twinkleSong from ternary(answer=&wonder) &twinkle`, which takes
 * `ternary` over `&twinkle`, `&wonder` its answer.
 */
export declare const usesIn: (text: string, head: string) => UseOver[];
/** The heads of each signature a text holds, in the order written: one entry a part (decision 082). */
export declare const partsOf: (text: string) => string[][];
/** Does this text have a `from` line? (Cheap: a text without one compiles as it always has.) */
export declare const hasFrom: (text: string) => boolean;
/** A fragment's signature (decision 065): what its `from` line with no id declares; null for a collection, which has none. */
export declare function signatureOf(text: string): Extract<FromForm, {
    kind: 'signature';
}> | null;
/** A fragment's text without its signature: its lines, as a host that puts them on a workbench by hand reads them. */
export declare const bodyOf: (text: string) => string;
/** A fragment's hash: `e1:` and the hash of its text up to layout (its lines' code, one to a line). */
export declare const fragmentHash: (text: string) => string;
/**
 * Does a line read this name as a value, not as a sound: in an attribute (`over=&key`, `step=&tempo`), a generator's or
 * an operation's arguments (`scale(dorian, &tonic)`), or through an operator (`&call^-2`, `&g[0:3]`)? A step of a braid
 * or a term of a mix (`&bd`, `&cp:0:.6`, `[&kick * &level]`) is a sound: the kit's vocabulary, read by name (decision 065 §3).
 */
export declare function readsAsValue(code: string, name: string): boolean;
/** The expansion of a text, as the compiler reads it. */
export interface Expansion {
    /** The piece's own text as written, then the used lines (so the piece's lines keep their numbers). */
    readonly text: string;
    /** Its `from` lines, compiled: what each resolved to, gave and was overridden in. */
    readonly takes: readonly Take[];
    /** Every name a `from` line gave (bare). */
    readonly given: ReadonlySet<string>;
    /** What the expansion says: an unresolved id, a cycle, a depth past `FROM_DEPTH`, a collision, a changed version. */
    readonly diagnostics: readonly Diagnostic[];
    /** For each line of `text` past the piece's own, the `from` line it came through. */
    readonly through: (line: number) => Span | null;
    /** Where each line it added came from, by the name it declares (`Origin`, #639). */
    readonly origins: ReadonlyMap<string, readonly Origin[]>;
}
/** The expansion of a text (see the module's comment), its `use` and `from` lines resolved by `options`. */
export declare function expansion(text: string, { resolve: host, locked, old }?: CompileOptions): Expansion;
/**
 * A piece's expansion written out (decision 054; #177's `inline`, Cell studio's "write out"): its own lines, its `use`
 * lines gone, then the used lines it doesn't define. A `use` that doesn't resolve stays, so nothing is lost.
 */
export declare function expand(text: string, resolve: Resolve, locked?: CompileOptions['locked']): string;
