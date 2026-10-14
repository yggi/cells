/**
 * The isometry (docs/notes/fold.md): two neighbours into one. The pair heard most often, anywhere in any line, becomes a
 * symbol, its every place replaced by it; then again, pairs of symbols becoming symbols, until no pair comes twice:
 * Re-Pair (Larsson & Moffat 2000), grammar induction as Sequitur's. Its levels are the piece's scales, built from the
 * bottom (a motif, a phrase, a section, the form) by one move. A pair is compared as shapes: the second's base against
 * the first's (`transpose.ts`), so a phrase and its transposition are one symbol at two bases.
 */
import type { Tool } from './ir';
/**
 * Fold the commonest pair into a symbol, again and again, while one comes twice: in the lines and in the symbols'
 * own steps alike (the same move at every level). In a phrase that variants copy, only where every copy keeps both
 * steps (`base=` counts the phrase's steps as written: a pair folded there is folded in each copy too, one kept step
 * for two); never in a variant's own steps.
 */
export declare const pairs: Tool;
