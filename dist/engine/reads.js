const isRef = (x) => {
    const v = x;
    return !!v && typeof v === 'object' && typeof v.name === 'string' && typeof v.span?.line === 'number' && !('braid' in v) && !('units' in v);
};
const isRefAtom = (x) => {
    const v = x;
    return !!v && typeof v === 'object' && v.kind === 'ref' && typeof v.name === 'string';
};
const spanOf = (x) => {
    const s = x?.span;
    return s && typeof s.line === 'number' ? s : undefined;
};
export const formOf = (path) => path
    .split('.')
    .filter((k) => !/^\d+$/.test(k))
    .slice(0, 2)
    .join('.');
export function readsOf(decl) {
    const out = [];
    const seen = new Set();
    const walk = (x, path, span) => {
        if (!x || typeof x !== 'object' || seen.has(x))
            return;
        seen.add(x);
        const joined = path.join('.');
        if (isRef(x)) {
            out.push({ name: x.name, path: joined, form: formOf(joined), ref: x, span: x.span });
            return;
        }
        if (isRefAtom(x)) {
            out.push({ name: x.name, path: joined, form: formOf(joined), ref: x, span });
            return;
        }
        const here = spanOf(x) ?? span;
        for (const [k, v] of Object.entries(x))
            if (k !== 'span' && k !== 'paramSpans')
                walk(v, [...path, k], here);
    };
    walk(decl, [], decl.span);
    return out;
}
