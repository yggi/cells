/**
 * Normalise (decision 049, #28): a valid text written in the canonical spelling of each of its duplicates, keeping every
 * cell, its name, every step and every reference, and playing the same notes. A command of its own, never offered while
 * a piece is being written (decision 017): for the examples, a corpus, the round trip, and before a hash (#49). What it
 * writes is listed, each with its reason, in docs/language/canonical.md. One rule a file:
 *
 *  - aliases.ts:  Strudel's or dough's name for a parameter as ours, whatever its length: cutoff= → lpf=, clip= → legato=
 *  - uses.ts:     a `use` line in its one spelling (decision 059): use "harmonic minor" → use * from "harmonic minor"
 *  - mainkey.ts:  the main key named (decision 060): over=key → over=&key
 *  - forwarded.ts: a use of a fragment that only forwards as the use it forwards to (#196): use * from "harmonic minor"… use &bd, … from gm_kit
 *
 * The canonical table's other rows join as the owner rules them (#27). A `use` line (decision 054) is kept, in its
 * order, never expanded: expanding adds cells, Shorten's side of decision 049's line (`expand` writes it out). Its
 * fragment is read through `options.resolve`. Pure.
 */
import { type Rewrite } from '../rewrite';
import type { CompileOptions, CompileResult } from '../program';
/** Every rewrite into the canonical spelling a text has, its `use` lines' fragments read through `options.resolve`. */
export declare const normalisations: (options?: CompileOptions) => (source: string, result: CompileResult) => Rewrite[];
/** A text in the canonical spelling, one rewrite at a time, each playing the same notes; the steps are what each did. */
export declare const normalise: (source: string, options?: CompileOptions) => {
    source: string;
    steps: string[];
};
