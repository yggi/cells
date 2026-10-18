/**
 * The repository's library: every fragment built so far, the meters and the rhythms, each fragment's facet saying which.
 * A query names its facet (`{ facet: 'meter' }`), so adding a facet never changes what a query of another returns.
 */
import type { Fragment } from './fragments';
import { METER_FRAGMENTS } from './meters';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** The meters, then the rhythms: twenty-five fragments. */
export const LIBRARY: readonly Fragment[] = [...METER_FRAGMENTS, ...RHYTHM_FRAGMENTS];
