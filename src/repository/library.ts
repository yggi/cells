/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs, the forms, the band and the styles, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif`, `form`, `band` and `style` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { RENAMED_IDS } from '../engine/renamed';
import { SEED, seedFragments } from './seed';
import { EMPTY_LAYER, type Fragment, type LearnedLayer } from './fragments';
import { variantsOf } from './variants';

/** The seed library's folders, in the order the library lists them: each folder its facet's fragments (decision 047). */
const FOLDERS = ['meters', 'rhythms', 'bass', 'harmony', 'instruments', 'expression', 'modes', 'performers', 'stab', 'motifs', 'forms', 'bands', 'styles', 'modules'];

/** Every seed fragment, a template's sets of arguments each a fragment of its own, folder by folder (`FOLDERS`). */
export const LIBRARY: readonly Fragment[] = FOLDERS.flatMap((folder) => seedFragments(folder));

/**
 * The ids the library no longer lists, each still read as a fragment that only forwards: a `from` line of the fragment
 * that took its place (#196). The core kit was the General MIDI kit's 13 voices a groove needs, before a
 * `use` could name what it takes; the General MIDI kit is `gm_kit`, a word. Migrate writes a line of one as the line it
 * forwards to (`migrate/forwarded.ts`), so a piece that names one plays as before and is respelled.
 */
export const RETIRED: ReadonlyMap<string, string> = new Map([
  ['core kit', '&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit'],
  ['gm kit', '* from gm_kit'],
]);

// (a template whose points carry its arguments is in the library as a fragment for each set, `diatonic(mode=aeolian)`; a from
// line names the template itself, `diatonic`, so its own text is read by its id too)
const CURRENT = new Map([...SEED.map((f): [string, string] => [f.fragment.id, f.fragment.text]), ...LIBRARY.map((f): [string, string] => [f.id, f.text])]);
/** Each id the seed renamed (`RENAMED_IDS`, #387), read for a minor version as the text of its word: the same hash, so a lockfile still holds. */
const RENAMED = [...RENAMED_IDS].map(([old, word]): [string, string] => [old, CURRENT.get(word)!]);
const BY_ID = new Map([...CURRENT, ...RENAMED, ...RETIRED]);

/**
 * The seed library as a `use` line's resolver (decision 054): a fragment's text by its id, a retired id's forwarding
 * text (`RETIRED`), or null for none. It holds each fragment's current version only: a lockfile's older hash plays the
 * current one (the compile warns).
 */
export const resolveSeed: Resolve = (id) => BY_ID.get(id) ?? null;

/**
 * The seed library and a person's filed fragments as one resolver (#638): a `from` line's id read from the seed first
 * (`resolveSeed`, its retired and renamed ids too), then from the layer's filed fragments, a filed template's sets of
 * arguments as the seed's are (`variantsOf`). The seed first, so a filed fragment never stands in for one of cells' own
 * (a layer that files a seed id is refused by `merge` already). The layer is read, never changed.
 */
export function resolverOf(layer: LearnedLayer = EMPTY_LAYER): Resolve {
  if (!layer.filed.length) return resolveSeed;
  const filed = new Map(layer.filed.flatMap(({ fragment }) => variantsOf(fragment).map((v): [string, string] => [v.id, v.text])));
  return (id, hash) => resolveSeed(id, hash) ?? filed.get(id) ?? null;
}
