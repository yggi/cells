import { compileSource } from "../engine/compile.js";
import { references } from "../engine/references.js";
import { signatureOf } from "../engine/use.js";
import { EMPTY_LAYER } from "./fragments.js";
import { holesOf } from "./holes.js";
import { PARTS, resolverOf } from "./library.js";
import { SEED } from "./seed.js";
import { argsOf, variantsOf } from "./variants.js";
function entryOf(file, path, layer, resolve) {
    const { fragment, meta, prose } = file;
    const variants = variantsOf(fragment).map((v) => v.id);
    const learned = layer.points.flatMap(({ id, point, weight, facet }) => {
        if (id !== fragment.id && !variants.includes(id))
            return [];
        const args = id === fragment.id ? undefined : argsOf(fragment, id);
        return [{ point, weight, ...(facet !== undefined ? { facet } : {}), ...(args ? { args } : {}) }];
    });
    const association = [...fragment.association, ...learned];
    let holes;
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
const SEEDED = new WeakMap();
export function catalogue(layer = EMPTY_LAYER) {
    const kept = SEEDED.get(layer);
    if (kept)
        return kept;
    const resolve = resolverOf(layer);
    const parts = PARTS.map((f) => {
        const [document, head] = [f.id.slice(0, f.id.indexOf('/')), f.id.slice(f.id.indexOf('/') + 1)];
        return { ...entryOf({ fragment: f, meta: { source: 'seed' }, prose: '' }, `examples/${document}`, layer, resolve), part: { document, head } };
    });
    const entries = Object.freeze([...SEED.map((f) => entryOf(f, f.path, layer, resolve)), ...parts, ...layer.filed.map((f) => entryOf(f, null, layer, resolve))]);
    SEEDED.set(layer, entries);
    return entries;
}
