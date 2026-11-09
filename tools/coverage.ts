/**
 * What each style finds, facet by facet: the repository's coverage of the library of styles (#540), and a probe for
 * where a fragment should be placed before its points are written (#371) or for a change to how a query measures
 * (#644). A measurement; it decides no language.
 *
 *   npm run coverage -- [--facet <f>[,<f>…]] [--k <n>] [--styles <id>[,<id>…]] [--between]
 *                       [--place <placement.json>] [--distance today|window|hinge|whole] [--json]
 *
 * With no `--facet`, one row per style and one column per facet: the distance of the first fragment found, `=` after it
 * where the second ties it (a tie is broken by id, so the first is the id's, not the style's). With `--facet`, one row
 * per style and facet: its `--k` first fragments (3 by default), each with its distance.
 *
 * - `--styles` keeps those styles of `styles` (by id); `--between` adds the point halfway between each pair of them,
 *   where Jambot's radio drifts (#540).
 * - `--place` reads a JSON object of fragment ids, each to an array of points that replace that fragment's points of
 *   the facet each names (or of every facet, where a point names none): `{ "AABA": [{ "point": { "harm": 0.75 },
 *   "weight": 1, "facet": "form", "reach": { "harm": 0.1 } }] }`. A point's weight is 1 where it says none.
 * - `--distance` is how a fragment's point is measured from a style (`distanceOf`):
 *   - `today`, the repository's (`pointDistance`): over the axes both name, a missing axis dropped from the mean;
 *   - `window`, #644 as filed: each axis's distance measured from the edge of the point's reach (0 inside it), a missing
 *     axis still dropped, so with no reach written every query returns what it does today;
 *   - `hinge`, a softer window: inside the reach the distance grows at a quarter of its slope outside (`HINGE`), so two
 *     points that both reach a style are told apart by how near their centres are; a missing axis dropped, as `window`;
 *   - `whole`, #436's reading of a missing axis: a reach of the whole axis, so 0 there, but counted in the mean over the
 *     style's axes; a point that names every axis and no reach is measured as today.
 *
 * Ranks by distance, then by id, as a query with nothing chosen and no layer does (`createRepository`'s `query`); the
 * test holds `today` to the query itself. Co-use and a learned layer are a query's, and out of this tool's reach.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { byId, createRepository, pointDistance, type Fragment, type StylePoint } from '../src/repository/fragments';
import { LIBRARY } from '../src/repository/library';
import { STYLES, type Style } from '../src/repository/styles';

/** A point a probe places: a fragment's point, its weight, its facet, and the reach of each axis it names (0 where it says none). */
export interface Placed {
  readonly point: StylePoint;
  readonly weight?: number;
  readonly facet?: string;
  readonly reach?: StylePoint;
}

/** A point as the probe measures it: its weight and reach stated. */
interface ProbedPoint extends Placed {
  readonly weight: number;
  readonly reach: StylePoint;
}

/** A fragment as the probe measures it: its points, each perhaps with a reach. */
export interface Probed {
  readonly id: string;
  readonly points: readonly ProbedPoint[];
}

/** How a fragment's point is measured from a style: the module's header says each. */
export type DistanceMode = 'today' | 'window' | 'hinge' | 'whole';
export const DISTANCE_MODES: readonly DistanceMode[] = ['today', 'window', 'hinge', 'whole'];

/** A hinge's slope inside a reach: a quarter of the slope outside it, so the centre still ranks first among points that reach a style. */
export const HINGE = 0.25;

/** How far a fragment's point is from a style's, by the mode, before its weight. Infinite when they share no axis (`today`, `window`). */
export function distanceOf(at: Placed, style: StylePoint, mode: DistanceMode): number {
  if (mode === 'today') return pointDistance(at.point, style);
  let sum = 0;
  let axes = 0;
  for (const axis of Object.keys(style)) {
    const named = Object.hasOwn(at.point, axis);
    if (!named && mode !== 'whole') continue;
    axes += 1;
    if (!named) continue;
    const off = Math.abs(at.point[axis]! - style[axis]!);
    const reach = at.reach?.[axis] ?? 0;
    const d = Math.max(0, off - reach) + (mode === 'hinge' ? HINGE * Math.min(off, reach) : 0);
    sum += d * d;
  }
  return axes > 0 ? Math.sqrt(sum / axes) : Infinity;
}

/** The library as the repository holds it (a template's variants expanded), each fragment's points replaced where the placement names it. */
export function probed(placement: Readonly<Record<string, readonly Placed[]>> = {}, fragments: readonly Fragment[] = LIBRARY): Probed[] {
  const held = createRepository(fragments).fragments;
  const unknown = Object.keys(placement).filter((id) => !held.some((f) => f.id === id));
  if (unknown.length) throw new Error(`--place names no fragment of the library: ${unknown.join(', ')}`);
  return held.map((f) => {
    const placed = placement[f.id];
    const own = f.association.map((wp) => ({ point: wp.point, weight: wp.weight, reach: {}, ...(wp.facet === undefined ? {} : { facet: wp.facet }) }));
    if (!placed) return { id: f.id, points: own };
    const facets = new Set(placed.map((p) => p.facet));
    const kept = own.filter((p) => !facets.has(undefined) && !facets.has(p.facet));
    const fresh = placed.map((p) => ({ point: p.point, weight: p.weight ?? 1, reach: p.reach ?? {}, ...(p.facet === undefined ? {} : { facet: p.facet }) }));
    return { id: f.id, points: [...kept, ...fresh] };
  });
}

/** One fragment found at a style, and how far. */
export interface Hit {
  readonly id: string;
  readonly distance: number;
}

/** The fragments of a facet ranked at a point: distance (the nearest of its points of the facet, over its weight), then id. */
export function rank(library: readonly Probed[], at: StylePoint, facet: string, mode: DistanceMode = 'today'): Hit[] {
  return library
    .map((f) => ({ id: f.id, points: f.points.filter((p) => p.facet === undefined || p.facet === facet) }))
    .filter((f) => f.points.length > 0)
    .map((f) => ({ id: f.id, distance: Math.min(...f.points.map((p) => distanceOf(p, at, mode) / p.weight)) }))
    .sort((a, b) => a.distance - b.distance || byId(a.id, b.id));
}

/** Every facet a point of the library names, in the order of its first point. */
export const facetsOf = (library: readonly Probed[]): string[] => [...new Set(library.flatMap((f) => f.points.flatMap((p) => (p.facet ? [p.facet] : []))))];

/** A place a row is measured at: a style, or the point halfway between two. */
export interface Place {
  readonly name: string;
  readonly point: StylePoint;
}

/** The styles kept (all, where `ids` is empty), and with `between` the point halfway between each pair of them. */
export function placesOf(ids: readonly string[] = [], between = false, styles: readonly Style[] = STYLES): Place[] {
  const unknown = ids.filter((id) => !styles.some((s) => s.id === id));
  if (unknown.length) throw new Error(`--styles names no style of styles: ${unknown.join(', ')}`);
  const kept = ids.length ? styles.filter((s) => ids.includes(s.id)) : styles;
  const places: Place[] = kept.map((s) => ({ name: s.name, point: s.point }));
  if (between)
    kept.forEach((a, i) =>
      kept.slice(i + 1).forEach((b) => {
        const point = Object.fromEntries(
          Object.keys(a.point)
            .filter((x) => Object.hasOwn(b.point, x))
            .map((x) => [x, (a.point[x]! + b.point[x]!) / 2]),
        );
        places.push({ name: `${a.name} | ${b.name}`, point });
      }),
    );
  return places;
}

/** The first `k` fragments of each facet at each place. */
export function coverage(library: readonly Probed[], places: readonly Place[], facets: readonly string[], k: number, mode: DistanceMode) {
  return places.map((place) => ({ place: place.name, found: Object.fromEntries(facets.map((facet) => [facet, rank(library, place.point, facet, mode).slice(0, k)])) }));
}

const fixed = (d: number) => (Number.isFinite(d) ? d.toFixed(3) : '∞');

/** The table with a column per facet: the first's distance, `=` where the second ties it, `–` where the facet has none. */
export function facetTable(rows: ReturnType<typeof coverage>, facets: readonly string[]): string {
  const width = Math.max(...rows.map((r) => r.place.length), 5);
  const head = `${'style'.padEnd(width)} ${facets.map((f) => f.padStart(10)).join(' ')}`;
  const cell = (hits: readonly Hit[]) => (hits.length === 0 ? '–' : `${fixed(hits[0]!.distance)}${hits[1] && hits[1].distance === hits[0]!.distance ? '=' : ' '}`);
  return [head, ...rows.map((r) => `${r.place.padEnd(width)} ${facets.map((f) => cell(r.found[f]!).padStart(10)).join(' ')}`)].join('\n');
}

/** The table with a row per place and facet: its first fragments, each with its distance. */
export function hitTable(rows: ReturnType<typeof coverage>, facets: readonly string[]): string {
  const width = Math.max(...rows.map((r) => r.place.length), 5);
  return rows.flatMap((r) => facets.map((f) => `${r.place.padEnd(width)} ${f.padEnd(10)} ${r.found[f]!.map((h) => `${h.id} ${fixed(h.distance)}`).join(' | ')}`)).join('\n');
}

/** The value after a flag, or undefined. */
const valueOf = (args: readonly string[], flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const mode = (valueOf(args, '--distance') ?? 'today') as DistanceMode;
  if (!DISTANCE_MODES.includes(mode)) throw new Error(`--distance is ${mode}: one of ${DISTANCE_MODES.join(', ')}`);
  const placePath = valueOf(args, '--place');
  const library = probed(placePath ? (JSON.parse(readFileSync(placePath, 'utf8')) as Record<string, Placed[]>) : {});
  const asked = valueOf(args, '--facet')?.split(',');
  const facets = asked ?? facetsOf(library).filter((f) => f !== 'style');
  // (the table reads the second, to mark a tie)
  const k = Number(valueOf(args, '--k') ?? (asked ? 3 : 2));
  const rows = coverage(library, placesOf(valueOf(args, '--styles')?.split(','), args.includes('--between')), facets, k, mode);
  if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else console.log(asked ? hitTable(rows, facets) : facetTable(rows, facets));
}
