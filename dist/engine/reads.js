const isRef = (x) => {
    const v = x;
    return !!v && typeof v === 'object' && typeof v.name === 'string' && typeof v.span?.line === 'number' && !('braid' in v) && !('units' in v);
};
export const formOf = (path) => path
    .split('.')
    .filter((k) => !/^\d+$/.test(k))
    .slice(0, 2)
    .join('.');
export function readsOf(decl) {
    const out = [];
    const seen = new Set();
    const walk = (x, path) => {
        if (!x || typeof x !== 'object' || seen.has(x))
            return;
        seen.add(x);
        if (isRef(x)) {
            out.push({ name: x.name, path: path.join('.'), form: formOf(path.join('.')) });
            return;
        }
        for (const [k, v] of Object.entries(x))
            if (k !== 'span' && k !== 'paramSpans')
                walk(v, [...path, k]);
    };
    walk(decl, []);
    return out;
}
