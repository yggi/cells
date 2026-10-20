/**
 * The repository's library: every fragment built so far, the meters, the rhythms and the bass lines, their points
 * associated as `meter`, `rhythm` and `bass`. A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import { BASS_FRAGMENTS } from './bass';
import type { Fragment } from './fragments';
import { METER_FRAGMENTS } from './meters';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The meters, the rhythms, then the bass lines: thirty-one fragments. */
export const LIBRARY: readonly Fragment[] = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS];
