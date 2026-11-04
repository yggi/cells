/**
 * Migrate (decision 049, #156): a text written for an earlier version of the language, its retired forms rewritten as the
 * language writes them now, each rewrite playing the same notes (`rewriteAll`). A retired form still reads, with a
 * warning that names Migrate; its migration is witnessed by a pair of texts in `fixtures/migrations/<rule>/`, which keep
 * it honest when the parser stops reading the form. One rule a file, in the order the forms were retired:
 *
 *  - gates.ts:     a gate written the old way (trigger=, velocity=, gate=, gain=) as play= and level= (decision 023)
 *  - taps.ts:      a line stepped by a meter cell's own steps (step=&bar*2) as a tap of the meter (step=8n, decision 040)
 *  - sections.ts:  a table of sections named &parts as &sections (decision 044; a name, offered for one minor version)
 *  - swing.ts:     a bare swing=.67 on a meter as the level it leans (swing=8n:.67, #18)
 *  - uses.ts:      a `use` line in its one spelling: use "my riff" → use * from "my riff" (decision 059)
 *  - mainkey.ts:   over=key as the cell it reads, over=&key (decision 060)
 *  - forwarded.ts: a use of a retired id as the use it forwards to: "core kit" → &bd, … from gm_kit (#338)
 *  - from.ts:      a `use` line as the `from` line that plays the same, a template's arguments said (decision 065)
 *  - grids.ts:     a grid's size written cycle=19 map=edo as its map's, map=edo(19), map=ed(7, 3/2) (decision 040, #75)
 *  - laps.ts:      a turning table's cycle= in steps as laps, cycle=24 on a 12 → cycle=2 (decision 040, #75): exact by
 *                  construction against the old meaning, taken unchecked (`Rewrite.exact`), and never Normalise's
 *  - renamed.ts:   a seed id that became a word as the word: "harmonic minor" → harmonic_minor (#387)
 *
 * The card's title= tags= tier= going to the file's frontmatter (decision 047) is a migration too, but its rewrite makes
 * a text a piece file, so `migrate` leaves it: Shorten offers it, and `movedCard` (`shorten/card.ts`) does it.
 *
 * Shorten keeps offering its four (gate, tap, swing, section) as suggestions, and Normalise keeps running all nine
 * before its own, for one minor version (decision 049's bound): delegated here, then gone with a CHANGELOG line. Pure.
 */
import { rewriteAll, ROUNDS, type Find, type Rewrite } from '../rewrite';
import type { CompileOptions } from '../program';
import { gates } from './gates';
import { taps } from './taps';
import { sections } from './sections';
import { swings } from './swing';
import { uses } from './uses';
import { mainKey } from './mainkey';
import { forwardedUses } from './forwarded';
import { fromUses } from './from';
import { grids } from './grids';
import { laps } from './laps';
import { renamedIds } from './renamed';

/** The rules a migration is found by (Shorten's suggestions keep theirs as their kinds). */
export type MigrationRule = 'gate' | 'tap' | 'section' | 'swing' | 'use' | 'main key' | 'forwarded' | 'from' | 'grid' | 'laps' | 'renamed';
export type Migration = Rewrite<MigrationRule>;

/** Every migration a text has, in the order its form was retired; a `use` line's fragment read through `options.resolve`. */
export const migrations =
  (options: CompileOptions = {}): Find =>
  (source, result): Migration[] => [
    ...gates(source, result, options),
    ...taps(source, result, options),
    ...sections(source, result, options),
    ...swings(source, result, options),
    ...uses(source),
    ...mainKey(source, result),
    ...forwardedUses(source, options.resolve),
    ...fromUses(source, options.resolve),
    ...grids(source, result, options),
    ...laps(source, result),
    ...renamedIds(source, options.resolve),
  ];

/** A text with every retired form written as it is now, one rewrite at a time, each playing the same notes; the steps are what each did. */
export const migrate = (source: string, options: CompileOptions = {}): { source: string; steps: string[] } => {
  // (a retired form is read the old way, so it compiles and its rewrite can be checked against it)
  const old = { ...options, old: true };
  return rewriteAll(source, migrations(old), ROUNDS, old);
};
