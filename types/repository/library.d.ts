/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs, the forms, the band and the styles, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif`, `form`, `band` and `style` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { type Fragment, type LearnedLayer } from './fragments';
/** Every seed fragment, a template's sets of arguments each a fragment of its own, folder by folder (`FOLDERS`). */
/**
 * The parts the examples give (decision 082), each a fragment whose id is its document's key and its head
 * (`kinderlied/twinkle`), its text the part (`partOf`), its points the ones its document's frontmatter keys by its head
 * (`parts: { twinkle: { association: […] } }`). A part with no association there is taken by its head all the same,
 * and found by no query, so it isn't listed. A malformed one throws here, naming the example and the head.
 */
export declare const PARTS: readonly Fragment[];
/** Every seed fragment, a template's sets of arguments each a fragment of its own, folder by folder (`FOLDERS`), then the parts the examples give (`PARTS`). */
export declare const LIBRARY: readonly Fragment[];
/** The library's fragments of a facet, read off their points (decision 046), wherever they are kept: a folder or a document. */
export declare const ofFacet: (facet: string) => Fragment[];
/** The id a `from` line writes for a fragment: a part's document (`kinderlied/twinkle` → `kinderlied`), any other's own. */
export declare const fromId: (id: string) => string;
/** The head a line takes a fragment by, where it is named for it: a part's head (`kinderlied/twinkle` → `twinkle`), a seed motif's id. */
export declare const headOf: (id: string) => string;
/**
 * The ids the library no longer lists, each still read as a fragment that only forwards: a `from` line of the fragment
 * that took its place (#196). The core kit was the General MIDI kit's 13 voices a groove needs, before a
 * `use` could name what it takes; the General MIDI kit is `gm_kit`, a word. Migrate writes a line of one as the line it
 * forwards to (`migrate/forwarded.ts`), so a piece that names one plays as before and is respelled.
 */
export declare const RETIRED: ReadonlyMap<string, string>;
/**
 * The seed library as a `from` line's resolver (decision 054): a fragment's text by its id, an example's by its key
 * (decision 082), a retired id's forwarding
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
