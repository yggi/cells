import { clocking } from "./clocking.js";
import { flatten } from "./flatten.js";
import { ownRate, stepsAt } from "./readers.js";
const flatCache = new WeakMap();
function flatOf(result, statics, name) {
    let byCell = flatCache.get(result);
    if (!byCell)
        flatCache.set(result, (byCell = new Map()));
    let hit = byCell.get(name);
    if (!hit || hit.statics !== statics) {
        const f = flatten(result, name, statics);
        byCell.set(name, (hit = { statics, flat: f, lap: f.length ? Math.max(...f.map((e) => e.step + e.duration)) : 0 }));
    }
    return hit;
}
function readAt(result, statics, name, t, clk) {
    const c = result.cells.get(name);
    if (!c?.clock)
        return null;
    const steps = stepsAt(clk ?? clocking(result, statics, t), c);
    if (!Number.isFinite(steps))
        return null;
    const hit = flatOf(result, statics, name);
    if (!hit.flat.length || !(hit.lap > 0))
        return null;
    return { s: ((steps % hit.lap) + hit.lap) % hit.lap, hit };
}
export function valueAt(result, statics, name, t, clk) {
    const r = readAt(result, statics, name, t, clk);
    if (!r)
        return null;
    const { s, hit: { flat }, } = r;
    const i = flat.findIndex((e) => s >= e.step && s < e.step + e.duration);
    if (i < 0)
        return null;
    const e = flat[i];
    const v = e.value + e.alter;
    if (result.cells.get(name)?.map?.kind !== 'lin')
        return v;
    const next = flat[(i + 1) % flat.length];
    return v + ((next.value + next.alter - v) * (s - e.step)) / e.duration;
}
export function valuesAt(result, statics, name, t, clk) {
    const r = readAt(result, statics, name, t, clk);
    if (!r)
        return [];
    return r.hit.flat.filter((e) => r.s >= e.step && r.s < e.step + e.duration).map((e) => e.value + e.alter);
}
export function notesAt(result, statics, name, t, clk) {
    const r = readAt(result, statics, name, t, clk);
    if (!r)
        return [];
    const c = result.cells.get(name);
    const perStep = 1 / Math.max(1e-9, (result.clocks.get(c.clock)?.perSecond ?? 1) * ownRate(c));
    return r.hit.flat.filter((e) => r.s >= e.step && r.s < e.step + e.duration).map((e) => ({ value: e.value + e.alter, since: (r.s - e.step) * perStep }));
}
export function lastNoteAt(result, statics, name, t, clk) {
    const r = readAt(result, statics, name, t, clk);
    if (!r)
        return null;
    const c = result.cells.get(name);
    const perStep = 1 / Math.max(1e-9, (result.clocks.get(c.clock)?.perSecond ?? 1) * ownRate(c));
    const { flat, lap } = r.hit;
    let best = null;
    let ago = Infinity;
    for (const e of flat) {
        const d = (((r.s - e.step) % lap) + lap) % lap;
        if (d < ago)
            [ago, best] = [d, e];
    }
    return best ? { since: ago * perStep, length: best.duration * perStep } : null;
}
