import { resolvePitch, semitones } from "./helix.js";
export const writtenText = (w) => `${w.value}${w.alter > 0 ? '#'.repeat(w.alter) : 'b'.repeat(-w.alter)}`;
export function melodicOut(result, cell) {
    return result.outputs.find((o) => !o.silent && !o.tape && !o.gate && !o.kit && o.cell === cell && o.cell !== o.voice) ?? null;
}
export function recordTarget(result, armed) {
    if (armed === null)
        return null;
    const of = (cell) => {
        const spec = result.cells.get(cell)?.frees.find((f) => f.key === 'braid');
        const out = spec && result.cells.get(cell)?.clock ? melodicOut(result, cell) : null;
        return spec && out ? { cell, spec, out } : null;
    };
    const own = of(armed);
    if (own || !result.cells.get(armed)?.voice)
        return own;
    const cells = [...result.cells.values()].sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
    for (const c of cells) {
        const t = of(c.name);
        if (t && t.out.voice === armed)
            return t;
    }
    return null;
}
const READ = 512;
const MAX_ALTER = 3;
const tidy = (x) => Math.round(x * 1e9) / 1e9;
export function tableReader(result, o, shifts) {
    const pitch = (w) => {
        const r = resolvePitch(result, o.cell, w.value, w.alter, shifts);
        return tidy(o.sign * semitones(result, r.root, r.position) + o.offset);
    };
    let ladder = null;
    const entries = () => {
        if (ladder)
            return ladder;
        const at = new Map();
        for (let k = 0; k <= READ; k++)
            for (const v of k ? [k, -k] : [0]) {
                const s = pitch({ value: v, alter: 0 });
                if (Number.isFinite(s) && !at.has(s))
                    at.set(s, v);
            }
        return (ladder = [...at].map(([s, value]) => ({ s, value })).sort((a, b) => a.s - b.s));
    };
    const nearestEntry = (x) => {
        const l = entries();
        let lo = 0;
        let hi = l.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (l[mid].s <= x)
                lo = mid;
            else
                hi = mid - 1;
        }
        return lo + 1 < l.length && l[lo + 1].s - x < x - l[lo].s ? lo + 1 : lo;
    };
    return {
        read(semis, mode) {
            const l = entries();
            if (!l.length || !Number.isFinite(semis))
                return null;
            const x = tidy(semis);
            const i = nearestEntry(x);
            if (mode === 'snap')
                return { value: l[i].value, alter: 0, semis: l[i].s };
            let best = null;
            const better = (c) => {
                if (!best)
                    return true;
                const d = Math.abs(c.semis - x) - Math.abs(best.semis - x);
                if (Math.abs(d) > 1e-9)
                    return d < 0;
                if (Math.abs(c.alter) !== Math.abs(best.alter))
                    return Math.abs(c.alter) < Math.abs(best.alter);
                if (c.alter !== best.alter)
                    return c.alter > best.alter;
                return Math.abs(c.value) < Math.abs(best.value) || (Math.abs(c.value) === Math.abs(best.value) && c.value < best.value);
            };
            for (let j = Math.max(0, i - 2); j <= Math.min(l.length - 1, i + 2); j++)
                for (let alter = -MAX_ALTER; alter <= MAX_ALTER; alter++) {
                    const c = { value: l[j].value, alter, semis: alter ? pitch({ value: l[j].value, alter }) : l[j].s };
                    if (Number.isFinite(c.semis) && better(c))
                        best = c;
                }
            if (!best)
                return null;
            const b = best;
            const on = l.find((e) => Math.abs(e.s - b.semis) < 1e-9);
            const w = on ? { value: on.value, alter: 0, semis: on.s } : b;
            return mode === 'ignore' && w.alter !== 0 ? null : w;
        },
    };
}
export function quantise(notes, length) {
    const starts = new Map();
    for (const n of notes) {
        const s = Math.floor(n.on + 0.5);
        if (s < 0 || s >= length)
            continue;
        const e = Math.min(length, Math.max(s + 1, Math.floor(n.off + 0.5)));
        const at = starts.get(s) ?? { ws: new Map(), end: s + 1 };
        at.ws.set(writtenText(n), n);
        at.end = Math.max(at.end, e);
        starts.set(s, at);
    }
    const steps = [...starts.keys()].sort((a, b) => a - b);
    const out = [];
    let at = 0;
    for (const [k, s] of steps.entries()) {
        for (; at < s; at++)
            out.push('~');
        const { ws, end } = starts.get(s);
        const len = Math.min(end, steps[k + 1] ?? length) - s;
        const sorted = [...ws.values()].sort((a, b) => a.value - b.value || a.alter - b.alter).map(writtenText);
        out.push(`${sorted.length > 1 ? `[${sorted.join(',')}]` : sorted[0]}${len > 1 ? `@${len}` : ''}`);
        at = s + len;
    }
    for (; at < length; at++)
        out.push('~');
    return out;
}
export class Take {
    length;
    start = null;
    #down = new Map();
    #notes = [];
    constructor(length) {
        this.length = length;
    }
    begin(step) {
        this.start ??= this.length * Math.max(0, Math.ceil((step - 0.5) / this.length));
    }
    get end() {
        return this.start === null ? null : this.start + this.length - 0.5;
    }
    down(key, w, step) {
        this.up(key, step);
        if (w)
            this.#down.set(key, { value: w.value, alter: w.alter, on: step });
    }
    up(key, step) {
        const d = this.#down.get(key);
        if (!d)
            return;
        this.#down.delete(key);
        this.#notes.push({ ...d, off: step });
    }
    write() {
        if (this.start === null)
            return null;
        const start = this.start;
        for (const key of [...this.#down.keys()])
            this.up(key, start + this.length);
        return quantise(this.#notes.map((n) => ({ ...n, on: n.on - start, off: n.off - start })), this.length);
    }
}
