import { clocking } from "../clocking.js";
import { stepsOf, unitsFor } from "../flatten.js";
import { slots } from "../subseq.js";
const MOST = 20_000;
function nodesOf(result, shifts, root, pick, shift) {
    const out = [];
    const walk = (name, p, extra, ctx, at, k, depth, seen) => {
        const cell = result.cells.get(name);
        if (!cell || out.length > MOST || seen.includes(name))
            return;
        const table = cell.root ? name : (cell.over ?? ctx);
        const units = unitsFor(result, name, shifts, p, table, extra);
        for (const { atom: a, at: t, dur } of slots(units, (x) => (x.kind === 'ref' ? stepsOf(result, x.name, x.pick) || 1 : 1))) {
            if (a.kind !== 'ref')
                continue;
            const child = result.cells.get(a.name);
            if (!child || child.voice || child.kit || child.mix)
                continue;
            const from = at + t * k;
            out.push({ cell: a.name, from, len: dur * k, depth: depth + 1 });
            walk(a.name, a.pick, a.shift, table, from, (dur * k) / (stepsOf(result, a.name, a.pick) || 1), depth + 1, [...seen, name]);
        }
    };
    out.push({ cell: root, from: 0, len: Math.max(1, stepsOf(result, root, pick)), depth: 0 });
    walk(root, pick, shift, root, 0, 1, 0, []);
    return out;
}
export function structure(p, until) {
    const clk = clocking(p.result, p.statics);
    const out = [];
    const seen = new Set();
    for (const t of p.tracks) {
        const o = t.output;
        if (seen.has(o.cell))
            continue;
        seen.add(o.cell);
        const tree = nodesOf(p.result, p.statics, o.cell, o.pick, o.shift);
        if (tree.length < 2)
            continue;
        const tm = clk.map(t.clock);
        const last = Math.min(until, t.end);
        const steps = tm.stepAt(Math.max(0, last)) * t.rate;
        if (!Number.isFinite(steps))
            continue;
        for (let lap = 0; lap * t.period < steps && out.length < MOST; lap++)
            for (const n of tree) {
                const s = lap * t.period + n.from;
                const at = tm.q(s / t.rate);
                if (!Number.isFinite(at) || at >= last)
                    continue;
                const to = Math.min(last, tm.q((s + n.len) / t.rate));
                const base = p.result.cells.get(n.cell)?.base?.name;
                out.push({ cell: n.cell, at, to, depth: n.depth, output: o.id, ...(base ? { base } : {}) });
            }
    }
    return out;
}
