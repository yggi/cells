import { resolvePitch, semitones } from "./helix.js";
import { kitNotes } from "./midi.js";
import { voiceFor } from "./realize.js";
import { tableReader } from "./capture.js";
const READ = 512;
const LOWEST = 8;
const HIGHEST = 20000;
const byPlace = (result) => (a, b) => {
    const sa = result.cells.get(a.cell)?.span;
    const sb = result.cells.get(b.cell)?.span;
    return (sa?.line ?? Infinity) - (sb?.line ?? Infinity) || (sa?.col ?? 0) - (sb?.col ?? 0);
};
export function armable(result) {
    const out = new Map();
    for (const o of result.outputs) {
        if (o.silent || o.tape)
            continue;
        if (!o.gate && o.cell !== o.voice && !out.has(o.cell))
            out.set(o.cell, { cell: o.cell, voice: o.voice, kit: o.kit });
        if (!out.has(o.voice))
            out.set(o.voice, { cell: o.voice, voice: o.voice, kit: o.kit });
    }
    return [...out.values()].sort(byPlace(result));
}
export const keyFrequency = (note, a4 = 440) => a4 * Math.pow(2, (note - 69) / 12);
export function keyLevel(velocity) {
    const v = Math.max(1, Math.min(127, Number.isFinite(velocity) ? velocity : 100));
    return (v / 127) ** 2;
}
function nearest(sorted, at) {
    if (!sorted.length)
        return null;
    const x = Math.round(at * 1e9) / 1e9;
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (sorted[mid] <= x)
            lo = mid;
        else
            hi = mid - 1;
    }
    const below = sorted[lo];
    const above = sorted[lo + 1];
    return above !== undefined && above - x < x - below ? above : below;
}
function pitches(result, melody, o, shifts) {
    const out = new Set();
    const base = result.cells.get(o.voice)?.freq ?? 0;
    for (let i = -READ; i <= READ; i++) {
        const r = resolvePitch(result, melody, i, 0, shifts);
        const s = o.sign * semitones(result, r.root, r.position) + o.offset;
        const f = base * Math.pow(2, s / 12);
        if (Number.isFinite(s) && f >= LOWEST && f <= HIGHEST)
            out.add(Math.round(s * 1e9) / 1e9);
    }
    return [...out].sort((a, b) => a - b);
}
export function keyboardOf(result, cell, shifts, { a4 = 440, mode = 'snap' } = {}) {
    const c = result.cells.get(cell);
    if (!c)
        return null;
    const arm = armable(result).find((a) => a.cell === cell);
    if (c.kit || arm?.kit) {
        const notes = [...kitNotes(kitMembers(result, cell, arm))];
        return {
            kind: 'kit',
            cell,
            drum: (gm) => {
                const hit = notes.find(([, n]) => gm.includes(n));
                return hit ? { voice: hit[0], freq: result.cells.get(hit[0]).freq } : null;
            },
        };
    }
    if (!arm && !c.voice)
        return null;
    const voice = arm?.voice ?? cell;
    const melody = melodyOf(result, cell, arm);
    const played = (note) => keyFrequency(note, a4);
    if (mode === 'allow' || !melody)
        return { kind: 'voice', cell, voice, key: played };
    const { o, base } = melody;
    if (mode === 'ignore') {
        const reader = tableReader(result, o, shifts);
        return {
            kind: 'voice',
            cell,
            voice,
            key: (note) => {
                const w = reader.read(12 * Math.log2(played(note) / base), 'ignore');
                return w === null ? null : base * Math.pow(2, w.semis / 12);
            },
        };
    }
    let ladder = null;
    return {
        kind: 'voice',
        cell,
        voice,
        key: (note) => {
            ladder ??= pitches(result, o.cell, o, shifts);
            const s = nearest(ladder, 12 * Math.log2(played(note) / base));
            return s === null ? null : base * Math.pow(2, s / 12);
        },
    };
}
function kitMembers(result, cell, arm) {
    const kit = arm?.voice ?? cell;
    return (result.cells.get(kit)?.units ?? []).flatMap((u) => (u.atom.kind === 'ref' && result.cells.get(u.atom.name)?.voice ? [u.atom.name] : []));
}
function melodyOf(result, cell, arm) {
    const voice = arm?.voice ?? cell;
    const o = result.outputs.find((x) => !x.silent && !x.tape && !x.gate && x.voice === voice && (arm?.cell === voice || x.cell === cell));
    const base = result.cells.get(voice)?.freq ?? 0;
    return !o || o.cell === voice || !(base > 0) ? null : { o, base };
}
export function kitPads(result, cell) {
    const c = result.cells.get(cell);
    const arm = armable(result).find((a) => a.cell === cell);
    if (!c || !(c.kit || arm?.kit))
        return [];
    const members = [...new Set(kitMembers(result, cell, arm))];
    const notes = kitNotes(members);
    return members.flatMap((member) => {
        const note = notes.get(member);
        return note === undefined ? [] : [{ member, note }];
    });
}
export function scaleKeys(result, cell, shifts, a4 = 440) {
    const c = result.cells.get(cell);
    if (!c)
        return null;
    const arm = armable(result).find((a) => a.cell === cell);
    if (c.kit || arm?.kit || (!arm && !c.voice))
        return null;
    const melody = melodyOf(result, cell, arm);
    if (!melody)
        return null;
    const out = new Set();
    for (const s of pitches(result, melody.o.cell, melody.o, shifts)) {
        const note = Math.round(69 + 12 * Math.log2((melody.base * Math.pow(2, s / 12)) / a4) + 1e-9);
        if (note >= 0 && note <= 127)
            out.add(note);
    }
    return out;
}
export function rowNote(result, cell, value, shifts) {
    const plays = (x) => !x.silent && !x.tape && !x.gate;
    const read = result.outputs.find((x) => plays(x) && x.kit && x.mods.some((m) => m.picks && m.cell === cell));
    if (read)
        return voiceFor(result, read, value);
    const o = result.outputs.find((x) => plays(x) && x.cell === cell) ?? result.outputs.find((x) => plays(x) && x.voice === cell);
    if (!o)
        return null;
    const picked = o.kit && o.mods.some((m) => m.picks);
    if (o.kit && !picked)
        return voiceFor(result, o, value);
    const on = picked ? voiceFor(result, o, 0) : { voice: o.voice, freq: result.cells.get(o.voice)?.freq ?? 0 };
    if (!on)
        return null;
    const r = resolvePitch(result, o.cell, value, 0, shifts);
    const freq = on.freq * Math.pow(2, (o.sign * semitones(result, r.root, r.position) + o.offset) / 12);
    return freq > 0 && Number.isFinite(freq) ? { voice: on.voice, freq } : null;
}
