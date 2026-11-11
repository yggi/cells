/**
 * A rewrite: what Migrate, Normalise and Shorten each find in a piece (decision 049), one change to its text with what it
 * does in a sentence. Shorten offers its rewrites as suggestions, measured (`shorten/harness.ts`); Migrate and Normalise
 * apply theirs, round after round (`rewriteAll`). Vary (`vary/`, decision 052) gives a fragment's variations as rewrites
 * too, each playing other notes, so `rewriteAll`, which takes only a rewrite that plays the same, never runs it. Pure.
 */
import { compileSource } from './compile';
import type { CompileOptions } from './program';
/** The tool a rewrite is one of. */
export type Tool = 'migrate' | 'normalise' | 'shorten' | 'vary';
export interface Rewrite<R extends string = string> {
    readonly id: string;
    readonly tool: Tool;
    /** The rule that found it (Shorten's are its suggestions' kinds). */
    readonly rule: R;
    /** In a sentence: what it does. */
    readonly title: string;
    /** What was written, and what it becomes (short excerpts). */
    readonly before: string;
    readonly after: string;
    readonly apply: (source: string) => string;
    /**
     * Exact by construction, against a meaning the compiler no longer reads (a migration of a spelling whose meaning changed,
     * #75: cycle=24 counted steps, now laps), so `rewriteAll` takes it unchecked: the two texts' notes can't be compared,
     * the old one now meaning something else. Its witness is its fixture pair. Only Migrate's.
     */
    readonly exact?: true;
}
/** What a tool finds in a text that compiles. */
export type Find = (source: string, result: ReturnType<typeof compileSource>) => readonly Rewrite[];
/** How many rounds `rewriteAll` runs at most: a rewrite a round, so a text with more than this many is left part done. */
export declare const ROUNDS = 20;
/**
 * A tool's rewrites applied until none is left: each round the first that changes the text and plays the same notes
 * over the whole piece (`soundsIdentical`, S1 of decision 050), the text compiled again after it. The steps are the
 * rewrites' titles, in order. A text's `from` lines (decision 054) read through `options`: they are lines like any other.
 */
export declare function rewriteAll(source: string, find: Find, rounds?: number, options?: CompileOptions): {
    source: string;
    steps: string[];
};
