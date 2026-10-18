import { sum, transform } from "./wavelet.js";
export const SIGNALS = ['impulses', 'envelope', 'voices', 'change', 'harmony'];
const HARMONY_MEMORY = 8;
const ENTRY = 0.5;
const SIGMA = 1.2;
const gainOf = (e) => Math.max(e.gains[0], e.gains[1]);
const pitchClass = (freq) => (((Math.round(12 * Math.log2(freq / 440)) + 9) % 12) + 12) % 12;
export function sampled(events, g, which = SIGNALS) {
    const n = Math.max(1, Math.round(g.window * g.rate));
    const put = (x, t, w) => {
        const c = t * g.rate;
        for (let k = Math.floor(c - 3 * SIGMA); k <= Math.ceil(c + 3 * SIGMA); k++) {
            const at = g.periodic ? ((k % n) + n) % n : k;
            if (at < 0 || at >= n)
                continue;
            x[at] += (w * Math.exp(-(((k - c) / SIGMA) ** 2) / 2)) / (SIGMA * Math.sqrt(2 * Math.PI));
        }
    };
    const want = new Set(which);
    const inside = events.filter((e) => e.at >= 0 && e.at < g.window).sort((a, b) => a.at - b.at);
    const out = {};
    if (want.has('impulses')) {
        const x = new Float64Array(n);
        for (const e of inside)
            put(x, e.at, gainOf(e));
        out.impulses = x;
    }
    if (want.has('envelope')) {
        const edges = new Float64Array(n);
        for (const e of inside) {
            put(edges, e.at, gainOf(e));
            put(edges, Math.min(g.window, e.at + e.dur), -gainOf(e));
        }
        const x = new Float64Array(n);
        for (let i = 0, acc = 0; i < n; i++)
            x[i] = acc += edges[i];
        out.envelope = x;
    }
    if (want.has('voices') || want.has('change')) {
        const byVoice = new Map();
        for (const e of inside) {
            const notes = byVoice.get(e.voice);
            if (notes)
                notes.push(e);
            else
                byVoice.set(e.voice, [e]);
        }
        const change = new Float64Array(n);
        const each = [];
        for (const notes of byVoice.values()) {
            const x = new Float64Array(n);
            let last = null;
            for (const e of notes) {
                put(x, e.at, gainOf(e));
                const entry = !last || e.at - (last.at + last.dur) > ENTRY;
                const w = entry ? 12 : Math.min(12, Math.abs(12 * Math.log2(e.freq / last.freq)));
                if (w > 0.01)
                    put(change, e.at, w * gainOf(e));
                last = e;
            }
            each.push(x);
        }
        if (want.has('change'))
            out.change = change;
        if (want.has('voices'))
            out.byVoice = each;
    }
    if (want.has('harmony')) {
        const x = new Float64Array(n);
        const heard = new Array(12).fill(-Infinity);
        for (const e of inside) {
            if (!(e.freq > 0))
                continue;
            const pc = pitchClass(e.freq);
            if (e.at - heard[pc] > HARMONY_MEMORY)
                put(x, e.at, gainOf(e));
            heard[pc] = e.at;
        }
        out.harmony = x;
    }
    return out;
}
export function scalograms(events, g, which = SIGNALS) {
    const x = sampled(events, g, which);
    const out = {};
    for (const s of which) {
        if (s === 'voices') {
            const each = x.byVoice ?? [];
            out.voices = each.length ? each.map((v) => transform(v, g)).reduce(sum) : transform(new Float64Array(Math.max(1, Math.round(g.window * g.rate))), g);
        }
        else
            out[s] = transform(x[s], g);
    }
    return out;
}
