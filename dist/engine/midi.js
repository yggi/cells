import { isMidiCard } from "./program.js";
import { refsOf } from "./readers.js";
const DRUM_CHANNEL = 10;
export const DEFAULT_BEND_RANGE = 2;
export const BEND_CENTRE = 8192;
const BEND_STEP = 0.02;
const IN_TUNE = 0.5;
export function noteOf(freq, a4 = 440) {
    const n = 69 + 12 * Math.log2(freq / a4);
    const note = Math.round(n);
    return { note, cents: (n - note) * 100 };
}
export function bendValue(cents, range = DEFAULT_BEND_RANGE) {
    if (!Number.isFinite(cents))
        return BEND_CENTRE;
    const v = Math.round(BEND_CENTRE + (cents / (100 * range)) * BEND_CENTRE);
    return Math.max(0, Math.min(16383, v));
}
export const bendMessage = (channel, value) => [0xe0 | ((channel - 1) & 15), value & 0x7f, (value >> 7) & 0x7f];
export function velocityOf(e, gain = Math.max(Math.abs(e.gains[0]), Math.abs(e.gains[1]))) {
    const level = e.levels[0]?.level ?? 1;
    const amp = Math.max(0, level * Math.abs(gain));
    const v = Math.round(127 * Math.sqrt(Math.min(1, amp)));
    return Math.max(1, Math.min(127, Number.isFinite(v) ? v : 1));
}
const GM_DRUMS = {
    bd: 36,
    kick: 36,
    kd: 36,
    rim: 37,
    rs: 37,
    sd: 38,
    snare: 38,
    cp: 39,
    clap: 39,
    hh: 42,
    ch: 42,
    ph: 44,
    oh: 46,
    crash: 49,
    cr: 49,
    ride: 51,
    rd: 51,
    lt: 41,
    lo: 41,
    tom: 45,
    mt: 45,
    mid: 45,
    ht: 48,
    hi: 48,
    clave: 75,
    claves: 75,
};
export function gmDrumNote(name) {
    return GM_DRUMS[name.toLowerCase().replace(/\d+$/, '')] ?? null;
}
export function kitNotes(members) {
    const out = new Map();
    for (const m of members) {
        const n = gmDrumNote(m);
        if (n !== null)
            out.set(m, n);
    }
    const taken = new Set(out.values());
    let next = 36;
    for (const m of members) {
        if (out.has(m))
            continue;
        while (next <= 127 && taken.has(next))
            next++;
        if (next > 127)
            break;
        out.set(m, next);
        taken.add(next);
    }
    return out;
}
const hasMidiCards = (result) => [...result.cells.values()].some((c) => isMidiCard(c));
const byPlace = (result) => (a, b) => {
    const sa = result.cells.get(a)?.span;
    const sb = result.cells.get(b)?.span;
    return (sa?.line ?? Infinity) - (sb?.line ?? Infinity) || (sa?.col ?? 0) - (sb?.col ?? 0);
};
export const melodicChannel = (i, kit = DRUM_CHANNEL) => {
    const k = i % 15;
    return k < kit - 1 ? k + 1 : k + 2;
};
const membersOf = (result, o) => refsOf(result.cells.get(o.voice));
const gateOf = (result, o) => [...o.through, ...o.via].find((n) => !!result.cells.get(n)?.gate);
const channelKey = (result, o) => gateOf(result, o) ?? o.voice;
const pitchedKit = (o) => o.kit && (o.mods.length > 0 || o.offset !== 0);
const drumKit = (o) => o.kit && !pitchedKit(o);
export function routable(result) {
    const voices = new Set();
    const members = new Set();
    for (const o of result.outputs) {
        if (o.silent)
            continue;
        if (drumKit(o))
            for (const m of membersOf(result, o))
                members.add(m);
        else if (o.kit)
            for (const m of membersOf(result, o))
                voices.add(gateOf(result, o) ?? m);
        else
            voices.add(channelKey(result, o));
    }
    const order = byPlace(result);
    return { voices: [...voices].sort(order), members: [...members].sort(order) };
}
export function rowsOf(result, voice) {
    const cards = hasMidiCards(result);
    const rows = result.outputs.filter((o) => o.voice === voice && !o.kit && (cards ? !!o.midi?.length : !o.silent)).map((o) => (cards ? o.voice : channelKey(result, o)));
    return [...new Set(rows)];
}
export function channelTable(result, outputs = [{}]) {
    if (hasMidiCards(result))
        return cardTable(result);
    const { voices, members } = routable(result);
    const notes = kitNotes(members);
    const table = [];
    const kits = [];
    (outputs.length ? outputs : [{}]).forEach((o, i) => {
        const first = i === 0;
        const kit = onOff(o.kit) ?? (first ? DRUM_CHANNEL : 0);
        if (kit && notes.size)
            kits.push({ port: i + 1, channel: kit });
        voices.forEach((voice, k) => {
            const channel = onOff(o.voices?.[voice]) ?? (first ? melodicChannel(k, kit || DRUM_CHANNEL) : 0);
            if (channel)
                table.push({ voice, channel, port: i + 1 });
        });
    });
    const order = byPlace(result);
    return {
        voices: table.sort((a, b) => order(a.voice, b.voice) || a.port - b.port),
        kit: [...notes].map(([member, note]) => ({ member, note })),
        kits,
    };
}
function cardTable(result) {
    const order = byPlace(result);
    const voices = new Map();
    const members = new Set();
    const kits = new Map();
    const ports = new Set();
    for (const o of result.outputs)
        for (const m of o.midi ?? []) {
            ports.add(m.port);
            if (drumKit(o)) {
                for (const k of membersOf(result, o))
                    members.add(k);
                kits.set(`${m.port}|${m.channel}`, { port: m.port, channel: m.channel });
            }
            else
                for (const v of o.kit ? membersOf(result, o) : [o.voice])
                    voices.set(`${v}|${m.channel}|${m.port}`, { voice: v, channel: m.channel, port: m.port });
        }
    for (const c of result.cells.values())
        if (c.map?.kind === 'midi')
            ports.add(c.map.port);
    const notes = kitNotes([...members].sort(order));
    return {
        voices: [...voices.values()].sort((a, b) => order(a.voice, b.voice) || a.port - b.port || a.channel - b.channel),
        kit: [...notes].map(([member, note]) => ({ member, note })),
        kits: notes.size ? [...kits.values()].sort((a, b) => a.port - b.port || a.channel - b.channel) : [],
        byPiece: true,
        ports: [...ports].sort((a, b) => a - b),
    };
}
const onOff = (c) => (c === 0 ? 0 : validChannel(c));
const validChannel = (c) => (typeof c === 'number' && Number.isInteger(c) && c >= 1 && c <= 16 ? c : null);
export const routesOf = (r) => (r === null ? [] : Array.isArray(r) ? r : [r]);
export function router(result, table) {
    const outputs = new Map(result.outputs.map((o) => [o.id, o]));
    const channels = new Map();
    for (const v of table.voices)
        channels.set(v.voice, [...(channels.get(v.voice) ?? []), { channel: v.channel, port: v.port }]);
    const drums = new Map(table.kit.map((k) => [k.member, k.note]));
    if (table.byPiece)
        return (e) => {
            if (!e.midi?.length)
                return null;
            const o = e.output === undefined ? undefined : outputs.get(e.output);
            const drum = o && drumKit(o) ? drums.get(e.voice) : null;
            if (drum === undefined)
                return null;
            return e.midi.map((m) => ({ channel: m.channel, drum, port: m.port, gain: m.gain }));
        };
    return (e) => {
        const o = e.output === undefined ? undefined : outputs.get(e.output);
        if (o?.silent)
            return null;
        if (o && drumKit(o)) {
            const note = drums.get(e.voice);
            return note === undefined ? null : table.kits.map((k) => ({ channel: k.channel, drum: note, port: k.port }));
        }
        const key = !o ? e.voice : o.kit ? (gateOf(result, o) ?? e.voice) : channelKey(result, o);
        return (channels.get(key) ?? []).map((c) => ({ channel: c.channel, drum: null, port: c.port }));
    };
}
export function legatoNotes(e) {
    if (!e.legato)
        return [e];
    const { legato, ...one } = e;
    const ns = legato.notes;
    return ns.map((n, k) => {
        const next = ns[k + 1];
        const into = next && noteOf(next.freq).note !== noteOf(n.freq).note ? Math.min(legato.glide, next.dur) : 0;
        return { ...one, at: n.at, dur: next ? next.at - n.at + into : n.dur, freq: n.freq, bends: n.bends };
    });
}
export function midiNote(e, route, bendRange = DEFAULT_BEND_RANGE, a4 = 440) {
    const velocity = velocityOf(e, route.gain);
    const end = e.at + Math.max(0, e.dur);
    if (route.drum !== null)
        return { channel: route.channel, note: route.drum, velocity, at: e.at, end, bend: BEND_CENTRE, bends: [] };
    if (!(e.freq > 0) || !Number.isFinite(e.freq))
        return null;
    const { note, cents } = noteOf(e.freq, a4);
    if (note < 0 || note > 127)
        return null;
    const off = Math.abs(cents) < IN_TUNE ? 0 : cents;
    const value = (c) => (Math.abs(off + c) < IN_TUNE ? BEND_CENTRE : bendValue(off + c, bendRange));
    const bends = [];
    let last = { at: e.at, cents: 0 };
    const push = (at, v) => {
        if (v !== (bends.at(-1)?.value ?? value(0)))
            bends.push({ at, value: v });
    };
    for (const b of e.bends) {
        if (b.at >= end)
            break;
        if (b.ramp && b.at > last.at) {
            for (let t = last.at + BEND_STEP; t < b.at - 1e-9; t += BEND_STEP)
                push(t, value(last.cents + ((b.cents - last.cents) * (t - last.at)) / (b.at - last.at)));
        }
        const at = Math.max(e.at, b.at);
        push(at, value(b.cents));
        last = { at, cents: b.cents };
    }
    return { channel: route.channel, note, velocity, at: e.at, end, bend: value(0), bends };
}
export class Rotation {
    channels;
    #busy = new Map();
    constructor(channels) {
        this.channels = channels;
    }
    take(end) {
        let best = this.channels[0];
        for (const c of this.channels)
            if ((this.#busy.get(c) ?? -Infinity) < (this.#busy.get(best) ?? -Infinity))
                best = c;
        this.#busy.set(best, Math.max(end, this.#busy.get(best) ?? -Infinity));
        return best;
    }
    forget() {
        this.#busy.clear();
    }
}
export function rotationChannels(from, to, kit, kitChannel = DRUM_CHANNEL) {
    const out = [];
    for (let c = Math.max(1, Math.min(from, to)); c <= Math.min(16, Math.max(from, to)); c++)
        if (!(kit && c === kitChannel))
            out.push(c);
    return out.length ? out : [1];
}
