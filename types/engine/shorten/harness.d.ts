/**
 * What every Shorten rule shares: the cells it may rewrite, how a suggestion's
 * saving is measured, and the note-for-note check a rule runs before it offers
 * a rewrite whose sound depends on its tables.
 */
import { compileSource } from '../compile';
export interface Suggestion {
    readonly id: string;
    readonly kind: 'run' | 'phrase' | 'fraction' | 'same' | 'default' | 'progression' | 'degree' | 'pan' | 'gate' | 'alias';
    /** In a sentence: what it does. */
    readonly title: string;
    /** What was written, and what it becomes (short excerpts). */
    readonly before: string;
    readonly after: string;
    /** Characters saved. */
    readonly saving: number;
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
/** The cells whose steps are written out one by one, and safe to rewrite. */
export declare function candidates(source: string): {
    result: Result;
    cells: Candidate[];
};
/** The code's length: runs of spaces count as one (the padding that keeps comments aligned isn't code). */
export declare const size: (source: string) => number;
/** A suggestion with its saving measured on its result; null when it saves nothing (or its rewrite fails). */
export declare const measured: (source: string, s: Omit<Suggestion, "saving">) => Suggestion | null;
/** Do these cells play the same notes (value, place, length) in both programs? */
export declare function sameNotes(a: string, b: string, names: readonly string[]): boolean;
/**
 * How many seconds two spellings are compared over: Shorten's check and the tests of equal spellings use the same. A minute is
 * the longest cycle of most pieces (the longest layers, a day in the sun pieces or twenty minutes in Royal, are never run to the end).
 */
export declare const SAMENESS_SECONDS = 60;
/** Does the whole piece play the same notes (voice, onset, length, pitch, level per channel, bends, volumes, moving parameters, envelope) in both, for its first minute? */
export declare function samePiece(a: string, b: string, until?: number): boolean;
