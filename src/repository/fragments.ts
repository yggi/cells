/**
 * The repository of fragments (decision 041): a fragment is cells text with an index entry, an id, the facet it belongs to
 * and an association, the places in style space it is found at. A query takes a style point and k and returns the k
 * fragments nearest to it, of the facet it names. Fragments come in groups (decision 043): the repository counts how often
 * two were used together, and a query weighs that count with what is already chosen beside the distance (decision 046).
 * In memory only: no hash, no canonical form, no persistence (#49's later steps).
 *
 * The repository doesn't know the axes, nor the facets. A style point maps axis names to numbers, and the frontend names
 * them (Jambot's `sync`, `harm`, …): a distance compares only the axes a query and a point share, so an axis no fragment
 * has is ignored. A facet is a name too (`meter`, `rhythm`), compared and never read.
 */

/** A place in style space: axis names to numbers. */
export type StylePoint = Readonly<Record<string, number>>;

/** One place a fragment is associated with, and how strongly: a weight > 0 (use moves it, later). */
export interface WeightedPoint {
  readonly point: StylePoint;
  readonly weight: number;
}

/** A fragment: cells text and its index entry. */
export interface Fragment {
  /** Names it in the repository: unique, never empty. */
  readonly id: string;
  /** The cells text, never empty. */
  readonly text: string;
  /** The places in style space it is found at, one or more. */
  readonly association: readonly WeightedPoint[];
  /** The kind of part it is, which a query names to find only those (`meter`, `rhythm`); with none, only a query that names no facet finds it. */
  readonly facet?: string;
}

/** A fragment a query found, how far it is from the query's point, and the score it was ranked by. */
export interface Found {
  readonly fragment: Fragment;
  /** Its distance from the query's point (`fragmentDistance`): the style alone. */
  readonly distance: number;
  /** What it is ranked by: the distance less the pull of its uses with what is already chosen (`coUseScore`); the distance when it has none. */
  readonly score: number;
}

/** What a query may say beside its point: the facet it asks for, and the fragments already chosen. */
export interface QueryOptions {
  /** Only fragments of this facet; every fragment where it says none. */
  readonly facet?: string;
  /** The ids already chosen (on the composer's workbench): a fragment used with them often ranks nearer. An id the repository doesn't hold counts no use. */
  readonly chosen?: readonly string[];
}

export interface Repository {
  readonly fragments: readonly Fragment[];
  /**
   * The k fragments of the facet asked for that rank first, by score (`coUseScore`), then by id; each with its distance
   * (`fragmentDistance`) and its score, which is the distance when nothing is chosen. A fragment that shares no axis with
   * the point is infinitely far, and comes last. `axisWeights` weighs the axes against each other (1 where it says
   * nothing): the frontend knows that its tempo is not on the scale of its other axes.
   */
  query(point: StylePoint, k: number, axisWeights?: StylePoint, options?: QueryOptions): Found[];
  /** Records that these fragments were used together: the count of every pair among them goes up by one (an id given twice counts once). Throws on an id it doesn't hold. */
  used(ids: readonly string[]): void;
  /** How often two fragments were used together (0 for a fragment with itself). */
  usedTogether(a: string, b: string): number;
}

/**
 * How far the uses of a fragment with what is already chosen pull it nearer: λ in `coUseScore`, in units of distance per
 * e-fold of uses. At 0.1, fewer than 10 uses (λ·ln 10 ≈ 0.23) never reverse two fragments 0.3 apart, Jambot's miss
 * distance, and the 20th does (λ·ln 21 ≈ 0.304): the style leads, and the groups a jam keeps reorder what is near it.
 */
export const CO_USE_PULL = 0.1;

/**
 * A fragment's score: its distance less λ·ln(1 + n), n its uses with the fragments already chosen, summed over them
 * (decision 046). The logarithm makes each doubling of uses pull the same, so a pair used often doesn't lock the query
 * onto it; the sum is taken before it, so how many fragments are chosen doesn't change what a count can do.
 */
export const coUseScore = (distance: number, uses: number): number => distance - CO_USE_PULL * Math.log1p(uses);

const isFiniteNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** What is wrong with a style point: no axes, or an axis whose value isn't a finite number. */
function pointProblems(point: unknown, where: string): string[] {
  if (typeof point !== 'object' || point === null) return [`${where}: not a style point`];
  const axes = Object.entries(point);
  if (!axes.length) return [`${where}: an empty point (no axes)`];
  return axes.flatMap(([axis, value]) => (isFiniteNumber(value) ? [] : [`${where}: ${axis} is ${String(value)}, not a number`]));
}

/** What is wrong with an index entry, each problem a sentence; none for a well-formed one. */
export function fragmentProblems(entry: Fragment): string[] {
  const problems: string[] = [];
  const { id, text, association } = entry as Partial<Record<keyof Fragment, unknown>>;
  if (typeof id !== 'string' || !id.trim()) problems.push('no id');
  const name = typeof id === 'string' && id.trim() ? id : '(no id)';
  if (typeof text !== 'string' || !text.trim()) problems.push(`${name}: no text`);
  const { facet } = entry as { facet?: unknown };
  if (facet !== undefined && (typeof facet !== 'string' || !facet.trim())) problems.push(`${name}: facet ${String(facet)}, not a name`);
  if (!Array.isArray(association) || !association.length) problems.push(`${name}: no style point in its association`);
  else
    association.forEach((wp: Partial<WeightedPoint> | null, i) => {
      const where = `${name}: point ${i + 1}`;
      if (!wp || !isFiniteNumber(wp.weight) || wp.weight <= 0) problems.push(`${where}: weight ${String(wp?.weight)}, not a number > 0`);
      problems.push(...pointProblems(wp?.point, where));
    });
  return problems;
}

/**
 * How far apart two points are, over the axes both have: the root of the weighted mean of the squared differences, so
 * that sharing more axes doesn't make a point farther. Infinite when they share none.
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

/** How far a fragment is from a point: the nearest of its association's points, each distance divided by that point's weight. */
export function fragmentDistance(fragment: Fragment, point: StylePoint, axisWeights: StylePoint = {}): number {
  return Math.min(...fragment.association.map((wp) => pointDistance(wp.point, point, axisWeights) / wp.weight));
}

/** A repository of these fragments; it throws on a malformed entry or an id given twice, naming each problem. */
export function createRepository(entries: readonly Fragment[]): Repository {
  const problems = entries.flatMap(fragmentProblems);
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) problems.push(`${id}: the id is given twice`);
    seen.add(id);
  }
  if (problems.length) throw new Error(`A malformed repository: ${problems.join('; ')}`);
  const fragments = [...entries];
  // How often each pair was used together, both ways round: id → id → count.
  const together = new Map<string, Map<string, number>>(fragments.map((f) => [f.id, new Map()]));
  const usesWith = (id: string, chosen: readonly string[]) => {
    const counts = together.get(id)!;
    let n = 0;
    for (const other of chosen) n += counts.get(other) ?? 0;
    return n;
  };
  return {
    fragments,
    query(point, k, axisWeights = {}, { facet, chosen = [] } = {}) {
      if (!(Number.isInteger(k) && k >= 0)) throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
      const wrong = [
        ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
        ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
      ];
      if (wrong.length) throw new Error(`query: ${wrong.join(', ')}`);
      const chosenIds = [...new Set(chosen)];
      return fragments
        .filter((fragment) => facet === undefined || fragment.facet === facet)
        .map((fragment) => {
          const distance = fragmentDistance(fragment, point, axisWeights);
          return { fragment, distance, score: coUseScore(distance, usesWith(fragment.id, chosenIds)) };
        })
        .sort((a, b) => a.score - b.score || (a.fragment.id < b.fragment.id ? -1 : a.fragment.id > b.fragment.id ? 1 : 0))
        .slice(0, k);
    },
    used(ids) {
      const unknown = ids.filter((id) => !together.has(id));
      if (unknown.length) throw new Error(`used: no fragment ${unknown.map((id) => `'${id}'`).join(', ')}`);
      const distinct = [...new Set(ids)];
      for (const a of distinct)
        for (const b of distinct) {
          if (a === b) continue;
          const counts = together.get(a)!;
          counts.set(b, (counts.get(b) ?? 0) + 1);
        }
    },
    usedTogether(a, b) {
      return a === b ? 0 : (together.get(a)?.get(b) ?? 0);
    },
  };
}
