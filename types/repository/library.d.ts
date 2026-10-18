/**
 * The repository's library: every fragment built so far, the meters and the rhythms, their points associated as `meter`
 * and `rhythm`. A query names its facet (`{ facet: 'meter' }`) and measures only the points of that facet, so adding
 * fragments of another never changes what it returns.
 */
import type { Fragment } from './fragments';
/** The meters, then the rhythms: twenty-six fragments. */
export declare const LIBRARY: readonly Fragment[];
