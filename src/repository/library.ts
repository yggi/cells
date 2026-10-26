/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes and the performers, their points associated as `meter`, `rhythm`, `bass`, `harmony`, `instrument`,
 * `mode` and `performer` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { BASS_FRAGMENTS } from './bass';
import type { Fragment } from './fragments';
import { HARMONY_FRAGMENTS } from './harmony';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { PERFORMER_FRAGMENTS } from './performers';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The meters, the rhythms, the bass lines, the harmonies, the instruments, the modes, then the performers: fifty-two fragments. */
export const LIBRARY: readonly Fragment[] = [
  ...METER_FRAGMENTS,
  ...RHYTHM_FRAGMENTS,
  ...BASS_FRAGMENTS,
  ...HARMONY_FRAGMENTS,
  ...INSTRUMENT_FRAGMENTS,
  ...MODE_FRAGMENTS,
  ...PERFORMER_FRAGMENTS,
];

const BY_ID = new Map(LIBRARY.map((f) => [f.id, f.text]));

/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, or null for none. It holds
 * each fragment's current version only: a lockfile's older hash plays the current one (the compile warns).
 */
export const resolveSeed: Resolve = (id) => BY_ID.get(id) ?? null;
