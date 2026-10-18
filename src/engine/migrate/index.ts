/**
 * Migrate (decision 049, #156): a text written for an earlier version of the language, its retired forms rewritten as
 * the language writes them now, playing the same notes. A retired form still reads, with a warning that names the form
 * that says it now; a migration keeps working when the parser stops reading it, witnessed by its pairs in
 * `fixtures/migrations/`. One rule a file, in the order its form was retired:
 *
 *  - gates.ts:     a gate written the old way (trigger=, velocity=, gate=, gain=) as play= and level= (decision 023)
 *  - taps.ts:      a line stepped by a meter cell's own steps (step=&bar*2) as a tap of the meter (step=8n, decision 040)
 *  - swing.ts:     a bare swing=.67 on a meter as the level it leans (swing=8n:.67, #18)
 *  - sections.ts:  a table of sections named &parts as &sections (decision 044): a name, not a retired form, offered for
 *                  one minor version and then retired (#159)
 *
 * The card's title= tags= tier= going to the file's frontmatter (decision 047) is a migration too, but its rewrite makes
 * a text a piece file, so `migrate` leaves it: Shorten offers it, and `movedCard` (`shorten/card.ts`) does it. Shorten
 * offers these migrations as suggestions too, for one minor version more (#154). Pure.
 */
import { rewriteAll, type Rewrite } from '../rewrite';
import type { CompileResult } from '../program';
import { gates } from './gates';
import { taps } from './taps';
import { swings } from './swing';
import { sections } from './sections';

/** The rules a migration is found by: Shorten's suggestions keep their kinds. */
export type MigrationRule = 'gate' | 'tap' | 'swing' | 'section';
export type Migration = Rewrite<MigrationRule>;

/** Every migration a text has, in the order its form was retired. */
export const migrations = (source: string, result: CompileResult): Migration[] => [
  ...gates(source, result),
  ...taps(source, result),
  ...swings(source, result),
  ...sections(source, result),
];

/** A text with every retired form rewritten as it is written now, one at a time, each playing the same notes; the steps are what each did. */
export const migrate = (source: string): { source: string; steps: string[] } => rewriteAll(source, migrations);
