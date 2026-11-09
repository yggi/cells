/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs, the forms, the band and the styles, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif`, `form`, `band` and `style` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { type Fragment, type LearnedLayer } from './fragments';
/** The meters, the rhythms, the bass lines, the harmonies, the instruments, the expressions, the modes, the performers, the stab lines, the motifs, the forms, the band, then the styles: a hundred and twelve fragments. */
export declare const LIBRARY: readonly Fragment[];
/**
 * The ids the library no longer lists, each still read as a fragment that only forwards: a `from` line of the fragment
 * that took its place (#196). The core kit was the General MIDI kit's 13 voices a groove needs, before a
 * `use` could name what it takes; the General MIDI kit is `gm_kit`, a word. Migrate writes a line of one as the line it
 * forwards to (`migrate/forwarded.ts`), so a piece that names one plays as before and is respelled.
 */
export declare const RETIRED: ReadonlyMap<string, string>;
/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, a retired id's forwarding
 * text (`RETIRED`), or null for none. It holds each fragment's current version only: a lockfile's older hash plays the
 * current one (the compile warns).
 */
export declare const resolveSeed: Resolve;
/**
 * The seed library and a person's filed fragments as one resolver (#638): a `from` line's id read from the seed first
 * (`resolveSeed`, its retired and renamed ids too), then from the layer's filed fragments, a filed template's sets of
 * arguments as the seed's are (`variantsOf`). The seed first, so a filed fragment never stands in for one of cells' own
 * (a layer that files a seed id is refused by `merge` already). The layer is read, never changed.
 */
export declare function resolverOf(layer?: LearnedLayer): Resolve;
