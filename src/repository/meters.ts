/**
 * The meters: the repository's first facet (#82, decision 041), since swing lives in the meter cell and whether the band
 * swings is a question of which meter it plays. Each fragment is one line, `&bar meter(…)`, open on its tempo: the host
 * sets `step=` (Jambot's `bpm` is its own axis, and a fragment's style has no tempo: decision 037).
 *
 * The associations are written by hand, on four of Jambot's axes (`presets.ts`). Each of Jambot's eight presets names a
 * 4/4 meter (yggi/jambot#360) and is a point of that meter's association: straight 4/4 holds the three that play
 * straight, and each swung 4/4 the presets that play its swing. The other meters sit where no preset is, and
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
import { AMBIENT, at, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO, weighted } from './presets';

/** The meters built so far: thirteen, each one line of cells text, every point associated as the facet `meter`. */
export const METER_FRAGMENTS: readonly Fragment[] = [
  { id: '4/4', text: '&bar meter("4/4")', association: weighted('meter', SYNTH_POP, TECHNO, BOSSA_NOVA) },
  // (Jambot's swing 1: the triplet swing, 2/3, on the eighths; the sixteenths straight)
  { id: '4/4 swung on 8n', text: '&bar meter("4/4") swing=8n:2/3', association: weighted('meter', SWING_JAZZ) },
  // (Jambot's swing .45: the sixteenths' heaviest lean of the presets)
  { id: '4/4 leaning on 16n', text: '&bar meter("4/4") swing=16n:.65', association: weighted('meter', LO_FI) },
  // (Jambot's swing .3)
  { id: '4/4 leaning lightly on 16n', text: '&bar meter("4/4") swing=16n:.6', association: weighted('meter', DEEP_HOUSE, FUNK) },
  // (Jambot's swing .05: 31/60, an onset a thirtieth of a sixteenth late)
  { id: '4/4 leaning faintly on 16n', text: '&bar meter("4/4") swing=16n:31/60', association: weighted('meter', AMBIENT) },
  // (alla breve: the bpm counts half notes; fast, bright, marching)
  { id: '4/4 alla breve', text: '&bar meter("4/4") beat=2', association: weighted('meter', at(0.2, 0.6, 0.9, 1)) },
  // (a march, a polka: on the beat, plain, short and dense)
  { id: '2/4', text: '&bar meter("2/4")', association: weighted('meter', at(0, 0.1, 0.6, 1)) },
  // (a waltz, a ballad: on the beat, rich, sparse)
  { id: '3/4', text: '&bar meter("3/4")', association: weighted('meter', at(0, 0.7, 0.3, 0)) },
  // (a lilt: plain and sparse)
  { id: '6/8', text: '&bar meter("6/8")', association: weighted('meter', at(0.3, 0.2, 0.2, 0)) },
  // (a slow blues, a soul ballad: legato, off the beat)
  { id: '12/8', text: '&bar meter("12/8")', association: weighted('meter', at(0.7, 0.6, 0, 0.2)) },
  // (cool jazz: rich, unhurried)
  { id: '5/4', text: '&bar meter("5/4")', association: weighted('meter', at(0.4, 0.9, 0.5, 0.3)) },
  // (3+2+2, a Balkan dance: off the beat, short and dense)
  { id: '7/8', text: '&bar meter("7/8")', association: weighted('meter', at(0.8, 0.6, 1, 1)) },
  // (3+2+3+2)
  { id: '10/8', text: '&bar meter("10/8")', association: weighted('meter', at(0.6, 0.9, 0.8, 0.9)) },
];
