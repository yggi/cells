/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs, the forms and the band, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif`, `form` and `band` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { BASS_FRAGMENTS } from './bass';
import type { Fragment } from './fragments';
import { HARMONY_FRAGMENTS } from './harmony';
import { EXPRESSION_FRAGMENTS } from './expression';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { PERFORMER_FRAGMENTS } from './performers';
import { RHYTHM_FRAGMENTS } from './rhythms';
import { STAB_FRAGMENTS } from './stab';
import { MOTIF_FRAGMENTS } from './motifs';
import { FORM_FRAGMENTS } from './forms';
import { BAND_FRAGMENTS } from './bands';

/** The meters, the rhythms, the bass lines, the harmonies, the instruments, the expressions, the modes, the performers, the stab lines, the motifs, the forms, then the band: a hundred and eleven fragments. */
export const LIBRARY: readonly Fragment[] = [
  ...METER_FRAGMENTS,
  ...RHYTHM_FRAGMENTS,
  ...BASS_FRAGMENTS,
  ...HARMONY_FRAGMENTS,
  ...INSTRUMENT_FRAGMENTS,
  ...EXPRESSION_FRAGMENTS,
  ...MODE_FRAGMENTS,
  ...PERFORMER_FRAGMENTS,
  ...STAB_FRAGMENTS,
  ...MOTIF_FRAGMENTS,
  ...FORM_FRAGMENTS,
  ...BAND_FRAGMENTS,
];

/**
 * The ids the library no longer lists, each still read for one minor version as a fragment that only forwards: a `use`
 * of the fragment that took its place (#196). The core kit was the General MIDI kit's 13 voices a groove needs, before a
 * `use` could name what it takes; the General MIDI kit is `gm_kit`, a word. Normalise writes a use of one as the use it
 * forwards to (`normalise/forwarded.ts`), so a piece that names one plays as before and is respelled.
 */
export const RETIRED: ReadonlyMap<string, string> = new Map([
  ['core kit', 'use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit'],
  ['gm kit', 'use * from gm_kit'],
]);

const BY_ID = new Map([...LIBRARY.map((f): [string, string] => [f.id, f.text]), ...RETIRED]);

/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, a retired id's forwarding
 * text (`RETIRED`), or null for none. It holds each fragment's current version only: a lockfile's older hash plays the
 * current one (the compile warns).
 */
export const resolveSeed: Resolve = (id) => BY_ID.get(id) ?? null;
