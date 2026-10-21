/**
 * Normalise (decision 049, #28): a valid text written in the canonical spelling of each of its duplicates, keeping every
 * cell, its name, every step and every reference, and playing the same notes. A command of its own, never offered while
 * a piece is being written (decision 017): for the examples, a corpus, the round trip, and before a hash (#49). What it
 * writes is listed, each with its reason, in docs/language/canonical.md. One rule a file:
 *
 *  - aliases.ts:  Strudel's or dough's name for a parameter as ours, whatever its length: cutoff= → lpf=, clip= → legato=
 *
 * The canonical table's other rows join as the owner rules them (#27). A `use` line (decision 054) is kept, in its one
 * spelling (`use "id"`, the only one the parser reads), in its order, never expanded: expanding adds cells, Shorten's side
 * of decision 049's line (`expand` writes it out). Its fragment is read through `options.resolve`. Pure.
 */
import { rewriteAll, ROUNDS, type Rewrite } from '../rewrite';
import type { CompileOptions, CompileResult } from '../program';
import { aliases } from './aliases';

/** Every rewrite into the canonical spelling a text has. */
export const normalisations = (source: string, result: CompileResult): Rewrite[] => [...aliases(source, result)];

/** A text in the canonical spelling, one rewrite at a time, each playing the same notes; the steps are what each did. */
export const normalise = (source: string, options?: CompileOptions): { source: string; steps: string[] } => rewriteAll(source, normalisations, ROUNDS, options);
