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
import type { Fragment, StylePoint } from './fragments';

/** A point on the four axes the meters are placed on. */
const at = (sync: number, harm: number, artic: number, energy: number): StylePoint => ({ sync, harm, artic, energy });

// Jambot's presets on those axes (swing, entropy and bpm left out). Lifted from yggi/jambot packages/engine/src/style.ts @ 7b078e8.
const SYNTH_POP = at(0.3, 0.45, 0.55, 0.55);
const TECHNO = at(0.12, 0, 1, 0.8);
const DEEP_HOUSE = at(0.35, 0.55, 0.65, 0.65); // swing .3: 16n leaning to .60
const AMBIENT = at(0.05, 0.3, 0, 0.2); // swing .05: 16n leaning to .52
const LO_FI = at(0.5, 0.75, 0.35, 0.5); // swing .45: 16n leaning to .65
const FUNK = at(1, 0.12, 0.85, 0.75); // swing .3: 16n leaning to .60
const BOSSA_NOVA = at(0.75, 0.85, 0.45, 0.45);
const SWING_JAZZ = at(0.35, 1, 0.3, 0.6); // swing 1: 8n at .67, the jazz kit and the walking bass (yggi/jambot#360)

/** An association of these points, each of weight 1. */
const weighted = (...points: StylePoint[]) => points.map((point) => ({ point, weight: 1 }));

/** The meters built so far: nine, each one line of cells text. */
export const METER_FRAGMENTS: readonly Fragment[] = [
  {
    id: '4/4',
    text: '&bar meter("4/4")',
    association: weighted(SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ),
  },
  // (alla breve: the bpm counts half notes; fast, bright, marching)
  { id: '4/4 alla breve', text: '&bar meter("4/4") beat=2', association: weighted(at(0.2, 0.6, 0.9, 1)) },
  // (a march, a polka: on the beat, plain, short and dense)
  { id: '2/4', text: '&bar meter("2/4")', association: weighted(at(0, 0.1, 0.6, 1)) },
  // (a waltz, a ballad: on the beat, rich, sparse)
  { id: '3/4', text: '&bar meter("3/4")', association: weighted(at(0, 0.7, 0.3, 0)) },
  // (a lilt: plain and sparse)
  { id: '6/8', text: '&bar meter("6/8")', association: weighted(at(0.3, 0.2, 0.2, 0)) },
  // (a slow blues, a soul ballad: legato, off the beat)
  { id: '12/8', text: '&bar meter("12/8")', association: weighted(at(0.7, 0.6, 0, 0.2)) },
  // (cool jazz: rich, unhurried)
  { id: '5/4', text: '&bar meter("5/4")', association: weighted(at(0.4, 0.9, 0.5, 0.3)) },
  // (3+2+2, a Balkan dance: off the beat, short and dense)
  { id: '7/8', text: '&bar meter("7/8")', association: weighted(at(0.8, 0.6, 1, 1)) },
  // (3+2+3+2, written as levels: no time signature groups 10/8 so)
  { id: '10/8', text: '&bar meter("*..+.+..+.")', association: weighted(at(0.6, 0.9, 0.8, 0.9)) },
];
