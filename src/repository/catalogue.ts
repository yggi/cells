/**
 * The catalogue (yggi/cell-studio#621, rung C1, #638): one read of the library for a frontend that shows it, an entry for
 * each fragment file, the seed library's first (in path order), then a learned layer's filed ones (decision 048). Each
 * entry says what a frontend draws and lists a fragment by: its facets, its signature, what it takes, where it is found
 * in style space (its own points, then the points use added, decision 048), its prose and metadata, and the ids a query
 * answers with (a template's sets of arguments, `variantsOf`). Its holes need a compile, so each entry computes them on
 * first read and keeps them (120 compiles cost about 0.2 s, more than a frontend should pay to open its library).
 * A facet is read off the association, never off a folder (decision 046). Pure.
 */
import { compileSource } from '../engine/compile';
import { references } from '../engine/references';
import type { FromForm } from '../engine/parser/use';
import { signatureOf } from '../engine/use';
import type { FragmentFile, Meta } from './files';
import { EMPTY_LAYER, type LearnedLayer, type WeightedPoint } from './fragments';
import { holesOf, type Holes } from './holes';
import { resolverOf } from './library';
import { SEED } from './seed';
import { argsOf, variantsOf } from './variants';

/** One fragment file, as a frontend lists it. */
export interface CatalogueEntry {
  /** Its id, unique in the catalogue. */
  readonly id: string;
  /** Where it is in the seed library (`bass/01-root-bass`), or null for one a layer filed. */
  readonly path: string | null;
  /** Who made it: its metadata's `source` (`seed`, a person's name, `muse`, `composer`), or null where it says none. */
  readonly source: string | null;
  /** The facets its points name, each once, in the order they first appear. */
  readonly facets: readonly string[];
  /** Its points: the file's own (a template's with their arguments), then those use added in the layer. */
  readonly association: readonly WeightedPoint[];
  /** The ids a query answers with: its own, or a template's sets of arguments taken (`diatonic(mode=aeolian)`). */
  readonly variants: readonly string[];
  /** Its cells text, as the file holds it. */
  readonly text: string;
  /** Its signature (decision 065): heads, optional parameters, main one; null for a collection. */
  readonly signature: Extract<FromForm, { kind: 'signature' }> | null;
  /** The ids it takes from (its own `from` lines, `references`), each once. */
  readonly takes: readonly string[];
  /** The Markdown after its cells, and its metadata: every frontmatter key but the entry's. */
  readonly prose: string;
  readonly meta: Meta;
  /** Its holes (`holesOf`): what it reads and doesn't define, what it defines, what its clock needs. Compiled on first read. */
  readonly holes: Holes;
}

function entryOf(file: FragmentFile, path: string | null, layer: LearnedLayer, resolve: ReturnType<typeof resolverOf>): CatalogueEntry {
  const { fragment, meta, prose } = file;
  const variants = variantsOf(fragment).map((v) => v.id);
  // (a point use added names the fragment or one of its variants: kept with that variant's arguments, as the file writes its own)
  const learned = layer.points.flatMap(({ id, point, weight, facet }): WeightedPoint[] => {
    if (id !== fragment.id && !variants.includes(id)) return [];
    const args = id === fragment.id ? undefined : argsOf(fragment, id);
    return [{ point, weight, ...(facet !== undefined ? { facet } : {}), ...(args ? { args } : {}) }];
  });
  const association = [...fragment.association, ...learned];
  let holes: Holes | undefined;
  return {
    id: fragment.id,
    path,
    source: typeof meta.source === 'string' ? meta.source : null,
    facets: [...new Set(association.flatMap((wp) => (wp.facet === undefined ? [] : [wp.facet])))],
    association,
    variants,
    text: fragment.text,
    signature: signatureOf(fragment.text),
    takes: [...new Set(references(fragment.text).map((r) => r.id))].filter((id) => id !== fragment.id),
    prose,
    meta,
    get holes() {
      holes ??= holesOf(fragment.text, (t) => compileSource(t, undefined, { resolve }), resolve);
      return holes;
    },
  };
}

const SEEDED = new WeakMap<LearnedLayer, readonly CatalogueEntry[]>();

/**
 * The library as a frontend lists it: the seed's files in path order, then the layer's filed ones, each an entry. The
 * same layer gives the same entries (kept, so their holes are compiled once); a layer is never changed.
 */
export function catalogue(layer: LearnedLayer = EMPTY_LAYER): readonly CatalogueEntry[] {
  const kept = SEEDED.get(layer);
  if (kept) return kept;
  const resolve = resolverOf(layer);
  const entries = Object.freeze([...SEED.map((f) => entryOf(f, f.path, layer, resolve)), ...layer.filed.map((f) => entryOf(f, null, layer, resolve))]);
  SEEDED.set(layer, entries);
  return entries;
}
