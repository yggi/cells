/**
 * The meters: the repository's first facet (#82, decision 041), since swing lives in the meter cell and whether the band
 * swings is a question of which meter it plays. One fragment, `meter` (`fragments/meters/meter.md`, #507, decision 072):
 * a bar `&bar` open on its tempo (the host sets `step=`, Jambot's `bpm` its own axis: decision 037), its grouping and its
 * swing its arguments, each line its default (4/4, straight). Its points carry the arguments, one a style, and the
 * repository holds it taken with each set: `meter`, `meter(swing=8n:2/3)`, `meter(grouping=meter("7/8"))`, thirteen.
 *
 * The associations are written by hand, on four of Jambot's axes (`presets.ts`). Each of Jambot's eight presets names a
 * 4/4 meter (yggi/jambot#360) and is a point of that meter's association: straight 4/4 holds the three that play
 * straight, and each swing the presets that play it. The other groupings sit where no preset is, and where no point
 * halfway between two presets is nearer to them than to the presets' own meters.
 *
 * A swung meter plays exactly the swing Jambot plays at its presets' value on the swing axis: the shares are the shares
 * of Jambot's swing axis at `s` (the readers' path of the family's swing contract, `fixtures/contracts/swing.json`), each
 * written as the shortest decimal that is that number, so every onset lands where Jambot's `leanMap` puts it. Two
 * presets share a swing when their shares move no onset of the bar by 1e-9 or more; today that means equal, Deep
 * house's and Funk's. A swing on `8n` brings in Jambot's jazz kit (yggi/jambot#360); its id says it, `swing=8n:…`.
 */
import type { Fragment } from './fragments';
import { seedFragments } from './seed';

/** The meters: the `meter` fragment taken with each set of arguments its points carry, thirteen, every point associated as the facet `meter`. */
export const METER_FRAGMENTS: readonly Fragment[] = seedFragments('meters');
