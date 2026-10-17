import { clocking } from "../clocking.js";
import { eventsBetween } from "../realize.js";
export function splices(p, until) {
    const clk = clocking(p.result, p.statics);
    const notes = eventsBetween(p, 0, until, true, { until });
    const heard = new Map();
    for (const e of notes) {
        if (!e.output)
            continue;
        const ts = heard.get(e.output);
        if (ts)
            ts.push(e.at);
        else
            heard.set(e.output, [e.at]);
    }
    for (const ts of heard.values())
        ts.sort((a, b) => a - b);
    const out = [];
    const seen = new Set();
    for (const t of p.tracks) {
        const events = [...t.events].sort((a, b) => a.step - b.step);
        if (new Set(events.map((e) => e.cell)).size < 2)
            continue;
        const tm = clk.map(t.clock);
        const last = Math.min(until, t.end);
        const steps = tm.stepAt(Math.max(0, last)) * t.rate;
        if (!Number.isFinite(steps))
            continue;
        const times = heard.get(t.output.id) ?? [];
        for (let lap = 0; lap * t.period < steps; lap++)
            events.forEach((e, k) => {
                const before = k > 0 ? events[k - 1] : events[events.length - 1];
                if (e.cell === before.cell || (k === 0 && lap === 0))
                    return;
                const s = lap * t.period + e.step;
                const at = tm.q(s / t.rate);
                const next = tm.q((s + Math.max(1, e.duration)) / t.rate);
                if (!Number.isFinite(at) || at >= last)
                    return;
                const i = firstFrom(times, at - 1e-3);
                if (!(i < times.length && times[i] < next - 1e-3))
                    return;
                const key = `${t.output.id}|${at.toFixed(3)}`;
                if (seen.has(key))
                    return;
                seen.add(key);
                out.push({ at, cell: e.cell, after: before.cell, output: t.output.id });
            });
    }
    return out.sort((a, b) => a.at - b.at);
}
function firstFrom(xs, x) {
    let lo = 0;
    let hi = xs.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (xs[mid] < x)
            lo = mid + 1;
        else
            hi = mid;
    }
    return lo;
}
