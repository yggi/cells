/**
 * Migrate (decision 049, #156): a text written for an earlier version of the language, its retired forms rewritten as the
 * language writes them now, each rewrite playing the same notes (`rewriteAll`). A retired form still reads, with a
 * warning that names Migrate; its migration is witnessed by a pair of texts in `fixtures/migrations/<rule>/`, which keep
 * it honest when the parser stops reading the form. One rule a file, in the order the forms were retired:
 *
 *  - gates.ts:     a gate written the old way (trigger=, velocity=, gate=, gain=) as play= and level= (decision 023)
 *  - taps.ts:      a line stepped by a meter cell's own steps (step=&bar*2) as a tap of the meter (step=8n, decision 040)
 *  - swing.ts:     a bare swing=.67 on a meter as the level it leans (swing=8n:.67, #18)
 *  - mainkey.ts:   over=key as the cell it reads, over=&key (decision 060)
 *  - moved.ts: a `from` line of a seed fragment a piece took in as its part, as a take of the part: &twinkle from twinkle &key → &twinkle from kinderlied &key (decision 082)
 *  - forwarded.ts: a `from` line of a retired id as the line it forwards to: * from "core kit" → &bd, … from gm_kit (#338)
 *  - grids.ts:     a grid's size written cycle=19 map=edo as its map's, map=edo(19), map=ed(7, 3/2) (decision 040, #75)
 *  - laps.ts:      a turning table's cycle= in steps as laps, cycle=24 on a 12 → cycle=2 (decision 040, #75): exact by
 *                  construction against the old meaning, taken unchecked (`Rewrite.exact`), and never Normalise's
 *  - renamed.ts:   a seed id that became a word as the word: "harmonic minor" → harmonic_minor (#387)
 *  - oneshot.ts:   the bare line word oneshot as the voice's parameter, oneshot=1 (decision 068, #440)
 *  - beats.ts:     beat=n, retired, as the meter that counts those beats: meter("4/4") beat=2 → meter("2/2", 2) (#502)
 *  - pairs.ts:     a swing's :pairs dropped, what every swing does now (swing=8n:2/3, decision 071, #15)
 *  - notes.ts:     a drum named as General MIDI's with no note= written with the note its name gave: &bd note=36 (decision 075)
 *  - arguments.ts: a `from` line of a fragment that read a name it now declares, passing the piece's cell of the name:
 *                  bass_performer(bassV=&bassV) (decision 075, #560 rung 3c–e)
 *  - parts.ts:     a role cell or a line named as a part, a drum line named as a role, written with the value its name
 *                  gave: part=bass, role=kick (decision 075, the feel's version 3, #560 rung 2)
 *  - axes.ts:      a style on the axes sync harm artic energy as on sync harm bite mood (decision 076, #572): exact
 *                  against the old meaning, taken unchecked (`Rewrite.exact`), and never Normalise's
 *  - laws.ts:      a law written law=fiveto12 over=&day as the from line that takes it: &cycle from five_to_twelve &day (decision 085)
 *
 * `&parts` → `&sections` (decision 044) was offered for v0.15 and is retired (decision 049, ruling 4): `&parts` is a valid
 * name, the author's. The card's title= tags= tier= going to the file's frontmatter (decision 047) is a migration too, but its rewrite makes
 * a text a piece file, so `migrate` leaves it: Shorten offers it, and `movedCard` (`shorten/card.ts`) does it.
 *
 * Shorten offered four of them (gate, tap, swing, section) as suggestions for v0.15, delegated here, and no longer does
 * (#157). Normalise runs these rules before its own, but those exact only against an older meaning (decision 049's order:
 * Migrate, then Normalise).
 *
 * A `use` line (decisions 054, 059) is no longer read: Migrate stopped rewriting it as a `from` line in the minor after v0.20.0 (#588,
 * after a minor of warnings since v0.14.0). A text that still has one is told so by the parser, and is rewritten by hand
 * (`docs/language/use.md`), or by Migrate at an earlier version. Pure.
 */
import { type Find, type Rewrite } from '../rewrite';
import type { CompileOptions } from '../program';
/** The rules a migration is found by (Shorten's suggestions keep theirs as their kinds). */
export type MigrationRule = 'gate' | 'tap' | 'swing' | 'main key' | 'forwarded' | 'grid' | 'laps' | 'renamed' | 'oneshot' | 'pairs' | 'beats' | 'notes' | 'arguments' | 'axes' | 'parts' | 'moved' | 'law';
export type Migration = Rewrite<MigrationRule>;
/** Every migration a text has, in the order its form was retired; a `from` line's fragment read through `options.resolve`. */
export declare const migrations: (options?: CompileOptions) => Find;
/** A text with every retired form written as it is now, one rewrite at a time, each playing the same notes; the steps are what each did. */
export declare const migrate: (source: string, options?: CompileOptions) => {
    source: string;
    steps: string[];
};
