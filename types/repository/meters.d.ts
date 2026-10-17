/**
 * The meters: the repository's first facet (#82, decision 041), since swing lives in the meter cell and whether the band
 * swings is a question of which meter it plays. Each fragment is one line, `&bar meter(…)`, open on its tempo: the host
 * sets `step=` (Jambot's `bpm` is its own axis, and a fragment's style has no tempo: decision 037).
 *
 * The associations are written by hand, on four of Jambot's axes: `sync` (on the beat 0, off it 1), `harm` (a static
 * vamp 0, moving, rich harmony 1), `artic` (legato 0, staccato 1) and `energy` (sparse 0, dense 1). Each of Jambot's eight
 * presets names a 4/4 meter (yggi/jambot#360) and is a point of that meter's association: straight 4/4 holds the three
 * that play straight, and each swung 4/4 the presets that play its swing. The other meters sit where no preset is, and
 * where no point halfway between two presets is nearer to them than to the presets' own meters.
 *
 * A swung meter plays exactly the swing Jambot plays at its presets' value on the swing axis: the shares are
 * `swingShares(s)` of yggi/jambot packages/engine/src/swing.ts, each written as the shortest decimal that is that number
 * (`fixtures/jambot-swing.json`), so every onset lands where Jambot's `leanMap` puts it. Two presets share a swung meter
 * when their shares move no onset of the bar by 1e-9 or more (a level's offbeat moves by the share's difference times its
 * span, at most 4 sixteenths: shares less than 2.5e-10 apart); today that means equal, Deep house's and Funk's. A meter
 * swung on `8n` brings in Jambot's jazz kit (yggi/jambot#360), so its id says `swung on 8n`, and a lean on `16n` says
 * `leaning … on 16n`.
 */
import type { Fragment } from './fragments';
/** The meters built so far: thirteen, each one line of cells text. */
export declare const METER_FRAGMENTS: readonly Fragment[];
