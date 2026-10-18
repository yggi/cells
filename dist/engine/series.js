import { resolveIn, semitones } from "./helix.js";
import { clocking, EPS, playing, shiftsAt } from "./clocking.js";
import { tapped } from "./flatten.js";
export function paramTracks(p, voice, at, dur) {
    const vp = p.voiceParams.get(voice);
    if (!vp || Object.keys(vp).length === 0)
        return undefined;
    const out = {};
    for (const [key, prm] of Object.entries(vp)) {
        const series = prm.series.map((m) => levelSeries(p, m, at, at + dur));
        const product = (time) => series.reduce((a, s) => a * valueThen(s, time, (x) => x.level), 1);
        const scaled = (x) => (prm.range ? prm.range[0] + (prm.range[1] - prm.range[0]) * x : x);
        if (prm.env && prm.range) {
            out[key] = { kind: 'env', from: prm.range[0], peak: scaled(product(at)), ...prm.env };
        }
        else {
            const times = [...new Set(series.flatMap((s) => s.map((x) => x.at)))].sort((a, b) => a - b);
            out[key] = {
                kind: 'points',
                points: (times.length ? times : [at]).map((time) => ({
                    at: time,
                    value: scaled(product(time)),
                    ...(series.some((s) => s.some((x) => x.ramp && Math.abs(x.at - time) < EPS)) ? { ramp: true } : {}),
                })),
            };
        }
    }
    return out;
}
export function pitchOf(p, e, at) {
    const now = shiftsAt(p.result, p.statics, at + EPS);
    const own = p.played.has(e.cell) ? playing(now, p.statics, e.cell) : now;
    const t = tapped(p.result, e, own);
    const found = resolveIn(p.result, e.table, e.tableShift, t.value, t.alter, own);
    const r = e.transpose ? { ...found, position: found.position + e.transpose } : found;
    return semitones(p.result, r.root, r.position);
}
export function modulation(p, m, from, to) {
    if (m.events.length === 0)
        return [{ at: from, semis: 0 }];
    if (!m.clock)
        return [{ at: from, semis: m.sign * pitchOf(p, m.events[0], from) }];
    if (m.lin)
        return rampedSeries(p, m, from, to, (e, at) => m.sign * pitchOf(p, e, at)).map((x) => ({ at: x.at, semis: x.v, ramp: x.ramp }));
    const tm = clocking(p.result, p.statics).map(m.clock);
    let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
    let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
    if (!Number.isFinite(c0))
        c0 = 0;
    if (!Number.isFinite(c1))
        c1 = c0;
    const out = [];
    const lap0 = Math.floor(c0 / m.period);
    const last = inForce(m, c0);
    out.push({ at: from, semis: last ? m.sign * pitchOf(p, last, from) : 0 });
    for (let lap = lap0; lap * m.period < c1; lap++) {
        for (const e of m.events) {
            const s = lap * m.period + e.step;
            if (s <= c0 + EPS || s >= c1 - EPS)
                continue;
            const at = tm.q(s / m.rate);
            out.push({ at, semis: m.sign * pitchOf(p, e, at) });
        }
    }
    return out;
}
function inForce(m, c) {
    const lap0 = Math.floor(c / m.period);
    let last = null;
    for (const lap of [lap0, lap0 - 1]) {
        for (const e of m.events)
            if (lap * m.period + e.step <= c + EPS)
                last = e;
        if (last)
            break;
    }
    return last;
}
export function heldAt(p, m, at) {
    if (m.events.length === 0)
        return null;
    if (!m.clock)
        return m.events[0];
    const c = clocking(p.result, p.statics).map(m.clock).stepAt(Math.max(0, at)) * m.rate;
    return inForce(m, Number.isFinite(c) ? c : 0);
}
function rampedSeries(p, m, from, to, valueOf) {
    const tm = clocking(p.result, p.statics).map(m.clock);
    const starts = [...new Map(m.events.map((e) => [e.step, e])).values()].sort((a, b) => a.step - b.step);
    const at = (c) => tm.q(c / m.rate);
    const valueAt = (c) => {
        const lap = Math.floor(c / m.period);
        const local = c - lap * m.period;
        let i = starts.length - 1;
        for (let k = 0; k < starts.length; k++)
            if (starts[k].step <= local + EPS)
                i = k;
        const a = starts[i];
        const aStep = a.step > local + EPS ? a.step - m.period : a.step;
        const va = valueOf(a, at(lap * m.period + aStep));
        if (i === starts.length - 1 || aStep < 0)
            return va;
        const b = starts[i + 1];
        const vb = valueOf(b, at(lap * m.period + b.step));
        return va + ((vb - va) * (local - aStep)) / Math.max(EPS, b.step - aStep);
    };
    let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
    let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
    if (!Number.isFinite(c0))
        c0 = 0;
    if (!Number.isFinite(c1))
        c1 = c0;
    const out = [{ at: from, v: valueAt(c0), ramp: false }];
    for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
        for (const e of starts) {
            const c = lap * m.period + e.step;
            if (c > c0 + EPS && c < c1 - EPS)
                out.push({ at: at(c), v: valueOf(e, at(c)), ramp: e !== starts[0] });
        }
    out.push({ at: to, v: valueAt(c1 - 1e-6), ramp: true });
    return out;
}
export function levelSeries(p, m, from, to) {
    const val = (e) => (m.db ? Math.pow(10, (e.value + e.alter) / 20) : Math.max(0, e.value + e.alter));
    if (m.events.length === 0)
        return [{ at: from, level: 0 }];
    if (!m.clock)
        return [{ at: from, level: val(m.events[0]) }];
    if (m.lin)
        return rampedSeries(p, m, from, to, (e) => val(e)).map((x) => ({ at: x.at, level: Math.max(0, x.v), ramp: x.ramp }));
    const tm = clocking(p.result, p.statics).map(m.clock);
    let c0 = tm.stepAt(Math.max(0, from)) * m.rate;
    let c1 = tm.stepAt(Math.max(0, to)) * m.rate;
    if (!Number.isFinite(c0))
        c0 = 0;
    if (!Number.isFinite(c1))
        c1 = c0;
    const levelAt = (c) => {
        const local = c - Math.floor(c / m.period) * m.period;
        let best = -1;
        for (const e of m.events)
            if (local >= e.step - EPS && local < e.step + e.duration - EPS)
                best = Math.max(best, val(e));
        return best < 0 ? 0 : best;
    };
    const out = [{ at: from, level: levelAt(c0) }];
    const edges = new Set();
    for (let lap = Math.floor(c0 / m.period); lap * m.period < c1; lap++)
        for (const e of m.events)
            for (const s of [lap * m.period + e.step, lap * m.period + e.step + e.duration])
                if (s > c0 + EPS && s < c1 - EPS)
                    edges.add(s);
    for (const s of [...edges].sort((a, b) => a - b)) {
        const level = levelAt(s + EPS * 10);
        if (level !== out[out.length - 1].level)
            out.push({ at: tm.q(s / m.rate), level });
    }
    return out;
}
export function valueThen(s, time, v) {
    let i = 0;
    for (let k = 0; k < s.length; k++)
        if (s[k].at <= time + EPS)
            i = k;
    const next = s[i + 1];
    if (!next?.ramp || Math.abs(s[i].at - time) < EPS)
        return v(s[i]);
    return v(s[i]) + ((v(next) - v(s[i])) * (time - s[i].at)) / Math.max(EPS, next.at - s[i].at);
}
