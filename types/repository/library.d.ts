/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments and the modes, their points associated as `meter`, `rhythm`, `bass`, `harmony`, `instrument` and `mode` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import type { Fragment } from './fragments';
/** The meters, the rhythms, the bass lines, the harmonies, the instruments, then the modes: forty-three fragments. */
export declare const LIBRARY: readonly Fragment[];
/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, or null for none. It holds
 * each fragment's current version only: a lockfile's older hash plays the current one (the compile warns).
 */
export declare const resolveSeed: Resolve;
