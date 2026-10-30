/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs and the forms, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif` and `form` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import type { Fragment } from './fragments';
/** The meters, the rhythms, the bass lines, the harmonies, the instruments, the expressions, the modes, the performers, the stab lines, the motifs, then the forms: a hundred and ten fragments. */
export declare const LIBRARY: readonly Fragment[];
/**
 * The ids the library no longer lists, each still read for one minor version as a fragment that only forwards: a `use`
 * of the fragment that took its place (#196). The core kit was the General MIDI kit's 13 voices a groove needs, before a
 * `use` could name what it takes; the General MIDI kit is `gm_kit`, a word. Normalise writes a use of one as the use it
 * forwards to (`normalise/forwarded.ts`), so a piece that names one plays as before and is respelled.
 */
export declare const RETIRED: ReadonlyMap<string, string>;
/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, a retired id's forwarding
 * text (`RETIRED`), or null for none. It holds each fragment's current version only: a lockfile's older hash plays the
 * current one (the compile warns).
 */
export declare const resolveSeed: Resolve;
