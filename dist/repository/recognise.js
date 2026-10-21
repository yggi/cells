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
const onset = (t) => (Math.round(t * 3840) / 3840).toFixed(6);
const windowOf = (bar, keys) => ({ bar, notes: counted(keys), size: keys.length, signature: [...keys].sort().join('|') });
function windowsOf(c, width) {
    const known = c.windows.get(width);
    if (known)
        return known;
    const { span, bar, notes } = c;
    let out;
    if (width === null || span === null || bar === null)
        out = [
            windowOf(0, notes.map((n) => (n.at === null ? n.key : `${onset(n.at)} ${n.key}`))),
        ];
    else {
        const eps = 1e-9;
        const starts = width < span - eps ? Array.from({ length: Math.ceil(span / bar - eps) }, (_, b) => b) : [0];
        out = starts.map((b) => {
            const keys = [];
            for (const n of notes) {
                if (n.at === null)
                    keys.push(n.key);
                else
                    for (let t = (((n.at - b * bar) % span) + span) % span; t < width - eps; t += span)
                        keys.push(`${onset(t)} ${n.key}`);
            }
            return windowOf(b, keys);
        });
    }
    c.windows.set(width, out);
    return out;
}
const candidate = (path, notes, r) => ({ path, notes, span: r.span, bar: r.bar, windows: new Map() });
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
    const exact = new WeakMap();
    const exactOf = (cs, width) => {
        const byWidth = exact.get(cs) ?? new Map();
        exact.set(cs, byWidth);
        let index = byWidth.get(width);
        if (!index) {
            index = new Map();
            for (const c of cs)
                for (const w of windowsOf(c, width)) {
                    const held = index.get(w.signature);
                    if (!held || c.path.length < held.path.length)
                        index.set(w.signature, { path: c.path, bar: w.bar });
                }
            byWidth.set(width, index);
        }
        return index;
    };
    const of = (fragment, vary, depth) => {
        const key = JSON.stringify([fragment.text, depth, vary.workbench ?? '', vary.operators, vary.keep ?? [], vary.fewest ?? 1, vary.degrees ?? null]);
        const known = candidates.get(key);
        if (known)
            return known;
        const out = [];
        const source = read(fragment.text, vary);
        if (source.notes?.length) {
            out.push(candidate([], source.notes, source));
            const step = (v) => ({ operator: v.rule, line: v.line, by: v.by });
            if (depth >= 1)
                for (const v of source.variations) {
                    out.push(candidate([step(v.variation)], v.notes, source));
                    if (depth >= 2) {
                        const twice = read(v.variation.apply(fragment.text), vary);
                        for (const w of twice.variations)
                            out.push(candidate([step(v.variation), step(w.variation)], w.notes, twice));
                    }
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
            const reading = readVariations(text, { ...vary, operators: [] });
            if (!reading.notes?.length)
                return [];
            const heard = windowsOf(candidate([], reading.notes, { ...reading, span: null }), null)[0];
            const out = [];
            for (const fragment of library) {
                const cs = of(fragment, vary, depth);
                if (tolerance === 0) {
                    const hit = exactOf(cs, reading.span).get(heard.signature);
                    if (hit)
                        out.push({ fragment, ...hit, distance: 0 });
                    continue;
                }
                let best = null;
                for (const c of cs)
                    for (const w of windowsOf(c, reading.span)) {
                        if (Math.abs(w.size - heard.size) > tolerance)
                            continue;
                        const distance = w.signature === heard.signature ? 0 : apart(w.notes, heard.notes, w.size, heard.size);
                        if (distance > tolerance)
                            continue;
                        if (!best || distance < best.distance || (distance === best.distance && c.path.length < best.path.length))
                            best = { fragment, path: c.path, bar: w.bar, distance };
                    }
                if (best)
                    out.push(best);
            }
            return out
                .map((r, i) => [r, i])
                .sort(([a, i], [b, j]) => a.distance - b.distance || a.path.length - b.path.length || a.bar - b.bar || i - j)
                .map(([r]) => r);
        },
    };
}
