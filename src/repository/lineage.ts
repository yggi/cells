/**
 * A variation's origin and its lineage (decision 052, points 4 and 9): a filed variation records the fragment it varies
 * (`varies: <id>`) and what was done to it (`by: <operator> <line> [<amount> …]`), the frontmatter's two keys, and a
 * lineage is the chain of `varies` from a filing back to its root, a seed or a fragment filed as heard. `variationMeta`
 * writes the two keys a frontend files a variation with; `ancestry` reads the chain back, and `familyOf` the root's every
 * descendant the layer holds, so a frontend's ladder (Jambot's boredom, its rejection) treats a variation as its family's.
 * Only the learned layer's filings carry `varies`: a seed's chain ends at it. A chain that comes round to an id already
 * on it (a layer edited by hand) ends there. Pure.
 */
import type { Meta } from './files';
import type { LearnedLayer } from './fragments';

/** The frontmatter's keys for a variation's origin (decision 052, point 4). */
export const VARIES = 'varies';
export const BY = 'by';

/** The meta a variation is filed with: the fragment it varies and its `by:` (`variationMeta('funk_drums', v)`), to pass to `fileFragment` with the rest. */
export function variationMeta(varies: string, variation: { readonly by: string }): Meta {
  return { [VARIES]: varies, [BY]: variation.by };
}

/** The fragment a filing varies and how, from the layer: its `varies` and `by`, or null where it varies none (a seed, a fragment filed as heard). */
export function originOf(layer: LearnedLayer, id: string): { readonly varies: string; readonly by: string | null } | null {
  const meta = layer.filed.find((f) => f.fragment.id === id)?.meta;
  const varies = meta?.[VARIES];
  if (typeof varies !== 'string') return null;
  const by = meta?.[BY];
  return { varies, by: typeof by === 'string' ? by : null };
}

/**
 * A fragment's ancestry: its id, then the fragment it varies, and so on to its root, each with the `by:` that made the
 * one before it from it (none on the first). A seed, or a filing that varies none, is its own root: `[{ id }]`.
 */
export function ancestry(layer: LearnedLayer, id: string): readonly { readonly id: string; readonly by?: string }[] {
  const out: { id: string; by?: string }[] = [{ id }];
  const seen = new Set([id]);
  for (let at = originOf(layer, id); at && !seen.has(at.varies); at = originOf(layer, at.varies)) {
    seen.add(at.varies);
    const last = out[out.length - 1]!;
    out[out.length - 1] = at.by === null ? last : { ...last, by: at.by };
    out.push({ id: at.varies });
  }
  return out;
}

/** A fragment's root: the last of its ancestry, a seed or a filing that varies none. */
export const rootOf = (layer: LearnedLayer, id: string): string => ancestry(layer, id).at(-1)!.id;

/**
 * A fragment's family: its root first, then every filing of the layer whose root is that one, in the order filed. A
 * fragment the layer neither holds nor descends from is a family of one (Jambot's `familyOf`, in the language).
 */
export function familyOf(layer: LearnedLayer, id: string): readonly string[] {
  const root = rootOf(layer, id);
  const filed = layer.filed.map((f) => f.fragment.id).filter((other) => rootOf(layer, other) === root);
  const family = filed.includes(root) ? filed : [root, ...filed];
  return family.includes(id) ? family : [id];
}
