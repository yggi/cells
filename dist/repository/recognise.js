import { PITCHED_OPERATORS, readVariations, RHYTHM_OPERATORS } from "../engine/vary/index.js";
export const ALL_OPERATORS = [...RHYTHM_OPERATORS, ...PITCHED_OPERATORS];
const counted = (keys) => {
    const out = new Map();
    for (const k of keys)
        out.set(k, (out.get(k) ?? 0) + 1);
    return out;
};
function apart(a, b, sizeA, sizeB) {
    let shared = 0;
    for (const [k, n] of a)
        shared += Math.min(n, b.get(k) ?? 0);
    return sizeA + sizeB - 2 * shared;
}
const candidate = (path, keys) => ({
    path,
    notes: counted(keys),
    size: keys.length,
    signature: [...keys].sort().join('|'),
});
export function createRecogniser() {
    const readings = new Map();
    const read = (text, vary) => {
        const key = JSON.stringify([text, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
        let r = readings.get(key);
        if (!r)
            readings.set(key, (r = readVariations(text, vary)));
        return r;
    };
    const candidates = new Map();
    const of = (fragment, vary, depth) => {
        const key = JSON.stringify([fragment.text, depth, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
        const known = candidates.get(key);
        if (known)
            return known;
        const out = [];
        const source = read(fragment.text, vary);
        if (source.notes?.length) {
            out.push(candidate([], source.notes));
            const step = (v) => ({ operator: v.rule, line: v.line, by: v.by });
            if (depth >= 1)
                for (const v of source.variations) {
                    out.push(candidate([step(v.variation)], v.notes));
                    if (depth >= 2)
                        for (const w of read(v.variation.apply(fragment.text), vary).variations)
                            out.push(candidate([step(v.variation), step(w.variation)], w.notes));
                }
        }
        candidates.set(key, out);
        return out;
    };
    return {
        recognise(text, library, options = {}) {
            const { tolerance = 0, depth = 1, operators = ALL_OPERATORS, ...rest } = options;
            if (!(Number.isInteger(tolerance) && tolerance >= 0))
                throw new Error(`recognise: tolerance is ${String(tolerance)}, not a whole number ≥ 0`);
            if (depth !== 0 && depth !== 1 && depth !== 2)
                throw new Error(`recognise: depth is ${String(depth)}, not 0, 1 or 2`);
            const vary = { ...rest, operators };
            const keys = readVariations(text, { ...vary, operators: [] }).notes;
            if (!keys?.length)
                return [];
            const heard = candidate([], keys);
            const out = [];
            for (const fragment of library) {
                let best = null;
                for (const c of of(fragment, vary, depth)) {
                    if (Math.abs(c.size - heard.size) > tolerance)
                        continue;
                    const distance = c.signature === heard.signature ? 0 : tolerance === 0 ? Infinity : apart(c.notes, heard.notes, c.size, heard.size);
                    if (distance > tolerance)
                        continue;
                    if (!best || distance < best.distance || (distance === best.distance && c.path.length < best.path.length))
                        best = { fragment, path: c.path, distance };
                    if (distance === 0 && c.path.length === 0)
                        break;
                }
                if (best)
                    out.push(best);
            }
            return out
                .map((r, i) => [r, i])
                .sort(([a, i], [b, j]) => a.distance - b.distance || a.path.length - b.path.length || i - j)
                .map(([r]) => r);
        },
    };
}
