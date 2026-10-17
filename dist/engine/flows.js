import { cellId, edgeId } from "./ids.js";
const cache = new WeakMap();
export function flows(result) {
    const hit = cache.get(result);
    if (hit)
        return hit;
    const all = [];
    const add = (kind, from, to, id = edgeId(cellId(from), cellId(to)), extra = {}) => {
        if (result.cells.has(from) && result.cells.has(to))
            all.push({ id, kind, from, to, ...extra });
    };
    const soundTapes = new Set(result.tapes.map((t) => t.name));
    for (const c of result.cells.values()) {
        for (const b of c.mix ?? [])
            add('mix', b.voice.name, c.name, undefined, { gain: b.gain });
        if (c.sink)
            for (const k of c.children.keys())
                add('channel', k, c.name, edgeId(cellId(c.name), cellId(k)));
        for (const e of midiEntries(c)) {
            if (e.ref)
                add('midi', e.ref, c.name, edgeId(cellId(c.name), cellId(e.ref)), { channel: e.channel });
            for (const b of e.bindings)
                add('midi', b.voice.name, c.name, undefined, { gain: b.gain, channel: e.channel });
        }
        const p = c.params;
        if (typeof p.write === 'string' && soundTapes.has(c.name))
            add('write', p.write, c.name);
        if (typeof p.play === 'string' && soundTapes.has(p.play))
            add('play', p.play, c.name);
        if (typeof p.excite === 'string')
            add('excite', p.excite, c.name);
        if (typeof p.couple === 'string') {
            add('couple', c.name, p.couple);
            add('couple', p.couple, c.name, edgeId(cellId(c.name), cellId(p.couple)), { back: true });
        }
    }
    const by = (key) => {
        const m = new Map();
        for (const f of all)
            (m.get(f[key]) ?? m.set(f[key], []).get(f[key])).push(f);
        return m;
    };
    const out = { all, from: by('from'), to: by('to') };
    cache.set(result, out);
    return out;
}
function midiEntries(c) {
    if (c.map?.kind !== 'midi')
        return [];
    const one = c.map.channel;
    const out = [];
    let at = 0;
    c.units.forEach((u, i) => {
        for (let k = 0; k < u.repeat; k++, at++) {
            const channel = one ?? at + 1;
            if (u.atom.kind === 'ref')
                out.push({ channel, ref: u.atom.name, bindings: [] });
            else if (u.atom.kind === 'mix')
                out.push({ channel, ref: null, bindings: c.chords?.[i] ?? [] });
        }
    });
    return out;
}
