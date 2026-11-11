import { gmDrumNote } from "../engine/midi.js";
import { planOf } from "../engine/host.js";
import { readPoint } from "../engine/reading/point.js";
import { windowAt } from "../engine/schedule.js";
import { midiOf } from "../theory/modes.js";
import { audition } from "./audition.js";
import { fitsAs } from "./fit.js";
export const PART_OF = { rhythm: 'drums', bass: 'bass', harmony: 'pad', stab: 'stab', motif: 'lead' };
export const READ_BARS = 16;
export const GUESS_K = 2;
export const GUESSED = { rhythm: ['sync'], harmony: ['harm'] };
const BAR_SECONDS = 2;
const STEP = BAR_SECONDS / 16;
const FOUR_FOUR = '&bar meter("4/4") step=120bpm';
export function readFragment(text, facet, resolve) {
    const part = PART_OF[facet];
    if (!part)
        return null;
    const self = '_read';
    if (fitsAs(self, FOUR_FOUR, { resolve: (id) => (id === self ? text : resolve(id)) }).unmet.length)
        return null;
    const a = audition(text, { resolve });
    if (a.why)
        return null;
    const plan = planOf(a.text, undefined, { resolve });
    const bars = Array.from({ length: READ_BARS }, () => []);
    for (const e of windowAt(plan, 0, READ_BARS * BAR_SECONDS - 1e-9).events) {
        if (e.unheard)
            continue;
        const at = Math.round(e.at / STEP);
        const bar = Math.floor(at / 16);
        if (bar >= READ_BARS)
            continue;
        const note = part === 'drums' ? (gmDrumNote(e.voice) ?? Math.round(midiOf(e.freq))) : Math.round(midiOf(e.freq));
        bars[bar].push({ part, step: at % 16, length: Math.max(e.dur / STEP, 1e-9), note });
    }
    return bars.some((b) => b.length) ? readPoint(bars) : null;
}
const featuresOf = (r) => ({ ...r.point, intensity: r.intensity });
export function readingDistance(a, b) {
    const fa = featuresOf(a);
    const fb = featuresOf(b);
    const shared = Object.keys(fa).filter((k) => fb[k] !== undefined);
    return shared.length ? Math.sqrt(shared.reduce((s, k) => s + (fa[k] - fb[k]) ** 2, 0) / shared.length) : Infinity;
}
export const placedAs = (f, facet) => f.association.filter((w) => w.facet === undefined || w.facet === facet).map((w) => w.point);
export function readFacet(library, facet, resolve) {
    return library.flatMap((f) => {
        const placed = placedAs(f, facet);
        if (!placed.length)
            return [];
        const reading = readFragment(f.text, facet, resolve);
        return reading ? [{ id: f.id, reading, placed }] : [];
    });
}
function meanPoint(points) {
    const axes = [...new Set(points.flatMap((p) => Object.keys(p)))];
    return Object.fromEntries(axes.map((a) => {
        const vs = points.flatMap((p) => (p[a] === undefined ? [] : [p[a]]));
        return [a, vs.reduce((s, v) => s + v, 0) / vs.length];
    }));
}
export function firstGuess(reading, among, k = GUESS_K) {
    const near = among
        .map((r) => ({ r, distance: readingDistance(reading, r.reading) }))
        .filter((x) => Number.isFinite(x.distance))
        .sort((a, b) => a.distance - b.distance || (a.r.id < b.r.id ? -1 : 1))
        .slice(0, k);
    if (!near.length)
        return null;
    return { point: meanPoint(near.map((x) => meanPoint(x.r.placed))), from: near.map((x) => ({ id: x.r.id, distance: x.distance })) };
}
export function guessPlace(text, facet, library, resolve) {
    const axes = GUESSED[facet];
    if (!axes)
        return null;
    const reading = readFragment(text, facet, resolve);
    if (!reading)
        return null;
    const g = firstGuess(reading, readFacet(library, facet, resolve));
    if (!g)
        return null;
    const point = Object.fromEntries(axes.flatMap((a) => (g.point[a] === undefined ? [] : [[a, g.point[a]]])));
    return Object.keys(point).length ? { point, from: g.from } : null;
}
