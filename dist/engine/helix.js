import { ROOT, codeShifts } from "./program.js";
import { midiOf, mod } from "../theory/modes.js";
import { leaves, mapLeaves } from "./subseq.js";
export function period(result, name, ctx) {
    const c = result.cells.get(name);
    if (!c)
        return 12;
    if (c.root)
        return c.cycle;
    if (c.scan)
        return c.scan.lap;
    return result.cells.get(c.over ?? ctx ?? c.context)?.cycle ?? 12;
}
export function shiftedUnits(result, name, shift, ctx) {
    const c = result.cells.get(name);
    const k = c.units.length;
    if (k === 0 || shift === 0)
        return [...c.units];
    const p = period(result, name, ctx);
    const lap = Math.floor(shift / k);
    const r = shift - lap * k;
    return Array.from({ length: k }, (_, i) => {
        const u = c.units[(i + r) % k];
        const climb = p * (lap + (i + r >= k ? 1 : 0));
        if (climb === 0)
            return u;
        const atom = mapLeaves(u.atom, (a) => a.kind === 'note'
            ? { ...a, value: a.value + climb }
            : a.kind === 'choice'
                ? { ...a, values: a.values.map((x) => x + climb) }
                : a.kind === 'chord'
                    ? { ...a, notes: a.notes.map((x) => x + climb) }
                    : a);
        return atom === u.atom ? u : { ...u, atom };
    });
}
const ENTRY_CACHE = 256;
const entryCache = new WeakMap();
export function entries(result, name, shift) {
    let cache = entryCache.get(result);
    if (!cache)
        entryCache.set(result, (cache = new Map()));
    const key = `${name}|${shift}`;
    const hit = cache.get(key);
    if (hit)
        return hit;
    const out = [];
    for (const a of shiftedUnits(result, name, shift).flatMap((u) => leaves(u.atom))) {
        if (a.kind === 'note')
            out.push({ value: a.value, alter: a.alter });
        else if (a.kind === 'chord')
            a.notes.forEach((v, j) => out.push({ value: v, alter: a.alters[j] }));
    }
    if (cache.size >= ENTRY_CACHE)
        cache.delete(cache.keys().next().value);
    cache.set(key, out);
    return out;
}
export function lookup(result, name, x, shifts, extra = 0) {
    const c = result.cells.get(name);
    if (c.root)
        return { value: x + shifts(name) + extra, alter: 0 };
    const es = entries(result, name, shifts(name) + extra);
    if (es.length === 0)
        return { value: 0, alter: 0 };
    const xi = Math.floor(x);
    const lap = Math.floor(xi / es.length);
    const e = es[xi - lap * es.length];
    return { value: e.value + lap * period(result, name), alter: e.alter };
}
export function resolveIn(result, table, tableShift, value, alter, shifts) {
    const path = [];
    let at = table;
    let atShift = tableShift;
    let x = value;
    let pending = alter;
    for (let guard = 0; guard < 64; guard++) {
        const c = result.cells.get(at);
        if (c.root) {
            const position = x + pending + shifts(at) + atShift;
            path.push({ cell: at, index: Math.round(position) });
            return { root: at, position, path };
        }
        path.push({ cell: at, index: Math.floor(x + atShift) });
        const e = lookup(result, at, x, shifts, atShift);
        x = e.value + pending;
        pending = e.alter;
        atShift = c.over ? c.overShift : 0;
        at = c.over ?? c.context;
    }
    return { root: at, position: x, path };
}
export function resolvePitch(result, cell, value, alter, shifts) {
    const c = result.cells.get(cell);
    if (c.root)
        return { root: cell, position: value + alter + shifts(cell), path: [] };
    return resolveIn(result, c.over ?? c.context, c.over ? c.overShift : 0, value, alter, shifts);
}
export function semitones(result, root, position) {
    const c = result.cells.get(root);
    if (c?.map?.kind === 'ratios') {
        const r = c.map.ratios;
        const n = r.length - 1;
        const period = r[n] / r[0];
        const lap = Math.floor(position / n);
        const at = position - lap * n;
        const i = Math.floor(at);
        const f = at - i;
        const ratio = Math.pow(r[i] / r[0], 1 - f) * Math.pow(r[i + 1] / r[0], f);
        return 12 * Math.log2(Math.pow(period, lap) * ratio);
    }
    const period = c?.map?.kind === 'edo' ? c.map.period : 2;
    return (position * 12 * Math.log2(period)) / (c?.cycle ?? 12);
}
export function positionHue(result, root, position) {
    const cycle = result.cells.get(root)?.cycle ?? 12;
    return (mod(Math.round(position), cycle) / cycle) * 360;
}
export function positionOctave(result, root, position) {
    const cycle = result.cells.get(root)?.cycle ?? 12;
    const p = Math.round(position);
    return p === cycle ? 0 : Math.floor(p / cycle);
}
export function positionOf(result, root, semis) {
    const c = result.cells.get(root);
    const ratio = Math.pow(2, semis / 12);
    if (c?.map?.kind === 'ratios') {
        const given = c.map.ratios;
        const r = given.map((x) => x / given[0]);
        const n = r.length - 1;
        const lap = Math.floor(Math.log(ratio) / Math.log(r[n]) + 1e-9);
        const within = ratio / Math.pow(r[n], lap);
        let i = 0;
        while (i < n - 1 && r[i + 1] <= within + 1e-12)
            i++;
        const f = Math.log(within / r[i]) / Math.log(r[i + 1] / r[i]);
        return lap * n + i + f;
    }
    const period = c?.map?.kind === 'edo' ? c.map.period : 2;
    return (semis * (c?.cycle ?? 12)) / (12 * Math.log2(period));
}
export function voiceGrid(result, voice) {
    for (const o of result.outputs)
        if (o.voice === voice && !o.kit && !o.gate)
            try {
                return resolvePitch(result, o.cell, 0, 0, codeShifts(result)).root;
            }
            catch {
            }
    return ROOT;
}
export function freqHue(result, voice, freq) {
    const v = result.cells.get(voice);
    if (!v || !(freq > 0) || !(v.freq > 0))
        return null;
    const root = voiceGrid(result, voice);
    return positionHue(result, root, positionOf(result, root, 12 * Math.log2(freq / v.freq)));
}
export function gridName(result, voice, freq) {
    const v = result.cells.get(voice);
    if (!v || !(freq > 0) || !(v.freq > 0))
        return null;
    const root = voiceGrid(result, voice);
    const g = result.cells.get(root);
    if (!g || (g.cycle === 12 && g.map?.kind === 'edo' && g.map.period === 2))
        return null;
    const midi = midiOf(freq);
    const m = Math.round(midi);
    const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    return {
        grid: root,
        position: Math.round(positionOf(result, root, 12 * Math.log2(freq / v.freq))),
        nearest: `${NAMES[mod(m, 12)]}${Math.floor(m / 12) - 1}`,
        cents: Math.round((midi - m) * 100),
    };
}
export function tableChain(result, table) {
    const out = [];
    let at = table;
    for (let guard = 0; at !== null && guard < 64; guard++) {
        out.push(at);
        const c = result.cells.get(at);
        at = !c || c.root ? null : (c.over ?? c.context);
    }
    return out;
}
export const isTap = (result, name, pick) => !!pick && !pick.abs && isPicked(result, name, pick);
export const isPicked = (result, name, pick) => !!pick && result.cells.get(name).units.every((u) => u.atom.kind === 'note' && u.repeat === 1 && u.subdivide === 1 && u.chance === undefined);
export function rootOf(result, table) {
    let at = table;
    for (let guard = 0; guard < 64; guard++) {
        const c = result.cells.get(at);
        if (!c || c.root)
            return at;
        at = c.over ?? c.context;
    }
    return at;
}
