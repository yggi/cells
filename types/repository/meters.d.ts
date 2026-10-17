/**
 * The meters: the repository's first facet (#82, decision 041), since swing lives in the meter cell and whether the band
 * swings is a question of which meter it plays. Each fragment is one line, `&bar meter(…)`, open on its tempo: the host
 * sets `step=` (Jambot's `bpm` is its own axis, and a fragment's style has no tempo: decision 037).
 *
 * The associations are written by hand, on four of Jambot's axes: `sync` (on the beat 0, off it 1), `harm` (a static
 * vamp 0, moving, rich harmony 1), `artic` (legato 0, staccato 1) and `energy` (sparse 0, dense 1). Straight 4/4 holds the
 * points of Jambot's eight presets, each of which names a 4/4 meter (yggi/jambot#360); the presets that swing point here
 * until their swung meters are built. The other meters sit where no preset is, and where no point halfway between two
 * presets is nearer to them than to the presets' own meter.
 *
 * A swung meter (4/4 swung on `8n`, the funk and house leans on `16n`) waits for swing on the bar (#18): adding one is
 * one entry here, its association the presets that name it, taken from straight 4/4's.
 */
import type { Fragment } from './fragments';
/** The meters built so far: nine, each one line of cells text. */
export declare const METER_FRAGMENTS: readonly Fragment[];
