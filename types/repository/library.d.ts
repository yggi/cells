/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs and the forms, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif` and `form` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import type { Fragment } from './fragments';
/** The meters, the rhythms, the bass lines, the harmonies, the instruments, the modes, the performers, the stab lines, the motifs, then the forms: sixty-eight fragments. */
export declare const LIBRARY: readonly Fragment[];
/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, or null for none. It holds
 * each fragment's current version only: a lockfile's older hash plays the current one (the compile warns).
 */
export declare const resolveSeed: Resolve;
