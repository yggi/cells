import { ROOT, pickedUnits } from "./program.js";
import { resolveIn } from "./helix.js";
import { clocking, playedCells, playing, selects, shiftsAt } from "./clocking.js";
import { stepsOf, unitsFor } from "./flatten.js";
import { footOf, slots } from "./subseq.js";
import { cellId, edgeId } from "./ids.js";
import { droneEnd, endOf, eventsBetween, kitPickAt, outputPlays, picksNow, plan, voiceFor } from "./realize.js";
import { liveRouting } from "./routing.js";
import { mod } from "../theory/modes.js";
const EPS = 1e-9;
const plans = new WeakMap();
function planOf(result, statics, muted) {
    let a = plans.get(result);
    if (!a)
        plans.set(result, (a = new WeakMap()));
    let b = a.get(statics);
    if (!b)
        a.set(statics, (b = new WeakMap()));
    let p = b.get(muted);
    if (!p)
        b.set(muted, (p = plan(result, statics, muted)));
    return p;
}
function oneshotRing(result) {
    let ring = 0;
    for (const o of result.outputs)
        if (o.kit)
            for (const u of result.cells.get(o.voice)?.units ?? []) {
                const v = u.atom.kind === 'ref' ? result.cells.get(u.atom.name) : undefined;
                const env = v?.oneshot && v.env ? result.cells.get(v.env) : undefined;
                const n = env?.units.map((x) => (x.atom.kind === 'note' ? x.atom.value : 0)) ?? [];
                if (n.length >= 2)
                    ring = Math.max(ring, n[0] + n[1]);
            }
    return ring;
}
export function liveAt(result, statics, muted, seconds) {
    const cells = new Map();
    const voices = new Set();
    const bars = new Map();
    const beatAt = new Map();
    const stepAt = new Map();
    const played = playedCells(result);
    const now = shiftsAt(result, statics, seconds);
    const clk = clocking(result, statics, seconds);
    const mark = (name) => {
        let c = cells.get(name);
        if (!c)
            cells.set(name, (c = { local: null, entries: new Set() }));
        return c;
    };
    const markChain = (way, cell, from, table, tableShift, value, alter) => {
        let prev = from;
        for (const p of resolveIn(result, table, tableShift, value, alter, played.has(cell) ? playing(now, statics, cell) : now).path) {
            mark(p.cell).entries.add(p.index);
            way.push({ from: prev && result.cells.get(prev)?.over === p.cell ? prev : null, to: p.cell, table: true });
            prev = p.cell;
        }
    };
    for (const c of result.cells.values()) {
        if (!c.clock || !selects(result, c.name))
            continue;
        const period = Math.max(1, stepsOf(result, c.name, null));
        const at = clk.stepOf(c.clock) * c.rate;
        if (c.laps && at >= c.laps * period)
            continue;
        const live = mark(c.name);
        live.local = mod(at, period);
        for (const k of picksNow(result, statics, c.name, seconds))
            live.entries.add(k);
    }
    for (const c of result.cells.values()) {
        if (!c.loops || !c.clock || c.voice || c.mix || c.sink || played.has(c.name))
            continue;
        const period = Math.max(1, stepsOf(result, c.name, null));
        const live = mark(c.name);
        if (live.local === null)
            live.local = mod(clk.stepOf(c.clock) * c.rate, period);
    }
    for (const [name, info] of result.clocks) {
        if (info.tap)
            continue;
        const beat = Math.floor(clk.stepOf(name) + EPS);
        const k = clk.map(name).beats;
        mark(name).entries.add(mod(beat, k));
        bars.set(name, Math.floor(beat / k));
        beatAt.set(name, mod(clk.stepOf(name), k));
        stepAt.set(name, clk.stepOf(name));
    }
    const active = [];
    const ways = new Map();
    const members = new Map();
    for (const o of result.outputs) {
        if (!outputPlays(result, o, muted))
            continue;
        if (seconds >= (o.drone ? droneEnd(result, statics) : endOf(result, statics, o)))
            continue;
        if (o.select.length && !o.select.every((x) => picksNow(result, statics, x.cell, seconds).has(x.entry)))
            continue;
        active.push(o);
        const way = [];
        const hits = [];
        ways.set(o, way);
        members.set(o, hits);
        const top = result.cells.get(o.cell);
        voices.add(cellId(o.voice));
        mark(o.voice);
        for (const v of [...o.via, ...o.through])
            if (!muted.has(cellId(v)))
                mark(v);
        for (const m of [...o.mods, ...o.levels]) {
            if (muted.has(cellId(m.cell)))
                continue;
            const mc = result.cells.get(m.cell);
            const live = mark(m.cell);
            if (mc.clock)
                live.local = mod(clk.stepOf(mc.clock) * mc.rate, Math.max(1, mc.steps));
        }
        const picked = o.kit && o.mods.some((m) => m.picks);
        if (picked) {
            const v = kitPickAt(planOf(result, statics, muted), o, seconds);
            if (v && !muted.has(cellId(v))) {
                mark(v);
                voices.add(cellId(v));
                hits.push(v);
            }
        }
        if (o.drone)
            continue;
        let at = o.cell;
        let pick = o.pick;
        let extra = o.shift;
        let local = mod(clk.stepOf(top.clock) * top.rate, Math.max(1, stepsOf(result, o.cell, o.pick)));
        const lap = Math.floor((clk.stepOf(top.clock) * top.rate) / Math.max(1, stepsOf(result, o.cell, o.pick)));
        let ctx = ROOT;
        let ctxShift = 0;
        let ctxFrom = null;
        for (let guard = 0; guard < 64; guard++) {
            if (muted.has(cellId(at)))
                break;
            const cell = result.cells.get(at);
            const table = cell.root ? at : (cell.over ?? ctx);
            const tShift = cell.root ? 0 : cell.over ? cell.overShift : ctxShift;
            const tFrom = cell.root ? null : cell.over ? at : ctxFrom;
            const k = cell.units.length;
            const turn = statics(at);
            const first = pick ? (pickedUnits(k, pick, turn)?.[0] ?? 0) : 0;
            const offset = Array.from({ length: k ? mod(first - turn, k) : 0 }, (_, q) => cell.unitSteps[mod(q + turn, k)]).reduce((x, y) => x + y, 0);
            mark(at).local = pick ? offset + local : local;
            const unitOf = (x) => (x.kind === 'ref' ? stepsOf(result, x.name, x.pick) || 1 : 1);
            let base = 0;
            let now = [];
            for (const u of unitsFor(result, at, statics, pick, table, extra)) {
                const span = footOf(u.atom, unitOf) * u.elongate * u.repeat;
                if (local >= base - EPS && local < base + span - EPS) {
                    const from = base;
                    now = slots([u], unitOf)
                        .map((x) => ({ ...x, at: x.at + from }))
                        .filter((x) => local >= x.at - EPS && local < x.at + x.dur - EPS && (!x.laps || mod(lap, x.laps.of) === x.laps.is));
                    break;
                }
                base += span;
            }
            if (!now.length)
                break;
            for (const { atom: a } of now) {
                if (a.kind !== 'note' && a.kind !== 'chord')
                    continue;
                if (o.kit && !picked) {
                    for (const value of a.kind === 'note' ? [a.value] : a.notes) {
                        const v = voiceFor(result, o, value);
                        if (v) {
                            mark(v.voice);
                            voices.add(cellId(v.voice));
                            hits.push(v.voice);
                        }
                    }
                }
                else {
                    if (a.kind === 'note')
                        markChain(way, at, tFrom, table, tShift, a.value, a.alter);
                    else
                        a.notes.forEach((v, j) => markChain(way, at, tFrom, table, tShift, v, a.alters[j]));
                }
            }
            const hit = now.find((x) => x.atom.kind === 'ref');
            if (!hit)
                break;
            const a = hit.atom;
            if (a.kind !== 'ref')
                break;
            way.push({ from: at, to: a.name });
            const span = stepsOf(result, a.name, a.pick) || 1;
            local = Math.min(span - EPS, Math.max(0, ((local - hit.at) / hit.dur) * span));
            at = a.name;
            pick = a.pick;
            extra = a.shift;
            ctx = table;
            ctxShift = tShift;
            ctxFrom = tFrom;
        }
    }
    const ring = oneshotRing(result);
    if (ring > 0)
        for (const e of eventsBetween(planOf(result, statics, muted), Math.max(0, seconds - ring - EPS), seconds + EPS, true)) {
            if (!(e.at <= seconds && seconds < e.at + e.dur) || !result.cells.get(e.voice)?.oneshot)
                continue;
            const o = active.find((x) => x.id === e.output);
            if (!o)
                continue;
            mark(e.voice);
            voices.add(cellId(e.voice));
            const hits = members.get(o);
            if (hits && !hits.includes(e.voice))
                hits.push(e.voice);
        }
    const phases = new Map();
    for (const c of result.cells.values())
        if (c.clock && !c.voice) {
            const s = clk.stepOf(c.clock) * c.rate;
            phases.set(c.name, s - Math.floor(s));
        }
    const how = {
        braid: (acc, o) => {
            acc.node(o.cell);
            for (const e of ways.get(o) ?? []) {
                if (e.from)
                    acc.edge(e.from, e.to, edgeId(cellId(e.from), cellId(e.to)));
                else
                    acc.node(e.to);
                if (e.table && result.cells.get(e.to)?.step)
                    acc.clock(e.to);
            }
        },
        members: (o) => members.get(o) ?? [],
    };
    const { nodes, edges } = liveRouting(result, muted, active, how);
    return { seconds, shifts: now, cells, nodes, edges, voices, bars, beatAt, stepAt, phases };
}
