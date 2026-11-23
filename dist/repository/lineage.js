export const VARIES = 'varies';
export const BY = 'by';
export function variationMeta(varies, variation) {
    return { [VARIES]: varies, [BY]: variation.by };
}
export function originOf(layer, id) {
    const meta = layer.filed.find((f) => f.fragment.id === id)?.meta;
    const varies = meta?.[VARIES];
    if (typeof varies !== 'string')
        return null;
    const by = meta?.[BY];
    return { varies, by: typeof by === 'string' ? by : null };
}
export function ancestry(layer, id) {
    const out = [{ id }];
    const seen = new Set([id]);
    for (let at = originOf(layer, id); at && !seen.has(at.varies); at = originOf(layer, at.varies)) {
        seen.add(at.varies);
        const last = out[out.length - 1];
        out[out.length - 1] = at.by === null ? last : { ...last, by: at.by };
        out.push({ id: at.varies });
    }
    return out;
}
export const rootOf = (layer, id) => ancestry(layer, id).at(-1).id;
export function familyOf(layer, id) {
    const root = rootOf(layer, id);
    const filed = layer.filed.map((f) => f.fragment.id).filter((other) => rootOf(layer, other) === root);
    const family = filed.includes(root) ? filed : [root, ...filed];
    return family.includes(id) ? family : [id];
}
