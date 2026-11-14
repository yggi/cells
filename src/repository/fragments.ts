/**
 * The repository of fragments (decision 041): a fragment is cells text with an index entry, an id and an association, the
 * places in style space it is found at, each of which may name the facet it is found under. A query takes a style point
 * and k and returns the k fragments nearest to it, over their points of the facet it names. Fragments come in groups
 * (decision 043): a query weighs how often two were used together with what is already chosen, beside the distance
 * (decision 046), as strongly as the frontend asks (`pull`); how well a group is known saturates, and what was used lately
 * is the frontend's workbench, not the repository's (#151).
 *
 * The repository is built from the seed library and keeps nothing a jam learns (decision 047, point 7; decision 048): a
 * query may be handed a learned layer (`LearnedLayer`: fragments the frontend filed, association points use added,
 * counts of use together), merged with the seed at that query and never stored, so a repository answers the same query
 * with the same layer alike, every time. What changes a layer (filing, use) is `learned.ts`, which returns a new one.
 *
 * The repository doesn't know the axes, nor the facets. A style point maps axis names to numbers, and the frontend names
 * them (Jambot's `sync`, `harm`, …): a distance compares only the axes a query and a point share, so an axis no fragment
 * has is ignored. A facet is a name too (`meter`, `rhythm`), compared and never read: a hint of what a fragment is
 * associated as there (a bell a rhythm in one style, a scale in another), not a classifier. What a fragment can fill is
 * read off its text by the fit (`fit.ts`, decision 047), never off its facets: a query given the workbench ranks only the
 * fragments that fit it.
 */
import { variantsOf } from './variants';
import { RENAMED_IDS } from '../engine/renamed';
import type { FragmentFile } from './files';
import { cachedFit } from './fit';
import type { Resolve } from '../engine/program';

/** A place in style space: axis names to numbers. */
export type StylePoint = Readonly<Record<string, number>>;

/** One place a fragment is associated with, and how strongly: a weight > 0 (use adds such places, `learned.ts`). */
export interface WeightedPoint {
  readonly point: StylePoint;
  readonly weight: number;
  /** The facet it is associated as here (`meter`, `rhythm`): a hint a query names. With none, the point counts for every facet. */
  readonly facet?: string;
  /**
   * A template's arguments at this point (`{ mode: 'aeolian' }`), in a seed file: the seed reads each set as a fragment of its
   * own, `diatonic(mode=aeolian)`, the template with them bound (`seed.ts`, #387). A fragment as a repository holds it has none.
   */
  readonly args?: Readonly<Record<string, string>>;
  /** How sure the point is on each axis it names, written `bite=.55 ± .1` (decision 089 §6): kept, read by no query yet (#644). */
  readonly reach?: StylePoint;
}

/** A fragment: cells text and its index entry. */
export interface Fragment {
  /** Names it in the repository: unique, never empty. */
  readonly id: string;
  /** The cells text, never empty. */
  readonly text: string;
  /** The places in style space it is found at, one or more. */
  readonly association: readonly WeightedPoint[];
}

/** A fragment a query found, how far it is from the query's point, and the score it was ranked by. */
export interface Found {
  readonly fragment: Fragment;
  /** Its distance from the query's point (`fragmentDistance`): the style alone. */
  readonly distance: number;
  /** What it is ranked by: the distance less the pull of its uses with what is already chosen (`coUseScore`); the distance when it has none. */
  readonly score: number;
}

/**
 * What a frontend has learned (decision 048): plain data, JSON as it stands, kept by the frontend (files, a database, a
 * store) and handed to each query. cells never stores it, and `learned.ts` returns a new one for each change.
 */
export interface LearnedLayer {
  /** Fragments the frontend filed (the composer's on a miss, the Muse's), each as a file reads and writes (`writeFragment`). Use moves their associations in place. */
  readonly filed: readonly FragmentFile[];
  /** Association points use added to fragments the layer doesn't hold itself (the seed's), each naming its fragment. */
  readonly points: readonly LearnedPoint[];
  /** How often two fragments were used together, each pair once. */
  readonly together: readonly UsedPair[];
}

/** An association point use added to a fragment the layer doesn't hold (a seed fragment): its id, and the point. */
export interface LearnedPoint extends WeightedPoint {
  readonly id: string;
}

/** How often two fragments were used together: their ids, in code-unit order, and the count, a whole number > 0. */
export interface UsedPair {
  readonly ids: readonly [string, string];
  readonly count: number;
}

/** A layer with nothing learned: a query handed it answers as one handed none. */
export const EMPTY_LAYER: LearnedLayer = Object.freeze({ filed: Object.freeze([]), points: Object.freeze([]), together: Object.freeze([]) });

/** The seed and a learned layer merged, as a query sees them. */
export interface Merged {
  /** The seed's fragments, then the filed ones, each with the points use added to it after its own. */
  readonly fragments: readonly Fragment[];
  /** The ids of the filed fragments. */
  readonly filed: ReadonlySet<string>;
  /** How often each pair was used together, both ways round: id → id → count. */
  readonly together: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Ids the layer names (a point, a pair) that neither the seed nor the layer holds, left out (a seed fragment a later release dropped). */
  readonly unheld: readonly string[];
}

/** What a query may say beside its point: the facet it asks for, the fragments already chosen, the workbench, the learned layer. */
export interface QueryOptions {
  /** Measure each fragment over its points of this facet and those that name none, and rank only fragments that have one; every point of every fragment where it says none. */
  readonly facet?: string;
  /** The ids already chosen (on the composer's workbench): a fragment used with them often ranks nearer. An id the repository doesn't hold counts no use. */
  readonly chosen?: readonly string[];
  /**
   * How strongly use together with what is chosen pulls (`coUseScore`), a number ≥ 0: `CO_USE_PULL` where it says none, 0
   * for none (a query that ranks as one with nothing chosen). The frontend sets it from where it is on its novelty ladder
   * (decision 043, point 5): strong to repeat and vary, weak or 0 to fetch nearby and far. cells knows no ladder.
   */
  readonly pull?: number;
  /**
   * The workbench, a cells text: rank only the fragments that fit it (`fitsAs`, #587: a template taken by a `from` line with
   * its main argument, a collection by its lines; their clock's needs met, compiled with no new diagnostic). Each fragment
   * is tested in the order it ranks, until k fit; the repository caches each compile by its text. Its `from` lines take from
   * the repository's own fragments.
   */
  readonly workbench?: string;
  /**
   * Each facet's main argument on the workbench, as a `from` line writes it (`{ bass: '&harm', motif: '&key', harmony:
   * '&key', mode: '&tonic' }`, #587): what a template of that facet is taken with. The query's facet names it; with none,
   * the first of the fragment's own facets that the map names. A template of a facet it doesn't name is taken with the one
   * cell that meets its main parameter, of what the workbench offers (`&harm, &key from`) or else all its cells, and fits
   * nowhere that several do (decision 075). No name of the workbench is read by convention.
   */
  readonly arguments?: Readonly<Record<string, string>>;
  /** What the frontend has learned, merged with the seed for this query only (`merge`); none, or `EMPTY_LAYER`, ranks the seed alone. */
  readonly layer?: LearnedLayer;
}

export interface Repository {
  /** The seed: the fragments it was built from. */
  readonly fragments: readonly Fragment[];
  /**
   * The k fragments that rank first, by score (`coUseScore`), then a filed fragment before a seed one, then by id; each
   * with its distance (`fragmentDistance`, over its points of the facet asked for) and its score, which is the distance
   * when nothing is chosen or the pull is 0. A fragment that shares no axis with the point is infinitely far, and comes
   * last. `axisWeights` weighs the axes against each other (1 where it says nothing): the frontend knows that its tempo is
   * not on the scale of its other axes. Throws on a malformed layer (`layerProblems`), or a pull that isn't a number ≥ 0.
   */
  query(point: StylePoint, k: number, axisWeights?: StylePoint, options?: QueryOptions): Found[];
  /** The seed and a layer merged, as a query sees them; throws on a malformed layer, or one that files a seed's id. */
  merge(layer: LearnedLayer): Merged;
}

/** The pull of use together a query has where it names none (`QueryOptions.pull`): λ in `coUseScore`. */
export const CO_USE_PULL = 0.1;

/** The count of uses together past which more add nothing: a group used together 10 times is known (#151). */
export const CO_USE_KNOWN = 10;

/**
 * How far a known group pulls, in units of the pull: 0.01 in distance at the default, half Jambot's hold distance, a
 * thirtieth of its miss distance (0.3). Over the lock-in measure's 256 runs (`lockin.ts`, `lockin.slow.test.ts`) use
 * together then adds 1.5 points to the rhythms' share among a run's 3 most used, on top of use moves' 2.5, 4.05 in all,
 * under the bound then, 5 points with twice its standard error (#162; since #533 the bound is relative, decision 048); at 0.2 the total is 5.1, at 0.05 3.4. Any pull adds some,
 * since among fragments that fit the style about as well a known group wins the tie, and stays (#151).
 */
export const CO_USE_REACH = 0.1;

/**
 * A fragment's score: its distance less pull · reach · ln(1 + min(n, known)) / ln(1 + known), n its uses with the
 * fragments already chosen, summed over them (decision 046, amended by #151). The logarithm makes each doubling of uses
 * pull the same, until the group is known; past that, more uses add nothing, so a group a long jam keeps never pulls past
 * `CO_USE_REACH` · pull and the style stays in charge. The sum is taken before it, so how many fragments are chosen
 * doesn't change what a count can do. With a pull of 0, or no uses, the score is the distance.
 */
export const coUseScore = (distance: number, uses: number, pull: number = CO_USE_PULL): number =>
  uses > 0 && pull > 0 ? distance - (pull * CO_USE_REACH * Math.log1p(Math.min(uses, CO_USE_KNOWN))) / Math.log1p(CO_USE_KNOWN) : distance;

const isFiniteNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** What is wrong with a style point: an axis whose value isn't a finite number. A point with no axes is no style (`ANY_DISTANCE`). */
function pointProblems(point: unknown, where: string): string[] {
  if (typeof point !== 'object' || point === null) return [`${where}: not a style point`];
  return Object.entries(point).flatMap(([axis, value]) => (isFiniteNumber(value) ? [] : [`${where}: ${axis} is ${String(value)}, not a number`]));
}

/** What is wrong with an index entry, each problem a sentence; none for a well-formed one. */
export function fragmentProblems(entry: Fragment): string[] {
  const problems: string[] = [];
  const { id, text, association } = entry as Partial<Record<keyof Fragment, unknown>>;
  if (typeof id !== 'string' || !id.trim()) problems.push('no id');
  const name = typeof id === 'string' && id.trim() ? id : '(no id)';
  if (typeof text !== 'string' || !text.trim()) problems.push(`${name}: no text`);
  if (!Array.isArray(association) || !association.length) problems.push(`${name}: no style point in its association`);
  else association.forEach((wp: Partial<WeightedPoint> | null, i) => problems.push(...weightedPointProblems(wp, `${name}: point ${i + 1}`)));
  return problems;
}

/** What is wrong with one weighted point: its weight, its facet, its point. */
function weightedPointProblems(wp: Partial<WeightedPoint> | null, where: string): string[] {
  const problems: string[] = [];
  if (!wp || !isFiniteNumber(wp.weight) || wp.weight <= 0) problems.push(`${where}: weight ${String(wp?.weight)}, not a number > 0`);
  const facet: unknown = wp?.facet;
  if (facet !== undefined && (typeof facet !== 'string' || !facet.trim())) problems.push(`${where}: facet ${String(facet)}, not a name`);
  problems.push(...pointProblems(wp?.point, where));
  return problems;
}

/** What is wrong with a learned layer's shape, each problem a sentence; none for a well-formed one. Which ids it may name is the seed's (`merge`). */
export function layerProblems(layer: LearnedLayer): string[] {
  const { filed, points, together } = layer as Partial<Record<keyof LearnedLayer, unknown>>;
  const problems: string[] = [];
  if (!Array.isArray(filed)) problems.push('the layer: filed is not a list');
  else {
    const seen = new Set<string>();
    filed.forEach((file: Partial<FragmentFile> | null, i) => {
      const where = `filed ${i + 1}`;
      if (!file?.fragment) return void problems.push(`${where}: no fragment`);
      problems.push(...fragmentProblems(file.fragment).map((p) => `${where}: ${p}`));
      if (typeof file.meta !== 'object' || file.meta === null || Array.isArray(file.meta)) problems.push(`${where}: its meta is not a map`);
      if (typeof file.prose !== 'string') problems.push(`${where}: its prose is not a string`);
      if (seen.has(file.fragment.id)) problems.push(`${where}: the id ${file.fragment.id} is filed twice`);
      seen.add(file.fragment.id);
    });
  }
  if (!Array.isArray(points)) problems.push('the layer: points is not a list');
  else
    points.forEach((lp: Partial<LearnedPoint> | null, i) => {
      const where = `learned point ${i + 1}`;
      if (typeof lp?.id !== 'string' || !lp.id.trim()) problems.push(`${where}: no id`);
      problems.push(...weightedPointProblems(lp, where));
    });
  if (!Array.isArray(together)) problems.push('the layer: together is not a list');
  else {
    const seen = new Set<string>();
    together.forEach((pair: Partial<UsedPair> | null, i) => {
      const where = `pair ${i + 1}`;
      const ids: unknown = pair?.ids;
      const [a, b] = Array.isArray(ids) ? (ids as unknown[]) : [];
      if (!Array.isArray(ids) || ids.length !== 2 || typeof a !== 'string' || typeof b !== 'string' || !a.trim() || !b.trim())
        return void problems.push(`${where}: its ids are not two names`);
      if (!(byId(a, b) < 0)) problems.push(`${where}: its ids ${a} and ${b} are not two, in order`);
      if (!(Number.isInteger(pair?.count) && pair!.count! > 0)) problems.push(`${where}: its count ${String(pair?.count)} is not a whole number > 0`);
      const key = JSON.stringify([a, b]);
      if (seen.has(key)) problems.push(`${where}: ${a} and ${b} are counted twice`);
      seen.add(key);
    });
  }
  return problems;
}

/**
 * How far apart two points are, over the axes both have: the root of the weighted mean of the squared differences, so
 * that sharing more axes doesn't make a point farther. Infinite when they share none. It is *the* distance between two
 * styles: a query's, `nearestStyle`'s, and a frontend's (a glow, a name for where a style is), so none keeps its own.
 */
export function pointDistance(a: StylePoint, b: StylePoint, axisWeights: StylePoint = {}): number {
  let sum = 0;
  let weights = 0;
  for (const axis of Object.keys(a)) {
    if (!Object.hasOwn(b, axis)) continue;
    const w = axisWeights[axis] ?? 1;
    sum += w * (a[axis]! - b[axis]!) ** 2;
    weights += w;
  }
  return weights > 0 ? Math.sqrt(sum / weights) : Infinity;
}

/** A fragment's association points a query of this facet measures: those of the facet and those that name none; all, for no facet. */
export const pointsOf = (fragment: Fragment, facet?: string): readonly WeightedPoint[] =>
  facet === undefined ? fragment.association : fragment.association.filter((wp) => wp.facet === undefined || wp.facet === facet);

/**
 * Where a fragment of no style is found (#540, the owner, 2026-11-13): an association with no point (a module, an
 * expression: `- facet: module`) is at this distance from every point, the farthest a placed point can be (each axis
 * spans 0 to 1, and a distance is their root mean square). So it ranks behind every fragment placed nearer and ahead of
 * none placed farther, at every style alike; its weight divides it as a point's does.
 */
export const ANY_DISTANCE = 1;

/** Whether a point is no style: it names no axis. */
export const isAnyStyle = (point: StylePoint): boolean => Object.keys(point).length === 0;

/**
 * How far a fragment is from a point: the nearest of its association's points (of the facet, where one is named), each
 * distance divided by that point's weight; a point of no style is `ANY_DISTANCE` away. Infinite when it has no point of
 * that facet.
 */
export function fragmentDistance(fragment: Fragment, point: StylePoint, axisWeights: StylePoint = {}, facet?: string): number {
  return Math.min(...pointsOf(fragment, facet).map((wp) => (isAnyStyle(wp.point) ? ANY_DISTANCE : pointDistance(wp.point, point, axisWeights)) / wp.weight));
}

/** The order of two ids, by code unit: how a layer writes a pair, and a query breaks a tie. */
/** A renamed seed id's old spelling (#387), so ties keep the order they had: a query answers as it did before the rename. */
// (a word renamed twice, `4/4` to `meter_4_4` to `meter` (#387, #507), breaks ties by its oldest id: the first)
const WAS = new Map([...RENAMED_IDS].reverse().map(([old, word]) => [word, old]));
const tieKey = (id: string) => WAS.get(id) ?? id;
export const byId = (a: string, b: string): number => {
  const [x, y] = [tieKey(a), tieKey(b)];
  return x < y ? -1 : x > y ? 1 : 0;
};

/** A fragment's variants (`variantsOf`), or none, with a problem, where its arguments don't bind (no signature, a parameter it lacks). */
function expanded(fragment: Fragment, problems: string[]): Fragment[] {
  try {
    return variantsOf(fragment);
  } catch (e) {
    problems.push(`${String(fragment?.id)}: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

/**
 * A repository of these fragments, the seed; it throws on a malformed entry or an id given twice, naming each problem. It
 * keeps nothing between calls but a cache of compiles by text (`cachedFit`), which changes no answer.
 */
export function createRepository(given: readonly Fragment[]): Repository {
  // (a template whose points carry its arguments is a fragment for each set, `diatonic(mode=aeolian)`: #387, B1)
  const problems: string[] = [];
  const entries = given.flatMap((f) => expanded(f, problems));
  problems.push(...entries.flatMap(fragmentProblems));
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) problems.push(`${id}: the id is given twice`);
    seen.add(id);
  }
  if (problems.length) throw new Error(`A malformed repository: ${problems.join('; ')}`);
  const seed = [...entries];
  // (the fragments as a from line takes them: each by its id, a template whose points carry its arguments by its own too)
  const resolverOf = (fragments: readonly Fragment[]): Resolve => {
    const byId = new Map([...given, ...fragments].map((f): [string, string] => [f.id, f.text]));
    return (id) => byId.get(id) ?? null;
  };
  const fits = cachedFit(resolverOf(seed));
  const alone: Merged = { fragments: seed, filed: new Set(), together: new Map(), unheld: [] };

  function merge(layer: LearnedLayer): Merged {
    const wrong = layerProblems(layer);
    for (const { fragment } of Array.isArray(layer.filed) ? layer.filed : []) if (seen.has(fragment?.id)) wrong.push(`the layer files ${fragment.id}, a seed fragment's id`);
    if (wrong.length) throw new Error(`A malformed learned layer: ${wrong.join('; ')}`);
    if (!layer.filed.length && !layer.points.length && !layer.together.length) return alone;
    // (a filed template whose points carry its arguments is a fragment for each set, as the seed's is)
    const filedFragments = layer.filed.flatMap((f) => expanded(f.fragment, wrong));
    for (const { id } of filedFragments) if (seen.has(id) && !layer.filed.some((f) => f.fragment.id === id)) wrong.push(`the layer files ${id}, a seed fragment's id`);
    if (wrong.length) throw new Error(`A malformed learned layer: ${wrong.join('; ')}`);
    const filed = new Set(filedFragments.map((f) => f.id));
    const held = (id: string) => seen.has(id) || filed.has(id);
    const added = new Map<string, WeightedPoint[]>();
    const unheld = new Set<string>();
    for (const { id, point, weight, facet } of layer.points) {
      if (!held(id)) {
        unheld.add(id);
        continue;
      }
      const list = added.get(id) ?? [];
      list.push({ point, weight, ...(facet === undefined ? {} : { facet }) });
      added.set(id, list);
    }
    const withAdded = (f: Fragment): Fragment => {
      const more = added.get(f.id);
      return more ? { ...f, association: [...f.association, ...more] } : f;
    };
    const together = new Map<string, Map<string, number>>();
    const count = (a: string, b: string, n: number) => {
      const counts = together.get(a) ?? new Map<string, number>();
      counts.set(b, (counts.get(b) ?? 0) + n);
      together.set(a, counts);
    };
    for (const { ids, count: n } of layer.together) {
      const [a, b] = ids;
      for (const id of ids) if (!held(id)) unheld.add(id);
      if (!held(a) || !held(b)) continue;
      count(a, b, n);
      count(b, a, n);
    }
    return { fragments: [...seed.map(withAdded), ...filedFragments.map(withAdded)], filed, together, unheld: [...unheld].sort(byId) };
  }

  return {
    fragments: seed,
    merge,
    query(point, k, axisWeights = {}, { facet, chosen = [], workbench, layer, pull = CO_USE_PULL, arguments: mains = {} } = {}) {
      if (!(Number.isInteger(k) && k >= 0)) throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
      if (!(isFiniteNumber(pull) && pull >= 0)) throw new Error(`query: pull is ${String(pull)}, not a number ≥ 0`);
      const wrong = [
        ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
        ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
      ];
      if (wrong.length) throw new Error(`query: ${wrong.join(', ')}`);
      const { fragments, filed, together } = layer ? merge(layer) : alone;
      const chosenIds = [...new Set(chosen)];
      const usesWith = (id: string) => {
        const counts = together.get(id);
        let n = 0;
        if (counts) for (const other of chosenIds) n += counts.get(other) ?? 0;
        return n;
      };
      const ranked = fragments
        .filter((fragment) => pointsOf(fragment, facet).length > 0)
        .map((fragment) => {
          const distance = fragmentDistance(fragment, point, axisWeights, facet);
          return { fragment, distance, score: coUseScore(distance, usesWith(fragment.id), pull) };
        })
        .sort((a, b) => a.score - b.score || Number(filed.has(b.fragment.id)) - Number(filed.has(a.fragment.id)) || byId(a.fragment.id, b.fragment.id));
      if (workbench === undefined) return ranked.slice(0, k);
      // (a layer's filed fragments are the from lines' to take too: a fit of its own, for this query)
      const fit = layer && fragments !== seed ? cachedFit(resolverOf([...fragments, ...layer.filed.map((f) => f.fragment)])) : fits;
      const mainOf = (f: Fragment): string | undefined => {
        if (facet !== undefined) return mains[facet];
        for (const wp of f.association) if (wp.facet !== undefined && mains[wp.facet] !== undefined) return mains[wp.facet];
        return undefined;
      };
      const fitting: Found[] = [];
      for (const found of ranked) {
        if (fitting.length >= k) break;
        if (fit(found.fragment.text, workbench, mainOf(found.fragment)).fits) fitting.push(found);
      }
      return fitting;
    },
  };
}
