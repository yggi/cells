import { codeShifts } from "./program.js";
import { flatten } from "./flatten.js";
import { CELL_PARAMS } from "./attributes.js";
function hashOf(text) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0) * 2 ** 21 + (h1 >>> 11)).toString(36);
}
const nine = (x) => +x.toPrecision(9);
const keyed = new WeakMap();
export function drawKeyOf(result) {
    const known = keyed.get(result);
    if (known)
        return known;
    const shifts = codeShifts(result);
    const memo = new Map();
    const keyOf = (name, seen) => {
        const k = memo.get(name);
        if (k !== undefined)
            return k;
        const c = result.cells.get(name);
        if (!c)
            return name;
        if (seen.has(name))
            return '↺';
        const inner = new Set([...seen, name]);
        let steps = [];
        try {
            steps = flatten(result, name, shifts).map((e) => [
                nine(e.step),
                nine(e.duration),
                nine(e.value + e.alter + (e.transpose ?? 0)),
                e.chance ?? null,
                e.options?.map((o) => o.value + o.alter) ?? null,
                e.laps ? [e.laps.of, e.laps.is] : null,
                e.chosen?.map((x) => [nine(x.at), x.of, x.is, x.lap]) ?? null,
            ]);
        }
        catch {
        }
        const params = Object.entries(c.params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([p, v]) => [p, typeof v === 'string' && CELL_PARAMS.has(p) ? keyOf(v, inner) : v]);
        const key = hashOf(JSON.stringify([c.seed, c.steps, steps, params.filter(([p]) => p !== 'chance'), c.env ? keyOf(c.env, inner) : null]));
        if (!seen.size)
            memo.set(name, key);
        return key;
    };
    const of = (cell) => keyOf(cell, new Set());
    keyed.set(result, of);
    return of;
}
