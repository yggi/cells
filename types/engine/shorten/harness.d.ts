/**
 * What every Shorten rule shares: the cells it may rewrite, and how a rewrite's saving is measured, so it is offered
 * as a suggestion. The note-for-note check a rule runs before it offers a rewrite is the tools' own (`../sameness`),
 * re-exported here as it was before #155.
 */
import { compileSource } from '../compile';
import { type CompileOptions } from '../program';
import type { Rewrite } from '../rewrite';
export { samePiece, sameNotes, SAMENESS_SECONDS } from '../sameness';
export interface Suggestion {
    readonly id: string;
    readonly kind: 'run' | 'phrase' | 'fraction' | 'same' | 'default' | 'progression' | 'degree' | 'pan' | 'gate' | 'alias' | 'tap' | 'swing' | 'section' | 'card';
    /** In a sentence: what it does. */
    readonly title: string;
    /** What was written, and what it becomes (short excerpts). */
    readonly before: string;
    readonly after: string;
    /** Characters saved. */
    readonly saving: number;
    /** The rewrite: the text, shorter or migrated; for a `card`, the piece as a file (decision 047). */
    readonly apply: (source: string) => string;
}
export type Result = ReturnType<typeof compileSource>;
/** A cell whose steps are written out one by one: its name, its braid's tokens, and whether its numbers are grid steps. */
export interface Candidate {
    readonly name: string;
    readonly tokens: string[];
    /** Transposable: its numbers are steps of a grid (no table between them and it). */
    readonly grid: boolean;
}
/** The cells whose steps are written out one by one, and safe to rewrite: the piece's own (a used line is its fragment's, #241). */
export declare function candidates(source: string, options?: CompileOptions): {
    result: Result;
    cells: Candidate[];
};
/** The names a piece's `use` lines gave it (bare): their lines are the fragments', not the piece's to rewrite. */
export declare const usedNames: (r: Result) => ReadonlySet<string>;
/** The code's length: runs of spaces count as one (the padding that keeps comments aligned isn't code). */
export declare const size: (source: string) => number;
/** What a rewrite saves (characters, `size`), or null when it changes nothing or its rewrite fails. */
export declare const saves: (source: string, r: Pick<Rewrite, "apply">) => number | null;
/** A Shorten rule's rewrite: offered as a suggestion of the rule's kind. */
export type ShortenRewrite = Rewrite<Suggestion['kind']>;
/** A rewrite offered as a suggestion, its saving measured on its result (a rule has checked it changes the text). */
export declare const suggestion: (source: string, r: ShortenRewrite) => Suggestion;
/** A suggestion with its saving measured on its result; null when it saves nothing (or its rewrite fails). Kept for the public subpath. */
export declare const measured: (source: string, s: Omit<Suggestion, "saving">) => Suggestion | null;
