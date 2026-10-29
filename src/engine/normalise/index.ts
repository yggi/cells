/**
 * Normalise (decision 049, amended for #196; #28): a valid text written in its canonical form, which may change, add and
 * remove cells, each rewrite sounding identical (S1). A command of its own, never offered while
 * a piece is being written (decision 017): for the examples, a corpus, the round trip, and before a hash (#49). What it
 * writes is listed, each with its reason, in docs/language/canonical.md. One rule a file:
 *
 *  - aliases.ts:  Strudel's or dough's name for a parameter as ours, whatever its length: cutoff= → lpf=, clip= → legato=
 *  - uses.ts:     a `use` line in its one spelling (decision 059): use "harmonic minor" → use * from "harmonic minor"
 *  - mainkey.ts:  the main key named (decision 060): over=key → over=&key
 *  - names.ts:    the interface names where they are unambiguous (#196): the main meter &bar, its rate &tempo, the main key
 *                 &key, its tonic &tonic; and scan(1 1 1 1), the meter of four beats, as meter("4/4")
 *  - library.ts:  a line that is a library fragment's word for word as a use of it (#196): &bar meter("4/4") step=&tempo
 *                 → use &bar from "4/4", with the library the call gives (`NormaliseOptions.library`)
 *  - forwarded.ts: a use of a fragment that only forwards as the use it forwards to (#196): use * from "core kit" → use &bd, … from gm_kit
 *
 * The canonical table's other rows join as the owner rules them (#27). A `use` line (decision 054) is kept, in its
 * order, never expanded: a used fragment's lines written in are no canonical form (`expand` writes them out). Its
 * fragment is read through `options.resolve`. Pure.
 */
import { rewriteAll, ROUNDS, type Rewrite } from '../rewrite';
import type { CompileOptions, CompileResult } from '../program';
import { aliases } from './aliases';
import { mainKey } from './mainkey';
import { forwardedUses } from './forwarded';
import { libraryLines, type LibraryFragment } from './library';
import { fourFour, interfaceNames } from './names';
import { uses } from './uses';

/** What Normalise reads besides the text: the compile's options, and the library whose lines a piece takes by `use`. */
export interface NormaliseOptions extends CompileOptions {
  readonly library?: readonly LibraryFragment[];
}

/** Every rewrite into the canonical spelling a text has, its `use` lines' fragments read through `options.resolve`. */
export const normalisations =
  (options: NormaliseOptions = {}) =>
  (source: string, result: CompileResult): Rewrite[] => [
    ...uses(source),
    ...forwardedUses(source, options.resolve),
    ...mainKey(source, result),
    ...interfaceNames(source, result),
    ...fourFour(source, result),
    ...aliases(source, result),
    ...libraryLines(source, options.library),
  ];

/** A text in the canonical spelling, one rewrite at a time, each playing the same notes; the steps are what each did. */
export const normalise = (source: string, options?: NormaliseOptions): { source: string; steps: string[] } => rewriteAll(source, normalisations(options), ROUNDS, options);
