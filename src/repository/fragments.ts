/**
 * The repository of fragments, its first step (decision 041): a fragment is cells text with an index entry, an id and an
 * association, the places in style space it is found at. A query takes a style point and k and returns the k fragments
 * nearest to it. In memory only: no hash, no canonical form, no persistence (#49's later steps).
 *
 * The repository doesn't know the axes. A style point maps axis names to numbers, and the frontend names them (Jambot's
 * `sync`, `harm`, …): a distance compares only the axes a query and a point share, so an axis no fragment has is ignored.
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
}

/** A fragment a query found, and how far it is from the query's point. */
export interface Found {
  readonly fragment: Fragment;
  readonly distance: number;
}

export interface Repository {
  readonly fragments: readonly Fragment[];
  /**
   * The k fragments nearest to a point, nearest first (ties by id), each with its distance (`fragmentDistance`). A
   * fragment that shares no axis with the point is infinitely far, and comes last. `axisWeights` weighs the axes
   * against each other (1 where it says nothing): the frontend knows that its tempo is not on the scale of its other axes.
   */
  query(point: StylePoint, k: number, axisWeights?: StylePoint): Found[];
}

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
  return {
    fragments,
    query(point, k, axisWeights = {}) {
      if (!(Number.isInteger(k) && k >= 0)) throw new Error(`query: k is ${k}, not a whole number ≥ 0`);
      const wrong = [
        ...Object.entries(point).flatMap(([axis, v]) => (isFiniteNumber(v) ? [] : [`${axis} is ${String(v)}`])),
        ...Object.entries(axisWeights).flatMap(([axis, w]) => (isFiniteNumber(w) && w > 0 ? [] : [`${axis}'s weight is ${String(w)}`])),
      ];
      if (wrong.length) throw new Error(`query: ${wrong.join(', ')}`);
      return fragments
        .map((fragment) => ({ fragment, distance: fragmentDistance(fragment, point, axisWeights) }))
        .sort((a, b) => a.distance - b.distance || (a.fragment.id < b.fragment.id ? -1 : a.fragment.id > b.fragment.id ? 1 : 0))
        .slice(0, k);
    },
  };
}
