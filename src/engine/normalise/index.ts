/**
 * Normalise (decision 049, amended for #196; #28): a valid text written in its canonical form, which may change, add and
 * remove cells, each rewrite sounding identical (S1). A command of its own, never offered while
 * a piece is being written (decision 017): for the examples, a corpus, the round trip, and before a hash (#49). What it
 * writes is listed, each with its reason, in docs/language/canonical.md. One rule a file:
 *
 *  - aliases.ts:  Strudel's or dough's name for a parameter as ours, whatever its length: cutoff= → lpf=, clip= → legato=
 *  - names.ts:    the interface names where they are unambiguous (#196): the main meter &bar, its rate &tempo, the main key
 *                 &key, its tonic &tonic; and scan(1 1 1 1), the meter of four beats, as meter("4/4")
 *  - library.ts:  a line that is a library fragment's word for word as a use of it (#196): &bar meter("4/4") step=&tempo
 *                 → use &bar from meter_4_4, and a fragment's cell written inline as it by name: pitch=&(map=lin …)
 *                 → pitch=&vibrato, use &vibrato; with the library the call gives (`NormaliseOptions.library`)
 *
 * Migrate's rules run first, as decision 049 orders them (Migrate, then Normalise): a retired form a text has, or that a rule
 * here writes on its way (libraryLines writes a `use`, which Migrate's `from` says as a `from` line), is migrated in the same
 * run. They were Normalise's own (the `use` spellings, over=key, the forwards, `from`) until Migrate was built (#156).
 *
 * The canonical table's other rows join as the owner rules them (#27). A `use` line (decision 054) is kept, in its
 * order, never expanded: a used fragment's lines written in are no canonical form (`expand` writes them out). Its
 * fragment is read through `options.resolve`. Pure.
 */
import { rewriteAll, ROUNDS, type Rewrite } from '../rewrite';
import type { CompileOptions, CompileResult } from '../program';
import { aliases } from './aliases';
import { libraryCells, libraryLines, type LibraryFragment } from './library';
import { fourFour, interfaceNames } from './names';
import { migrations } from '../migrate';

/** What Normalise reads besides the text: the compile's options, and the library whose lines a piece takes by `use`. */
export interface NormaliseOptions extends CompileOptions {
  readonly library?: readonly LibraryFragment[];
}

/** Every rewrite into the canonical spelling a text has, its `use` lines' fragments read through `options.resolve`. */
export const normalisations =
  (options: NormaliseOptions = {}) =>
  (source: string, result: CompileResult): Rewrite[] => [
    // (but a migration exact only against an older meaning: in a valid text it would change what the text says, #75)
    ...migrations(options)(source, result).filter((r) => !r.exact),
    ...interfaceNames(source, result),
    ...fourFour(source, result),
    ...aliases(source, result),
    ...libraryLines(source, options.library),
    ...libraryCells(source, options.library),
  ];

/** A text in the canonical spelling, one rewrite at a time, each playing the same notes; the steps are what each did. */
export const normalise = (source: string, options?: NormaliseOptions): { source: string; steps: string[] } => rewriteAll(source, normalisations(options), ROUNDS, options);
