/**
 * The repository's library: every fragment built so far, the meters and the rhythms, each fragment's facet saying which.
 * A query names its facet (`{ facet: 'meter' }`), so adding a facet never changes what a query of another returns.
 */
import type { Fragment } from './fragments';
/** The meters, then the rhythms: twenty-five fragments. */
export declare const LIBRARY: readonly Fragment[];
