/**
 * The repository's library: every fragment built so far, the meters, the rhythms, the bass lines, the harmonies, the
 * instruments, the modes, the performers, the stab lines, the motifs, the forms, the band and the styles, their points associated as `meter`,
 * `rhythm`, `bass`, `harmony`, `instrument`, `mode`, `performer`, `stab`, `motif`, `form`, `band` and `style` (the
 * bell and scale both `mode` and `rhythm`). A query names its facet (`{ facet: 'meter' }`) and measures only the points
 * of that facet, so adding fragments of another never changes what it returns.
 */
import type { Resolve } from '../engine/program';
import { EXAMPLES } from '../engine/examples';
import { RENAMED_IDS } from '../engine/renamed';
import { SEED, seedFragments } from './seed';
import { EMPTY_LAYER, fragmentProblems, type Fragment, type LearnedLayer, type WeightedPoint } from './fragments';
import { readPiece } from '../engine/piecefile';
import { partOf, usesIn } from '../engine/use';
import { variantsOf } from './variants';

/** The seed library's folders, in the order the library lists them: each folder its facet's fragments (decision 047). */
const FOLDERS = ['meters', 'rhythms', 'bass', 'harmony', 'instruments', 'expression', 'modes', 'performers', 'stab', 'motifs', 'forms', 'bands', 'styles', 'modules'];

/** Every seed fragment, a template's sets of arguments each a fragment of its own, folder by folder (`FOLDERS`). */
/**
 * The parts the examples give (decision 082), each a fragment whose id is its document's key and its head
 * (`kinderlied/twinkle`), its text the part (`partOf`), its points the ones its document's frontmatter keys by its head
 * (`parts: { twinkle: { association: […] } }`). A part with no association there is taken by its head all the same,
 * and found by no query, so it isn't listed. A malformed one throws here, naming the example and the head.
 */
export const PARTS: readonly Fragment[] = Object.entries(EXAMPLES).flatMap(([key, e]) => {
  const file = readPiece(e.file);
  const parts = 'problems' in file ? undefined : file.frontmatter.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return [];
  return Object.entries(parts as Record<string, { association?: unknown }>).map(([head, entry]) => {
    const text = partOf(e.source, head);
    if (text === null) throw new Error(`examples/${key}.md: its frontmatter keys a part &${head}, and no signature names it`);
    const fragment = { id: `${key}/${head}`, text, association: (entry?.association ?? []) as readonly WeightedPoint[] };
    const problems = fragmentProblems(fragment);
    if (problems.length) throw new Error(`examples/${key}.md, part &${head}: ${problems.join('; ')}`);
    return fragment;
  });
});

/** Every seed fragment, a template's sets of arguments each a fragment of its own, folder by folder (`FOLDERS`), then the parts the examples give (`PARTS`). */
export const LIBRARY: readonly Fragment[] = [...FOLDERS.flatMap((folder) => seedFragments(folder)), ...PARTS];

/** The library's fragments of a facet, read off their points (decision 046), wherever they are kept: a folder or a document. */
export const ofFacet = (facet: string): Fragment[] => LIBRARY.filter((f) => f.association.some((p) => p.facet === facet));

/** A part's id: its document's key, a slash, its head (`kinderlied/twinkle`); a template's arguments may hold a slash of their own (`meter(grouping=meter("2/2"))`). */
const PART_ID = /^[^(/]+\/[^(]+$/;

/** The id a `from` line writes for a fragment: a part's document (`kinderlied/twinkle` → `kinderlied`), any other's own. */
export const fromId = (id: string): string => (PART_ID.test(id) ? id.slice(0, id.indexOf('/')) : id);
/** The head a line takes a fragment by, where it is named for it: a part's head (`kinderlied/twinkle` → `twinkle`), a seed motif's id. */
export const headOf = (id: string): string => (PART_ID.test(id) ? id.slice(id.indexOf('/') + 1) : id);

/** How a document plays one of its parts (#692): the fragment it takes over it, and each named argument, a part of the same document by its id. */
export interface PartUse {
  readonly id: string;
  readonly args: Readonly<Record<string, string>>;
}

/**
 * How a part's own document plays it (#692; the owner, 2026-11-11: "tunes own form beats the style"): each line of the
 * document that takes a fragment with the part's head as its main argument, its arguments that name another of the
 * document's parts (`&wonder`) written as that part's id (`kinderlied/wonder`), any other as written. For
 * `kinderlied/twinkle`, `[{ id: 'ternary', args: { answer: 'kinderlied/wonder' } }]`: the form a frontend plays the
 * tune in, over the style's. None for a fragment that isn't a part, or a part its document takes nothing over.
 */
export function usesOf(id: string): readonly PartUse[] {
  if (!PART_ID.test(id)) return [];
  const key = fromId(id);
  const source = (EXAMPLES as Readonly<Record<string, { readonly source: string } | undefined>>)[key]?.source;
  if (source === undefined) return [];
  const part = (value: string) => {
    const name = /^&(\w+)$/.exec(value)?.[1];
    const other = name === undefined ? undefined : `${key}/${name}`;
    return other !== undefined && PARTS.some((f) => f.id === other) ? other : value;
  };
  return usesIn(source, headOf(id)).map((u) => ({ id: u.id, args: Object.fromEntries(Object.entries(u.args).map(([k, v]) => [k, part(v)])) }));
}

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
/**
 * The examples by their keys (decision 082): a piece is a document, so a line takes a part it gives by its key
 * (`&twinkle from kinderlied &key`). One namespace: no example's key is a fragment's id (`namespace.test.ts`).
 */
const PIECES = Object.entries(EXAMPLES).map(([key, e]): [string, string] => [key, e.source]);
const BY_ID = new Map([...PIECES, ...CURRENT, ...RENAMED, ...RETIRED]);

/**
 * The seed library as a `from` line's resolver (decision 054): a fragment's text by its id, an example's by its key
 * (decision 082), a retired id's forwarding
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
