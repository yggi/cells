/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies and the
 * instruments, their points associated as `meter`, `rhythm`, `bass`, `harmony` and `instrument`. A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import { BASS_FRAGMENTS } from './bass';
import type { Fragment } from './fragments';
import { HARMONY_FRAGMENTS } from './harmony';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { METER_FRAGMENTS } from './meters';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The meters, the rhythms, the bass lines, the harmonies, then the instruments: thirty-eight fragments. */
export const LIBRARY: readonly Fragment[] = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS, ...HARMONY_FRAGMENTS, ...INSTRUMENT_FRAGMENTS];
