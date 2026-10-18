/**
 * The learned layer, changed (decision 048; decision 043, points 1–2; decision 047, point 7): what a jam learns is the
 * frontend's, plain data it keeps and hands to each query (`LearnedLayer`, `fragments.ts`). Every function here takes a
 * layer and returns a new one, never changing the one it was given, so cells keeps no state between calls.
 *
 * - **Filing** (`fileFragment`): a fragment the composer made on a miss, or the Muse heard, gets an association of one
 *   point, at the query's point, of weight `FILING_WEIGHT`, with `source` and `created` set: a `FragmentFile`, which
 *   `writeFragment` writes as a file.
 * - **Identity, until the hash** (#46, #28): a filed text that is a held fragment's text after renaming (`sameText`: the
 *   two read alike once each one's own names are numbered in the order it declares them) adds to that fragment, as a
 *   use of it at the filing's point, instead of becoming a second.
 * - **Use** (`useFragments`): the fragments a frontend kept together have each pair's count raised by one (decision 046),
 *   and each moves its association at the point it was kept: the point that finds it there (its least distance over
 *   weight, of the facet kept) is raised by `USE_STEP`, to `USE_CAP` at most. A seed point is cells' and stays as written:
 *   the layer raises it by a point of its own at the same place, which the merge then finds first. A fragment with no
 *   point of that facet gets one at the use's place, of weight `FILING_WEIGHT`. So use never adds a place a fragment is
 *   found at (a point added where it was kept would drag it along a walking style, one section behind, and lock the
 *   composer onto it: in each of 8 runs of 1,250 sections, its 3 most used meters and rhythms held every section, against
 *   76 to 100 % with nothing learned, in `lockin.test.ts`'s first draft); it
 *   makes the places it has reach farther, by a quarter at most.
 */
import type { FragmentFile, Meta } from './files';
import { declarations } from './fit';
import { byId, fragmentProblems, pointDistance, pointsOf, type LearnedLayer, type Repository, type StylePoint, type UsedPair, type WeightedPoint } from './fragments';
import { INTERFACE_NAMES } from './holes';

/**
 * A filed fragment's weight at its point. A fragment is first at a query when its distance divided by its weight is the
 * least, so at 0.1 a filed fragment is first only within a tenth of its nearest rival's distance: where the composer
 * files, on a miss, nothing lies within 0.3 (Jambot's `MISS_DISTANCE`), so what it made holds the next 0.03 around its
 * point (two sections of the radio's walk at entropy 0.3, 0.014 a section), and use takes it farther; where a seed
 * fragment sits 0.05 away, a fragment the Muse filed is first only within 0.005 of where it was heard.
 */
export const FILING_WEIGHT = 0.1;

/** What a use adds to the weight of the point that found the fragment: a filing's weight, so a filed fragment kept at ten sections is as strong as a seed point. */
export const USE_STEP = 0.1;

/**
 * The most use can raise a point's weight to. A seed point weighs 1, so use shortens a seed fragment's distances by a
 * fifth at most (1/1.25), and moves its border with a fragment nothing used from halfway to five ninths of the way: a fragment
 * more than 1.25 times as far as one used is never found first. Over 10,000 sections of the walk at entropy 0.3
 * (`lockin.test.ts`), use moves add 2.5 points to the share of sections whose fragment is among its run's 3 most used
 * (meters) and 3.2 (rhythms), under the bound of 5; at 1.5 they add 7 and 8.5, at 1.1 none and 1. The step barely
 * matters (0.02 or 0.1, the same to a point): the cap decides.
 */
export const USE_CAP = 1.25;

/** A fragment to file: its text, where it was made or heard, and who and when. */
export interface Filing {
  readonly text: string;
  /** The query's point: where the composer missed, or where the Muse heard it. */
  readonly point: StylePoint;
  /** The facet it was made as (`meter`, `rhythm`), a hint on its point; none for every facet. */
  readonly facet?: string;
  /** Who filed it: `composer`, `muse`, a person's name. */
  readonly source: string;
  /** When, as the frontend writes a timestamp (cells has no clock): `2026-10-18T21:04:00Z`. */
  readonly created: string;
  /** Its id; by default `<source> <created>`, then ` 2`, ` 3` … while that is taken. A given id that is taken is an error. */
  readonly id?: string;
  /** More metadata (`tags`, `heard`, anything): kept after `source` and `created`. */
  readonly meta?: Meta;
  readonly prose?: string;
}

/** What filing did: the new layer, and the fragment the text is now held as. */
export interface Filed {
  readonly layer: LearnedLayer;
  /** The id it is held under: the new fragment's, or the held fragment's whose text it is. */
  readonly id: string;
  /** The file filed, as `writeFragment` writes it; null when the text was held already and the filing added to it. */
  readonly file: FragmentFile | null;
  /** Where it was held: its own names to the held fragment's (`&bd` → `&kick`), those that differ. Empty for a new one. */
  readonly renamed: ReadonlyMap<string, string>;
}

/** A fragment kept: its id, and where it was kept (the query's point and facet). A use with no point counts toward use together and moves nothing. */
export interface Use {
  readonly id: string;
  readonly point?: StylePoint;
  readonly facet?: string;
}

const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.replace(/^&/, '')));
const NAME = /&([A-Za-z_][A-Za-z0-9_]*)/g;

/** A text's own names, bare, in the order it declares them: those it defines but the interface names (`&bar`, `key`, `&harm`). */
const ownNames = (text: string): string[] => [...new Set(declarations(text).map((l) => l.name))].filter((name) => !INTERFACE.has(name));

/**
 * A text as identity reads it, until the hash: each declaration's code as the union reads it (`fit.ts`: comments aside,
 * whitespace collapsed, a line and those it continues onto as one), its own names numbered in the order it declares
 * them (`&#1`, `&#2`, no name a text can write), the interface names and the names it uses but doesn't define as
 * written. Two texts that read alike are one fragment, renamed.
 */
export function canonicalText(text: string): string {
  const index = new Map(ownNames(text).map((name, i) => [name, i + 1]));
  return declarations(text)
    .map((l) => l.code.replace(NAME, (written, name: string) => (index.has(name) ? `&#${index.get(name)}` : written)))
    .join('\n');
}

/** Whether text `a` is text `b` after renaming: then its own names to `b`'s, those that differ (`&bd` → `&kick`); else null. */
export function sameText(a: string, b: string): ReadonlyMap<string, string> | null {
  if (canonicalText(a) !== canonicalText(b)) return null;
  const bs = ownNames(b);
  return new Map(ownNames(a).flatMap((name, i) => (name === bs[i] ? [] : [[`&${name}`, `&${bs[i]}`] as const])));
}

/** How often two fragments were used together, in a layer (0 for a fragment with itself). */
export function usedTogether(layer: LearnedLayer, a: string, b: string): number {
  if (a === b) return 0;
  const [x, y] = byId(a, b) < 0 ? [a, b] : [b, a];
  return layer.together.find((p) => p.ids[0] === x && p.ids[1] === y)?.count ?? 0;
}

const rounded = (weight: number) => Math.round(weight * 1e9) / 1e9;

/**
 * A fragment's association moved by a use at a point (see the module's comment): the layer with the point that finds it
 * there (the least distance over weight, of the facet) raised by `USE_STEP`, to `USE_CAP` at most; the same layer when
 * that point is at the cap. A seed point is raised by a point of the layer's at its place, a filed fragment's in place.
 */
function movedAt(repository: Repository, layer: LearnedLayer, id: string, point: StylePoint, facet: string | undefined): LearnedLayer {
  // Every point of the fragment, where it lives: its own (the seed's, fixed; a filed one's, in the layer), then the layer's points for it.
  const file = layer.filed.find((f) => f.fragment.id === id);
  const own = file ? file.fragment.association : repository.fragments.find((f) => f.id === id)!.association;
  type Place = { readonly wp: WeightedPoint; readonly own?: number; readonly row?: number };
  const places: Place[] = own.map((wp, i) => ({ wp, own: i }));
  layer.points.forEach((lp, i) => {
    if (lp.id === id) places.push({ wp: lp, row: i });
  });
  const ofFacet = new Set(pointsOf({ id, text: '-', association: places.map((p) => p.wp) }, facet));
  let found: Place | undefined;
  let best = Infinity;
  // (the last of equals: a layer's point at a seed point's place, which it raised, before that seed point)
  for (const place of places) {
    const d = ofFacet.has(place.wp) ? pointDistance(place.wp.point, point) / place.wp.weight : Infinity;
    if (d <= best && d < Infinity) [found, best] = [place, d];
  }
  if (!found) return addedAt(layer, id, file, { point: { ...point }, weight: FILING_WEIGHT, ...(facet === undefined ? {} : { facet }) });
  const { wp } = found;
  if (wp.weight >= USE_CAP) return layer;
  const weight = rounded(Math.min(USE_CAP, wp.weight + USE_STEP));
  if (found.row !== undefined) return { ...layer, points: layer.points.map((lp, i) => (i === found.row ? { ...lp, weight } : lp)) };
  if (!file) return addedAt(layer, id, file, { ...wp, weight });
  const association = own.map((p, i) => (i === found.own ? { ...p, weight } : p));
  return { ...layer, filed: layer.filed.map((f) => (f === file ? { ...f, fragment: { ...f.fragment, association } } : f)) };
}

/** The layer with a point added to a fragment: to a filed one's own association, else as a point of the layer's naming it. */
function addedAt(layer: LearnedLayer, id: string, file: FragmentFile | undefined, wp: WeightedPoint): LearnedLayer {
  if (!file) return { ...layer, points: [...layer.points, { id, ...wp }] };
  const fragment = { ...file.fragment, association: [...file.fragment.association, wp] };
  return { ...layer, filed: layer.filed.map((f) => (f === file ? { ...f, fragment } : f)) };
}

/** The layer with the count of each pair among these ids raised by one (an id given twice counts once). */
function countedTogether(layer: LearnedLayer, ids: readonly string[]): LearnedLayer {
  const distinct = [...new Set(ids)].sort(byId);
  if (distinct.length < 2) return layer;
  const together: UsedPair[] = [...layer.together];
  const at = new Map(together.map((p, i) => [JSON.stringify(p.ids), i]));
  for (let i = 0; i < distinct.length; i++)
    for (let j = i + 1; j < distinct.length; j++) {
      const ids: readonly [string, string] = [distinct[i]!, distinct[j]!];
      const key = JSON.stringify(ids);
      const k = at.get(key);
      if (k === undefined) {
        at.set(key, together.length);
        together.push({ ids, count: 1 });
      } else together[k] = { ids, count: together[k]!.count + 1 };
    }
  return { ...layer, together };
}

/**
 * What using these fragments together teaches (see the module's comment): each pair's count raised by one, and each use
 * that names its point moving its fragment's association there. Throws on an id neither the seed nor the layer holds,
 * and returns a new layer, the one given unchanged.
 */
export function useFragments(repository: Repository, layer: LearnedLayer, uses: readonly Use[]): LearnedLayer {
  const held = new Set(repository.merge(layer).fragments.map((f) => f.id));
  const unknown = uses.filter((u) => !held.has(u.id)).map((u) => `'${u.id}'`);
  if (unknown.length) throw new Error(`useFragments: no fragment ${unknown.join(', ')}`);
  let next = countedTogether(
    layer,
    uses.map((u) => u.id),
  );
  for (const { id, point, facet } of uses) if (point) next = movedAt(repository, next, id, point, facet);
  return next;
}

/**
 * A fragment filed (see the module's comment): a new fragment of one point at the filing's point, weight
 * `FILING_WEIGHT`, its metadata `source`, `created` and the rest; or, where its text is a held fragment's after renaming,
 * a use of that fragment at the point. Throws on a filing that isn't one (no text, no source or created, a malformed
 * point, a taken id, metadata that names what the file writes itself).
 */
export function fileFragment(repository: Repository, layer: LearnedLayer, filing: Filing): Filed {
  const { text, point, facet, source, created, meta = {}, prose = '' } = filing;
  const problems: string[] = [];
  if (typeof source !== 'string' || !source.trim()) problems.push('no source');
  if (typeof created !== 'string' || !created.trim()) problems.push('no created');
  const clash = ['id', 'association', 'source', 'created'].filter((key) => Object.hasOwn(meta, key));
  if (clash.length) problems.push(`its meta names ${clash.join(', ')}, which filing writes itself`);
  const association: WeightedPoint[] = [{ point: { ...point }, weight: FILING_WEIGHT, ...(facet === undefined ? {} : { facet }) }];
  problems.push(...fragmentProblems({ id: filing.id ?? 'filed', text, association }));
  if (problems.length) throw new Error(`fileFragment: ${problems.join('; ')}`);

  const merged = repository.merge(layer);
  for (const held of merged.fragments) {
    const renamed = sameText(text, held.text);
    if (renamed) return { layer: movedAt(repository, layer, held.id, point, facet), id: held.id, file: null, renamed };
  }
  const taken = new Set([...merged.fragments.map((f) => f.id), ...merged.unheld]);
  if (filing.id !== undefined && taken.has(filing.id)) throw new Error(`fileFragment: the id ${filing.id} is taken`);
  let id = filing.id ?? `${source} ${created}`;
  for (let n = 2; taken.has(id); n++) id = `${source} ${created} ${n}`;
  const file: FragmentFile = { fragment: { id, text, association }, meta: { source, created, ...meta }, prose };
  return { layer: { ...layer, filed: [...layer.filed, file] }, id, file, renamed: new Map() };
}
