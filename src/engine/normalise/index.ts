/**
 * Normalise (decision 049, amended for #196; #28): a valid text written in its canonical form, which may change, add and
 * remove cells, each rewrite sounding identical (S1). A command of its own, never offered while
 * a piece is being written (decision 017): for the examples, a corpus, the round trip, and before a hash (#49). What it
 * writes is listed, each with its reason, in docs/language/canonical.md. One rule a file:
 *
 *  - aliases.ts:  Strudel's or dough's name for a parameter as ours, whatever its length: cutoff= → lpf=, clip= → legato=; and ftype='s numbers as its words, ftype=2 → ftype=24db (decision 074)
 *  - names.ts:    the interface names where they are unambiguous (#196): the main meter &bar, its rate &tempo, the main key
 *                 &key, its tonic &tonic
 *  - meter.ts:    a meter built by hand as the meter it is (#645): even beats, scan(1 1 1), as meter("3/4"); a clock of two
 *                 tapped by its pulse, &swing scan(2 1) step=8n, as the main meter's swing, &swing swing=8n:2/3
 *  - library.ts:  a line that is a library fragment's word for word as a use of it (#196): &bar meter("4/4") step=&tempo
 *                 → use &bar from meter, and a fragment's cell written inline as it by name: pitch=&(map=lin …)
 *                 → pitch=&vibrato, use &vibrato; with the library the call gives (`NormaliseOptions.library`)
 *  - library.ts, again: a template's head line with its parameters filled in as a from line of it with those arguments
 *                 (#524): &bar meter("7/8") step=&tempo → &bar from meter(grouping=meter("7/8")) &tempo
 *  - narrowest.ts: a collection's `* from gm_kit` as the cells of it the piece uses, `&bd, &hh from gm_kit` (#27's row,
 *                 the owner on #157: `*` is a shorthand for all of it the piece uses)
 *
 * Migrate's rules run first, as decision 049 orders them (Migrate, then Normalise): a retired form a text has, or that a rule
 * here writes on its way (libraryLines writes a `use`, which Migrate's `from` says as a `from` line), is migrated in the same
 * run. They were Normalise's own (the `use` spellings, over=key, the forwards, `from`) until Migrate was built (#156).
 *
 * The canonical table's other rows join as the owner rules them (#27). A `from` line (decision 054) is kept, in its
 * order, never expanded: a used fragment's lines written in are no canonical form (`expand` writes them out). Its
 * fragment is read through `options.resolve`. Pure.
 */
import { rewriteAll, ROUNDS, type Rewrite } from '../rewrite';
import type { CompileOptions, CompileResult } from '../program';
import { aliases, filterModels } from './aliases';
import { libraryCells, libraryLines, libraryTemplates, type LibraryFragment } from './library';
import { narrowestFroms } from './narrowest';
import { interfaceNames } from './names';
import { evenScan, shadowMeter, swingClock, tapClock } from './meter';
import { migrations } from '../migrate';
import { mainMeters } from '../migrate/mainmeter';
import { oneRoot } from '../migrate/oneroot';

/** What Normalise reads besides the text: the compile's options, and the library whose lines a piece takes by `use`. */
export interface NormaliseOptions extends CompileOptions {
  readonly library?: readonly LibraryFragment[];
}

/** Every rewrite into the canonical spelling a text has, its `from` lines' fragments read through `options.resolve`. */
export const normalisations =
  (options: NormaliseOptions = {}) =>
  (source: string, result: CompileResult): Rewrite[] => [
    // (but a migration exact only against an older meaning: in a valid text it would change what the text says, #75)
    // (and but naming a bare tap's meter, decision 091: last, after a second clock is folded into the main meter, so a
    // piece left with one meter keeps its taps bare)
    ...migrations(options)(source, result).filter((r) => !r.exact && r.rule !== 'main meter' && r.rule !== 'one root'),
    ...interfaceNames(source, result),
    ...evenScan(source, result),
    ...swingClock(source, result),
    ...shadowMeter(source, result),
    ...tapClock(source, result, options),
    ...aliases(source, result),
    ...filterModels(source, result),
    ...libraryLines(source, options.library),
    ...libraryTemplates(source, options.library, options.resolve),
    ...libraryCells(source, options.library),
    ...narrowestFroms(source, options.resolve),
    ...oneRoot(source, result),
    ...mainMeters(source, result),
  ];

/** A text in the canonical spelling, one rewrite at a time, each playing the same notes; the steps are what each did. */
export const normalise = (source: string, options?: NormaliseOptions): { source: string; steps: string[] } => {
  // (it writes every migration before its own rules, for a minor version: a retired form is read the old way)
  const old = { ...options, old: true };
  return rewriteAll(source, normalisations(old), ROUNDS, old);
};
