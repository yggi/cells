/**
 * The repository's library: every fragment built so far, the meters and the rhythms, their points associated as `meter`
 * and `rhythm`. A query names its facet (`{ facet: 'meter' }`) and measures only the points of that facet, so adding
 * fragments of another never changes what it returns.
 */
import type { Fragment } from './fragments';
import { METER_FRAGMENTS } from './meters';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The meters, then the rhythms: twenty-six fragments. */
export const LIBRARY: readonly Fragment[] = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS];
