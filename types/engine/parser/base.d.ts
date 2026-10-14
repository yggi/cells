/**
 * `base=` (decision 026): a cell written as a copy of another, changed where it says — an overdub, a delta. Resolved as
 * the text is parsed, so compile sees plain cells: `&answer base=&subject^$7 =!3 12@2` is the subject a fifth up, its
 * fourth step 12 held 2 instead.
 *
 *  - **Its braid** goes over the base's step by step (a run `x!n` counts as n steps, a subsequence `[0 2]` as one): `=`
 *    keeps the base's step as it is, `=@n` keeps its pitch held n, a value replaces it, and what goes past the base's end
 *    is added. Nothing written: the base as it is. `=` keeps a whole step, so it stands outside brackets.
 *  - **Transposed**: `base=&x^$n` moves what it keeps n grid steps (a cell that reads no table: semitones), `^n` n steps
 *    of its table (a degree); what the cell writes itself is as it sounds.
 *  - **Its attributes**: what it doesn't set, the base's — its table, its clock, its shift, a voice's sound — not its
 *    label, notes, laps or `off`.
 *
 * A base of a base works; a base that comes round to the cell itself is an error on `base=`; one that names no cell is
 * left on the cell, for compile to say (`Unknown cell`), as it does of every reference.
 */
import type { ParseResult } from '../ast';
/** The cells of a parse with every `base=` resolved into a plain cell; an error where one can't be. */
export declare function applyBases(p: ParseResult): ParseResult;
